# ffvpn

<p align="center"><img src="https://github.com/dreamboxone/ffvpn/releases/latest/download/logo.png" alt="ffvpn" width="200"></p>

An unofficial client for Firefox's built-in VPN on OpenWrt, with an integrated LuCI interface.

[![Release](https://img.shields.io/github/v/release/dreamboxone/ffvpn?style=for-the-badge)](https://github.com/dreamboxone/ffvpn/releases/latest)
[![Downloads](https://img.shields.io/github/downloads/dreamboxone/ffvpn/total?style=for-the-badge)](https://github.com/dreamboxone/ffvpn/releases)

[![Telegram](https://img.shields.io/badge/Telegram-RouteKernel-26A5E4?style=for-the-badge&logo=telegram)](https://t.me/routekernel1)

[فارسی](README.md) · [English](README.en.md) · [简体中文](README.zh.md) · [Русский](README.ru.md)

[Website and source](https://github.com/dreamboxone/ffvpn) · [Telegram support](https://t.me/routekernel1)

## Features

- Integrated LuCI installation, four languages, light/dark/router themes and tab icons.
- Multiple Mozilla accounts, priority order, quota display and automatic account switching.
- Immediate settings and a sliding power switch; no Save & Apply.
- Detect Zirgozar and PassWall2; warn before routing changes and restore owned settings on disable, preserving later manual edits.
- Separate application/core update checks, updates and reinstalls, with core path and free space.
- Signed releases and content-defined differential downloads; unchanged blocks are reused locally.
- Tehran timezone and Iranian time servers, matching Zirgozar.

## Installation

Targets OpenWrt 23.05, 24.10 and 25.12. LuCI is required; Zirgozar or PassWall2 is optional for whole-network routing.

Run on the router over SSH:

```sh
wget -qO /tmp/ffvpn-install.sh https://raw.githubusercontent.com/dreamboxone/ffvpn/main/install.sh && sh /tmp/ffvpn-install.sh
```

## Install, remove and device requirements

The installer detects the router's OpenWrt release and architecture and downloads the matching files. Targets: OpenWrt 23.05, 24.10 and 25.12; hardware-tested on 25.12.6. See [architectures.json](build/architectures.json).

**Install or remove with the same command:** the command above opens `1) Install`, `2) Update`, `3) Remove`. To uninstall, run it again and choose **3**. Account data is retained and owned routing changes are restored.

**Flash:** approximately 15–20 MB for the application and core, plus missing dependencies. Allow at least 32 MB free flash and 64 MB free temporary storage. Binary size varies by architecture.

**RAM:** recommended minimum 256 MB total router RAM; a hard minimum on low-memory devices has not been validated. The test router measured about 18 MB resident core memory and a 42 MB observed peak. Zirgozar or PassWall2 requires additional memory.

Standalone SOCKS works without a routing engine: router LAN address, port `10810`, no username/password by default, LAN access only. The management API remains loopback-only. For whole-network routing, select either Zirgozar or PassWall2 in Basic settings, then apply settings; Restore settings reverses these changes.

Choose Install, Update or Remove. Open LuCI → Services → ffvpn and add a Mozilla account. Installation leaves routing disabled. Removal retains account data.

## Core and limitations

The core derives from [arman-vpn-client](https://github.com/armanlife/arman-vpn-client), with an OpenWrt entry point. Mozilla updates its service; compatible core builds are distributed through ffvpn releases. Differential download size depends on actual binary changes; first installation requires all files.

Not affiliated with or endorsed by Mozilla. Account quotas and availability are controlled by Mozilla. TCP is limited to ports 80, 443, 8080 and 8443; UDP also has port restrictions. Some calls, games and SSH connections may fail. The management API is loopback-only; SOCKS is available to LAN devices and blocked from WAN.

## Licenses

The interface and ffvpn utilities use AGPL-3.0-or-later. The upstream core retains its GPL-3.0 license. Theme and clock behavior derive from [Zirgozar](https://github.com/dreamboxone/zirgozar). Vazirmatn includes its font license. See [UPSTREAM.json](UPSTREAM.json) for pinned revisions.

ffvpn · Copyright © 2026 dreamboxone · GNU AGPLv3 · No warranty
