// ScatterExplorer: Anywidget Front-End Module (anywidget >= 0.11).
//
// Model state (shared by all views): _xy, _codes, categories, _selection,
//                                    point_size, height
// View state (local to one view):    pan/zoom, lasso path, hover
//
// No third-party libraries: works offline.

const PALETTE = [
  "#4e79a7", "#f28e2b", "#e15759", "#76b7b2", "#59a14f",
  "#edc948", "#b07aa1", "#ff9da7", "#9c755f", "#bab0ac",
];
const PALETTE_RGB = PALETTE.map(hexToRgb);
const MISSING_CODE = 0xffff;
const MISSING_HEX = "#8c8c8c";
const MISSING_RGB = hexToRgb(MISSING_HEX);
const HOVER_RADIUS = 8; // CSS px

// ------------------------------------------------------------- helpers

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function colorOf(code) {
  return code === MISSING_CODE ? MISSING_HEX : PALETTE[code % PALETTE.length];
}

// Hosts give binary traits as a DataView. Accept other forms too.
function asDataView(value) {
  if (value instanceof DataView) return value;
  if (value instanceof ArrayBuffer) return new DataView(value);
  if (ArrayBuffer.isView(value)) {
    return new DataView(value.buffer, value.byteOffset, value.byteLength);
  }
  return new DataView(new ArrayBuffer(0));
}

// Zero-copy typed array over binary data. Copies only if misaligned.
function typedView(value, Type) {
  const dv = asDataView(value);
  const size = Type.BYTES_PER_ELEMENT;
  const length = Math.floor(dv.byteLength / size);
  if (dv.byteOffset % size === 0) return new Type(dv.buffer, dv.byteOffset, length);
  return new Type(dv.buffer.slice(dv.byteOffset, dv.byteOffset + length * size));
}

// Ray casting. poly is flat: [x0, y0, x1, y1, ...].
function pointInPolygon(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 2; i < poly.length; j = i, i += 2) {
    const xi = poly[i], yi = poly[i + 1], xj = poly[j], yj = poly[j + 1];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

function h(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

// ------------------------------------------------------------- module

// Factory form: this function runs once per widget instance.
// Decoded arrays live in this closure, so every view shares one copy.
export default () => {
  let data = null;
  let dataKey = [null, null];
  let sel = null;
  let selKey = null;

  function getData(model) {
    const xyRaw = model.get("_xy");
    const codesRaw = model.get("_codes");
    if (data && dataKey[0] === xyRaw && dataKey[1] === codesRaw) return data;

    const xy = typedView(xyRaw, Float32Array);
    const n = xy.length >> 1;
    let codes = typedView(codesRaw, Uint16Array);
    if (codes.length !== n) codes = null; // no color column

    let xmin = Infinity, xmax = -Infinity, ymin = Infinity, ymax = -Infinity;
    for (let i = 0; i < n; i++) {
      const x = xy[2 * i], y = xy[2 * i + 1];
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
      if (x < xmin) xmin = x;
      if (x > xmax) xmax = x;
      if (y < ymin) ymin = y;
      if (y > ymax) ymax = y;
    }
    if (xmin === Infinity) { xmin = 0; xmax = 1; ymin = 0; ymax = 1; }

    dataKey = [xyRaw, codesRaw];
    data = { xy, codes, n, bounds: { xmin, xmax, ymin, ymax } };
    sel = null; // the selection mask depends on n
    return data;
  }

  function getSelection(model) {
    const { n } = getData(model);
    const raw = model.get("_selection");
    if (sel && selKey === raw) return sel;
    const idx = typedView(raw, Uint32Array);
    const mask = new Uint8Array(n);
    let count = 0;
    for (let k = 0; k < idx.length; k++) {
      const i = idx[k];
      if (i < n && mask[i] === 0) { mask[i] = 1; count++; }
    }
    selKey = raw;
    sel = { mask, count };
    return sel;
  }

  function setSelection(model, indices) {
    // Give the host an exact-size buffer: some serializers send the
    // whole underlying buffer, not only the view's slice.
    const exact =
      indices.byteOffset === 0 && indices.byteLength === indices.buffer.byteLength
        ? indices
        : indices.slice();
    model.set("_selection", new DataView(exact.buffer));
    model.save_changes();
  }

  return {
    initialize({ model }) {
      getData(model); // decode once, before the first view
    },

    render({ model, el, signal }) {
      // ------------------------------------------------------- DOM
      const root = h("div", "sx-root");
      const toolbar = h("div", "sx-toolbar");
      const lassoBtn = h("button", "sx-btn", "Lasso");
      const panBtn = h("button", "sx-btn", "Pan");
      const resetBtn = h("button", "sx-btn", "Reset view");
      const clearBtn = h("button", "sx-btn", "Clear selection");
      for (const b of [lassoBtn, panBtn, resetBtn, clearBtn]) b.type = "button";
      const status = h("span", "sx-status");
      toolbar.append(lassoBtn, panBtn, resetBtn, clearBtn, status);

      const body = h("div", "sx-body");
      const stage = h("div", "sx-stage");
      const canvas = h("canvas", "sx-canvas");
      const tooltip = h("div", "sx-tooltip");
      stage.append(canvas, tooltip);
      const legend = h("div", "sx-legend");
      body.append(stage, legend);
      root.append(toolbar, body);
      el.append(root);
      const ctx = canvas.getContext("2d");

      // ------------------------------------------- view state (local)
      let W = 0, H = 0, dpr = 1;
      let view = null; // { cx, cy, kx, ky }: data center, px per data unit
      let mode = "lasso";
      let lasso = null; // [[px, py], ...] in CSS px
      let drag = null;
      let hover = -1;
      let frame = 0;
      let hoverFrame = 0;
      let hoverPos = null;

      const toScreen = (x, y) => [
        (x - view.cx) * view.kx + W / 2,
        H / 2 - (y - view.cy) * view.ky,
      ];
      const toData = (px, py) => [
        (px - W / 2) / view.kx + view.cx,
        view.cy - (py - H / 2) / view.ky,
      ];
      const pos = (e) => {
        const r = canvas.getBoundingClientRect();
        return [e.clientX - r.left, e.clientY - r.top];
      };

      function fit() {
        if (!W) return;
        const { bounds } = getData(model);
        const pad = 16;
        const dx = bounds.xmax - bounds.xmin || 1;
        const dy = bounds.ymax - bounds.ymin || 1;
        view = {
          cx: (bounds.xmin + bounds.xmax) / 2,
          cy: (bounds.ymin + bounds.ymax) / 2,
          kx: Math.max(1, W - 2 * pad) / dx,
          ky: Math.max(1, H - 2 * pad) / dy,
        };
      }

      function resize() {
        const width = Math.floor(stage.clientWidth);
        const height = model.get("height");
        const ratio = window.devicePixelRatio || 1;
        if (!width || (width === W && height === H && ratio === dpr)) return;
        W = width; H = height; dpr = ratio;
        canvas.style.width = W + "px";
        canvas.style.height = H + "px";
        canvas.width = Math.max(1, Math.round(W * dpr));
        canvas.height = Math.max(1, Math.round(H * dpr));
        legend.style.maxHeight = H + "px";
        if (!view) fit();
        requestDraw();
      }

      function requestDraw() {
        if (!frame) frame = requestAnimationFrame(draw);
      }

      // ------------------------------------------------------ drawing
      function draw() {
        frame = 0;
        if (!W || !view) return;
        const { xy, codes, n } = getData(model);
        const { mask, count } = getSelection(model);

        const cw = canvas.width, ch = canvas.height;
        const img = ctx.createImageData(cw, ch);
        // One 32-bit word per pixel (RGBA, little-endian): 4x fewer writes.
        const px32 = new Uint32Array(img.data.buffer);
        const s = Math.max(1, Math.round(model.get("point_size") * dpr));
        const off = s / 2;
        // screen = data * a + b, in device pixels
        const ax = view.kx * dpr, bx = (W / 2 - view.cx * view.kx) * dpr - off;
        const ay = -view.ky * dpr, by = (H / 2 + view.cy * view.ky) * dpr - off;

        const pack = (rgb, a) => ((a << 24) | (rgb[2] << 16) | (rgb[1] << 8) | rgb[0]) >>> 0;
        const colorsFor = (a) => {
          const table = new Uint32Array(PALETTE.length + 1);
          PALETTE_RGB.forEach((rgb, k) => (table[k] = pack(rgb, a)));
          table[PALETTE.length] = pack(MISSING_RGB, a);
          return table;
        };
        const paint = (alpha, want) => {
          // want: -1 = every point, 0 = unselected only, 1 = selected only
          const table = colorsFor(alpha);
          for (let i = 0; i < n; i++) {
            if (want >= 0 && mask[i] !== want) continue;
            const x0 = Math.round(xy[2 * i] * ax + bx);
            const y0 = Math.round(xy[2 * i + 1] * ay + by);
            // off-screen and NaN points both fail this test
            if (!(x0 > -s && x0 < cw && y0 > -s && y0 < ch)) continue;
            const code = codes ? codes[i] : 0;
            const color = table[code === MISSING_CODE ? PALETTE.length : code % PALETTE.length];
            if (s === 1) { px32[y0 * cw + x0] = color; continue; }
            const xa = x0 < 0 ? 0 : x0, xb = x0 + s > cw ? cw : x0 + s;
            const ya = y0 < 0 ? 0 : y0, yb = y0 + s > ch ? ch : y0 + s;
            for (let yy = ya; yy < yb; yy++) px32.fill(color, yy * cw + xa, yy * cw + xb);
          }
        };

        if (count === 0) {
          paint(230, -1);
        } else {
          paint(40, 0); // dimmed first
          paint(255, 1); // selected on top
        }
        ctx.putImageData(img, 0, 0);

        // Overlays, in CSS px.
        const fg = getComputedStyle(root).getPropertyValue("--sx-fg").trim() || "#333";
        ctx.save();
        ctx.scale(dpr, dpr);
        if (lasso && lasso.length > 1) {
          ctx.beginPath();
          ctx.moveTo(lasso[0][0], lasso[0][1]);
          for (let k = 1; k < lasso.length; k++) ctx.lineTo(lasso[k][0], lasso[k][1]);
          ctx.closePath();
          ctx.setLineDash([4, 3]);
          ctx.lineWidth = 1;
          ctx.strokeStyle = fg;
          ctx.stroke();
          ctx.globalAlpha = 0.08;
          ctx.fillStyle = fg;
          ctx.fill();
        }
        if (hover >= 0 && hover < n) {
          const [hx, hy] = toScreen(xy[2 * hover], xy[2 * hover + 1]);
          ctx.setLineDash([]);
          ctx.globalAlpha = 1;
          ctx.lineWidth = 1.5;
          ctx.strokeStyle = fg;
          ctx.beginPath();
          ctx.arc(hx, hy, Math.max(4, model.get("point_size") + 2), 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();

        status.textContent = count
          ? `${count.toLocaleString()} of ${n.toLocaleString()} selected`
          : `${n.toLocaleString()} points. Drag to select, hold Shift to add.`;
      }

      // ------------------------------------------------------- legend
      function buildLegend() {
        const cats = model.get("categories") || [];
        const { codes, n } = getData(model);
        legend.replaceChildren();
        legend.hidden = cats.length === 0 || !codes;
        if (legend.hidden) return;

        const counts = new Uint32Array(cats.length + 1); // last slot = missing
        for (let i = 0; i < n; i++) {
          const c = codes[i];
          counts[c < cats.length ? c : cats.length] += 1;
        }
        const entries = cats.map((name, c) => [name, c, counts[c]]);
        if (counts[cats.length]) entries.push(["(missing)", MISSING_CODE, counts[cats.length]]);

        for (const [name, code, cnt] of entries) {
          const item = h("button", "sx-legend-item");
          item.type = "button";
          item.dataset.code = String(code);
          item.title = "Click to select. Shift-click to add.";
          const swatch = h("span", "sx-swatch");
          swatch.style.background = colorOf(code);
          item.append(swatch, h("span", "sx-label", name), h("span", "sx-count", cnt.toLocaleString()));
          legend.append(item);
        }
      }

      // ---------------------------------------------------- selection
      function selectCategory(code, additive) {
        const { codes, n } = getData(model);
        const base = additive ? getSelection(model).mask : null;
        const out = [];
        for (let i = 0; i < n; i++) {
          if (codes[i] === code || (base && base[i])) out.push(i);
        }
        setSelection(model, Uint32Array.from(out));
      }

      function commitLasso(additive) {
        const { xy, n } = getData(model);
        const poly = new Float64Array(lasso.length * 2);
        let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
        lasso.forEach(([px, py], k) => {
          const [x, y] = toData(px, py);
          poly[2 * k] = x;
          poly[2 * k + 1] = y;
          x0 = Math.min(x0, x); x1 = Math.max(x1, x);
          y0 = Math.min(y0, y); y1 = Math.max(y1, y);
        });
        const base = additive ? getSelection(model).mask : null;
        const out = [];
        for (let i = 0; i < n; i++) {
          const x = xy[2 * i], y = xy[2 * i + 1];
          // cheap bounding-box test first, exact polygon test second
          const hit = x >= x0 && x <= x1 && y >= y0 && y <= y1 && pointInPolygon(x, y, poly);
          if (hit || (base && base[i])) out.push(i);
        }
        setSelection(model, Uint32Array.from(out));
      }

      // -------------------------------------------------------- hover
      function findNearest(px, py) {
        const { xy, n } = getData(model);
        const ax = view.kx, bx = W / 2 - view.cx * view.kx;
        const ay = -view.ky, by = H / 2 + view.cy * view.ky;
        let best = -1, bestD = HOVER_RADIUS * HOVER_RADIUS;
        for (let i = 0; i < n; i++) {
          const dx = xy[2 * i] * ax + bx - px;
          const dy = xy[2 * i + 1] * ay + by - py;
          const d = dx * dx + dy * dy;
          if (d < bestD) { bestD = d; best = i; }
        }
        return best;
      }

      function showTooltip(i, px, py) {
        if (i < 0) { tooltip.style.display = "none"; return; }
        const { codes } = getData(model);
        const cats = model.get("categories") || [];
        let text = `Row ${i}`;
        if (codes) {
          const c = codes[i];
          text += `: ${c === MISSING_CODE ? "(missing)" : cats[c] ?? c}`;
        }
        tooltip.textContent = text;
        tooltip.style.display = "block";
        tooltip.style.left = Math.max(4, Math.min(px + 12, W - tooltip.offsetWidth - 4)) + "px";
        tooltip.style.top = Math.max(4, py - 28) + "px";
      }

      function scheduleHover(px, py) {
        hoverPos = [px, py];
        if (hoverFrame) return;
        hoverFrame = requestAnimationFrame(() => {
          hoverFrame = 0;
          if (!view || lasso || drag) return;
          const i = findNearest(hoverPos[0], hoverPos[1]);
          if (i !== hover) { hover = i; requestDraw(); }
          showTooltip(i, hoverPos[0], hoverPos[1]);
        });
      }

      function setMode(m) {
        mode = m;
        lassoBtn.setAttribute("aria-pressed", String(m === "lasso"));
        panBtn.setAttribute("aria-pressed", String(m === "pan"));
        stage.dataset.mode = m;
      }

      // ------------------------------------- browser events ({ signal })
      canvas.addEventListener("pointerdown", (e) => {
        if (e.button !== 0 || !view) return;
        const p = pos(e);
        try { canvas.setPointerCapture(e.pointerId); } catch {}
        hover = -1;
        showTooltip(-1);
        if (mode === "lasso") lasso = [p];
        else drag = { p, cx: view.cx, cy: view.cy };
        requestDraw();
      }, { signal });

      canvas.addEventListener("pointermove", (e) => {
        if (!view) return;
        const p = pos(e);
        if (lasso) {
          const last = lasso[lasso.length - 1];
          if (Math.hypot(p[0] - last[0], p[1] - last[1]) > 2) {
            lasso.push(p);
            requestDraw();
          }
        } else if (drag) {
          view.cx = drag.cx - (p[0] - drag.p[0]) / view.kx;
          view.cy = drag.cy + (p[1] - drag.p[1]) / view.ky;
          requestDraw();
        } else {
          scheduleHover(p[0], p[1]);
        }
      }, { signal });

      const endPointer = (commit) => (e) => {
        if (lasso && commit && lasso.length > 2) commitLasso(e.shiftKey);
        lasso = null;
        drag = null;
        requestDraw();
      };
      canvas.addEventListener("pointerup", endPointer(true), { signal });
      canvas.addEventListener("pointercancel", endPointer(false), { signal });

      canvas.addEventListener("pointerleave", () => {
        if (lasso || drag) return;
        hover = -1;
        showTooltip(-1);
        requestDraw();
      }, { signal });

      canvas.addEventListener("wheel", (e) => {
        if (!view) return;
        e.preventDefault();
        const p = pos(e);
        const [dx, dy] = toData(p[0], p[1]);
        const f = Math.exp(-e.deltaY * 0.0015);
        view.kx *= f;
        view.ky *= f;
        // keep the data point under the cursor fixed
        view.cx = dx - (p[0] - W / 2) / view.kx;
        view.cy = dy + (p[1] - H / 2) / view.ky;
        requestDraw();
      }, { signal, passive: false });

      lassoBtn.addEventListener("click", () => setMode("lasso"), { signal });
      panBtn.addEventListener("click", () => setMode("pan"), { signal });
      resetBtn.addEventListener("click", () => { fit(); requestDraw(); }, { signal });
      clearBtn.addEventListener("click", () => setSelection(model, new Uint32Array(0)), { signal });
      legend.addEventListener("click", (e) => {
        const item = e.target.closest(".sx-legend-item");
        if (item) selectCategory(Number(item.dataset.code), e.shiftKey);
      }, { signal });

      // ---------------------------- model events (remove them on abort)
      const onData = () => { hover = -1; fit(); buildLegend(); requestDraw(); };
      const listeners = [
        ["change:_xy", onData],
        ["change:_codes", onData],
        ["change:categories", buildLegend],
        ["change:_selection", requestDraw],
        ["change:point_size", requestDraw],
        ["change:height", resize],
      ];
      for (const [event, fn] of listeners) model.on(event, fn);

      const observer = new ResizeObserver(resize);
      observer.observe(stage);

      signal.addEventListener("abort", () => {
        for (const [event, fn] of listeners) model.off(event, fn);
        observer.disconnect();
        cancelAnimationFrame(frame);
        cancelAnimationFrame(hoverFrame);
      });

      // ------------------------------------------------------- start
      setMode("lasso");
      buildLegend();
      resize();
    },
  };
};
