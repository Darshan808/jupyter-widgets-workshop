# Review checklist for AI-drafted widgets

AI assistants write widgets that *look* right and often run. These checks find
the bugs that only show up later: in a second view, with large data, after you
share it, or on someone else's machine. Tick each item.

## A. Python and browser stay in sync

- [ ] **A1. Every `model.set(...)` is followed by `model.save_changes()`.**
      Without it, Python never sees the change.
- [ ] **A2. Nothing is mutated in place.** `push`, `splice`, or `obj.x = ...` on a
      value from `model.get(...)` followed by `model.set` of the same object does
      not trigger a change. Look for copies: `[...old, item]`, `{...old, key}`.
      The Python side has the same rule: `w.items = w.items + [x]`, not `.append`.
- [ ] **A3. Change callbacks read values with `model.get(...)`,** not from callback arguments.
- [ ] **A4. Test it:** change the value in the browser, then read it in Python.
      Change it in Python, then look at the browser.

## B. Interaction and lifecycle

- [ ] **B1. All DOM work happens inside `render`.** `initialize` has no `el`.
- [ ] **B2. Every `model.on(...)` has a matching `model.off(...)`** in an
      `abort` listener on `signal`, and browser listeners use `{ signal }`.
- [ ] **B3. Test it:** display the widget in two cells. Both views update, and
      clearing one cell causes no errors in the browser console.
- [ ] **B4. Text from data uses `textContent`, not `innerHTML`.** A label like
      `<img src=x onerror=alert(1)>` must show as text.

## C. Data and performance

- [ ] **C1. Large arrays travel as `traitlets.Bytes`,** not `traitlets.List`.
      A million floats as JSON is about 30 MB; as float32 bytes it is 4 MB.
- [ ] **C2. No `Math.min(...arr)` / `Math.max(...arr)` on large arrays** (stack overflow).
- [ ] **C3. Drawing scales:** with many points per pixel, it summarises
      (for example min/max per pixel column) instead of drawing every point.
- [ ] **C4. No CDN imports,** or each one is pinned to an exact version and you
      accept that the widget needs internet.

## D. Errors and edge cases

- [ ] **D1. Python validates inputs** (types, shapes, matching lengths, empty
      data, sorted time) and raises `ValueError` with a clear message.
- [ ] **D2. The widget shows something sensible for empty or tiny data.**
- [ ] **D3. The browser console (F12) shows no errors** while you use it.

## E. Packaging

- [ ] **E1. `_esm` and `_css` use `pathlib.Path(__file__).parent / ...`.**
      A relative string such as `"static/widget.js"` works only from one folder.
- [ ] **E2. JS and CSS files live inside the Python package folder** (for example `static/`).
- [ ] **E3. CSS classes have a unique prefix and use theme variables** (dark mode).
- [ ] **E4. The package requires the anywidget version its JS needs**
      (`anywidget>=0.11` if it uses `signal`).
