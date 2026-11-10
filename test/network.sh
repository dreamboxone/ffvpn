#!/bin/sh
# Run with the real OpenWrt UCI tool, using an isolated configuration directory.
set -eu
SOURCE=${1:?Path to network helper}
TEST=$(mktemp -d /tmp/ffvpn-network-test.XXXXXX)
trap 'if [ "${FFVPN_KEEP_TEST:-0}" != 1 ]; then rm -r "$TEST"; else echo "$TEST"; fi' EXIT
mkdir -p "$TEST/bin" "$TEST/config" "$TEST/delta" "$TEST/override" "$TEST/init" "$TEST/state"
REAL_UCI=$(command -v uci)
cat > "$TEST/bin/uci" <<EOF
#!/bin/sh
exec "$REAL_UCI" -c "$TEST/config" -t "$TEST/delta" "\$@"
EOF
chmod +x "$TEST/bin/uci"
cat > "$TEST/init/zirgozar" <<'EOF'
#!/bin/sh
exit 0
EOF
cp "$TEST/init/zirgozar" "$TEST/init/passwall2"
chmod +x "$TEST/init/"*
export PATH="$TEST/bin:$PATH" FFVPN_STATE="$TEST/state" FFVPN_INIT="$TEST/init"
cat > "$TEST/config/ffvpn" <<'EOF'
config ffvpn main
 option integration auto
EOF
cat > "$TEST/config/zirgozar" <<'EOF'
config zirgozar config
 option enabled 1
 option node original
 option localhost_proxy 1
EOF
cat > "$TEST/config/passwall2" <<'EOF'
config global
 option enabled 1
 option node original_pw
 option localhost_proxy 1
 option remote_dns_protocol tcp
EOF
uci export zirgozar > "$TEST/zirgozar.before"
uci export passwall2 > "$TEST/passwall2.before"
sh "$SOURCE" apply
[ "$(uci get zirgozar.config.node)" = ffvpn_local ]
[ "$(uci get zirgozar.config.localhost_proxy)" = 0 ]
[ "$(uci get 'passwall2.@global[0].enabled')" = 0 ]
sh "$SOURCE" apply
sh "$SOURCE" restore
uci export zirgozar > "$TEST/zirgozar.after"
uci export passwall2 > "$TEST/passwall2.after"
cmp "$TEST/zirgozar.before" "$TEST/zirgozar.after"
cmp "$TEST/passwall2.before" "$TEST/passwall2.after"
echo 'PASS: apply, repeated apply, exact restore of both routing engines'
sh "$SOURCE" apply
uci set zirgozar.config.node=user_changed
uci commit zirgozar
sh "$SOURCE" restore
[ "$(uci get zirgozar.config.node)" = user_changed ]
echo 'PASS: preserve later user edits'
uci set ffvpn.main.integration=passwall2
uci commit ffvpn
sh "$SOURCE" apply
[ "$(uci get 'passwall2.@global[0].node')" = ffvpn_local ]
[ "$(uci get 'passwall2.@global[0].remote_dns_protocol')" = doh ]
[ "$(uci get zirgozar.config.enabled)" = 0 ]
sh "$SOURCE" restore
uci export passwall2 > "$TEST/passwall2.after"
cmp "$TEST/passwall2.before" "$TEST/passwall2.after"
echo 'PASS: PassWall2 selection and DNS restore'
uci set zirgozar.config.node=unsaved
if sh "$SOURCE" apply; then echo 'FAIL: accepted unsaved edits'; exit 1; fi
[ "$(uci get zirgozar.config.node)" = unsaved ]
uci revert zirgozar
echo 'PASS: refuse unsaved edits'
cat > "$TEST/init/passwall2" <<EOF
#!/bin/sh
if [ -f "$TEST/fail-once" ]; then rm "$TEST/fail-once"; exit 1; fi
exit 0
EOF
touch "$TEST/fail-once"
uci export passwall2 > "$TEST/restart.before"
if sh "$SOURCE" apply; then echo 'FAIL: ignored restart failure'; exit 1; fi
uci export passwall2 > "$TEST/restart.after"
cmp "$TEST/restart.before" "$TEST/restart.after"
[ ! -f "$TEST/state/target" ]
echo 'PASS: failed activation rolls back routing settings'

cat > "$TEST/config/firewall" <<'EOF'
config zone lan
 option name lan
EOF
cp "$TEST/init/zirgozar" "$TEST/init/firewall"
cat > "$TEST/init/ffvpn-tun" <<EOF
#!/bin/sh
case "\$1" in
 start) [ ! -f "$TEST/tun-fail" ] && touch "$TEST/tun-running";;
 stop) rm -f "$TEST/tun-running";;
esac
EOF
chmod +x "$TEST/init/firewall" "$TEST/init/ffvpn-tun"
export FFVPN_TUN_SERVICE="$TEST/init/ffvpn-tun"
uci set ffvpn.main.integration=tun
uci commit ffvpn
uci export firewall > "$TEST/firewall.before"
sh "$SOURCE" apply
[ -f "$TEST/tun-running" ]
[ "$(cat "$TEST/state/target")" = tun ]
[ "$(uci get firewall.ffvpn_tun.device)" = ffvpntun ]
[ "$(uci get firewall.ffvpn_tun_lan.src)" = lan ]
[ "$(uci get firewall.ffvpn_tun_lan.dest)" = ffvpntun ]
[ "$(uci get zirgozar.config.enabled)" = 0 ]
[ "$(uci get 'passwall2.@global[0].enabled')" = 0 ]
sh "$SOURCE" restore
[ ! -f "$TEST/tun-running" ]
uci export firewall > "$TEST/firewall.after"
cmp "$TEST/firewall.before" "$TEST/firewall.after"
echo 'PASS: standalone TUN owns only its firewall and routing changes'

touch "$TEST/tun-fail"
if sh "$SOURCE" apply; then echo 'FAIL: accepted TUN startup failure'; exit 1; fi
uci export firewall > "$TEST/firewall.after"
cmp "$TEST/firewall.before" "$TEST/firewall.after"
[ ! -f "$TEST/state/target" ]
echo 'PASS: failed TUN startup restores the firewall'
