#!/usr/bin/env python3
"""Check that publisher and installed core agree on content-defined boundaries."""
import hashlib
import importlib.util
import pathlib
import random
import subprocess
import sys
import tempfile

spec = importlib.util.spec_from_file_location('release',pathlib.Path(__file__).resolve().parents[1]/'build/release.py')
release = importlib.util.module_from_spec(spec)
spec.loader.exec_module(release)
with tempfile.TemporaryDirectory() as d:
    root=pathlib.Path(d)
    data=random.Random(42).randbytes(2<<20)
    source=root/'source'
    source.write_bytes(data)
    subprocess.run([sys.argv[1],'-chunk-file',str(source),'-chunk-dir',str(root/'blocks')],check=True)
    expected={hashlib.sha256(b).hexdigest():b for b in release.blocks(data)}
    actual={p.name:p.read_bytes() for p in (root/'blocks').iterdir()}
    assert actual==expected, 'Publisher and core chunk boundaries differ'
print('Publisher/core block compatibility passed')
