"""Download every package (with dependencies) for OFFLINE installation.

Run this on each operating system you support (Windows, macOS, Linux), with
the same Python version participants use, and copy the folders to USB drives.

    python tools/make_wheelhouse.py
    # -> wheelhouse/<platform>-py<version>/

Participants then install without internet:

    python -m pip install --no-index --find-links wheelhouse/<folder> -r requirements.txt
"""

import pathlib
import platform
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
tag = f"{platform.system().lower()}-{platform.machine().lower()}-py{sys.version_info.major}{sys.version_info.minor}"
target = ROOT / "wheelhouse" / tag
target.mkdir(parents=True, exist_ok=True)

subprocess.run(
    [sys.executable, "-m", "pip", "download", "--dest", str(target),
     "-r", str(ROOT / "requirements.txt"), "pip", "setuptools", "wheel"],
    check=True,
)
files = list(target.iterdir())
size = sum(f.stat().st_size for f in files) / 1e6
print(f"\n{len(files)} files, {size:.0f} MB in {target}")
