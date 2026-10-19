# Widget ideas for your own AI-assisted build

Pick one that matches your field, or describe your own. Each is small enough
for 15 minutes with an assistant and the prompt template.

| Idea | Field | Python in | Python out |
|---|---|---|---|
| Image point annotator: click to place labelled points | Microscopy, imaging | 2-D array | DataFrame `x, y, label` |
| Threshold picker: histogram with a draggable threshold line | Image segmentation | 1-D values | float threshold, mask |
| Keyboard image sorter: press 1 to 9 to label each image, then the next one | Dataset curation, ML | list of 2-D arrays | list of labels |
| Sequence highlighter: select a region of a DNA or protein sequence | Bioinformatics | string | start, end |
| Confusion-matrix explorer: click a cell to get the misclassified rows | Machine learning | y_true, y_pred | row indices |
| Peak picker: click peaks on a spectrum | Chemistry, physics | x, y arrays | DataFrame of peaks |
| Colour palette builder: pick and order colours for plots | Any | none | list of hex colours |

**Rule of thumb:** if your idea needs a 3-D scene, a map, or millions of points
with WebGL, first look in `resources/widget_catalog.md`. Someone has probably
built it already: use first, build second.
