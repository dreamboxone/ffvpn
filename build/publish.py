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
import tarfile

p = argparse.ArgumentParser()
p.add_argument('--assets', type=pathlib.Path, required=True)
p.add_argument('--usign', required=True)
p.add_argument('--key', type=pathlib.Path, required=True)
p.add_argument('--apk', required=True)
a = p.parse_args()
version = pathlib.Path('VERSION').read_text().strip()
core_version = pathlib.Path('CORE_VERSION').read_text().strip()
architectures = json.loads(pathlib.Path('build/architectures.json').read_text())
expected = {arch + suffix + '.manifest' for arch in architectures for suffix in ('',)}
assert {m.name for m in a.assets.glob('*.manifest')} == expected, 'Architecture manifest set differs'
for name in sorted(expected):
    manifest = a.assets / name
    lines = manifest.read_text().splitlines()
    assert lines[0] == 'FFVPN 2 ' + version + ' ' + name.split('.')[0] + ' ' + core_version
    fields = lines[1].split()
    assert fields[0] == 'A' and pathlib.Path(fields[3]).name == fields[3]
    archive = a.assets / fields[3]
    assert archive.stat().st_size == int(fields[2])
    assert hashlib.sha256(archive.read_bytes()).hexdigest() == fields[1]
    with tarfile.open(archive, 'r:gz') as tar:
        for line in lines[2:]:
            fields = line.split()
            assert fields[0] == 'F'
            member = tar.getmember(fields[4])
            assert member.isfile()
            data = tar.extractfile(member).read()
            assert len(data) == int(fields[3])
            assert hashlib.sha256(data).hexdigest() == fields[1]
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
