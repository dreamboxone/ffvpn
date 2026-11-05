نسخه 1.0.1 ویژه OpenWrt با بهبود نصب و رابط کاربری LuCI. نسخه هسته همچنان 1.0.0 است.

- نمایش وضعیت نصب با رنگ، نسخه برنامه و هسته، وضعیت سرویس، معماری و آدرس گیت‌هاب در منوی نصب.
- نمایش درصد و نوار پیشرفت دانلود و مراحل نصب؛ دریافت آخرین اسکریپت در گزینه به‌روزرسانی.
- اصلاح جای عدد تاخیر در فارسی؛ عدد سمت راست واحد قرار می‌گیرد.
- راهنمای چهارزبانه فرگمنت TLS کنار عنوان؛ علامت سوال در فارسی سمت چپ و در زبان‌های دیگر سمت راست قرار دارد.
- حذف توضیح محدودیت پورت‌ها از تنظیمات پایه.

### نصب و حذف

```sh
wget -qO /tmp/ffvpn-install.sh https://raw.githubusercontent.com/dreamboxone/ffvpn/main/install.sh && sh /tmp/ffvpn-install.sh
```

برای حذف، همان دستور را اجرا و گزینه 3 را انتخاب کنید.

[راهنمای چهارزبانه و نیازمندی ها](https://github.com/dreamboxone/ffvpn#readme) · [تلگرام](https://t.me/routekernel1)

Built with GitHub Actions. OpenWrt targets: 23.05 / 24.10 / 25.12. The installer detects the architecture and verifies signed manifests and SHA-256 before installation. Release assets contain signed architecture manifests, complete archives and native IPK/APK packages. Mozilla controls account quotas and service availability.


Integrated IPK packages for OpenWrt 23.05/24.10 and APK packages for 25.12 are included for all supported architectures, with detached usign signatures. See README for installation.
