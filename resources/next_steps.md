# Next steps

## Share interactive results without a running kernel

- **Static HTML:** `jupyter nbconvert --execute --to html notebook.ipynb`.
  Executing embeds the widget state, so widgets render in the HTML file.
  Links made with `widgets.jslink` keep working; Python callbacks do not
  (there is no kernel).
- **Documentation sites:** the
  [MyST anywidget static export](https://developmentseed.org/myst-anywidget-static-export/)
  turns anywidget outputs into kernel-free interactive widgets, including binary data.

## Turn a notebook into an app

- [Voilà](https://voila.readthedocs.io): serve a notebook as a dashboard, code hidden.
- [marimo](https://marimo.io): a reactive notebook; anywidgets run natively
  (`mo.ui.anywidget(widget)`).
- [Solara](https://solara.dev), [Panel](https://panel.holoviz.org), and
  [Shiny for Python](https://shiny.posit.co/py/) can all embed Jupyter widgets.

## Learn more

- [anywidget documentation](https://anywidget.dev), especially the
  [AFM specification](https://anywidget.dev/en/afm/) (the lifecycle: `initialize`, `render`, `signal`)
  and [bundling](https://anywidget.dev/en/bundling/) (TypeScript, React, npm libraries).
- `npm create anywidget@latest`: a project template with a bundler, for larger widgets.
- [ipywidgets documentation](https://ipywidgets.readthedocs.io).
- Paper: Manz, Abdennur, Gehlenborg (2024),
  [*Any notebook served: authoring and sharing reusable interactive widgets*](https://proceedings.scipy.org/articles/NRPV2311),
  SciPy Proceedings.

## Contribute

- Add your widget to the [anywidget community gallery](https://anywidget.dev/en/community)
  (a pull request to `manzt/built-with-anywidget`).
- Add good widgets for your field to `resources/widget_catalog.md` in this repository.
- Join the Jupyter community: https://jupyter.org/community
