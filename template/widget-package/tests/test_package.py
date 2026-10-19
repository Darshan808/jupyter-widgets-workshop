"""Packaging tests. They run against the INSTALLED package, so a missing
JS or CSS file fails here instead of on a user's machine."""

import importlib
import inspect
import pathlib

import anywidget

MODULE = "{{module_name}}"


def widget_classes():
    module = importlib.import_module(MODULE)
    return [
        cls for _, cls in inspect.getmembers(module, inspect.isclass)
        if issubclass(cls, anywidget.AnyWidget) and cls is not anywidget.AnyWidget
    ]


def test_package_defines_a_widget():
    assert widget_classes(), f"{MODULE} defines no AnyWidget subclass"


def test_front_end_files_ship_with_package():
    for cls in widget_classes():
        for attr in ("_esm", "_css"):
            value = getattr(cls, attr, None)
            if value is None:
                continue
            text = str(value)
            # A path must exist inside the installed package; inline code is fine too.
            if text.endswith((".js", ".mjs", ".css")) and "\n" not in text:
                path = pathlib.Path(text)
                assert path.is_file(), f"{cls.__name__}.{attr} points to a missing file: {text}"
                text = path.read_text(encoding="utf-8")
            assert text.strip(), f"{cls.__name__}.{attr} is empty"


def test_front_end_is_a_valid_afm():
    for cls in widget_classes():
        esm = str(cls._esm)
        if esm.endswith((".js", ".mjs")):
            esm = pathlib.Path(esm).read_text(encoding="utf-8")
        assert "export default" in esm, f"{cls.__name__}: the AFM needs `export default`"
