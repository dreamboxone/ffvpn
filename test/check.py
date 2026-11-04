#!/usr/bin/env python3
"""Check portable scripts, translations, and release metadata."""
import json
import pathlib
import subprocess

root = pathlib.Path(__file__).resolve().parents[1]
subprocess.run(['python3',str(root/'build/assets.py')],check=True)
for path in [root/'install.sh', root/'test/network.sh', *list((root/'files/usr/libexec/ffvpn').glob('*')), root/'files/usr/libexec/rpcd/luci.ffvpn', root/'files/etc/init.d/ffvpn']:
    subprocess.run(['sh', '-n', str(path)], check=True)
for path in (root/'files').rglob('*.json'):
    json.loads(path.read_text())
for path in (root/'files').rglob('*.js'):
    subprocess.run(['node', '--check', str(path)], check=True)
assert (root/'CORE_VERSION').read_text().strip() == (root/'files/usr/share/ffvpn/core-version').read_text().strip()
for lang in ('en','zh','ru'):
    assert (root/f'README.{lang}.md').is_file()
subprocess.run(['shellcheck', '-S', 'error', str(root/'install.sh'), *map(str,(root/'files/usr/libexec/ffvpn').glob('*')),str(root/'files/usr/libexec/rpcd/luci.ffvpn')],check=True)
print('Portable checks passed')
