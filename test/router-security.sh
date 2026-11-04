#!/bin/sh
set -eu
UPDATE=${1:?Updater path}
ROOT=${2:?Isolated install root}
RELEASE=${3:?Local release directory}
ARCH=${4:?Architecture}
KEY=${5:?Public key}
export FFVPN_ROOT="$ROOT" FFVPN_RELEASE_BASE=http://127.0.0.1:18089 FFVPN_ARCH="$ARCH" FFVPN_KEY="$KEY"
manifest="$RELEASE/$ARCH.core.manifest"
cp "$manifest.sig" "$manifest.sig.saved"
cp "$ROOT/usr/bin/ffvpn-core" "$ROOT/core.saved"
block=''
cleanup() {
	cp "$manifest.sig.saved" "$manifest.sig"
	rm -f "$manifest.sig.saved"
	if [ -n "$block" ]; then cp "$block.saved" "$block"; rm -f "$block.saved"; fi
	mv "$ROOT/core.saved" "$ROOT/usr/bin/ffvpn-core"
}
trap cleanup EXIT
printf 'invalid signature\n' > "$manifest.sig"
if sh "$UPDATE" check core; then echo 'FAIL: accepted invalid signature'; exit 1; fi
echo 'PASS: invalid release signature rejected'
cp "$manifest.sig.saved" "$manifest.sig"
hash=$(awk '$1 == "B" {print $2; exit}' "$manifest")
block="$RELEASE/$hash.gz"
cp "$block" "$block.saved"
printf 'not a compressed block\n' > "$block"
rm "$ROOT/usr/bin/ffvpn-core"
if sh "$UPDATE" update core; then echo 'FAIL: accepted corrupted block'; exit 1; fi
[ ! -f "$ROOT/usr/bin/ffvpn-core" ]
echo 'PASS: corrupted block rejected before installation'
