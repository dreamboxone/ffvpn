نسخه 1.0.2 با اصلاح پیش‌نیازهای نصب. نسخه هسته همچنان 1.0.0 است.

- حذف وابستگی اجباری به nftables-json؛ هر دو نوع nftables قابل استفاده‌اند.
- استفاده از ابزار nft موجود روی روتر و نصب پیش‌نیازها فقط در صورت نبودن آن‌ها.
- در صورت موجود بودن تمام پیش‌نیازها، مدیر بسته اجرا نمی‌شود.

علت گزارش بوت‌نشدن دستگاه Google WiFi AC-1304 روی OpenWrt 24.10 قطعی نشده است. این نسخه انتخاب پیش‌نیازها را اصلاح می‌کند؛ آزمایش نصب و ریبوت روی دستگاه‌های 23.05 و 24.10 هنوز انجام نشده است.

### نصب و حذف

```sh
wget -qO /tmp/ffvpn-install.sh https://raw.githubusercontent.com/dreamboxone/ffvpn/main/install.sh && sh /tmp/ffvpn-install.sh
```

برای حذف، همان دستور را اجرا و گزینه 3 را انتخاب کنید.

[راهنمای چهارزبانه و نیازمندی ها](https://github.com/dreamboxone/ffvpn#readme) · [تلگرام](https://t.me/routekernel1)

Built with GitHub Actions. OpenWrt targets: 23.05 / 24.10 / 25.12. The installer detects the architecture and verifies signed manifests and SHA-256 before installation. Release assets contain signed architecture manifests, complete archives and native IPK/APK packages. Mozilla controls account quotas and service availability.


Integrated IPK packages for OpenWrt 23.05/24.10 and APK packages for 25.12 are included for all supported architectures, with detached usign signatures. See README for installation.
