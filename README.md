# Build, Find, and Ship Interactive Jupyter Widgets with ipywidgets and anywidget

Workshop materials for **SciPy India 2026**

Jupyter widgets turn one-way notebooks into two-way tools: a slider retrains a
model, and a lasso on a plot returns a pandas DataFrame. In this hands-on
workshop you learn how widgets work, build an interactive machine-learning
playground, find and combine existing widgets for your field, draft a custom
widget with AI help, and package it so others can `pip install` it.

**Approach: use first, build second.** You do not need to be very familiar with JavaScript.

## Before the workshop (10 minutes, please do this at home)

You need a laptop with **Python 3.10 or newer** (Windows, macOS, or Linux).

### Option A: pip (recommended)

```bash
git clone https://github.com/darshan808/jupyter-widgets-workshop.git
cd jupyter-widgets-workshop
python -m venv .venv
# Windows:      .venv\Scripts\activate
# macOS/Linux:  source .venv/bin/activate
python -m pip install -r requirements.txt
jupyter lab
```

### Option B: conda or mamba

```bash
conda env create -f environment.yml
conda activate widgets-workshop
jupyter lab
```

### Check your setup

Open **`00_setup_check.ipynb`** and run all cells. You should see a slider and
a green line of text. If not, see [`resources/troubleshooting.md`](resources/troubleshooting.md).

**Important:** start JupyterLab from the same environment you installed into.
Most "widget shows as text" problems come from two different environments.

### No time, or the installation failed?

On the day, mentors have **USB drives with an offline wheelhouse**:

```bash
python -m pip install --no-index --find-links <usb>/wheelhouse/<your-system> -r requirements.txt
```

## Schedule (3 hours)

| Time | Notebook | Topic |
|---|---|---|
| 0:00 | [`00_setup_check`](00_setup_check.ipynb) | Welcome and setup check |
| 0:10 | [`01_widget_model`](01_widget_model.ipynb) | How widgets work: synced traits, two-way messages, models and views |
| 0:30 | [`02_ml_playground`](02_ml_playground.ipynb) | Build an interactive ML playground with ipywidgets |
| 1:10 | | Break |
| 1:20 | [`03_widget_ecosystem`](03_widget_ecosystem.ipynb) + [`stations/`](stations/) | Discover and combine existing widgets |
| 1:55 | [`04_custom_widget_with_ai`](04_custom_widget_with_ai.ipynb) | Create a custom widget with AI help, and review it |
| 2:30 | [`05_package_and_publish`](05_package_and_publish.ipynb) | Package, test, and publish a widget |
| 2:50 | | Wrap-up and feedback |

## What is in this repository

```
00_setup_check.ipynb ... 05_package_and_publish.ipynb   the five modules
stations/              Module 3: one short notebook per widget (pick one)
solutions/             completed versions of every exercise
workshop/              example widgets and helpers used in the notebooks
  scatter_explorer/      lasso-select large scatter plots (Module 3)
  range_labeler/         mark labelled time ranges on a signal (Module 4)
  scaffold.py            creates a starter widget folder
  packaging.py           turns a widget folder into a package
ai/                    Module 4: prompt template, review checklist, task ideas,
                         and an AI-drafted widget with bugs to find
template/widget-package/   Module 5: package template with tests and a release workflow
my_widgets/            your own widgets go here
resources/             widget catalogue, troubleshooting, next steps
tools/                 instructor tools: run all notebooks, build an offline wheelhouse
```

## Module 3 stations

| Station | Widget | Good for | Internet in the browser? |
|---|---|---|---|
| A | jupyter-scatter | Millions of points, embeddings | No |
| B | drawdata | Draw a dataset, ML intuition | No |
| C | quak | Explore and filter large tables | No |
| D | Altair `JupyterChart` | Chart selections into pandas | Yes |
| E | Lonboard | Geospatial data | Base map only |
| F | ipyaladin | Astronomy | Yes |
| G | vizarr | Large microscopy images | Yes |

## AI assistants

Module 4 uses an AI assistant to draft code. **Any assistant works, and none
is required.** The review exercise and every other exercise work without one.
Open-source option: [jupyter-ai](https://github.com/jupyterlab/jupyter-ai) with
a local open-weight model.

## Licence

Code: BSD 3-Clause. Text: CC BY 4.0. See [`LICENSE`](LICENSE).

## Credits

Built on [Jupyter](https://jupyter.org), [ipywidgets](https://ipywidgets.readthedocs.io),
and [anywidget](https://anywidget.dev) by Trevor Manz, Nezar Abdennur, and Nils Gehlenborg
([SciPy 2024 paper](https://proceedings.scipy.org/articles/NRPV2311)), and on the
widget projects featured in the stations. Thank you to their authors.
