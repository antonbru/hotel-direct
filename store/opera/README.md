# Opera Add-ons: комплект для загрузки

Всё, что нужно для первой публикации «Прямые брони» в каталоге Opera.
Пошаговая инструкция — в [CHECKLIST.md](CHECKLIST.md), тексты — в
[LISTING.md](LISTING.md).

## Состав

| Файл | Куда |
|---|---|
| `hotel-direct-0.2.0.zip` | пакет для мастера Opera; готовый — в [Releases](https://github.com/antonbru/hotel-direct/releases/latest), локально собирается `npm run build` |
| `icons/icon-64.png` | иконка для Media: форма требует 64×64 |
| `icons/icon-128.png` | запасная иконка каталога |
| `icons/icon-512.png` | запасной размер иконки |
| `screenshots/01-ostrovok.png` | скриншот 1: карточка на Островке, 612×408 |
| `screenshots/02-101hotels.png` | скриншот 2: карточка на 101hotels, 612×408 |
| `screenshots/03-options.png` | скриншот 3: настройки, 612×408 |
| `screenshots/04-yandex.png` | скриншот 4: карточка на Яндекс Путешествиях, 612×408 |
| `promo/300x188.png` | опциональная промо-картинка для recommended, 300×188 |

## Откуда брать пакет

Готовый zip не хранится в git: его собирает workflow по тегу `v*` и прикладывает
к [GitHub Release](https://github.com/antonbru/hotel-direct/releases/latest).
Там же лежит `SHA256SUMS.txt`.

Локально:

```bash
npm run check
npm run build
cp dist/hotel-direct-0.2.0.zip store/opera/
```

## Коротко о пакете

- Manifest V3, версия `0.2.0`.
- Разрешения: `storage`, `https://tourism.fsa.gov.ru/*`.
- Content scripts: `ostrovok.ru`, `101hotels.com`.
- Никакого внешнего JS, минификации и телеметрии.
- Исходники: <https://github.com/antonbru/hotel-direct> (MIT).

SHA-256 релизного пакета — в `SHA256SUMS.txt` рядом с ассетом. У локальной
сборки хеш может отличаться из-за меток времени в zip, содержимое при этом
одинаковое.

## Как выпустить новую версию

1. Поднять версию в `extension/manifest.json` и `package.json`.
2. `npm run check`.
3. Поставить тег `vX.Y.Z` и запушить: workflow **Release** соберёт zip и
   приложит его к GitHub Release.

Пакет в git не коммитится: канонический файл — ассет релиза.

## Как пересобрать

```bash
npm run check                  # синтаксис, манифест, 27 тестов
npm run build                  # dist/hotel-direct-0.2.0.zip
cp dist/hotel-direct-0.2.0.zip store/opera/
```

Скриншоты:

```bash
node scripts/store-capture.mjs  # снимает живые страницы в .tmp/store
node scripts/store-shots.mjs    # собирает 612×408 в store/opera/screenshots
npm run promo:opera             # промо-картинка 300×188
```

`store-capture.mjs` запускает headless Chrome с распакованным расширением,
закрывает чужие модалки и cookie-баннеры, снимает страницу и карточку.
`store-shots.mjs` вставляет снимки в нейтральную рамку браузера и подсвечивает
иконку расширения на панели. Оба скрипта можно запускать повторно, но живые
страницы агрегаторов со временем меняются — проверяйте результат глазами.

## Важно

- Пакет — только `.zip`, не `.crx`.
- Внутри zip `manifest.json` должен лежать в корне, а не в папке.
- Не добавляйте `node_modules`, `.tmp`, `store`, `dist` в пакет.
- Не меняйте `name` на «Opera …» и не используйте логотип Opera.
- Версию поднимайте одновременно в `extension/manifest.json` и `package.json`.
