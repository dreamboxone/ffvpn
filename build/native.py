#!/usr/bin/env python3
"""Package verified release files as integrated OpenWrt IPK and APK packages."""
import argparse
import gzip
import hashlib
import io
import json
import os
import pathlib
import shutil
import subprocess
import tarfile
import tempfile

p = argparse.ArgumentParser()
p.add_argument('--assets', type=pathlib.Path, required=True)
p.add_argument('--apk', required=True)
a = p.parse_args()
version = pathlib.Path('VERSION').read_text().strip()
dependencies = ['curl', 'usign', 'luci-base', 'rpcd', 'jsonfilter', 'nftables-json']
postinst = '''#!/bin/sh
[ -z "${IPKG_INSTROOT:-}" ] || exit 0
/etc/init.d/ffvpn enable
/etc/init.d/ffvpn restart
/etc/init.d/rpcd restart
rm -f /tmp/luci-indexcache
/etc/init.d/uhttpd reload
exit 0
'''
prerm = '''#!/bin/sh
[ -z "${IPKG_INSTROOT:-}" ] || exit 0
/etc/init.d/ffvpn stop
/etc/init.d/ffvpn disable
exit 0
'''
postrm = '''#!/bin/sh
[ -z "${IPKG_INSTROOT:-}" ] || exit 0
/etc/init.d/rpcd restart
rm -f /tmp/luci-indexcache
/etc/init.d/uhttpd reload
exit 0
'''


def tar_bytes(root):
    stream = io.BytesIO()
    with tarfile.open(fileobj=stream, mode='w') as tar:
        for path in sorted(root.rglob('*')):
            info = tar.gettarinfo(str(path), './' + path.relative_to(root).as_posix())
            info.uid = info.gid = 0
            info.uname = info.gname = 'root'
            info.mtime = 0
            if path.is_file():
                with path.open('rb') as data:
                    tar.addfile(info, data)
            else:
                tar.addfile(info)
    return gzip.compress(stream.getvalue(), mtime=0)


for arch in json.loads(pathlib.Path('build/architectures.json').read_text()):
    with tempfile.TemporaryDirectory(prefix='ffvpn-package-') as temp:
        work = pathlib.Path(temp)
        root = work / 'root'
        root.mkdir()
        manifest = a.assets / (arch + '.manifest')
        lines = manifest.read_text().splitlines()
        current = None
        data = bytearray()
        managed = []

        def finish():
            if current:
                assert len(data) == int(current[3])
                assert hashlib.sha256(data).hexdigest() == current[1]
                name = pathlib.PurePosixPath(current[4])
                assert not name.is_absolute() and '..' not in name.parts
                dest = root / name
                dest.parent.mkdir(parents=True, exist_ok=True)
                dest.write_bytes(data)
                dest.chmod(int(current[2], 8))
                managed.append(name.as_posix())

        for line in lines[1:]:
            fields = line.split()
            if fields[0] == 'F':
                finish()
                current, data = fields, bytearray()
            elif fields[0] == 'B':
                block = gzip.decompress((a.assets / (fields[1] + '.gz')).read_bytes())
                assert hashlib.sha256(block).hexdigest() == fields[1]
                data.extend(block)
        finish()
        (root / 'etc/config').mkdir(parents=True, exist_ok=True)
        shutil.copyfile('files/etc/config/ffvpn', root / 'etc/config/ffvpn')
        metadata = root / 'usr/share/ffvpn'
        shutil.copyfile(manifest, metadata / 'installed.manifest')
        (metadata / 'managed-files').write_text('\n'.join(managed) + '\n')
        control = work / 'control'
        control.mkdir()
        size = sum(f.stat().st_size for f in root.rglob('*') if f.is_file())
        (control / 'control').write_text(
            f'Package: ffvpn\nVersion: {version}-1\nArchitecture: {arch}\n'
            f'Depends: {", ".join(dependencies)}\nInstalled-Size: {size}\n'
            'Section: net\nLicense: AGPL-3.0-or-later AND GPL-3.0-only\n'
            'Maintainer: dreamboxone\nURL: https://github.com/dreamboxone/ffvpn\n'
            'Description: Firefox VPN client with integrated LuCI interface\n')
        (control / 'conffiles').write_text('/etc/config/ffvpn\n')
        for name, script in [('postinst', postinst), ('prerm', prerm), ('postrm', postrm)]:
            (control / name).write_text(script)
            (control / name).chmod(0o755)
        ipk = a.assets / f'ffvpn_{version}-1_{arch}.ipk'
        with tarfile.open(ipk, mode='w:gz') as tar:
            for name, content in [('debian-binary', b'2.0\n'),
                                  ('control.tar.gz', tar_bytes(control)),
                                  ('data.tar.gz', tar_bytes(root))]:
                info = tarfile.TarInfo('./' + name)
                info.size = len(content)
                info.mode = 0o644
                tar.addfile(info, io.BytesIO(content))
        apkmeta = root / 'lib/apk/packages'
        apkmeta.mkdir(parents=True)
        (apkmeta / 'ffvpn.conffiles').write_text('/etc/config/ffvpn\n')
        config_hash = hashlib.sha256((root / 'etc/config/ffvpn').read_bytes()).hexdigest()
        (apkmeta / 'ffvpn.conffiles_static').write_text('/etc/config/ffvpn ' + config_hash + '\n')
        names = sorted('/' + f.relative_to(root).as_posix() for f in root.rglob('*') if f.is_file())
        (apkmeta / 'ffvpn.list').write_text('\n'.join(names) + '\n')
        apk = a.assets / f'ffvpn-{version}-r1-{arch}.apk'
        command = [a.apk, 'mkpkg', '--info', 'name:ffvpn', '--info', f'version:{version}-r1',
                   '--info', f'arch:{arch}', '--info', 'description:Firefox VPN with integrated LuCI',
                   '--info', 'license:AGPL-3.0-or-later AND GPL-3.0-only',
                   '--info', 'url:https://github.com/dreamboxone/ffvpn',
                   '--info', 'maintainer:dreamboxone', '--info', 'depends:' + ' '.join(dependencies),
                   '--script', 'post-install:' + str(control / 'postinst'),
                   '--script', 'post-upgrade:' + str(control / 'postinst'),
                   '--script', 'pre-deinstall:' + str(control / 'prerm'),
                   '--script', 'post-deinstall:' + str(control / 'postrm'),
                   '--files', str(root), '--output', str(apk)]
        subprocess.run(command, check=True, env={**os.environ, 'SOURCE_DATE_EPOCH': '0'})
        subprocess.run([a.apk, 'adbdump', str(apk)], check=True, stdout=subprocess.DEVNULL)
        print('Packaged', arch, flush=True)
