# Prompt template: draft an anywidget with an AI assistant

Copy everything between the lines into your assistant. Replace the parts in
`<angle brackets>`. Keep the rules: they prevent the most common bugs.

---

You are helping me write a Jupyter widget with **anywidget** (version 0.11 or newer).
I know Python well but I am not a JavaScript developer, so keep the JavaScript
small, plain, and commented.

**What the widget does:** <one or two sentences, e.g. "shows an image and lets me
click to place labelled points; I get the points back as a pandas DataFrame">

**Python input:** <e.g. "a 2-D NumPy array (the image) and a list of label names">

**What I need back in Python:** <e.g. "a DataFrame with x, y, label">

**Rules you must follow:**

1. Give me exactly three files for a folder `my_widgets/<name>/`:
   `__init__.py`, `static/widget.js`, `static/widget.css`.
2. In Python, set `_esm` and `_css` with
   `pathlib.Path(__file__).parent / "static" / "..."`, never a relative string.
3. Send large arrays (more than a few thousand numbers) as `traitlets.Bytes`
   (`array.astype(np.float32).tobytes()`), not as `traitlets.List`. In JavaScript
   read them as a typed array from the `DataView`.
4. Validate inputs in Python and raise `ValueError` with a clear message
   (shapes, lengths, types, empty input).
5. The JavaScript file must use `export default { initialize?, render }`.
   `render({ model, el, signal })` does all DOM work.
6. After every `model.set(...)`, call `model.save_changes()`.
7. Never mutate a synced array or object in place. Always set a new copy,
   e.g. `model.set("items", [...model.get("items"), item])`.
8. Pass `{ signal }` to every `addEventListener`. For every `model.on(...)`,
   remove it in `signal.addEventListener("abort", ...)` with `model.off(...)`.
9. Put text from data into the page with `textContent`, never `innerHTML`.
10. No external JavaScript libraries and no CDN imports, so it works offline.
11. Do not use `Math.min(...array)` or `Math.max(...array)` on large arrays (it crashes); use a loop.
12. Prefix every CSS class with a short unique prefix. Use JupyterLab theme
    variables with fallbacks, e.g. `var(--jp-ui-font-color1, #1f1f1f)`.
13. Add Python helper properties or methods that return results as pandas or NumPy.

After the code, show me two notebook cells that test it: one that displays the
widget, and one that reads the result back in Python.

---

## After you get the code

1. Save the three files into `my_widgets/<name>/` (create it with
   `workshop.scaffold.new_widget("<name>")`, then replace the files).
2. Run the two test cells. Open the browser console (F12) and look for errors.
3. Review the code with `ai/review_checklist.md` before you trust it.
4. If something is wrong, paste the error message and the checklist item back
   to the assistant and ask it to fix only that problem.
