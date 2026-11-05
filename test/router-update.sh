#!/bin/sh
# Run against a signed local release served only on router loopback.
set -eu
UPDATE=${1:?Updater path}
ROOT=${2:?Isolated install root}
BASE=${3:?Loopback release URL}
ARCH=${4:?OpenWrt architecture}
KEY=${5:?Release public key}
export FFVPN_ROOT="$ROOT" FFVPN_RELEASE_BASE="$BASE" FFVPN_ARCH="$ARCH" FFVPN_KEY="$KEY"
sh "$UPDATE" check app
sh "$UPDATE" check core
before=$(sha256sum "$ROOT/usr/bin/ffvpn-core")
sh "$UPDATE" update app
after=$(sha256sum "$ROOT/usr/bin/ffvpn-core")
[ "$before" = "$after" ]
echo 'PASS: independent application update preserves the core'
sh "$UPDATE" update core
echo 'PASS: independent core update'
sh "$UPDATE" update
downloaded=$(jsonfilter -i /tmp/ffvpn-update.stats -e '@.downloaded')
reused=$(jsonfilter -i /tmp/ffvpn-update.stats -e '@.reused')
[ "$downloaded" -gt 1048576 ]
[ "$reused" = 0 ]
echo "PASS: full archive downloaded $downloaded bytes without block reuse"
