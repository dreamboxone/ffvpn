'use strict';
'require baseclass';
var words = {
 'TLS fragmentation help': ['راهنمای فرگمنت TLS','TLS 分片帮助','Справка о фрагментации TLS'],
 'TLS fragmentation splits the initial TLS handshake (ClientHello). It may help when a network filter inspects the server name.': ['فرگمنت TLS پیام اولیه اتصال امن (ClientHello) را تکه‌تکه می‌کند. اگر فیلتر شبکه نام سرور را بررسی کند، این روش ممکن است به برقراری اتصال کمک کند.','TLS 分片会拆分初始握手消息（ClientHello）。当网络过滤器检查服务器名称时，这可能有助于建立连接。','Фрагментация TLS разделяет начальное сообщение ClientHello. Это может помочь, если сетевой фильтр проверяет имя сервера.'],
 'Sends the initial TLS message normally.': ['پیام اولیه TLS را به شکل معمول ارسال می‌کند.','正常发送初始 TLS 消息。','Отправляет начальное сообщение TLS обычным способом.'],
 'Uses three writes: before the domain name, its first letter, and the rest of the message.': ['پیام را در سه ارسال می‌فرستد: بخش قبل از نام دامنه، اولین حرف دامنه و ادامه پیام.','分三次写入：域名前的部分、域名的首字母，以及消息的剩余部分。','Записывает сообщение тремя частями: до имени домена, его первая буква и оставшаяся часть сообщения.'],
 'Sends the first byte separately, then sends the rest of the message.': ['اولین بایت پیام را جدا می‌فرستد و سپس باقی پیام را ارسال می‌کند.','单独发送第一个字节，然后发送消息的剩余部分。','Отправляет первый байт отдельно, затем оставшуюся часть сообщения.'],
 'Splits the message into two TLS records after the first letter of the domain name.': ['پیام را به دو رکورد TLS تقسیم می‌کند؛ مرز تقسیم بعد از اولین حرف نام دامنه است.','在域名首字母之后将消息拆成两条 TLS 记录。','Разделяет сообщение на две записи TLS после первой буквы имени домена.'],
 'The domain name is not changed or encrypted. Separate TCP writes may be combined by the network; bypass is not guaranteed.': ['نام دامنه عوض یا رمزگذاری نمی‌شود. شبکه ممکن است ارسال‌های جداگانه TCP را دوباره ترکیب کند؛ عبور از فیلتر تضمینی نیست.','域名不会被更改或加密。网络可能合并单独的 TCP 写入；不保证绕过过滤。','Имя домена не меняется и не шифруется. Сеть может объединить отдельные записи TCP; обход фильтра не гарантируется.'],
 'This cannot fix a blocked IP or port, or a TCP connection that never opens. It does not fragment the main HTTP/3 connection, which uses QUIC.': ['اگر IP یا پورت مسدود باشد، یا اتصال TCP از ابتدا برقرار نشود، فرگمنت کمکی نمی‌کند. اتصال اصلی HTTP/3 از QUIC استفاده می‌کند و با این روش تکه‌تکه نمی‌شود.','此功能无法解决 IP 或端口被封锁、或 TCP 无法建立连接的问题。HTTP/3 主连接使用 QUIC，不会通过此方法分片。','Не помогает при блокировке IP или порта либо невозможности установить TCP-соединение. Основное соединение HTTP/3 использует QUIC и этим способом не фрагментируется.'],
 'Keep this off if your connection is stable. Changes affect new connections.': ['اگر اتصال پایدار است، روی خاموش بماند. تغییر این گزینه روی اتصال‌های جدید اعمال می‌شود.','如果连接稳定，请保持关闭。更改仅对新连接生效。','Если соединение стабильно, оставьте выключенным. Изменения применяются к новым соединениям.'],
 'Show email': ['نمایش ایمیل','显示邮箱','Показать адрес'],
 'Hide email': ['مخفی کردن ایمیل','隐藏邮箱','Скрыть адрес'],
 'Days': ['روز','天','дн.'],
 'Checking version': ['در حال بررسی نسخه','正在检查版本','Проверка версии'],
 'Updating files': ['در حال به‌روزرسانی فایل‌ها','正在更新文件','Обновление файлов'],
 'Version check complete': ['بررسی نسخه انجام شد','版本检查完成','Проверка версии завершена'],
 'Update complete': ['به‌روزرسانی انجام شد','更新完成','Обновление завершено'],
 'The operation failed. Check the router connection and try again.': ['عملیات ناموفق بود. اتصال روتر را بررسی کنید و دوباره تلاش کنید.','操作失败，请检查路由器连接后重试。','Операция не выполнена. Проверьте соединение маршрутизатора и повторите попытку.'],
 'Storage': ['محل ذخیره فایل‌ها','文件存储','Хранение файлов'],
 'Current core path': ['مسیر فعلی هسته','当前核心路径','Текущий путь ядра'],
 'Core download folder': ['پوشه دریافت هسته','核心下载目录','Каталог загрузки ядра'],
 'The next core install or update uses this folder. Files under /tmp must be installed again after reboot.': ['نصب یا به‌روزرسانی بعدی هسته از این پوشه استفاده می‌کند. فایل‌های /tmp پس از راه‌اندازی دوباره روتر باید نصب شوند.','下次安装或更新核心将使用此目录。/tmp 中的文件在重启后需要重新安装。','Следующая установка или обновление ядра использует этот каталог. Файлы в /tmp нужно устанавливать заново после перезагрузки.'],
 'Firmware': ['سیستم عامل','固件','Прошивка'],
 'Basic settings': ['تنظیمات پایه','基本设置','Основные настройки'],
 'Status': ['وضعیت','状态','Состояние'],
 'Router information': ['مشخصات روتر','路由器信息','Сведения о маршрутизаторе'],
 'Connection status': ['وضعیت اتصال','连接状态','Состояние соединения'],
 'Traffic usage': ['مصرف ترافیک','流量使用','Использование трафика'],
 'Model': ['مدل','型号','Модель'],
 'Architecture': ['معماری','架构','Архитектура'],
 'Uptime': ['زمان روشن بودن','运行时间','Время работы'],
 'Memory': ['حافظه','内存','Память'],
 'CPU load': ['بار پردازنده','CPU 负载','Нагрузка процессора'],
 'Country': ['کشور','国家','Страна'],
 'Server': ['سرور','服务器','Сервер'],
 'Protocol': ['پروتکل','协议','Протокол'],
 'Public IP': ['آی پی عمومی','公网 IP','Публичный IP'],
 'Latency': ['تاخیر','延迟','Задержка'],
 'Upload': ['ارسال','上传','Отправлено'],
 'Download': ['دریافت','下载','Получено'],
 'Total': ['مجموع','总计','Всего'],
 'Today': ['امروز','今天','Сегодня'],
 'Week': ['هفته','周','Неделя'],
 'Month': ['ماه','月','Месяц'],
 'Not tested': ['آزمایش نشده','尚未测试','Не проверено'],
 'Connected': ['متصل','已连接','Подключено'],
 'Up to date': ['به‌روز است','已是最新','Установлена последняя версия'],
 'Not checked': ['بررسی نشده','尚未检查','Не проверено'],
 'Recommended location': ['موقعیت پیشنهادی','推荐位置','Рекомендуемое расположение'],
 'Recommended city': ['شهر پیشنهادی','推荐城市','Рекомендуемый город'],
 'the proxy is not running': ['کلید اصلی خاموش است. ابتدا آن را روشن کنید.','总开关已关闭，请先开启。','Главный переключатель выключен. Сначала включите его.'],
 'GB': ['گیگابایت','GB','ГБ'],
 'Create a Mozilla account': ['ساخت حساب موزیلا','创建 Mozilla 账户','Создать учётную запись Mozilla'],
 'Signing in': ['در حال ورود','正在登录','Выполняется вход'],
 'Enter the code sent by Mozilla.': ['کدی را که موزیلا فرستاده وارد کنید.','请输入 Mozilla 发送的验证码。','Введите код, отправленный Mozilla.'],
 'Enter your authenticator code.': ['کد برنامه احراز هویت را وارد کنید.','请输入身份验证器代码。','Введите код приложения аутентификации.'],
 'Open the confirmation email, then continue.': ['ایمیل تایید را باز کنید، سپس ادامه را بزنید.','打开确认邮件，然后继续。','Откройте письмо подтверждения, затем продолжите.'],
 'Sign-in failed': ['ورود ناموفق بود','登录失败','Не удалось войти'],
 'Sign-in cancelled': ['ورود لغو شد','已取消登录','Вход отменён'],
 'Incorrect Mozilla account password.': ['رمز حساب موزیلا نادرست است.','Mozilla 账户密码不正确。','Неверный пароль учётной записи Mozilla.'],
 'This account needs a Mozilla password; set it on the official account website.': ['این حساب به رمز موزیلا نیاز دارد؛ آن را در سایت رسمی حساب تنظیم کنید.','此账户需要 Mozilla 密码，请在官方账户网站设置。','Для этой записи нужен пароль Mozilla; задайте его на официальном сайте.'],
 'No Mozilla account exists with this email.': ['حساب موزیلا با این ایمیل وجود ندارد.','此邮箱没有 Mozilla 账户。','Учётной записи Mozilla с таким адресом нет.'],
 'Too many attempts. Wait before trying again.': ['تعداد تلاش‌ها زیاد است؛ کمی صبر کنید و دوباره تلاش کنید.','尝试次数过多，请稍后重试。','Слишком много попыток. Подождите перед повтором.'],
 'Wrong or expired verification code.': ['کد تایید نادرست یا منقضی شده است.','验证码错误或已过期。','Код подтверждения неверен или устарел.'],
 'Sign-in timed out. Please start again.': ['زمان ورود تمام شد؛ دوباره شروع کنید.','登录超时，请重新开始。','Время входа истекло. Начните снова.'],
 'Cannot reach Mozilla. Check the connection settings.': ['ارتباط با موزیلا برقرار نشد؛ تنظیمات اتصال را بررسی کنید.','无法连接 Mozilla，请检查连接设置。','Нет связи с Mozilla. Проверьте настройки соединения.'],
 'LAN proxying and DNS-over-HTTPS will be enabled. If Zirgozar is the other routing engine, its kill switch will be disabled temporarily.': ['پراکسی دستگاه‌های شبکه و DNS امن فعال می‌شوند. اگر زیرگذر مسیریاب دیگر باشد، کلید قطع اضطراری آن موقتا خاموش می‌شود.','将启用局域网代理和 DNS-over-HTTPS。如果 Zirgozar 是另一个路由引擎，其断网保护将暂时关闭。','Будут включены проксирование локальной сети и DNS-over-HTTPS. Если Zirgozar является другим механизмом маршрутизации, его аварийная блокировка будет временно отключена.'],
 'Home': ['خانه','主页','Главная'],
 'Display mode': ['حالت نمایش','显示模式','Режим отображения'],
 'Connection protocol': ['پروتکل اتصال','连接协议','Протокол соединения'],
 'TLS fragmentation': ['فرگمنت TLS','TLS 分片','Фрагментация TLS'],
 'Relay server': ['سرور واسط','中继服务器','Сервер ретрансляции'],
 'Core': ['هسته','核心','Ядро'],
 'Installed version': ['نسخه نصب‌شده','已安装版本','Установленная версия'],
 'Latest version': ['آخرین نسخه','最新版本','Последняя версия'],
 'Reinstall': ['نصب مجدد','重新安装','Переустановить'],
 'Check all': ['بررسی همه','全部检查','Проверить всё'],
 'Free space': ['فضای خالی','可用空间','Свободное место'],
 'Overview': ['نمای کلی','概览','Обзор'],
 'Accounts': ['کاربران','账户','Учётные записи'],
 'Move up': ['اولویت بالاتر','上移','Выше'],
 'Move down': ['اولویت پایین‌تر','下移','Ниже'],
 'Multiple Mozilla accounts are supported. Accounts are tried in priority order when quota runs low.': ['می‌توانید چند حساب موزیلا اضافه کنید. هنگام کم‌شدن سهمیه، حساب‌ها به ترتیب اولویت استفاده می‌شوند.','支持添加多个 Mozilla 账户。配额不足时按优先顺序切换账户。','Можно добавить несколько учётных записей Mozilla. При исчерпании квоты они используются в порядке приоритета.'],
 'Servers': ['سرورها','服务器','Серверы'],
 'Updates': ['به‌روزرسانی','更新','Обновления'],
 'Logs': ['گزارش‌ها','日志','Журнал'],
 'Settings': ['تنظیمات','设置','Настройки'],
 'Master switch': ['کلید اصلی','总开关','Главный переключатель'],
 'Routing engine': ['هماهنگ با','路由引擎','Механизм маршрутизации'],
 'Automatic': ['خودکار','自动','Автоматически'],
 'Light': ['روشن','浅色','Светлая'],
 'Dark': ['تیره','深色','Тёмная'],
 'Follow router theme': ['پیروی از تم روتر','跟随路由器主题','Тема маршрутизатора'],
 'Language': ['زبان','语言','Язык'],
 'Installed': ['نصب‌شده','已安装','Установлен'],
 'Not installed': ['نصب نشده','未安装','Не установлен'],
 'Running': ['در حال اجرا','运行中','Работает'],
 'Stopped': ['متوقف','已停止','Остановлен'],
 'Enabled': ['فعال','已启用','Включён'],
 'Disabled': ['غیرفعال','已禁用','Выключен'],
 'Refresh': ['تازه‌سازی','刷新','Обновить'],
 'Test connection': ['آزمایش اتصال','测试连接','Проверить соединение'],
 'Set router clock': ['تنظیم ساعت روتر','设置路由器时间','Настроить часы маршрутизатора'],
 'Set Tehran timezone and add Iranian time servers, as in Zirgozar?': ['منطقه زمانی تهران تنظیم و سرورهای زمان ایرانی مانند زیرگذر اضافه شوند؟','是否像 Zirgozar 一样设置德黑兰时区并添加伊朗时间服务器？','Установить часовой пояс Тегерана и добавить иранские серверы времени, как в Zirgozar?'],
 'Enable ffvpn? The selected engine will use the local ffvpn SOCKS proxy. Router traffic will bypass that engine to prevent loops. The other routing engine will be disabled. These settings will be restored when ffvpn is disabled; later manual edits will be preserved.': ['ffvpn فعال شود؟ مسیریاب انتخاب‌شده از پراکسی محلی ffvpn استفاده می‌کند. برای جلوگیری از حلقه، ترافیک خود روتر از آن عبور نمی‌کند. مسیریاب دیگر غیرفعال می‌شود. با خاموش‌کردن ffvpn این تنظیمات بازگردانده می‌شوند؛ ویرایش‌های دستی بعدی حفظ خواهند شد.','启用 ffvpn？所选路由引擎将使用本地 ffvpn SOCKS 代理。路由器自身流量将绕过该引擎以防止循环，另一个引擎将被禁用。关闭 ffvpn 时将恢复这些设置，并保留之后的手动修改。','Включить ffvpn? Выбранный механизм будет использовать локальный SOCKS-прокси ffvpn. Трафик самого маршрутизатора пойдёт напрямую для предотвращения петли. Другой механизм будет отключён. При выключении ffvpn настройки восстановятся с сохранением последующих ручных изменений.'],
 'Turn ffvpn off before changing the routing engine.': ['پیش از تغییر مسیریاب، ffvpn را خاموش کنید.','更改路由引擎前请关闭 ffvpn。','Перед сменой механизма маршрутизации выключите ffvpn.'],
 'Email': ['ایمیل','邮箱','Электронная почта'],
 'Password': ['رمز عبور','密码','Пароль'],
 'Sign in': ['ورود','登录','Войти'],
 'Verification code or answer': ['کد تایید یا پاسخ','验证码或回答','Код подтверждения или ответ'],
 'Continue': ['ادامه','继续','Продолжить'],
 'Cancel': ['انصراف','取消','Отмена'],
 'Remove': ['حذف','删除','Удалить'],
 'Remove this account?': ['این حساب حذف شود؟','删除此账户？','Удалить эту учётную запись?'],
 'Use now': ['استفاده اکنون','立即使用','Использовать'],
 'No accounts yet.': ['هنوز حسابی اضافه نشده است.','尚无账户。','Учётных записей пока нет.'],
 'Recommended': ['پیشنهادی','推荐','Рекомендуемый'],
 'Fastest': ['سریع‌ترین','最快','Самый быстрый'],
 'Select': ['انتخاب','选择','Выбрать'],
 'Measure latency': ['سنجش تاخیر','测试延迟','Измерить задержку'],
 'Update now': ['به‌روزرسانی','更新','Обновить'],
 'Check for updates': ['بررسی','检查','Проверить'],
 'Only changed files and binary blocks are downloaded. Downloads are verified before installation.': ['فقط فایل‌ها و بلوک‌های باینری تغییرکرده دانلود می‌شوند. پیش از نصب، اصالت و درستی فایل‌ها بررسی می‌شود.','仅下载更改的文件和二进制块。安装前会验证下载内容。','Загружаются только изменённые файлы и двоичные блоки. Перед установкой загрузки проверяются.'],
 'Start the update? The connection may briefly stop.': ['به‌روزرسانی شروع شود؟ اتصال ممکن است موقتا قطع شود.','开始更新？连接可能会短暂中断。','Начать обновление? Соединение может ненадолго прерваться.'],
 'Waiting for an account': ['در انتظار حساب','等待账户','Ожидание учётной записи'],
 'Waiting for network': ['در انتظار شبکه','等待网络','Ожидание сети'],
 'Off': ['خاموش','关闭','Выключен'],
 'Error': ['خطا','错误','Ошибка'],
 'Starting': ['در حال راه‌اندازی','正在启动','Запуск'],
 'Connecting': ['در حال اتصال','正在连接','Подключение'],
 'Saved': ['ذخیره شد','已保存','Сохранено'],
 'Operation failed': ['عملیات ناموفق بود','操作失败','Операция не выполнена'],
 'Router clock configured': ['ساعت روتر تنظیم شد','路由器时间已配置','Часы маршрутизатора настроены'],
 'Whole-network routing requires PassWall2 or Zirgozar.': ['مسیریابی کل شبکه به PassWall2 یا زیرگذر نیاز دارد.','全网络路由需要 PassWall2 或 Zirgozar。','Для маршрутизации всей сети требуется PassWall2 или Zirgozar.'],
 'Unofficial client. Not affiliated with Mozilla.': ['کلاینت غیررسمی؛ بدون وابستگی به موزیلا.','非官方客户端，与 Mozilla 无关联。','Неофициальный клиент. Не связан с Mozilla.'],
 'TCP is limited to ports 80, 443, 8080 and 8443. UDP availability depends on the destination port.': ['TCP به پورت‌های ۸۰، ۴۴۳، ۸۰۸۰ و ۸۴۴۳ محدود است. دسترسی UDP به پورت مقصد بستگی دارد.','TCP 仅支持 80、443、8080 和 8443 端口。UDP 可用性取决于目标端口。','TCP ограничен портами 80, 443, 8080 и 8443. Доступность UDP зависит от порта назначения.'],
 'Website': ['وب‌سایت','网站','Сайт'],
 'Source code': ['کد منبع','源代码','Исходный код'],
 'Support': ['پشتیبانی','支持','Поддержка'],
 'Pending': ['در انتظار','等待中','Ожидание'],
 'Sign-in complete': ['ورود انجام شد','登录完成','Вход выполнен'],
 'No update has been run yet.': ['هنوز به‌روزرسانی اجرا نشده است.','尚未执行更新。','Обновление ещё не запускалось.']
};
words["Apply settings"]=["اعمال تنظیمات", "应用设置", "Применить настройки"];
words["Restore settings"]=["بازگرداندن تنظیمات", "恢复设置", "Восстановить настройки"];
words["Applying settings"]=["در حال اعمال تنظیمات", "正在应用设置", "Применение настроек"];
words["Zirgozar"]=["زیرگذر", "Zirgozar", "Zirgozar"];
words["Enable the ffvpn SOCKS proxy for local network devices without a username or password?"]=["ساکس ffvpn برای دستگاه های شبکه داخلی بدون نام کاربری و رمز روشن شود؟", "是否启用无需用户名和密码的局域网 SOCKS 代理？", "Включить SOCKS для локальной сети без имени пользователя и пароля?"];
words["This creates the ffvpn SOCKS node, enables the selected routing engine, disables its localhost proxy, and sets remote DNS to Cloudflare DoH. The other engine is disabled. Restore settings reverses these changes and preserves later manual edits."]=["گره ساکس ffvpn ساخته و موتور انتخاب شده روشن می شود. پروکسی ترافیک خود روتر خاموش و DNS روی DoH کلادفلر تنظیم می شود. موتور دیگر خاموش می شود. با بازگرداندن تنظیمات، تغییرات برمی گردد و ویرایش های بعدی شما حفظ می شود.", "创建 ffvpn SOCKS 节点并启用所选引擎，关闭本机代理，设置 Cloudflare DoH，并停用其他引擎。恢复时保留后续手动修改。", "Будет создан узел SOCKS ffvpn, включен выбранный движок, отключен прокси самого роутера и установлен Cloudflare DoH. Другой движок отключится. Восстановление сохраняет последующие ручные изменения."];
words["Add user"]=["افزودن کاربر", "添加用户", "Добавить пользователя"];
words["Copy"]=["کپی", "复制", "Копировать"];
words["Copied"]=["کپی شد", "已复制", "Скопировано"];
words["Clear logs"]=["پاک کردن گزارش", "清除日志", "Очистить журнал"];
words["Clear the displayed log history?"]=["تاریخچه نمایش داده شده پاک شود؟", "清除显示的日志历史？", "Очистить отображаемую историю?"];
words["Technical details"]=["جزئیات فنی", "技术详情", "Технические сведения"];
words["No log entries."]=["گزارشی ثبت نشده است.", "暂无日志。", "Записей нет."];
words["Proxy enabled"]=["پروکسی روشن شد", "代理已启用", "Прокси включен"];
words["Proxy disabled"]=["پروکسی خاموش شد", "代理已停用", "Прокси выключен"];
words["Connection test passed"]=["آزمایش اتصال موفق بود", "连接测试成功", "Проверка соединения успешна"];
words["Connection test failed"]=["آزمایش اتصال ناموفق بود", "连接测试失败", "Проверка соединения не удалась"];
words["Connected to server"]=["اتصال به سرور برقرار شد", "已连接服务器", "Подключено к серверу"];
words["Service started"]=["برنامه شروع به کار کرد", "服务已启动", "Служба запущена"];
words["Settings saved"]=["تنظیمات ذخیره شد", "设置已保存", "Настройки сохранены"];
words["Mozilla request failed"]=["درخواست به موزیلا ناموفق بود", "Mozilla 请求失败", "Ошибка запроса Mozilla"];
words["DNS settings"]=["تنظیمات DNS", "DNS 设置", "Настройки DNS"];
words["Interface started"]=["رابط برنامه راه اندازی شد", "界面已启动", "Интерфейс запущен"];
words["Connection error"]=["خطای اتصال", "连接错误", "Ошибка соединения"];
words["Warning"]=["هشدار", "警告", "Предупреждение"];
words["Service event"]=["رویداد برنامه", "服务事件", "Событие службы"];
words["The master switch is off. Turn it on first."]=["کلید اصلی خاموش است. ابتدا آن را روشن کنید.", "请先开启主开关。", "Сначала включите главный переключатель."];
words["Delete"]=["حذف", "删除", "Удалить"];
words["Runtime Logs"]=["گزارش عملکرد", "运行日志", "Журнал работы"];
words["Core log"]=["گزارش هسته", "核心日志", "Журнал ядра"];
words["What ffvpn does is shown here, refreshed every 5 seconds."]=["کارهای ffvpn در اینجا نمایش داده می شود و هر ۵ ثانیه تازه می شود.", "此处显示 ffvpn 的操作，每 5 秒刷新。", "Здесь показаны действия ffvpn. Обновление каждые 5 секунд."];
words["The ffvpn core messages are shown here."]=["پیام های هسته ffvpn در اینجا نمایش داده می شود.", "此处显示 ffvpn 核心消息。", "Здесь показаны сообщения ядра ffvpn."];
words['Use']=['استفاده','使用','Использовать'];
words["Ready"]=["آماده استفاده", "可用", "Готов"];
words["Reserved"]=["ذخیره", "备用", "Резерв"];
words["Sign in again"]=["نیاز به ورود دوباره", "需要重新登录", "Войдите снова"];
words["Unavailable"]=["در دسترس نیست", "不可用", "Недоступен"];
words["Quota used"]=["سهمیه مصرف شده", "已用配额", "Использовано квоты"];
words["Drag to reorder"]=["برای تغییر اولویت بکشید", "拖动以调整优先级", "Перетащите для изменения приоритета"];
words["Used traffic"]=["میزان استفاده شده", "已用流量", "Использовано"];
words["Remaining traffic"]=["میزان باقیمانده", "剩余流量", "Осталось"];
words["Total quota"]=["میزان کل", "总配额", "Общая квота"];
words["First use"]=["زمان شروع استفاده", "首次使用", "Первое использование"];
words["Traffic reset"]=["زمان ریست مصرف ترافیک", "流量重置时间", "Сброс трафика"];
words["Not recorded"]=["ثبت نشده", "未记录", "Не записано"];
words["Unlimited"]=["نامحدود", "无限", "Без ограничений"];
words['Router clock is already configured.']=['ساعت روتر از قبل تنظیم شده است.','路由器时间已设置。','Время роутера уже настроено.'];
words['Activity duration']=['مدت فعالیت','运行时长','Время работы'];
words['Check']=['بررسی','检查','Проверить'];
words['Main Switch']=['کلید اصلی','主开关','Главный переключатель'];
words["The secure connection to Mozilla timed out. Check the router internet connection and clock, then try again."]=["مهلت برقراری اتصال امن به موزیلا به پایان رسید. اینترنت و ساعت روتر را بررسی و دوباره تلاش کنید.", "与 Mozilla 的安全连接超时。请检查路由器网络和时间后重试。", "Истекло время защищенного соединения с Mozilla. Проверьте интернет и часы роутера и повторите попытку."];
words["Mozilla did not respond in time. Check the router connection and try again."]=["موزیلا در مهلت مقرر پاسخ نداد. اتصال روتر را بررسی و دوباره تلاش کنید.", "Mozilla 未及时响应。请检查路由器连接后重试。", "Mozilla не ответила вовремя. Проверьте соединение роутера и повторите попытку."];
words["The Mozilla server address could not be resolved. Check router DNS settings."]=["نشانی سرور موزیلا پیدا نشد. تنظیمات DNS روتر را بررسی کنید.", "无法解析 Mozilla 地址。请检查路由器 DNS。", "Не удалось определить адрес Mozilla. Проверьте DNS роутера."];
words["Cannot connect to Mozilla. Check the router internet connection."]=["اتصال به موزیلا ممکن نیست. اینترنت روتر را بررسی کنید.", "无法连接 Mozilla。请检查路由器网络。", "Не удалось подключиться к Mozilla. Проверьте интернет роутера."];
words['The complete release archive is downloaded and verified before installation.']=['فایل کامل نسخه دریافت و پیش از نصب بررسی می شود.','下载完整版本归档并在安装前验证。','Полный архив версии загружается и проверяется перед установкой.'];
var language = 'fa';
try { language = localStorage.getItem('ffvpn-language') || 'fa'; } catch(e) {}
if (['en','fa','zh','ru'].indexOf(language) < 0) language = 'fa';
function cleanPersian(value) {
 return String(value).replace(/سوئد/g,'\u0001').replace(/[\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06ed]/g,'').replace(/[أإ]/g,'ا').replace(/ؤ/g,'و').replace(/ئ/g,'ی').replace(/ء/g,'').replace(/\u0001/g,'سوئد');
}
return baseclass.extend({
 get: function() { return language; },
 set: function(value) { if (['en','fa','zh','ru'].indexOf(value) >= 0) { language = value; try { localStorage.setItem('ffvpn-language', value); } catch(e) {} } },
 clean: cleanPersian,
 t: function(key) { var index = ['fa','zh','ru'].indexOf(language), value=index >= 0 && words[key] ? words[key][index] : key; return language==='fa'?cleanPersian(value):value; }
});
