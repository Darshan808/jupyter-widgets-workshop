# {{dist_name}}

{{description}}

```bash
pip install {{dist_name}}
```

```python
import {{module_name}}
```

Works in JupyterLab, Jupyter Notebook 7, VS Code, Google Colab, and marimo.

## Development

```bash
pip install -e ".[dev]"
ANYWIDGET_HMR=1 jupyter lab   # edits to src/{{module_name}}/static/ reload live
pytest
```

## Release

1. Change `version` in `pyproject.toml`.
2. `git tag v0.1.0 && git push --tags`
3. GitHub Actions tests, builds, and publishes to PyPI with trusted publishing.

One-time setup: on pypi.org add a "pending publisher" for this repository,
workflow `publish.yml`, environment `pypi`. Then create the `pypi` environment
in the GitHub repository settings.
