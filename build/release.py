#!/usr/bin/env python3
"""Create signed, content-addressed releases with reusable binary blocks."""
import argparse
import gzip
import hashlib
import pathlib
import shutil
import subprocess

BLOCK = 1048576
GEAR = [int.from_bytes(hashlib.sha256(bytes([i])).digest()[:8], 'little') for i in range(256)]

def blocks(data):
    start = rolling = 0
    for i, byte in enumerate(data):
        rolling = ((rolling << 1) + GEAR[byte]) & ((1 << 64) - 1)
        size = i + 1 - start
        if i + 1 == len(data) or (size >= 65536 and (rolling & 262143 == 0 or size >= BLOCK)):
            yield data[start:i + 1]
            start, rolling = i + 1, 0

def sha(data):
    return hashlib.sha256(data).hexdigest()

def make_release(root, binary, out, arch, version, key, component='all'):
    out.mkdir(parents=True, exist_ok=True)
    chunks = out
    chunks.mkdir(exist_ok=True)
    files = {p.relative_to(root).as_posix(): p for p in root.rglob('*') if p.is_file()}
    files['usr/bin/ffvpn-core'] = binary
    if component == 'core':
        files = {'usr/bin/ffvpn-core': binary, 'usr/share/ffvpn/core-version': root / 'usr/share/ffvpn/core-version'}
    elif component == 'app':
        files.pop('usr/bin/ffvpn-core')
        files.pop('usr/share/ffvpn/core-version', None)
    records = [f'FFVPN 1 {version} {arch}']
    for name, path in sorted(files.items()):
        if name == 'etc/config/ffvpn':
            continue
        data = path.read_bytes()
        mode = '755' if name.startswith(('usr/libexec/', 'etc/init.d/')) or name == 'usr/bin/ffvpn-core' else '644'
        records.append(f'F {sha(data)} {mode} {len(data)} {name}')
        for block in blocks(data):
            digest = sha(block)
            dest = chunks / f'{digest}.gz'
            if not dest.exists():
                dest.write_bytes(gzip.compress(block, compresslevel=9, mtime=0))
            records.append(f'B {digest} {len(block)}')
    suffix = '' if component == 'all' else f'.{component}'
    manifest = out / f'{arch}{suffix}.manifest'
    manifest.write_text('\n'.join(records) + '\n', encoding='utf-8')
    if key:
        subprocess.run(['usign', '-S', '-m', str(manifest), '-s', str(key), '-x', str(manifest) + '.sig'], check=True)

if __name__ == '__main__':
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
    signing.add_argument('--manifest-only', action='store_true', help='Create files for offline signing; not a publishable release')
    a = p.parse_args()
    for component in ('all', 'app', 'core'):
        version = a.core_version if component == 'core' else a.version
        make_release(a.root, a.binary, a.out, a.arch, version, a.key, component)
