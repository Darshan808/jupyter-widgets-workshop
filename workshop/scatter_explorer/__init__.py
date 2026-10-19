"""ScatterExplorer: lasso-select a large scatter plot, get the rows in pandas.

    from workshop.scatter_explorer import ScatterExplorer
    w = ScatterExplorer(df, x="umap1", y="umap2", color="cell_type")
    w                      # drag to lasso, Shift adds, wheel zooms
    w.selected_rows        # -> DataFrame of the selected rows
    w.select(df.score > 3) # Python -> plot
"""

import pathlib
import warnings

import anywidget
import numpy as np
import pandas as pd
import traitlets

_STATIC = pathlib.Path(__file__).parent / "static"
_MISSING = 0xFFFF  # category code for NaN / missing values


def _bytes_from_json(value, widget):
    # The browser sends a DataView. ipywidgets gives it to us as a
    # memoryview, but traitlets.Bytes accepts only bytes.
    return b"" if value is None else bytes(value)


class ScatterExplorer(anywidget.AnyWidget):
    _esm = _STATIC / "widget.js"
    _css = _STATIC / "widget.css"

    # --- Data: Python -> JS, binary (no JSON) ---
    _xy = traitlets.Bytes(b"").tag(sync=True)  # float32: x0, y0, x1, y1, ...
    _codes = traitlets.Bytes(b"").tag(sync=True)  # uint16 category code per point
    categories = traitlets.List(traitlets.Unicode(), default_value=[]).tag(sync=True)

    # --- Selection: both directions, binary uint32 row positions ---
    _selection = traitlets.Bytes(b"").tag(sync=True, from_json=_bytes_from_json)

    # --- Display settings ---
    point_size = traitlets.Int(2).tag(sync=True)
    height = traitlets.Int(480).tag(sync=True)

    def __init__(self, data, x, y, color=None, **kwargs):
        super().__init__(**kwargs)
        self._data = None
        self.set_data(data, x, y, color)

    # ------------------------------------------------------------------ data
    def set_data(self, data, x, y, color=None):
        """Replace the plotted data. Clears the selection."""
        if not isinstance(data, pd.DataFrame):
            raise TypeError("data must be a pandas DataFrame")

        xy = np.column_stack(
            [data[x].to_numpy(dtype=np.float32), data[y].to_numpy(dtype=np.float32)]
        )

        if color is None:
            codes, cats = np.zeros(0, dtype=np.uint16), []
        else:
            cat = pd.Categorical(data[color])
            if len(cat.categories) >= _MISSING:
                raise ValueError(f"too many categories in {color!r}")
            if len(cat.categories) > 20:
                warnings.warn(
                    f"{color!r} has {len(cat.categories)} categories; "
                    "colors repeat after 10.",
                    stacklevel=2,
                )
            raw = cat.codes.astype(np.int64)
            codes = np.where(raw < 0, _MISSING, raw).astype(np.uint16)
            cats = [str(c) for c in cat.categories]

        # hold_sync sends all changes in ONE message, so the browser
        # never sees new points with old colors.
        with self.hold_sync():
            self._data = data
            self._xy = np.ascontiguousarray(xy).tobytes()
            self._codes = codes.tobytes()
            self.categories = cats
            self._selection = b""

    # ------------------------------------------------------------- selection
    @property
    def selected(self):
        """Row positions (0-based, like .iloc) of the selected points."""
        return np.frombuffer(self._selection, dtype=np.uint32).astype(np.intp)

    @property
    def selected_rows(self):
        """The selected rows as a DataFrame (original index kept)."""
        return self._data.iloc[self.selected]

    def select(self, rows):
        """Select points from Python.

        rows: a boolean mask (e.g. df.score > 3) or row positions.
        """
        idx = np.asarray(rows)
        if idx.dtype == bool:
            if len(idx) != len(self._data):
                raise ValueError("boolean mask length does not match data")
            idx = np.flatnonzero(idx)
        idx = idx.astype(np.int64)
        if idx.size and (idx.min() < 0 or idx.max() >= len(self._data)):
            raise IndexError("row position out of range")
        self._selection = np.unique(idx).astype(np.uint32).tobytes()

    def clear_selection(self):
        self._selection = b""

    def on_select(self, callback):
        """Call callback(selected_rows) each time the selection changes.

        Note: in JupyterLab, print() inside a callback goes to the log
        console. Write to an ipywidgets.Output instead.
        """

        def _handler(change):
            callback(self.selected_rows)

        self.observe(_handler, names="_selection")
        return _handler
