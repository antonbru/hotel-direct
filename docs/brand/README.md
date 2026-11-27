# Логотип

Иконка расширения и бренд-исходники.

| Файл | Что это |
|---|---|
| `icon.svg` | исходник 1024×1024: скруглённый квадрат `#0F766E` + белый ключ |
| `icon-1024.png` | тот же исходник в растре (из него собираются размеры) |
| `icon-options.png` | лист сравнения вариантов (для истории) |

## Что за ключ

Глиф — [`key-fill`](https://phosphoricons.com/?q=key) из Phosphor Icons,
лицензия [MIT](https://github.com/phosphor-icons/core/blob/main/LICENSE).
Взята заливка, а не контур: в панели браузера иконка живёт в 16 px, и контур там
разваливается в пятно.

Параметры: фон `#0F766E`, скругление 22 % (228 из 1024), глиф 58 % поля,
оптический сдвиг +4/−4 px от геометрического центра (ключ тяжелее влево-вниз).

## Как пересобрать

Размеры расширения собираются из `icon-1024.png`:

```bash
npm run icons   # нужен Pillow
```

Если меняется сам SVG — перерисовать растры headless Chrome:

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless=new --no-sandbox --disable-gpu --hide-scrollbars \
  --default-background-color=00000000 \
  --virtual-time-budget=3000 --window-size=1024,1024 \
  --screenshot=docs/brand/icon-1024.png \
  "file://$PWD/docs/brand/icon.svg"
```

Затем `npm run icons`.

## Правила

- Не менять цвет фона и скругление без причины: иконка должна совпадать с карточкой
  в интерфейсе (`#0F766E`).
- Не делать контурную версию для 16 px.
- Не добавлять текст и мелкие детали: в 16 px от них остаются артефакты.
