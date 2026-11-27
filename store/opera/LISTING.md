# Тексты для карточки Opera Add-ons

Готовые значения для мастера загрузки. Копируйте блоки целиком, без markdown-разметки:
Opera показывает описание как обычный текст с переносами строк.

## Поля формы

| Поле | Значение |
|---|---|
| Название | **Прямые брони** (12 символов, как в `manifest.json`) |
| short_name | **Прямые** (6 символов — техническое короткое имя) |
| Версия | **0.2.0** (подставляется из пакета) |
| Категория | **Productivity** (в текущей форме Opera нет Travel) |
| Лицензия | **Opera Hosting License** |
| Страница поддержки | `https://github.com/antonbru/hotel-direct` |
| Домашняя страница | `https://github.com/antonbru/hotel-direct` |
| Политика конфиденциальности | `https://github.com/antonbru/hotel-direct/raw/main/docs/PRIVACY.md` |
| Исходный код для ревью | `https://github.com/antonbru/hotel-direct` (MIT, без минификации) |
| Платформы, где проверено | **macOS 27.0.1, Opera 139.0.6053.38** |
| Иконка | `store/opera/icons/icon-128.png` (128×128 PNG) |
| Скриншоты | `store/opera/screenshots/01-ostrovok.png`, `02-101hotels.png`, `03-options.png`, `04-yandex.png` (612×408) |
| Промо-изображение (опционально) | `store/opera/promo/300x188.png` (300×188) |
| Пакет | `store/opera/hotel-direct-0.2.0.zip` |

Категория: в актуальной форме Opera списка `Travel` нет. Выбирайте
**Productivity** — это ближайшая категория для утилиты, которая добавляет
информацию на страницы. `Shopping` — запасной вариант, если хочется ближе
к бронированию, но расширение не сравнивает цены и не продаёт туры.

Название в манифесте — «Прямые брони». Если в форме есть отдельное поле
перевода названия, для английской версии укажите **Direct Bookings**; глобальное
название пакета не меняйте, иначе оно разойдётся с манифестом.

Про `short_name`: Opera-линтер режет `short_name` длиннее 12 символов. Поэтому
в манифесте `name` — «Прямые брони» (12), а `short_name` — «Прямые» (6). Это
техническое поле для тесных мест интерфейса; в каталоге и менеджере расширений
показывается `name`.

---

## Русский

### Название

```
Прямые брони
```

### Краткое описание (summary)

```
Показывает официальный сайт и телефон отеля на странице агрегатора — чтобы бронировать напрямую, без комиссии.
```

### Полное описание

```
«Прямые брони» — бесплатное расширение для Opera, которое помогает бронировать отель напрямую, а не через посредника.

На странице отеля на Островке, 101hotels или Яндекс Путешествиях расширение добавляет компактную карточку в левом нижнем углу. В карточке — название отеля, официальный сайт из Единого реестра объектов классификации (Росаккредитация) и телефон. Кнопка «Открыть сайт отеля» ведёт на официальный сайт, кнопка «Позвонить» — на телефон отеля.

Как пользоваться
1. Откройте карточку отеля на ostrovok.ru, 101hotels.com или travel.yandex.ru.
2. Дождитесь карточки «Бронирование напрямую» в левом нижнем углу.
3. Нажмите «Открыть сайт отеля» или «Позвонить».
4. Если карточка не нужна, закройте её или выберите «Больше не показывать для этого отеля».

Как это выглядит
Белая карточка с зелёным акцентом: название отеля, домен сайта, две кнопки и короткая пометка, что комиссию с брони расширение не берёт. В настройках (значок расширения на панели) можно выключить карточку целиком и сбросить список скрытых отелей.

Что важно
— Расширение не меняет цены, кнопки и ссылки агрегатора, не перехватывает клики и не подставляет партнёрские ссылки.
— Комиссию с бронирований расширение не получает.
— Данные берутся из открытого реестра tourism.fsa.gov.ru; запрос уходит только за тем отелем, который вы открыли.
— Расширение не собирает персональные данные, историю просмотров и cookies и не передаёт данные третьим лицам.
— Весь код расширения находится в пакете; внешних скриптов и удалённо загружаемого кода нет.
— Работает для российских отелей, у которых на странице агрегатора есть реестровый номер. Если сайта в реестре нет, карточка покажет телефон. Если реестрового номера на странице нет, карточка не появляется.
— На Яндекс Путешествиях при переходе между карточками без перезагрузки страницы карточка появляется после обновления страницы: расширение не показывает данные другого отеля.
— Интерфейс на русском языке.

Расширение не связано с Островком, 101hotels, Яндексом и Росаккредитацией. «Островок», «101hotels» и «Яндекс Путешествия» — товарные знаки соответствующих правообладателей.
```

---

## English

### Name

```
Direct Bookings
```

### Summary

```
Shows a hotel's official website and phone on aggregator pages, so you can book direct without a middleman.
```

### Description

```
Direct Bookings is a free Opera extension that helps you book a hotel directly instead of through a booking middleman.

On a hotel page at Ostrovok, 101hotels or Yandex Travel, the extension adds a compact card in the bottom-left corner. The card shows the hotel name, its official website from the Unified Register of Classified Accommodation Objects (Rosaccreditation), and a phone number. "Open hotel website" takes you to the official site; "Call" starts a call to the hotel.

How to use
1. Open a hotel page on ostrovok.ru, 101hotels.com or travel.yandex.ru.
2. Wait for the "Booking direct" card in the bottom-left corner.
3. Click "Open hotel website" or "Call".
4. To dismiss the card, close it or choose "Don't show for this hotel again".

What it looks like
A white card with a green accent: the hotel name, the website domain, two buttons, and a short note that the extension takes no commission from bookings. In the settings (the extension icon in the toolbar) you can turn the card off completely and reset the hidden-hotel list.

Important
- The extension does not change the aggregator's prices, buttons, links or referral parameters, and does not intercept clicks.
- It earns no commission from bookings.
- Data comes from the public registry at tourism.fsa.gov.ru; a request is made only for the hotel you opened.
- The extension collects no personal data, browsing history or cookies, and shares no data with third parties.
- All extension code is bundled in the package; there are no external or remotely loaded scripts.
- It works for Russian hotels whose page shows a registry record number. If the registry has no website, the card shows the phone number. If the page shows no registry number, no card appears.
- On Yandex Travel, when you switch between hotels without reloading the page, the card appears after you reload: the extension never shows another hotel's data.
- The interface is in Russian.

Direct Bookings is not affiliated with Ostrovok, 101hotels, Yandex or Rosaccreditation. Ostrovok, 101hotels and Yandex Travel are trademarks of their respective owners.
```

---

## Проверка перед вставкой

- В названии нет слова «Opera» и намёка на связь с Opera — требование критериев.
- Краткое описание — одно законченное предложение, отвечает на вопрос «что делает».
- Полное описание отвечает на два вопроса: «как пользоваться» и «как выглядит».
- Указаны фоновые действия: чтение ссылки на реестр со страницы и запрос к
  `tourism.fsa.gov.ru`.
- Указаны ограничения: только российские отели, только страницы со ссылкой на реестр,
  без сайта — телефон.
- Нет обещаний «дешевле на 30 %», сравнения цен и партнёрских формулировок.
- Контакты и политика конфиденциальности — рабочие ссылки.

---

## Если форма спрашивает про разрешения

Короткий ответ для поля «Permission justification»:

```
storage — local settings, the hidden-hotel list and a 30-day cache of registry responses. Nothing leaves the device.

https://tourism.fsa.gov.ru/* — the only network request: fetch the public registry record for the hotel whose page the user opened. No user data is sent.

Content scripts on ostrovok.ru, 101hotels.com and travel.yandex.ru — read the registry number and the page state already present on the hotel page the user opened; no other page data is collected. On Yandex Travel, when switching hotels in-site, the extension re-requests that same page (same origin) to get the right hotel; nothing is sent anywhere else.
```

По-русски:

```
storage — настройки, список скрытых отелей и кэш ответов реестра на 30 дней. Данные не покидают устройство.

https://tourism.fsa.gov.ru/* — единственный сетевой запрос: публичная запись реестра для отеля, страницу которого открыл пользователь. Данные пользователя не передаются.

Content scripts на ostrovok.ru, 101hotels.com и travel.yandex.ru — читают реестровый номер и состояние страницы, которые уже есть на открытой пользователем странице отеля; другие данные страницы не собираются. На Яндекс Путешествиях при переходе между отелями внутри сайта расширение перезапрашивает ту же страницу (тот же домен), чтобы взять нужный отель; больше ничего никуда не уходит.
```

## Если форма спрашивает про данные

```
The extension collects no personal data, no browsing history and no cookies. It has no analytics, no accounts and no advertising identifiers. The only external request goes to the public registry at tourism.fsa.gov.ru and contains only the hotel ID taken from the page the user opened. Settings and the registry cache are stored locally and are removed with the extension.
```

```
Расширение не собирает персональные данные, историю просмотров и cookies. В нём нет аналитики, аккаунтов и рекламных идентификаторов. Единственный внешний запрос идёт в публичный реестр tourism.fsa.gov.ru и содержит только ID отеля со страницы, которую открыл пользователь. Настройки и кэш реестра хранятся локально и удаляются вместе с расширением.
```
