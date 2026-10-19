"""Create a starter widget folder in my_widgets/ for Module 4."""

import keyword
import pathlib
import re

_ROOT = pathlib.Path(__file__).resolve().parent.parent

_PY = '''"""{class_name}: describe what your widget does in one line."""

import pathlib

import anywidget
import traitlets

_STATIC = pathlib.Path(__file__).parent / "static"


class {class_name}(anywidget.AnyWidget):
    _esm = _STATIC / "widget.js"
    _css = _STATIC / "widget.css"

    value = traitlets.Int(0).tag(sync=True)
'''

_JS = '''// {class_name}: Anywidget Front-End Module (anywidget >= 0.11).

export default {{
  // Runs once per widget instance. No DOM here.
  initialize({{ model, signal }}) {{}},

  // Runs once per view (each time the widget is displayed).
  render({{ model, el, signal }}) {{
    const btn = document.createElement("button");
    btn.className = "{prefix}-button";
    btn.type = "button";

    const update = () => {{
      btn.textContent = `Value is ${{model.get("value")}}`;
    }};
    update();

    btn.addEventListener("click", () => {{
      model.set("value", model.get("value") + 1);
      model.save_changes();
    }}, {{ signal }});

    model.on("change:value", update);
    signal.addEventListener("abort", () => model.off("change:value", update));

    el.append(btn);
  }},
}};
'''

_CSS = '''/* Prefix every class with "{prefix}-" so it cannot clash with other widgets. */
.{prefix}-button {{
  font: inherit;
  padding: 3px 10px;
  border: 1px solid var(--jp-border-color1, #c4c4c4);
  border-radius: 4px;
  background: var(--jp-layout-color2, #f2f2f2);
  color: var(--jp-ui-font-color1, #1f1f1f);
  cursor: pointer;
}}
'''


def _class_name(module_name):
    return "".join(part.capitalize() for part in module_name.split("_"))


def new_widget(name, root=None, overwrite=False):
    """Create my_widgets/<name>/ with a working starter widget.

    name: a Python identifier in snake_case, e.g. "time_labeler".
    Returns the folder path. Import with: from my_widgets.<name> import <ClassName>
    """
    if not re.fullmatch(r"[a-z][a-z0-9_]*", name) or keyword.iskeyword(name):
        raise ValueError("name must be snake_case, e.g. 'time_labeler'")
    folder = pathlib.Path(root or _ROOT / "my_widgets") / name
    if folder.exists() and not overwrite:
        print(f"{folder} already exists: keeping your files (pass overwrite=True to start again)")
        return folder
    (folder / "static").mkdir(parents=True, exist_ok=True)
    class_name = _class_name(name)
    prefix = "".join(w[0] for w in name.split("_"))[:4] or "w"
    (folder / "__init__.py").write_text(_PY.format(class_name=class_name), encoding="utf-8")
    (folder / "static" / "widget.js").write_text(
        _JS.format(class_name=class_name, prefix=prefix), encoding="utf-8")
    (folder / "static" / "widget.css").write_text(_CSS.format(prefix=prefix), encoding="utf-8")
    return folder
