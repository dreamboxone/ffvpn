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

The workflow tests and cross-builds every architecture in GitHub Actions. Run it manually with **publish** enabled, or push a version tag such as `v1.0.0`, to verify, sign and publish entirely on GitHub. Ordinary branch pushes do not trigger a build.

The repository Actions secret `FFVPN_RELEASE_SIGNING_KEY_B64` contains the base64-encoded private usign key matching the pinned public key. It is decoded only into the runner temporary directory, removed after signing, and never included in artifacts. Keep a private backup outside the repository. `build/publish.py` verifies every reconstructed file and detached signature before publication.

The publish job creates a draft, uploads signed manifests, shared compressed blocks, integrated IPK/APK packages, logo, installer and SHA256SUMS, then publishes after all uploads succeed. An interrupted draft can be resumed by rerunning the workflow. Public releases cannot be overwritten; use a new version. Release notes are in `docs/RELEASE.md`.

`VERSION` identifies the interface and tools. `CORE_VERSION` identifies the adapted core; update `files/usr/share/ffvpn/core-version` with it. Record upstream source changes in `UPSTREAM.json` and rebuild the core. The updater supports `check`, `update` and `reinstall` for `app`, `core` or `all`.

On a router, run the network tests against an isolated UCI directory:

```sh
sh test/network.sh files/usr/libexec/ffvpn/network
```

`test/router-update.sh` accepts an updater, isolated root, loopback release URL, architecture and public key. Never use a live root for fixture tests. Network integration with a live router and Mozilla connection tests need separate verification.

Native packages are assembled from the verified manifests in the publish job. APK metadata uses the checksum-pinned official OpenWrt 25.12 SDK host tool. Every native package also has a detached usign signature. The uploader resumes matching draft assets and backs off on GitHub rate limits.
