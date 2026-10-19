"""Turn a widget folder into an installable Python package (Module 5)."""

import os
import pathlib
import re
import shutil
import subprocess
import sys
import tempfile
import zipfile

_ROOT = pathlib.Path(__file__).resolve().parent.parent
_TEMPLATE = _ROOT / "template" / "widget-package"
_TEXT_SUFFIXES = {".py", ".toml", ".md", ".yml", ".yaml", ".txt", ""}


def make_package(widget_dir, dist_name, description, author="Your Name",
                 dependencies=(), dest=None, overwrite=False):
    """Copy the package template and put the widget folder inside it.

    widget_dir: folder with __init__.py and static/ (e.g. my_widgets/time_labeler)
    dist_name:  the name on PyPI, e.g. "time-labeler" (check it is free first)
    dependencies: extra packages your widget imports, e.g. ["numpy", "pandas"]
    Returns the new project folder: packages/<dist_name>/
    """
    widget_dir = pathlib.Path(widget_dir).resolve()
    module = widget_dir.name
    if not (widget_dir / "__init__.py").is_file() or not (widget_dir / "static").is_dir():
        raise FileNotFoundError(f"{widget_dir} needs __init__.py and a static/ folder")
    if not re.fullmatch(r"[a-z0-9]+([._-][a-z0-9]+)*", dist_name):
        raise ValueError("dist_name must be lowercase, e.g. 'time-labeler'")

    project = pathlib.Path(dest or _ROOT / "packages") / dist_name
    if project.exists():
        if not overwrite:
            raise FileExistsError(f"{project} exists (pass overwrite=True to replace it)")
        shutil.rmtree(project)
    shutil.copytree(_TEMPLATE, project)

    values = {
        "{{dist_name}}": dist_name,
        "{{module_name}}": module,
        "{{description}}": description,
        "{{author}}": author,
    }
    for path in project.rglob("*"):
        if path.is_file() and path.suffix in _TEXT_SUFFIXES:
            text = path.read_text(encoding="utf-8")
            for key, value in values.items():
                text = text.replace(key, value)
            path.write_text(text, encoding="utf-8")

    deps = "".join(f'  "{d}",\n' for d in dependencies)
    pyproject = project / "pyproject.toml"
    pyproject.write_text(
        pyproject.read_text(encoding="utf-8").replace(
            '  # Add what your widget imports, for example "numpy" or "pandas".\n', deps),
        encoding="utf-8",
    )
    (project / "src" / "README.txt").unlink(missing_ok=True)
    shutil.copytree(widget_dir, project / "src" / module,
                    ignore=shutil.ignore_patterns("__pycache__", "*.pyc", ".ipynb_checkpoints"))
    return project


def build(project):
    """Build the wheel and sdist into project/dist/. Works offline (no isolation)."""
    project = pathlib.Path(project)
    shutil.rmtree(project / "dist", ignore_errors=True)
    result = subprocess.run(
        [sys.executable, "-m", "build", "--no-isolation", str(project)],
        capture_output=True, text=True,
    )
    if result.returncode != 0:
        raise RuntimeError(result.stdout[-2000:] + result.stderr[-2000:])
    return sorted((project / "dist").iterdir())


def wheel_files(wheel):
    """List the files inside a wheel."""
    with zipfile.ZipFile(wheel) as zf:
        return sorted(zf.namelist())


def test_installed(project):
    """Install the wheel into a temporary folder and run the tests against it.

    The source folder is NOT on the path, so a missing JS/CSS file fails here,
    exactly as it would on a user's machine. Dependencies come from this
    environment, so no internet is needed.
    """
    project = pathlib.Path(project)
    wheel = next((project / "dist").glob("*.whl"))
    with tempfile.TemporaryDirectory() as target, tempfile.TemporaryDirectory() as cwd:
        subprocess.run(
            [sys.executable, "-m", "pip", "install", "--quiet", "--no-deps",
             "--target", target, str(wheel)],
            check=True,
        )
        env = {**os.environ, "PYTHONPATH": target, "PY_COLORS": "0", "NO_COLOR": "1"}
        result = subprocess.run(
            [sys.executable, "-m", "pytest", "-q", "-p", "no:cacheprovider",
             "--tb=line", "--color=no", str((project / "tests").resolve())],
            capture_output=True, text=True, env=env, cwd=cwd,
        )
    lines = (result.stdout or result.stderr).strip().splitlines()
    print("\n".join(line for line in lines if line.strip() and not line.startswith(" "))[-1500:])
    return result.returncode == 0
