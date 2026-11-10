#!/usr/bin/env python3
"""Build complete architecture archives with signed file manifests."""
import argparse
import gzip
import hashlib
import io
import pathlib
import subprocess
import tarfile
import zipfile
from assets import restore_logo

restore_logo()
p = argparse.ArgumentParser()
p.add_argument('--root', type=pathlib.Path, default=pathlib.Path('files'))
p.add_argument('--binary', type=pathlib.Path, required=True)
p.add_argument('--out', type=pathlib.Path, default=pathlib.Path('dist'))
p.add_argument('--arch', required=True)
p.add_argument('--version', default=pathlib.Path('VERSION').read_text().strip())
p.add_argument('--core-version', default=pathlib.Path('CORE_VERSION').read_text().strip())
signing = p.add_mutually_exclusive_group(required=True)
signing.add_argument('--key', type=pathlib.Path)
signing.add_argument('--manifest-only', action='store_true')
a = p.parse_args()
a.out.mkdir(parents=True, exist_ok=True)
files = {f.relative_to(a.root).as_posix(): f for f in a.root.rglob('*') if f.is_file()}
files.pop('etc/config/ffvpn', None)
files['usr/bin/ffvpn-core'] = a.binary
extension = io.BytesIO()
with zipfile.ZipFile(extension, mode='w') as z:
    for name in ('manifest.json', 'mozilla.js', 'worker.js'):
        source = pathlib.Path('browser-signin') / name
        z.writestr(zipfile.ZipInfo('ffvpn-browser-signin/' + name), source.read_bytes())
    z.writestr(zipfile.ZipInfo('ffvpn-browser-signin/LICENSE'), pathlib.Path('LICENSE').read_bytes())
extension_path = 'www/luci-static/resources/ffvpn/browser-signin.zip'
files[extension_path] = None
records = [f'FFVPN 2 {a.version} {a.arch} {a.core_version}']
stream = io.BytesIO()
with tarfile.open(fileobj=stream, mode='w') as tar:
    for name, source in sorted(files.items()):
        data = extension.getvalue() if name == extension_path else source.read_bytes()
        mode = 0o755 if name.startswith(('usr/libexec/', 'etc/init.d/')) or name == 'usr/bin/ffvpn-core' else 0o644
        info = tarfile.TarInfo(name)
        info.mode, info.size = mode, len(data)
        info.uid = info.gid = 0
        tar.addfile(info, io.BytesIO(data))
        records.append(f'F {hashlib.sha256(data).hexdigest()} {mode:o} {len(data)} {name}')
archive = a.out / f'ffvpn-{a.version}-{a.arch}.tar.gz'
data = gzip.compress(stream.getvalue(), compresslevel=9, mtime=0)
archive.write_bytes(data)
records.insert(1, f'A {hashlib.sha256(data).hexdigest()} {len(data)} {archive.name}')
manifest = a.out / f'{a.arch}.manifest'
manifest.write_text('\n'.join(records) + '\n')
if a.key:
    subprocess.run(['usign', '-S', '-m', str(manifest), '-s', str(a.key), '-x', str(manifest) + '.sig'], check=True)
