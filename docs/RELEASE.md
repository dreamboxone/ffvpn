نسخه 1.0.3 هستهٔ سازگار با OpenWrt را به Arman VPN 1.0.17 ارتقا می‌دهد.

- مسیر جایگزین ورود و تمدید دسترسی موزیلا هنگام خطای HTTP 406 و بهبود تازه‌سازی سهمیهٔ حساب.
- HTTP/1.1، انتخاب نسخهٔ IP اتصال به موزیلا و کلیدهای مستقل رلهٔ شخصی و رلهٔ اشتراکی برای HTTP 451.
- دریافت پشتیبان حساب‌ها و تنظیمات هسته و وارد کردن حساب‌ها از پشتیبان FFVPN یا Arman VPN.
- ورود به حساب موزیلا از Chrome یا Edge با افزونهٔ همراه FFVPN و LuCI روی HTTPS.
- به‌روزرسانی هم‌زمان رابط و هسته از LuCI و نمایش جزئیات خطاهای به‌روزرسانی.

### نصب و حذف

```sh
wget -qO /tmp/ffvpn-install.sh https://raw.githubusercontent.com/dreamboxone/ffvpn/main/install.sh && sh /tmp/ffvpn-install.sh
```

برای حذف، همان دستور را اجرا و گزینه 3 را انتخاب کنید.

[راهنمای چهارزبانه و نیازمندی ها](https://github.com/dreamboxone/ffvpn#readme) · [تلگرام](https://t.me/routekernel1)

Built with GitHub Actions. OpenWrt targets: 23.05 / 24.10 / 25.12. The installer detects the architecture and verifies signed manifests and SHA-256 before installation. Release assets contain signed architecture manifests, complete archives and native IPK/APK packages. Mozilla controls account quotas and service availability.


Integrated IPK packages for OpenWrt 23.05/24.10 and APK packages for 25.12 are included for all supported architectures, with detached usign signatures. See README for installation.
