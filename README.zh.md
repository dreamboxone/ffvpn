# ffvpn

<p align="center"><img src="https://github.com/dreamboxone/ffvpn/releases/latest/download/logo.png" alt="ffvpn" width="200"></p>

用于 OpenWrt 的 Firefox 内置 VPN 非官方客户端，集成 LuCI 界面。

[![版本](https://img.shields.io/github/v/release/dreamboxone/ffvpn?style=for-the-badge)](https://github.com/dreamboxone/ffvpn/releases/latest)
[![下载](https://img.shields.io/github/downloads/dreamboxone/ffvpn/total?style=for-the-badge)](https://github.com/dreamboxone/ffvpn/releases)

[![Telegram](https://img.shields.io/badge/Telegram-RouteKernel-26A5E4?style=for-the-badge&logo=telegram)](https://t.me/routekernel1)

[فارسی](README.md) · [English](README.en.md) · [简体中文](README.zh.md) · [Русский](README.ru.md)

[网站与源代码](https://github.com/dreamboxone/ffvpn) · [Telegram 支持](https://t.me/routekernel1)

## 使用条件

- 路由器运行 OpenWrt 23.05、24.10 或 25.12，并采用[受支持的架构](build/architectures.json)。已在运行 25.12.6 的实体路由器上测试。
- 首次安装需要 SSH、路由器能访问 GitHub，以及一个 Mozilla 账号。安装程序会补装缺少的 LuCI 和依赖。
- 建议至少留出 32 MB 闪存、64 MB 临时空间，并配备 256 MB 总内存。程序与核心约占 15–20 MB，依赖和路由引擎需要额外资源。
- 全网路由需要 Zirgozar 或 PassWall2，也可直接使用独立的 SOCKS 代理。

## 安装

通过 SSH 登录路由器并运行以下命令。

```sh
wget -qO /tmp/ffvpn-install.sh https://raw.githubusercontent.com/dreamboxone/ffvpn/main/install.sh && sh /tmp/ffvpn-install.sh
```

选择 **1 (Install / Repair)**。安装程序会识别架构，下载对应版本并校验签名和文件哈希。安装后打开 **LuCI → Services → ffvpn**。首次安装时主开关默认关闭。

## 添加 Mozilla 账号

进入 **账号 → 添加用户**，输入 Mozilla 邮箱和密码，并按提示完成验证。可以添加多个账号，调整优先级、刷新配额或暂时禁用账号。配额不足时，FFVPN 可以自动切换账号。

### 在浏览器中登录

1. 在 Chrome 或 Edge 中通过 HTTPS 打开路由器的本地 LuCI 地址，进入 **账号 → 添加用户**。
2. 从表单下载并解压 FFVPN 扩展。在 `chrome://extensions` 或 `edge://extensions` 开启开发者模式，选择「加载解压缩的扩展程序」，打开扩展所在文件夹。每个浏览器配置只需安装一次。
3. 选择「在浏览器中登录 Mozilla」，再在同一个 LuCI 标签页点击 FFVPN 扩展图标。在 Mozilla 官方标签页输入密码并完成验证码或 CAPTCHA 验证。验证期间保留该标签页，完成后回到 LuCI 查看结果。

浏览器需要能访问 Mozilla 登录页面。

### 备份与迁移账号

在 **账号 → 账号备份** 选择「导出备份」，下载包含账号和核心设置的 ZIP。备份含有登录凭据，请妥善保管。迁移时选择 FFVPN 或 Arman VPN 的备份文件，查看账号列表并确认导入。相同邮箱的账号会更新登录凭据，路由器保留当前设置。

## 连接与路由

- **单个设备或应用。** 打开主开关，在客户端设置 SOCKS5，填写路由器 LAN 地址和端口 `10810`。默认允许 LAN 客户端免用户名和密码连接，WAN 无法访问，管理 API 仅监听回环地址。
- **全网路由。** 在 **主页 → 基本设置** 选择 Zirgozar 或 PassWall2 并应用设置。通过恢复设置撤销 FFVPN 的路由更改。
- **连接选项。** 在服务器页选择国家或测量延迟。在基本设置中选择 HTTP/2、HTTP/3 或 HTTP/1.1，以及连接 Mozilla 代理的 IP 版本。默认使用 HTTP/2 和自动优先 IPv4。
- **TLS 分片和时间。** 基本设置中的 TLS 分片选项旁有帮助说明。「设置路由器时间」会将时区设置为德黑兰并添加伊朗的时间服务器。
- **中继。** 个人中继和共享中继可独立开关。没有启用个人中继时，共享中继可在 HTTP 451 后处理 Guardian 控制请求。VPN 流量通过 Mozilla 隧道传输。

## 更新与卸载

- **从 1.0.2 升级到 1.0.3。** 在 SSH 中重新运行安装命令，选择 **2 (Update)**，同时升级界面和核心。也可以在 1.0.2 的 LuCI 中分别点击 **ffvpn** 和**核心**卡片的「更新」。完成后刷新 LuCI。
- **从 1.0.3 开始。** 在更新页可同时更新应用和核心，也可以分别检查、更新或重新安装。只更新核心时，在**核心**卡片先选「检查」，再选「更新」。两者版本号独立。更新可能会短暂中断连接。
- LuCI 从 FFVPN 的签名发行版获取兼容 OpenWrt 的核心。FFVPN 发布对应软件包后才能在界面中更新。更新程序下载完整归档并验证签名和 SHA-256。
- 使用脚本安装时，重新运行命令并选择 **3 (Remove)** 即可卸载。FFVPN 会撤销自己的路由更改，账号数据保留在 `/etc/ffvpn/core`。

## 故障排查

- **登录或续期出现 HTTP 406。** 在更新页核对核心版本。FFVPN 1.0.3 附带的 1.0.17 核心包含登录和续期的备用流程。如果问题再次出现，检查路由器时间和日志。
- **Guardian 返回 HTTP 451。** 检查基本设置中的个人中继和共享中继开关。启用的个人中继优先。
- **更新失败。** 查看更新页的错误详情，确认路由器能访问 GitHub，并检查可用空间。安装不完整时可通过 SSH 安装程序的 **1 (Install / Repair)** 修复。

## OpenWrt 软件包

[发行版](https://github.com/dreamboxone/ffvpn/releases/latest)按架构提供集成 LuCI 的软件包。23.05 和 24.10 使用 `ipk`，25.12 使用 `apk`。架构须与 `/etc/openwrt_release` 中的 `DISTRIB_ARCH` 一致。手动安装前，使用 usign 和 [FFVPN 发布公钥](files/usr/share/ffvpn/release.pub)验证独立的 `.sig` 签名。然后使用 `opkg install` 安装 IPK，或使用 `apk add --allow-untrusted` 安装已验证的第三方 APK。通过包管理器安装后，可使用 `opkg remove ffvpn` 或 `apk del ffvpn` 卸载。

## 限制与许可证

FFVPN 是非官方客户端。服务可用性和账号配额由 Mozilla 决定。隧道支持 TCP 端口 80、443、8080 和 8443，UDP 端口也受限制。这可能影响通话、游戏和 SSH。

界面和工具采用 AGPL-3.0-or-later。核心基于 [Arman VPN](https://github.com/armanlife/arman-vpn-client)，带有 OpenWrt 入口并保留 GPL-3.0。主题和时间设置源于 [Zirgozar](https://github.com/dreamboxone/zirgozar)。Vazirmatn 字体附带许可证。上游版本见 [UPSTREAM.json](UPSTREAM.json)。

ffvpn · Copyright © 2026 dreamboxone · GNU AGPLv3 · 不提供担保
