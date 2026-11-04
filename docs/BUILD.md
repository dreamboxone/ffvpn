# Build and publish

Use Go 1.27.2, Python 3, Node.js, ShellCheck and OpenWrt usign. The core is built without CGO.

```sh
python3 test/check.py
cd core
go test ./cmd/ffvpn ./internal/service ./internal/proxy ./internal/accounts ./internal/config ./internal/fxa
cd ..
sh build/core.sh arm_cortex-a7_neon-vfpv4 dist/ffvpn-core
python3 build/release.py --binary dist/ffvpn-core --out dist/release --arch arm_cortex-a7_neon-vfpv4 --key /private/path/release.key
```

The GitHub workflow runs only when manually dispatched after review. It tests the source and builds every architecture in `build/architectures.json`. Its artifacts are unsigned; they are not installable published releases until an authorized maintainer signs every manifest with the private key corresponding to `files/usr/share/ffvpn/release.pub`.

Keep the signing key outside the repository. For each `.manifest`, create its detached `.manifest.sig` with `usign -S`. Upload the manifests, signatures and compressed blocks to the same release. The installer pins the public key. Account data, routing state and private keys must never be included in release artifacts.

`VERSION` identifies the interface and tools. `CORE_VERSION` identifies the adapted core; update `files/usr/share/ffvpn/core-version` with it. Record upstream source changes in `UPSTREAM.json` and rebuild the core. The updater supports `check`, `update` and `reinstall` for `app`, `core` or `all`.

On a router, run the network tests against an isolated UCI directory:

```sh
sh test/network.sh files/usr/libexec/ffvpn/network
```

`test/router-update.sh` accepts an updater, isolated root, loopback release URL, architecture and public key. Never use a live root for fixture tests. Network integration with a live router and Mozilla connection tests need separate verification.
