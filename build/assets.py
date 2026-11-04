#!/usr/bin/env python3
"""Restore the exact logo bytes from the source asset blocks."""
import base64
import hashlib
import pathlib

def restore_logo():
    root=pathlib.Path(__file__).resolve().parents[1]
    target=root/'files/www/luci-static/resources/ffvpn/logo.png'
    expected=(root/'assets/logo.sha256').read_text().strip()
    if target.exists() and hashlib.sha256(target.read_bytes()).hexdigest()==expected:
        return
    data=b''.join(base64.b64decode(p.read_text(),validate=True) for p in sorted((root/'assets/logo').glob('*.b64')))
    if hashlib.sha256(data).hexdigest()!=expected:
        raise ValueError('Logo source blocks failed integrity validation')
    target.parent.mkdir(parents=True,exist_ok=True)
    target.write_bytes(data)

if __name__=='__main__':
    restore_logo()
