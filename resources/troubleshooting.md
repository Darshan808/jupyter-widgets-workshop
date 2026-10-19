# Troubleshooting

## Widgets show as text, for example `IntSlider(value=5, ...)`

The browser has no front-end code for widgets. Almost always, **JupyterLab is
running from a different environment** than the kernel.

1. Run `00_setup_check.ipynb`, section 2. It prints the kernel's Python.
2. In a terminal, check which JupyterLab you start: `which jupyter` (macOS,
   Linux) or `where jupyter` (Windows).
3. Fix one of these ways:
   - Start JupyterLab from the workshop environment: activate it, then `jupyter lab`.
   - Or install the widget front ends in the environment that runs JupyterLab:
     `python -m pip install "ipywidgets>=8" "anywidget>=0.11"`, then restart JupyterLab.
4. Refresh the browser tab after you restart JupyterLab.

On **JupyterHub**, ask an administrator to install `anywidget` and
`ipywidgets` in the server image once. After that, any anywidget-based package
works when users install it in their own kernel.

## Slider works, but a custom widget is blank

Open the browser console (F12, then the Console tab) and read the red error.

- `Failed to fetch dynamically imported module: https://...`: the widget loads
  code from the internet (stations D, F, G). Check your network.
- An error in your own `widget.js`: the message and line number tell you where.
  Paste it to your AI assistant together with the code.

## `print()` in a callback shows nothing

In JupyterLab, output from callbacks goes to the log console (View → Show Log
Console). Write to an `ipywidgets.Output` widget instead (Module 1).

## I change the widget in the browser, but Python does not see it

Your JavaScript calls `model.set(...)` without `model.save_changes()`, or it
changes an array in place. See checklist items A1 and A2 in `ai/review_checklist.md`.

## Live reload (`ANYWIDGET_HMR=1`) does nothing

- `%env ANYWIDGET_HMR=1` must run **before** anywidget is imported: restart the
  kernel and run that cell first.
- `_esm` and `_css` must be `pathlib.Path` objects, not strings.
- `watchfiles` must be installed (it is in `requirements.txt`).
- Changes to the Python file still need a kernel restart or `importlib.reload`.

## VS Code

Install the **Jupyter** extension and select the workshop environment as the
kernel (top right of the notebook). Widgets work with ipywidgets 8.

## Google Colab

Most anywidgets work directly. If a third-party widget does not render, run:

```python
from google.colab import output
output.enable_custom_widget_manager()
```

## Module 5: `Backend 'hatchling.build' is not available`

Install it: `python -m pip install hatchling`. The workshop builds without
isolation so that it works offline, which needs hatchling in the environment.

## Installation fails with no internet

Ask a mentor for the USB wheelhouse, then:

```bash
python -m pip install --no-index --find-links <usb>/wheelhouse/<your-system> -r requirements.txt
```
