نسخه 1.0.0 ویژه OpenWrt با رابط یکپارچه LuCI و چهار زبان فارسی، انگلیسی، چینی و روسی.

- تشخیص خودکار معماری و نسخه OpenWrt؛ منوی نصب، به‌روزرسانی و حذف.
- ساکس مستقل برای LAN؛ تنظیم و بازگردانی زیرگذر یا PassWall2.
- چند حساب موزیلا، اولویت، نمایش سهمیه و زمان ریست.
- به روزرسانی امضاشده با دریافت فایل کامل نسخه.
- تم روشن و تیره، پیروی از تم روتر، پرچم های داخلی و گزارش فارسی.

### نصب و حذف

```sh
wget -qO /tmp/ffvpn-install.sh https://raw.githubusercontent.com/dreamboxone/ffvpn/main/install.sh && sh /tmp/ffvpn-install.sh
```

برای حذف، همان دستور را اجرا و گزینه 3 را انتخاب کنید.

[راهنمای چهارزبانه و نیازمندی ها](https://github.com/dreamboxone/ffvpn#readme) · [تلگرام](https://t.me/routekernel1)

Built with GitHub Actions. OpenWrt targets: 23.05 / 24.10 / 25.12. The installer detects the architecture and verifies signed manifests and SHA-256 before installation. Release assets contain signed architecture manifests, complete archives and native IPK/APK packages. Mozilla controls account quotas and service availability.

Build: https://github.com/dreamboxone/ffvpn/actions/runs/41903329762


Integrated IPK packages for OpenWrt 23.05/24.10 and APK packages for 25.12 are included for all supported architectures, with detached usign signatures. See README for installation.
