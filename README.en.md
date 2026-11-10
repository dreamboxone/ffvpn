# ffvpn

<p align="center"><img src="https://github.com/dreamboxone/ffvpn/releases/latest/download/logo.png" alt="ffvpn" width="200"></p>

An unofficial client for Firefox's built-in VPN on OpenWrt, with an integrated LuCI interface.

[![Release](https://img.shields.io/github/v/release/dreamboxone/ffvpn?style=for-the-badge)](https://github.com/dreamboxone/ffvpn/releases/latest)
[![Downloads](https://img.shields.io/github/downloads/dreamboxone/ffvpn/total?style=for-the-badge)](https://github.com/dreamboxone/ffvpn/releases)

[![Telegram](https://img.shields.io/badge/Telegram-RouteKernel-26A5E4?style=for-the-badge&logo=telegram)](https://t.me/routekernel1)

[فارسی](README.md) · [English](README.en.md) · [简体中文](README.zh.md) · [Русский](README.ru.md)

[Website and source](https://github.com/dreamboxone/ffvpn) · [Telegram support](https://t.me/routekernel1)

## Requirements

- OpenWrt 23.05, 24.10 or 25.12 on a [supported architecture](build/architectures.json).
- SSH access for the initial install, access to GitHub from the router and a Mozilla account. The installer adds LuCI and other required dependencies when missing.
- Recommended free space is 32 MB on flash and 64 MB for temporary files, with at least 256 MB of total RAM. The app and core occupy about 15–20 MB, depending on architecture. Missing dependencies and routing engines need additional resources.
- Use [Zirgozar](https://github.com/dreamboxone/zirgozar) or PassWall2 for whole-network routing. Clients can also use the standalone SOCKS proxy.

## Install

Run this command over SSH on the router.

```sh
wget -qO /tmp/ffvpn-install.sh https://raw.githubusercontent.com/dreamboxone/ffvpn/main/install.sh && sh /tmp/ffvpn-install.sh
```

Choose **1 (Install / Repair)**. The installer detects the router architecture, downloads the matching release and verifies its signature and file hashes. Open **LuCI → Services → ffvpn**. On a fresh installation, the main switch stays off until you enable it.

## Add a Mozilla account

Open **Accounts → Add user**, enter your Mozilla email and password, and complete any verification prompts. You can add multiple accounts, reorder their priority, refresh quotas and temporarily disable accounts. FFVPN can switch accounts automatically as quota runs low.

### Sign in with your browser

1. Open the router's local LuCI address over HTTPS in Chrome or Edge, then select **Accounts → Add user**.
2. Download and extract the FFVPN extension from the form. Enable Developer mode at `chrome://extensions` or `edge://extensions`, then select the extracted folder with **Load unpacked**. Install the extension once per browser profile.
3. Choose **Sign in with Mozilla in your browser**, then click the extension icon in the same LuCI tab. Enter the password and complete any codes or CAPTCHA in Mozilla's tab. Leave that tab open through verification, then check LuCI for the result.

The browser needs access to Mozilla's sign-in page for this method.

### Back up or move accounts

Under **Accounts → Account backup**, select **Export backup** to download a ZIP of accounts and core settings. Keep the ZIP private because it contains sign-in credentials. To move accounts, choose a ZIP from FFVPN or Arman VPN, review the account list and confirm the import. Accounts with matching email addresses receive the imported credentials. The router keeps its current settings.

## Connect and route traffic

- **Single device or app.** Turn on the main switch and configure SOCKS5 with the router's LAN address and port `10810`. LAN clients can access it without a username or password by default. WAN access is blocked and the management API listens on loopback.
- **Whole network.** Under **Home → Basic settings**, select [Zirgozar](https://github.com/dreamboxone/zirgozar) or PassWall2 and choose **Apply settings**. Choose **Restore settings** to undo FFVPN's routing changes.
- **Connection options.** Use **Servers** to pick a country or measure latency. In Basic settings, choose HTTP/2, HTTP/3 or HTTP/1.1, and set the IP preference for connections to Mozilla's proxy. HTTP/2 and automatic IPv4-first selection are the defaults.
- **TLS fragmentation and clock.** Basic settings includes help beside the TLS fragmentation control. **Set router clock** sets the router's timezone to Tehran and adds Iranian time servers.
- **Relays.** Personal and shared relay switches are independent. When no personal relay is active, shared relays can handle Guardian control requests after HTTP 451. VPN traffic travels through Mozilla's tunnel.

## Update or remove

- **Upgrade from 1.0.2 to 1.0.3.** Run the installation command again over SSH and choose **2 (Update)** to upgrade both the interface and the core. To upgrade from LuCI 1.0.2, use **Update now** in both the **ffvpn** and **Core** cards. Refresh LuCI after the update.
- **From 1.0.3 onward.** In **Updates**, you can update both components together, or check, update and reinstall each separately. To update only the core, select **Check for updates** and then **Update now** in the **Core** card. The app and core have independent version numbers. Updating may briefly interrupt the connection.
- FFVPN publishes OpenWrt-compatible core builds in its own signed releases. A core update becomes available in LuCI when FFVPN publishes the corresponding package. The updater downloads the complete archive and verifies its signature and SHA-256 hashes.
- To remove a script installation, run the command again and choose **3 (Remove)**. FFVPN restores its routing changes and leaves account data in `/etc/ffvpn/core`.

## Troubleshooting

- **HTTP 406 during sign-in or renewal.** Check the installed core in **Updates**. FFVPN 1.0.3 ships with core 1.0.17, which has a fallback for sign-in and renewal. If the error recurs, check the router clock and **Logs**.
- **HTTP 451 from Guardian.** Check the personal and shared relay switches in Basic settings. An active personal relay takes priority.
- **Update fails.** Open the details in **Updates** and check the router's GitHub access and available space. Use **1 (Install / Repair)** in the SSH installer to repair an incomplete installation.

## OpenWrt packages

[Releases](https://github.com/dreamboxone/ffvpn/releases/latest) include integrated app and LuCI packages for each supported architecture. Use `ipk` on OpenWrt 23.05 and 24.10 and `apk` on 25.12. Match `DISTRIB_ARCH` in `/etc/openwrt_release`. For manual installation, verify the detached `.sig` with usign and the [FFVPN public release key](files/usr/share/ffvpn/release.pub) first. Then use `opkg install` with the IPK filename or `apk add --allow-untrusted` with the verified third-party APK. Use `opkg remove ffvpn` or `apk del ffvpn` to uninstall a package-manager installation.

## Limits and licenses

FFVPN is an unofficial client. Mozilla controls service availability and account quotas. The tunnel supports TCP ports 80, 443, 8080 and 8443 and restricts UDP ports. This can affect calls, games and SSH.

The interface and utilities use AGPL-3.0-or-later. The core derives from [Arman VPN](https://github.com/armanlife/arman-vpn-client), with an OpenWrt entry point, and retains its GPL-3.0 license. The theme and clock behavior derive from [Zirgozar](https://github.com/dreamboxone/zirgozar). Vazirmatn includes its font license. See [UPSTREAM.json](UPSTREAM.json) for source revisions.

ffvpn · Copyright © 2026 dreamboxone · GNU AGPLv3 · No warranty
