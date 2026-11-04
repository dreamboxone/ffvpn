#!/usr/bin/env python3
"""Verify reconstructed release files and sign architecture manifests."""
import argparse
import gzip
import hashlib
import json
import pathlib
import shutil
import subprocess
import sys

p = argparse.ArgumentParser()
p.add_argument('--assets', type=pathlib.Path, required=True)
p.add_argument('--usign', required=True)
p.add_argument('--key', type=pathlib.Path, required=True)
p.add_argument('--apk', required=True)
a = p.parse_args()
version = pathlib.Path('VERSION').read_text().strip()
core_version = pathlib.Path('CORE_VERSION').read_text().strip()
architectures = json.loads(pathlib.Path('build/architectures.json').read_text())
expected = {arch + suffix + '.manifest' for arch in architectures for suffix in ('', '.app', '.core')}
assert {m.name for m in a.assets.glob('*.manifest')} == expected, 'Architecture manifest set differs'
for name in sorted(expected):
    manifest = a.assets / name
    lines = manifest.read_text().splitlines()
    expected_version = core_version if '.core.manifest' in name else version
    assert lines[0] == 'FFVPN 1 ' + expected_version + ' ' + name.split('.')[0]
    current = None
    data = bytearray()

    def verify_file():
        if current:
            assert len(data) == int(current[3]), 'File size mismatch: ' + current[4]
            assert hashlib.sha256(data).hexdigest() == current[1], 'File hash mismatch: ' + current[4]

    for line in lines[1:]:
        fields = line.split()
        if fields[0] == 'F':
            verify_file()
            current, data = fields, bytearray()
        elif fields[0] == 'B':
            block = gzip.decompress((a.assets / (fields[1] + '.gz')).read_bytes())
            assert len(block) == int(fields[2])
            assert hashlib.sha256(block).hexdigest() == fields[1]
            data.extend(block)
        else:
            raise ValueError('Unknown manifest record')
    verify_file()
    signature = str(manifest) + '.sig'
    subprocess.run([a.usign, '-S', '-m', str(manifest), '-s', str(a.key), '-x', signature], check=True)
    subprocess.run([a.usign, '-V', '-m', str(manifest), '-p', 'files/usr/share/ffvpn/release.pub', '-x', signature], check=True)
subprocess.run([sys.executable, 'build/native.py', '--assets', str(a.assets), '--apk', a.apk], check=True)
for package in sorted(a.assets.iterdir()):
    if package.suffix not in ('.ipk', '.apk'):
        continue
    signature = str(package) + '.sig'
    subprocess.run([a.usign, '-S', '-m', str(package), '-s', str(a.key), '-x', signature], check=True)
    subprocess.run([a.usign, '-V', '-m', str(package), '-p', 'files/usr/share/ffvpn/release.pub', '-x', signature], check=True)
from assets import restore_logo
restore_logo()
shutil.copyfile('files/www/luci-static/resources/ffvpn/logo.png', a.assets / 'logo.png')
shutil.copyfile('install.sh', a.assets / 'install.sh')
sums = ''.join(hashlib.sha256(f.read_bytes()).hexdigest() + '  ' + f.name + '\n'
               for f in sorted(a.assets.iterdir()) if f.is_file() and f.name != 'SHA256SUMS')
(a.assets / 'SHA256SUMS').write_text(sums)
print('Verified and signed', len(expected), 'architecture manifests')
