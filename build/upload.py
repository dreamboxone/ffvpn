#!/usr/bin/env python3
"""Resume draft uploads with bounded retries and GitHub rate-limit backoff."""
import argparse
import hashlib
import json
import os
import pathlib
import time
import urllib.error
import urllib.parse
import urllib.request

p = argparse.ArgumentParser()
p.add_argument('--assets', type=pathlib.Path, required=True)
a = p.parse_args()
repo = os.environ['GH_REPO']
base = 'https://api.github.com/repos/' + repo
headers = {'Authorization': 'Bearer ' + os.environ['GH_TOKEN'],
           'Accept': 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28'}


def request(method, url, value=None, binary=False):
    payload = value if binary else json.dumps(value).encode() if value is not None else None
    request_headers = {**headers, 'Content-Type': 'application/octet-stream' if binary else 'application/json'}
    for attempt in range(12):
        req = urllib.request.Request(url, data=payload, headers=request_headers, method=method)
        try:
            with urllib.request.urlopen(req, timeout=240) as response:
                data = response.read()
                return json.loads(data) if data else None
        except urllib.error.HTTPError as error:
            text = error.read().decode(errors='replace')
            limited = error.code == 429 or error.code == 403 and 'rate limit' in text.lower()
            if not limited and error.code < 500:
                raise RuntimeError(f'GitHub HTTP {error.code}: {text}') from None
            delay = max(60, int(error.headers.get('Retry-After', '60'))) if limited else min(60, 2 ** attempt)
            if error.headers.get('X-RateLimit-Remaining') == '0':
                delay = max(delay, int(error.headers.get('X-RateLimit-Reset', '0')) - int(time.time()) + 2)
            print(f'GitHub requested a retry; waiting {delay} seconds', flush=True)
            time.sleep(delay)
        except (urllib.error.URLError, TimeoutError, ConnectionError) as error:
            delay = min(60, 2 ** attempt)
            print(f'Upload connection interrupted; retrying in {delay} seconds', flush=True)
            time.sleep(delay)
    raise RuntimeError('GitHub request retry limit reached')


version = pathlib.Path('VERSION').read_text().strip()
tag = 'v' + version
ref = os.environ['GITHUB_REF']
if ref.startswith('refs/tags/'):
    assert ref == 'refs/tags/' + tag, 'Tag and VERSION differ'
releases = request('GET', base + '/releases?per_page=100')
release = next((r for r in releases if r['tag_name'] == tag), None)
notes = '\n'.join(line for line in pathlib.Path('docs/RELEASE.md').read_text().splitlines()
                  if not line.startswith('Build:'))
notes += '\n\nBuild and release: https://github.com/' + repo + '/actions/runs/' + os.environ['GITHUB_RUN_ID'] + '\n'
if release:
    assert release['draft'], 'Release already published; use a new version'
    request('PATCH', base + '/releases/' + str(release['id']),
            {'target_commitish': os.environ['GITHUB_SHA'], 'body': notes})
else:
    release = request('POST', base + '/releases',
                      {'tag_name': tag, 'target_commitish': os.environ['GITHUB_SHA'],
                       'name': 'ffvpn ' + version, 'body': notes, 'draft': True, 'prerelease': False})
release_url = base + '/releases/' + str(release['id'])


def assets():
    result = {}
    for page in range(1, 100):
        batch = request('GET', release_url + f'/assets?per_page=100&page={page}')
        result.update({item['name']: item for item in batch})
        if len(batch) < 100:
            return result
    raise RuntimeError('Unexpected asset count')


remote = assets()
files = sorted(f for f in a.assets.iterdir() if f.is_file())
expected = {}
for index, path in enumerate(files, 1):
    data = path.read_bytes()
    digest = 'sha256:' + hashlib.sha256(data).hexdigest()
    expected[path.name] = (len(data), digest)
    item = remote.get(path.name)
    if item and item.get('digest') == digest and item['size'] == len(data):
        print(f'[{index}/{len(files)}] Reused {path.name}', flush=True)
        continue
    if item:
        request('DELETE', base + '/releases/assets/' + str(item['id']))
    upload = release['upload_url'].split('{')[0] + '?name=' + urllib.parse.quote(path.name)
    request('POST', upload, data, binary=True)
    print(f'[{index}/{len(files)}] Uploaded {path.name}', flush=True)
    time.sleep(1.25)
remote = assets()
for name, (size, digest) in expected.items():
    item = remote.get(name)
    assert item and item['size'] == size and item.get('digest') == digest, 'Asset validation failed: ' + name
request('PATCH', release_url, {'draft': False, 'make_latest': 'true', 'body': notes})
print('Published https://github.com/' + repo + '/releases/tag/' + tag, flush=True)
