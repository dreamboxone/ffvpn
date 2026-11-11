#!/bin/sh
set -eu
arch=${1:?OpenWrt architecture required}
out=${2:-dist/ffvpn-core}
case "$arch" in
	aarch64_*) GOARCH=arm64;;
	arm_arm926ej-s|arm_xscale) GOARCH=arm; GOARM=5;;
	arm_arm1176jzf-s_vfp) GOARCH=arm; GOARM=6;;
	arm_cortex-*) GOARCH=arm; GOARM=7;;
	mipsel_*) GOARCH=mipsle; GOMIPS=softfloat;;
	mips64el_*) GOARCH=mips64le; GOMIPS64=softfloat;;
	mips64_*) GOARCH=mips64; GOMIPS64=softfloat;;
	mips_*) GOARCH=mips; GOMIPS=softfloat;;
	x86_64) GOARCH=amd64; GOAMD64=v1;;
	i386_pentium4) GOARCH=386; GO386=softfloat;;
	riscv64_*) GOARCH=riscv64;;
	loongarch64_*) GOARCH=loong64;;
	*) echo "Unsupported architecture: $arch" >&2; exit 1;;
esac
export GOARCH GOARM GOMIPS GOMIPS64 GOAMD64 GO386
export GOOS=linux CGO_ENABLED=0
version=$(cat CORE_VERSION)
mkdir -p "$(dirname "$out")"
out=$(realpath -m "$out")
cd core
go build -tags with_gvisor -trimpath -buildvcs=false -ldflags "-s -w -X github.com/armanlife/firefox-vpn-client/core/internal/version.Current=$version" -o "$out" ./cmd/ffvpn
