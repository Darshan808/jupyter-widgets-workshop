"""RangeLabeler: mark labelled time ranges on a 1-D signal, get them in pandas.

    from workshop.range_labeler import RangeLabeler
    w = RangeLabeler(y, t=t, labels=["seizure", "artifact"])
    w                      # pick a label, drag across the plot
    w.ranges_df            # -> DataFrame: start, end, label, duration
    w.mask("artifact")     # -> boolean array over t, True inside ranges

This is the reviewed and fixed version of the AI draft in ai/draft_widget/.
"""

import pathlib

import anywidget
import numpy as np
import pandas as pd
import traitlets

_STATIC = pathlib.Path(__file__).parent / "static"


class RangeLabeler(anywidget.AnyWidget):
    _esm = _STATIC / "widget.js"
    _css = _STATIC / "widget.css"

    # Signal: Python -> JS, binary. A million samples is 12 MB, not 30 MB of JSON.
    _t = traitlets.Bytes(b"").tag(sync=True)  # float64, sorted
    _y = traitlets.Bytes(b"").tag(sync=True)  # float32

    # Small state: JSON is fine.
    labels = traitlets.List(traitlets.Unicode(), default_value=["event"]).tag(sync=True)
    active_label = traitlets.Unicode("event").tag(sync=True)
    ranges = traitlets.List(traitlets.Dict(), default_value=[]).tag(sync=True)
    height = traitlets.Int(220).tag(sync=True)

    def __init__(self, y, t=None, labels=("event",), **kwargs):
        labels = [str(label) for label in labels]
        if not labels:
            raise ValueError("labels must contain at least one label")
        super().__init__(labels=labels, active_label=labels[0], **kwargs)
        self.set_signal(y, t)

    # ----------------------------------------------------------- signal
    def set_signal(self, y, t=None):
        """Replace the plotted signal. Keeps existing ranges."""
        y = np.asarray(y, dtype=np.float64).ravel()
        if y.size < 2:
            raise ValueError("y needs at least 2 samples")
        t = np.arange(y.size, dtype=np.float64) if t is None else np.asarray(t, dtype=np.float64).ravel()
        if t.size != y.size:
            raise ValueError(f"t has {t.size} samples but y has {y.size}")
        if not np.all(np.isfinite(t)):
            raise ValueError("t must not contain NaN or infinite values")
        if np.any(np.diff(t) < 0):
            raise ValueError("t must be sorted in increasing order")
        self._signal_t = t
        with self.hold_sync():
            self._t = t.tobytes()
            self._y = y.astype(np.float32).tobytes()

    # ----------------------------------------------------------- ranges
    @traitlets.validate("active_label")
    def _check_active_label(self, proposal):
        if proposal["value"] not in self.labels:
            raise traitlets.TraitError(f"active_label must be one of {self.labels}")
        return proposal["value"]

    @property
    def ranges_df(self):
        """All ranges as a DataFrame, sorted by start."""
        df = pd.DataFrame(self.ranges, columns=["start", "end", "label"])
        df["duration"] = df["end"] - df["start"]
        return df.sort_values("start", ignore_index=True)

    def add_range(self, start, end, label=None):
        label = self.active_label if label is None else str(label)
        if label not in self.labels:
            raise ValueError(f"label must be one of {self.labels}")
        start, end = sorted((float(start), float(end)))
        # Assign a NEW list: in-place .append() would not sync.
        self.ranges = self.ranges + [{"start": start, "end": end, "label": label}]

    def clear(self, label=None):
        """Remove all ranges, or only the ranges with one label."""
        self.ranges = [] if label is None else [r for r in self.ranges if r["label"] != label]

    def mask(self, label=None):
        """Boolean array over t: True where a sample falls inside a range."""
        t = self._signal_t
        out = np.zeros(t.size, dtype=bool)
        for r in self.ranges:
            if label is None or r["label"] == label:
                out |= (t >= r["start"]) & (t <= r["end"])
        return out
