"""Execute every notebook (exercises and solutions) and report failures.

Instructors: run this after any change, and on each OS before the workshop.

    python tools/run_all_notebooks.py            # everything
    python tools/run_all_notebooks.py 02 03      # only notebooks whose path contains "02" or "03"
"""

import pathlib
import shutil
import sys
import time

import nbformat
from nbclient import NotebookClient
from nbclient.exceptions import CellExecutionError

ROOT = pathlib.Path(__file__).resolve().parent.parent


def notebooks(filters):
    paths = sorted(p for p in ROOT.rglob("*.ipynb")
                   if ".ipynb_checkpoints" not in p.parts and "packages" not in p.parts)
    return [p for p in paths if not filters or any(f in str(p.relative_to(ROOT)) for f in filters)]


def main(filters):
    # Module 4 creates this folder; remove it so the exercise runs cleanly.
    shutil.rmtree(ROOT / "my_widgets" / "my_first_widget", ignore_errors=True)
    failures = []
    for path in notebooks(filters):
        nb = nbformat.read(path, as_version=4)
        start = time.perf_counter()
        try:
            NotebookClient(nb, timeout=300, kernel_name="python3",
                           resources={"metadata": {"path": str(path.parent)}}).execute()
            status = "ok"
        except CellExecutionError as error:
            status = "FAILED"
            failures.append((path, str(error).strip().splitlines()[-1]))
        print(f"{status:7s} {time.perf_counter() - start:6.1f}s  {path.relative_to(ROOT)}", flush=True)
    shutil.rmtree(ROOT / "packages", ignore_errors=True)
    for path, message in failures:
        print(f"\n{path.relative_to(ROOT)}:\n  {message}")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
