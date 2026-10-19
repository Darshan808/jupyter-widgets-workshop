# Widget catalogue: use first, build second

Open-source widgets grouped by research task. **Tested** means it runs in this
workshop's environment (see `tools/tested-versions.txt`). For many more, browse
the [anywidget community gallery](https://anywidget.dev/en/community).

Before you adopt one, check it with the questions in Module 3: Can I get
results back into Python? Does it run where I work? Does it need internet?
Is it maintained?

## Plots and selections

| Widget | What it does | Tested |
|---|---|---|
| [Plotly `FigureWidget`](https://plotly.com/python/figurewidget/) | Interactive Plotly figures; lasso and box selection callbacks | Yes (Module 3) |
| [Altair `JupyterChart`](https://altair-viz.github.io/user_guide/jupyter_chart.html) | Altair charts whose selections come back to Python | Yes (station D) |
| [ipympl](https://matplotlib.org/ipympl/) | Interactive Matplotlib; works with `LassoSelector`, `SpanSelector` | |
| [bqplot](https://bqplot.github.io/bqplot/) | Grammar-of-graphics plots built on ipywidgets, with selectors | |
| [Mosaic (mosaic-widget)](https://github.com/uwdata/mosaic) | Linked views over large data with DuckDB | |

## Large point clouds and embeddings

| Widget | What it does | Tested |
|---|---|---|
| [jupyter-scatter](https://jupyter-scatter.dev) | Millions of points, WebGL, lasso, smooth transitions | Yes (station A) |
| `workshop.scatter_explorer` | This workshop's lasso explorer, Canvas 2D, to about 500k points | Yes (Module 3) |

## Tables

| Widget | What it does | Tested |
|---|---|---|
| [quak](https://github.com/manzt/quak) | Explore and filter large tables; filters become SQL (DuckDB) | Yes (station C) |
| [ipydatagrid](https://github.com/bloomberg/ipydatagrid) | Fast, editable data grid | |

## Maps and geospatial

| Widget | What it does | Tested |
|---|---|---|
| [Lonboard](https://developmentseed.org/lonboard) | Millions of points, lines, polygons from GeoPandas, WebGL | Yes (station E) |
| [ipyleaflet](https://ipyleaflet.readthedocs.io) | Leaflet maps with many layer types and controls | |

## Images, microscopy, medical imaging

| Widget | What it does | Tested |
|---|---|---|
| [vizarr](https://github.com/hms-dbmi/vizarr) | Very large (OME-)Zarr images, tile by tile | Yes (station G) |
| [ipyniivue](https://github.com/niivue/ipyniivue) | Brain and medical imaging (NIfTI and more) | |

## Biology and genomics

| Widget | What it does | Tested |
|---|---|---|
| [higlass-python](https://github.com/higlass/higlass-python) | Genome browser for Hi-C and genomic tracks | |
| [Vitessce](https://github.com/vitessce/vitessce-python) | Spatial and single-cell data views | |

## Astronomy

| Widget | What it does | Tested |
|---|---|---|
| [ipyaladin](https://github.com/cds-astro/ipyaladin) | Sky surveys and catalogues from CDS | Yes (station F) |

## Machine learning and teaching

| Widget | What it does | Tested |
|---|---|---|
| [drawdata](https://github.com/koaning/drawdata) | Draw datasets by hand | Yes (station B) |
| `workshop.range_labeler` | Mark labelled time ranges on long signals | Yes (Module 4) |

## 3-D

| Widget | What it does | Tested |
|---|---|---|
| [pythreejs](https://github.com/jupyter-widgets/pythreejs) | three.js scenes from Python | |
| [ipyvolume](https://github.com/widgetti/ipyvolume) | 3-D volume rendering and scatter | |

**Found a good one?** Open a pull request to add it here.
