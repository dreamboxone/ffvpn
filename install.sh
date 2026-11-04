#!/bin/sh
# SPDX-License-Identifier: AGPL-3.0-or-later
set -eu
umask 077
BASE=https://raw.githubusercontent.com/dreamboxone/ffvpn/main
[ "$(id -u)" = 0 ] || { echo 'Run this installer as root on OpenWrt.'; exit 1; }
[ -f /etc/openwrt_release ] || { echo 'This installer requires OpenWrt.'; exit 1; }
. /etc/openwrt_release
case "$DISTRIB_RELEASE" in 23.05*|24.10*|25.12*) ;; *) echo "Unsupported OpenWrt release: $DISTRIB_RELEASE"; exit 1;; esac

dependencies() {
	if command -v apk >/dev/null 2>&1; then
		apk update
		apk add curl usign luci-base rpcd jsonfilter
	elif command -v opkg >/dev/null 2>&1; then
		opkg update
		opkg install curl usign luci-base rpcd jsonfilter
	else echo 'No supported package manager.'; exit 1; fi
}

install_ffvpn() {
	dependencies
	stage=$(mktemp -d /tmp/ffvpn-install.XXXXXX)
	trap 'rm -r "$stage"' EXIT
	curl -fLsS --connect-timeout 15 --max-time 60 "$BASE/files/usr/libexec/ffvpn/update" -o "$stage/update"
	cat > "$stage/release.pub" <<'KEY'
untrusted comment: ffvpn
RWTXQN/NwokloOBG6TQE/EL2CYV80UKvFwJH6a/inhMgaQ0GxhvfACoj
KEY
	# The public key is pinned here; a release cannot replace its own trust root.
	FFVPN_KEY="$stage/release.pub" sh "$stage/update" update
	if [ ! -f /etc/config/ffvpn ]; then
		printf "config ffvpn 'main'\n\toption enabled '0'\n\toption integration 'auto'\n\toption core_dir '/usr/bin'\n" > /etc/config/ffvpn
	fi
	/etc/init.d/ffvpn enable
	/etc/init.d/ffvpn restart
	echo 'Open LuCI → Services → ffvpn. Add a Mozilla account before enabling routing.'
}

remove_ffvpn() {
	[ -f /usr/share/ffvpn/installed.manifest ] || { echo 'ffvpn is not installed.'; return; }
	printf 'Remove ffvpn? Account data will be kept. [y/N] '
	read -r answer
	case "$answer" in y|Y) ;; *) return;; esac
	/etc/init.d/ffvpn stop
	/etc/init.d/ffvpn disable
	core_dir=$(uci -q get ffvpn.main.core_dir || echo /usr/bin)
	case "$core_dir" in *..*|*[!a-zA-Z0-9_./-]*) echo 'Invalid core directory.'; exit 1;; esac
	case "$core_dir" in /usr/*|/opt/*|/mnt/*|/overlay/*|/tmp/*) ;; *) exit 1;; esac
	# Only remove files owned by the signed installed manifest.
	if [ -f /usr/share/ffvpn/managed-files ]; then cp /usr/share/ffvpn/managed-files /tmp/ffvpn-remove-files
	else awk '$1 == "F" {print $5}' /usr/share/ffvpn/installed.manifest > /tmp/ffvpn-remove-files; fi
	while IFS= read -r path; do
		if [ "$path" = usr/bin/ffvpn-core ]; then rm -f "$core_dir/ffvpn-core" /usr/bin/ffvpn-core; continue; fi
		case "$path" in *..*|/*|*[!a-zA-Z0-9_./-]*) echo 'Invalid installed manifest.'; exit 1;; esac
		case "$path" in usr/bin/ffvpn-core|etc/init.d/ffvpn|usr/libexec/ffvpn/*|usr/libexec/rpcd/luci.ffvpn|usr/share/ffvpn/*|usr/share/licenses/ffvpn/*|usr/share/luci/menu.d/luci-app-ffvpn.json|usr/share/rpcd/acl.d/luci-app-ffvpn.json|www/luci-static/resources/ffvpn/*|www/luci-static/resources/view/ffvpn/*) rm -f "/$path";; *) exit 1;; esac
	done < /tmp/ffvpn-remove-files
	rm -f /usr/share/ffvpn/installed.manifest /usr/share/ffvpn/installed.app.manifest /usr/share/ffvpn/installed.core.manifest /usr/share/ffvpn/managed-files /usr/share/ffvpn/version /etc/config/ffvpn /tmp/ffvpn-remove-files
	/etc/init.d/rpcd restart
	rm -f /tmp/luci-indexcache
	/etc/init.d/uhttpd reload
	echo 'Removed. Account data remains in /etc/ffvpn/core.'
}

while :; do
	printf '\nffvpn · OpenWrt %s\n1) Install\n2) Update\n3) Remove\n0) Exit\n> ' "$DISTRIB_RELEASE"
	read -r choice || exit 0
	case "$choice" in
		1) install_ffvpn;;
		2) if [ -x /usr/libexec/ffvpn/update ]; then /usr/libexec/ffvpn/update update; else echo 'Install ffvpn first.'; fi;;
		3) remove_ffvpn;;
		0) exit 0;;
		*) echo 'Choose 0, 1, 2 or 3.';;
	esac
done
