#!/usr/bin/env python3
"""Check revision ordering in LuCI, the updater, and native packages."""
import json
import os
import pathlib
import re
import subprocess
import tempfile

root = pathlib.Path(__file__).resolve().parents[1]
cases = [
    ('5.8.20-r1', '5.8.20', 1),
    ('5.8.20-r2', '5.8.20-r1', 1),
    ('5.8.20-r10', '5.8.20-r2', 1),
    ('5.8.20-r1', '5.8.20-r2', -1),
    ('5.8.20', '5.8.20-r1', -1),
    ('5.8.20-r1', '5.8.20-r1', 0),
    ('5.8.21', '5.8.20-r99', 1),
    ('5.9.0', '5.8.20-r99', 1),
    ('6.0.0', '5.99.99-r99', 1),
    ('5.8.20-r1', '1.0.3', 1),
    ('1.0.18', '1.0.17', 1),
    ('1.0.17', '1.0.18', -1),
    ('1.0.18', '1.0.18', 0),
]
invalid = ['5.8.20-r0', '5.8.20-r01', '5.8.20-r', '5.8.20-r-1',
           '5.8.20.1', '5.8.20-r1-extra', 'v5.8.20-r1', '5.8']
source = (root/'files/www/luci-static/resources/view/ffvpn/panel-5820-r1.js').read_text()
compare = source[source.index('function compareVersions('):source.index('function note(')]
subprocess.run(['node', '-e', compare + '''
const assert = require('node:assert/strict');
for (const [candidate, installed, order] of ''' + json.dumps(cases) + ''') {
 assert.equal(compareVersions(candidate, installed), order, candidate + ' vs ' + installed);
}
for (const value of ''' + json.dumps(invalid) + ''') {
 assert.equal(compareVersions(value, '5.8.20-r1'), null);
 assert.equal(compareVersions('5.8.20-r1', value), null);
}
'''], check=True)

updater = (root/'files/usr/libexec/ffvpn/update').read_text()
functions = updater[updater.index('is_release_version() {'):updater.index('finish_file() {')]
with tempfile.TemporaryDirectory(prefix='ffvpn-version-test-') as directory:
    metadata = pathlib.Path(directory)/'usr/share/ffvpn'
    metadata.mkdir(parents=True)
    env = dict(os.environ, ROOT=directory)
    for candidate, installed, order in cases:
        (metadata/'version').write_text(installed + '\n')
        result = subprocess.run(['sh', '-s', '--', candidate, installed],
                                input=functions + '\nis_release_version "$1" && is_release_version "$2" && refuse_downgrade version "$1"\n',
                                text=True, capture_output=True, env=env)
        assert result.returncode == (1 if order == -1 else 0), (candidate, installed, result.stderr)
    for value in invalid:
        result = subprocess.run(['sh', '-s', '--', value],
                                input=functions + '\nis_release_version "$1"\n', text=True, env=env)
        assert result.returncode != 0, value

native = (root/'build/native.py').read_text()
package_versions = native[native.index('match = re.fullmatch'):native.index('\ndependencies =')]
for value, ipk, apk in [('5.8.20-r1', '5.8.20-1', '5.8.20-r1'),
                        ('5.8.20-r12', '5.8.20-12', '5.8.20-r12'),
                        ('1.0.3', '1.0.3-1', '1.0.3-r1')]:
    scope = {'re': re, 'version': value}
    exec(package_versions, scope)
    assert (scope['ipk_version'], scope['apk_version']) == (ipk, apk)
print('Revision ordering and package version checks passed')
