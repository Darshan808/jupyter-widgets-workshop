// RangeLabeler: Anywidget Front-End Module (anywidget >= 0.11).
//
// Model state (shared by all views): _t, _y, labels, active_label, ranges, height
// View state (local to one view):    zoom window, drag in progress
//
// No third-party libraries: works offline.

const PALETTE = [
  "#4e79a7", "#f28e2b", "#e15759", "#76b7b2", "#59a14f",
  "#edc948", "#b07aa1", "#ff9da7", "#9c755f", "#bab0ac",
];
const UNKNOWN_COLOR = "#8c8c8c";

// ------------------------------------------------------------- helpers

function h(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text; // textContent: safe for any data
  return node;
}

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

// First index i with arr[i] >= x (arr is sorted).
function lowerBound(arr, x, n) {
  let lo = 0, hi = n;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (arr[mid] < x) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

function fmt(v) {
  return Number(v.toPrecision(5)).toLocaleString();
}

// ------------------------------------------------------------- module

// Factory: runs once per widget instance. Decoded arrays are shared by all views.
export default () => {
  let data = null;
  let dataKey = [null, null];

  function getData(model) {
    const tRaw = model.get("_t");
    const yRaw = model.get("_y");
    if (data && dataKey[0] === tRaw && dataKey[1] === yRaw) return data;

    const t = typedView(tRaw, Float64Array);
    const y = typedView(yRaw, Float32Array);
    const n = Math.min(t.length, y.length);
    let ymin = Infinity, ymax = -Infinity;
    for (let i = 0; i < n; i++) {
      const v = y[i];
      if (!Number.isFinite(v)) continue;
      if (v < ymin) ymin = v;
      if (v > ymax) ymax = v;
    }
    if (ymin === Infinity) { ymin = 0; ymax = 1; }
    if (ymin === ymax) { ymin -= 1; ymax += 1; }
    const t0 = n ? t[0] : 0;
    const t1 = n && t[n - 1] > t0 ? t[n - 1] : t0 + 1;

    dataKey = [tRaw, yRaw];
    data = { t, y, n, t0, t1, ymin, ymax };
    return data;
  }

  return {
    initialize({ model }) {
      getData(model); // decode once, before the first view
    },

    render({ model, el, signal }) {
      // ------------------------------------------------------- DOM
      const root = h("div", "rl-root");
      const toolbar = h("div", "rl-toolbar");
      const labelBar = h("div", "rl-labels");
      labelBar.setAttribute("role", "group");
      labelBar.setAttribute("aria-label", "Active label");
      const clearBtn = h("button", "rl-btn", "Clear all");
      clearBtn.type = "button";
      const status = h("span", "rl-status");
      toolbar.append(labelBar, clearBtn, status);

      const stage = h("div", "rl-stage");
      const canvas = h("canvas", "rl-canvas");
      stage.append(canvas);
      const list = h("div", "rl-list");
      root.append(toolbar, stage, list);
      el.append(root);
      const ctx = canvas.getContext("2d");

      // ------------------------------------------- view state (local)
      let W = 0, H = 0, dpr = 1;
      let view = null; // { a, b }: visible time window
      let drag = null; // { kind: "label" | "pan", ... }
      let frame = 0;

      const tOf = (px) => view.a + (px / W) * (view.b - view.a);
      const xOf = (time) => ((time - view.a) / (view.b - view.a)) * W;
      const pos = (e) => e.clientX - canvas.getBoundingClientRect().left;
      const colorOf = (label) => {
        const k = (model.get("labels") || []).indexOf(label);
        return k < 0 ? UNKNOWN_COLOR : PALETTE[k % PALETTE.length];
      };

      function setRanges(next) {
        model.set("ranges", next); // always a NEW array: in-place changes do not sync
        model.save_changes();
      }

      function resetView() {
        const { t0, t1 } = getData(model);
        view = { a: t0, b: t1 };
      }

      function clampView() {
        const { t0, t1, n } = getData(model);
        const full = t1 - t0;
        const minSpan = n > 1 ? (full / (n - 1)) * 4 : full;
        let span = Math.min(full, Math.max(minSpan, view.b - view.a));
        let a = Math.min(Math.max(view.a, t0), t1 - span);
        view = { a, b: a + span };
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
        if (!view) resetView();
        requestDraw();
      }

      function requestDraw() {
        if (!frame) frame = requestAnimationFrame(draw);
      }

      // ------------------------------------------------------ drawing
      function draw() {
        frame = 0;
        if (!W || !view) return;
        const { t, y, n, ymin, ymax } = getData(model);
        const css = getComputedStyle(root);
        const fg = css.getPropertyValue("--rl-fg").trim() || "#333";
        const muted = css.getPropertyValue("--rl-muted").trim() || "#777";
        const pad = 10;
        const yOf = (v) => pad + ((ymax - v) / (ymax - ymin)) * (H - 2 * pad);

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, W, H);

        // Ranges as coloured bands behind the signal.
        for (const r of model.get("ranges") || []) {
          const x0 = xOf(r.start), x1 = xOf(r.end);
          if (x1 < 0 || x0 > W) continue;
          ctx.fillStyle = colorOf(r.label);
          ctx.globalAlpha = 0.2;
          ctx.fillRect(x0, 0, Math.max(1, x1 - x0), H);
          ctx.globalAlpha = 0.9;
          ctx.fillRect(x0, 0, 1, H);
          ctx.fillRect(x1 - 1, 0, 1, H);
        }
        ctx.globalAlpha = 1;

        // Drag preview.
        if (drag && drag.kind === "label") {
          const x0 = Math.min(drag.x0, drag.x1), x1 = Math.max(drag.x0, drag.x1);
          ctx.fillStyle = colorOf(model.get("active_label"));
          ctx.globalAlpha = 0.3;
          ctx.fillRect(x0, 0, x1 - x0, H);
          ctx.globalAlpha = 1;
        }

        // Signal. Many samples per pixel: draw min/max per column (fast for
        // millions of samples). Few samples: draw a plain polyline.
        const first = Math.max(0, lowerBound(t, view.a, n) - 1);
        const last = Math.min(n, lowerBound(t, view.b, n) + 1);
        ctx.beginPath();
        ctx.strokeStyle = fg;
        ctx.lineWidth = 1;
        if (last - first <= 2 * W) {
          let started = false;
          for (let i = first; i < last; i++) {
            if (!Number.isFinite(y[i])) { started = false; continue; }
            const x = xOf(t[i]), yy = yOf(y[i]);
            if (started) ctx.lineTo(x, yy);
            else { ctx.moveTo(x, yy); started = true; }
          }
        } else {
          let i = first, started = false;
          for (let px = 0; px < W; px++) {
            const j = lowerBound(t, tOf(px + 1), n);
            let lo = Infinity, hi = -Infinity;
            for (let k = i; k < j; k++) {
              const v = y[k];
              if (v < lo) lo = v;
              if (v > hi) hi = v;
            }
            i = j;
            if (lo === Infinity) continue;
            if (started) ctx.lineTo(px + 0.5, yOf(hi));
            else { ctx.moveTo(px + 0.5, yOf(hi)); started = true; }
            ctx.lineTo(px + 0.5, yOf(lo));
          }
        }
        ctx.stroke();

        // Time axis: the visible window.
        ctx.fillStyle = muted;
        ctx.font = "11px sans-serif";
        ctx.textBaseline = "bottom";
        ctx.textAlign = "left";
        ctx.fillText(fmt(view.a), 4, H - 2);
        ctx.textAlign = "right";
        ctx.fillText(fmt(view.b), W - 4, H - 2);

        const count = (model.get("ranges") || []).length;
        status.textContent =
          `${n.toLocaleString()} samples, ${count} range${count === 1 ? "" : "s"}. ` +
          "Drag to label, Shift-drag to pan, wheel to zoom, double-click to reset.";
      }

      // --------------------------------------------- toolbar and list
      function buildLabels() {
        const active = model.get("active_label");
        labelBar.replaceChildren();
        for (const label of model.get("labels") || []) {
          const btn = h("button", "rl-label");
          btn.type = "button";
          btn.dataset.label = label;
          btn.setAttribute("aria-pressed", String(label === active));
          const swatch = h("span", "rl-swatch");
          swatch.style.background = colorOf(label);
          btn.append(swatch, h("span", null, label));
          labelBar.append(btn);
        }
      }

      function buildList() {
        const ranges = model.get("ranges") || [];
        list.replaceChildren();
        const order = ranges.map((r, i) => i).sort((p, q) => ranges[p].start - ranges[q].start);
        for (const i of order) {
          const r = ranges[i];
          const chip = h("span", "rl-chip");
          const swatch = h("span", "rl-swatch");
          swatch.style.background = colorOf(r.label);
          const remove = h("button", "rl-remove", "×");
          remove.type = "button";
          remove.dataset.index = String(i);
          remove.setAttribute("aria-label", `Remove ${r.label} range`);
          chip.append(swatch, h("span", null, `${r.label}: ${fmt(r.start)} to ${fmt(r.end)}`), remove);
          list.append(chip);
        }
      }

      // ------------------------------------- browser events ({ signal })
      canvas.addEventListener("pointerdown", (e) => {
        if (e.button !== 0 || !view) return;
        try { canvas.setPointerCapture(e.pointerId); } catch {}
        const x = pos(e);
        drag = e.shiftKey
          ? { kind: "pan", x0: x, a: view.a, b: view.b }
          : { kind: "label", x0: x, x1: x };
      }, { signal });

      canvas.addEventListener("pointermove", (e) => {
        if (!drag) return;
        const x = pos(e);
        if (drag.kind === "pan") {
          const shift = ((drag.x0 - x) / W) * (drag.b - drag.a);
          view = { a: drag.a + shift, b: drag.b + shift };
          clampView();
        } else {
          drag.x1 = x;
        }
        requestDraw();
      }, { signal });

      canvas.addEventListener("pointerup", () => {
        if (drag && drag.kind === "label" && Math.abs(drag.x1 - drag.x0) >= 3) {
          const { t0, t1 } = getData(model);
          const start = Math.max(t0, tOf(Math.min(drag.x0, drag.x1)));
          const end = Math.min(t1, tOf(Math.max(drag.x0, drag.x1)));
          const label = model.get("active_label");
          setRanges([...(model.get("ranges") || []), { start, end, label }]);
        }
        drag = null;
        requestDraw();
      }, { signal });

      canvas.addEventListener("pointercancel", () => { drag = null; requestDraw(); }, { signal });

      canvas.addEventListener("wheel", (e) => {
        if (!view) return;
        e.preventDefault();
        const x = pos(e);
        const tc = tOf(x);
        const span = (view.b - view.a) * Math.exp(e.deltaY * 0.0015);
        view = { a: tc - (x / W) * span, b: tc - (x / W) * span + span };
        clampView();
        requestDraw();
      }, { signal, passive: false });

      canvas.addEventListener("dblclick", () => { resetView(); requestDraw(); }, { signal });

      labelBar.addEventListener("click", (e) => {
        const btn = e.target.closest(".rl-label");
        if (!btn) return;
        model.set("active_label", btn.dataset.label);
        model.save_changes();
      }, { signal });

      list.addEventListener("click", (e) => {
        const btn = e.target.closest(".rl-remove");
        if (!btn) return;
        const index = Number(btn.dataset.index);
        setRanges((model.get("ranges") || []).filter((r, i) => i !== index));
      }, { signal });

      clearBtn.addEventListener("click", () => setRanges([]), { signal });

      // ---------------------------- model events (remove them on abort)
      const onSignal = () => { resetView(); requestDraw(); };
      const onRanges = () => { buildList(); requestDraw(); };
      const onLabels = () => { buildLabels(); buildList(); requestDraw(); };
      const listeners = [
        ["change:_t", onSignal],
        ["change:_y", onSignal],
        ["change:ranges", onRanges],
        ["change:labels", onLabels],
        ["change:active_label", buildLabels],
        ["change:height", resize],
      ];
      for (const [event, fn] of listeners) model.on(event, fn);

      const observer = new ResizeObserver(resize);
      observer.observe(stage);

      signal.addEventListener("abort", () => {
        for (const [event, fn] of listeners) model.off(event, fn);
        observer.disconnect();
        cancelAnimationFrame(frame);
      });

      // ------------------------------------------------------- start
      buildLabels();
      buildList();
      resize();
    },
  };
};
