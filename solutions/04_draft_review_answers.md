# Answer key: reviewing the AI draft (Module 4)

The draft is in `ai/draft_widget/`. The fixed version is `workshop/range_labeler/`.
Seven bugs were planted; every one was confirmed by tests before the workshop.

| # | Checklist | Where | Bug | Symptom | Fix |
|---|---|---|---|---|---|
| 1 | A1 | JS, "Clear all" `onclick` | `model.set("ranges", [])` without `save_changes()` | Ranges disappear in the browser, but `w.ranges` in Python still has them | Add `model.save_changes()` |
| 2 | A2 | JS, `mouseup` | `ranges.push(...)` on the array from `model.get`, then `set` of the same array | **Nothing appears after a drag**, and Python gets nothing | `model.set("ranges", [...model.get("ranges"), r])` |
| 3 | B2 | JS, end of `render` | `model.on("change:ranges", ...)` never removed | After a cell is cleared, the old view keeps updating a detached element | Remove it on `signal` abort; also pass `{ signal }` to the canvas listeners |
| 4 | B4 | JS, `drawList` | `chip.innerHTML = ...${r.label}...` | A label such as `<img src=x onerror=alert(1)>` runs as HTML | Build the chip with `textContent` |
| 5 | C1 | Python, traits `t` and `y` | `traitlets.List(traitlets.Float())` | 1 million samples = **30.5 MB of JSON** (vs 12 MB binary); slow to load | `traitlets.Bytes` with `float64`/`float32` arrays |
| 6 | D1 | Python, `__init__` | No validation | `RangeLabelerDraft([1, 2, 3], t=[0, 1])` is accepted silently | Check lengths, sorting, and empty input; raise `ValueError` |
| 7 | E1 | Python, `_esm` / `_css` | Relative string paths | Works only when the kernel runs in the repository root; fails after packaging with `FileNotFoundError` | `pathlib.Path(__file__).parent / "static" / ...` |

**Bonus findings** (not planted, but real):

- `Math.min(...y)` throws `RangeError: Maximum call stack size exceeded` for about 300,000+ samples (C2).
- It draws every sample as a line segment, so very long signals are slow (C3).
- The canvas width is fixed at 800 px, and colours ignore the dark theme (E3).
- Clicking without dragging creates a zero-width range.

**Teaching tip:** run the draft first and let people discover bug 2 ("nothing
happens when I drag"). Then ask them to find the cause with the checklist
instead of guessing. Most people find bugs 1, 2, 4, and 7 in 10 minutes; point
to the checklist sections for 3, 5, and 6.
