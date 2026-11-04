# ffvpn

<p align="center"><img src="https://github.com/dreamboxone/ffvpn/releases/latest/download/logo.png" alt="ffvpn" width="200"></p>

用于 OpenWrt 的 Firefox 内置 VPN 非官方客户端，集成 LuCI 界面。

[![版本](https://img.shields.io/github/v/release/dreamboxone/ffvpn?style=for-the-badge)](https://github.com/dreamboxone/ffvpn/releases/latest)
[![下载](https://img.shields.io/github/downloads/dreamboxone/ffvpn/total?style=for-the-badge)](https://github.com/dreamboxone/ffvpn/releases)

[فارسی](README.md) · [English](README.en.md) · [简体中文](README.zh.md) · [Русский](README.ru.md)

[网站与源代码](https://github.com/dreamboxone/ffvpn) · [Telegram 支持](https://t.me/routekernel1)

## 功能

- 集成安装 LuCI；支持四种语言、浅色、深色和跟随路由器主题，标签页带图标。
- 支持多个 Mozilla 账户、优先顺序、配额显示与自动切换。
- 开关和设置即时生效，无需 Save & Apply。
- 检测 Zirgozar 和 PassWall2；更改路由前提示，关闭时恢复本程序修改的设置，并保留之后的手动编辑。
- 分别检查、更新或重新安装应用和核心，显示核心路径与可用空间。
- 验证发布签名与 SHA-256，只下载更改的文件和二进制块。
- 与 Zirgozar 相同的德黑兰时区和伊朗时间服务器设置。

## 安装

目标版本为 OpenWrt 23.05、24.10 和 25.12。目前使用 Google WiFi 上的 25.12.6 进行实机测试；其他版本仍需单独验证。需要 LuCI 及 Zirgozar 或 PassWall2。

首次发布后，通过 SSH 执行：

```sh
wget -qO /tmp/ffvpn-install.sh https://raw.githubusercontent.com/dreamboxone/ffvpn/main/install.sh && sh /tmp/ffvpn-install.sh
```

菜单支持安装、更新和卸载。进入 LuCI → Services → ffvpn 添加 Mozilla 账户。安装后路由默认关闭，卸载会保留账户数据。

## 核心与限制

核心基于 [arman-vpn-client](https://github.com/armanlife/arman-vpn-client)，增加了 OpenWrt 入口。Mozilla 管理服务端；兼容核心通过 ffvpn 发布。差分下载量取决于实际二进制变化，首次安装需要完整下载。

本项目与 Mozilla 无关联，也未经其认可。配额和可用性由 Mozilla 决定。TCP 仅支持 80、443、8080、8443 端口，UDP 也受端口限制，部分通话、游戏和 SSH 可能无法使用。核心 API 与代理仅监听回环地址，管理使用经过认证的 LuCI 会话。

## 许可证

界面和工具使用 AGPL-3.0-or-later，上游核心保留 GPL-3.0。主题与时间设置来自 [Zirgozar](https://github.com/dreamboxone/zirgozar)。Vazirmatn 字体附带许可证。参见 [UPSTREAM.json](UPSTREAM.json)。

ffvpn · Copyright © 2026 dreamboxone · GNU AGPLv3 · 不提供担保
