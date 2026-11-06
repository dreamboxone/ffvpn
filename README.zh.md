# ffvpn

<p align="center"><img src="https://github.com/dreamboxone/ffvpn/releases/latest/download/logo.png" alt="ffvpn" width="200"></p>

用于 OpenWrt 的 Firefox 内置 VPN 非官方客户端，集成 LuCI 界面。

[![版本](https://img.shields.io/github/v/release/dreamboxone/ffvpn?style=for-the-badge)](https://github.com/dreamboxone/ffvpn/releases/latest)
[![下载](https://img.shields.io/github/downloads/dreamboxone/ffvpn/total?style=for-the-badge)](https://github.com/dreamboxone/ffvpn/releases)

[![Telegram](https://img.shields.io/badge/Telegram-RouteKernel-26A5E4?style=for-the-badge&logo=telegram)](https://t.me/routekernel1)

[فارسی](README.md) · [English](README.en.md) · [简体中文](README.zh.md) · [Русский](README.ru.md)

[网站与源代码](https://github.com/dreamboxone/ffvpn) · [Telegram 支持](https://t.me/routekernel1)

## 功能

- 集成安装 LuCI；支持四种语言、浅色、深色和跟随路由器主题，标签页带图标。
- 支持多个 Mozilla 账户、优先顺序、配额显示与自动切换。
- 开关和设置即时生效，无需 Save & Apply。
- 检测 Zirgozar 和 PassWall2；更改路由前提示，关闭时恢复本程序修改的设置，并保留之后的手动编辑。
- 分别检查、更新或重新安装应用和核心，显示核心路径与可用空间。
- 下载完整版本归档，并验证签名与 SHA-256。
- 与 Zirgozar 相同的德黑兰时区和伊朗时间服务器设置。

## 安装

目标版本为 OpenWrt 23.05、24.10 和 25.12。需要 LuCI；全网路由才需要 Zirgozar 或 PassWall2。

通过 SSH 执行：

```sh
wget -qO /tmp/ffvpn-install.sh https://raw.githubusercontent.com/dreamboxone/ffvpn/main/install.sh && sh /tmp/ffvpn-install.sh
```

## 安装、卸载与设备要求

安装程序自动检测路由器的 OpenWrt 版本与架构，并下载相应文件。支持目标为 23.05、24.10、25.12；硬件测试版本为 25.12.6。架构列表见 [architectures.json](build/architectures.json)。

**安装和卸载使用同一条命令：** 上方命令打开菜单 `1) Install`、`2) Update`、`3) Remove`。卸载时再次运行并选择 **3**。保留账户数据，恢复本程序修改的路由设置。

**闪存：** 程序和核心约需 15–20 MB，未安装的依赖另计。建议至少预留 32 MB 闪存和 64 MB 临时空间。二进制大小因架构而异。

**内存：** 建议路由器总内存至少 256 MB；尚未验证低内存设备的硬性最低要求。测试核心常驻内存约 18 MB，观察到的峰值约 42 MB。Zirgozar 或 PassWall2 需要额外内存。

无需路由引擎即可使用独立 SOCKS：路由器局域网地址，端口 `10810`，默认无用户名和密码，仅允许 LAN 访问。管理 API 仅监听回环地址。全网代理请在基本设置选择 Zirgozar 或 PassWall2 并应用设置；恢复按钮可撤销这些修改。

菜单支持安装、更新和卸载。进入 LuCI → Services → ffvpn 添加 Mozilla 账户。安装后路由默认关闭，卸载会保留账户数据。

## 核心与限制

核心基于 [arman-vpn-client](https://github.com/armanlife/arman-vpn-client)，增加了 OpenWrt 入口。Mozilla 管理服务端；兼容核心通过 ffvpn 发布。更新下载完整版本归档，并在安装前验证签名和文件哈希。

本项目与 Mozilla 无关联，也未经其认可。配额和可用性由 Mozilla 决定。TCP 仅支持 80、443、8080、8443 端口，UDP 也受端口限制，部分通话、游戏和 SSH 可能无法使用。管理 API 仅监听回环地址，SOCKS 仅允许 LAN 访问，阻止 WAN 访问。

## 许可证

界面和工具使用 AGPL-3.0-or-later，上游核心保留 GPL-3.0。主题与时间设置来自 [Zirgozar](https://github.com/dreamboxone/zirgozar)。Vazirmatn 字体附带许可证。参见 [UPSTREAM.json](UPSTREAM.json)。

ffvpn · Copyright © 2026 dreamboxone · GNU AGPLv3 · 不提供担保

## OpenWrt 软件包

[发行版](https://github.com/dreamboxone/ffvpn/releases/latest)为各架构提供集成 LuCI 的单个包：23.05/24.10 使用 `ipk`，25.12 使用 `apk`。架构必须匹配路由器。安装：`opkg install /tmp/ffvpn_1.0.2-1_ARCH.ipk`；验证签名后使用 `apk add --allow-untrusted /tmp/ffvpn-1.0.2-r1-ARCH.apk`。第三方 APK 不使用 OpenWrt 官方仓库签名，提供独立 usign `.sig` 和 SHA256SUMS。一行安装程序自动验证签名。卸载：`opkg remove ffvpn` 或 `apk del ffvpn`。
