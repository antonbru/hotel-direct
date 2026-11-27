#!/usr/bin/env node
// Собирает скриншоты 612×408 для карточки Opera Add-ons из живых снимков
// .tmp/store/*.png: окно браузера, панель с иконкой расширения и крупный
// фрагмент страницы с карточкой.
//
//   node scripts/store-capture.mjs   # исходники
//   node scripts/store-shots.mjs     # готовые PNG в store/opera/screenshots
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, '.tmp/store');
const OUT = join(ROOT, 'store/opera/screenshots');
const CHROME =
  process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const WIDTH = 612;
const HEIGHT = 408;

mkdirSync(OUT, { recursive: true });

const base64 = (path) => readFileSync(path).toString('base64');
const dataUri = (path) => `data:image/png;base64,${base64(path)}`;

const ICON = dataUri(join(ROOT, 'extension/icons/icon32.png'));

const SHOTS = [
  {
    file: '01-ostrovok.png',
    tab: 'Cosmos Selection Москва Арбат — Островок',
    url: 'ostrovok.ru/hotel/russia/moscow/mid13369156/hotel_cosmos…',
    image: dataUri(join(SRC, 'ostrovok-page.png')),
    // Страница 1440×900: показываем x 0–760, y 483–900 (карточка + фото отеля).
    scale: 584 / 760,
    top: 483,
  },
  {
    file: '02-101hotels.png',
    tab: 'Апартаменты Happy Home — 101Hotels',
    url: '101hotels.com/main/cities/moskva/apart-otel_apart-otel_salyut.html',
    image: dataUri(join(SRC, '101hotels-page.png')),
    scale: 584 / 760,
    top: 470,
  },
  {
    file: '03-options.png',
    tab: 'Настройки — Прямые брони',
    url: 'opera-extension://hotel-direct/options.html',
    image: dataUri(join(SRC, 'options-page.png')),
    // Страница настроек: центральная колонка 800 px, верхние 440 px.
    scale: 584 / 800,
    left: 330,
    top: 6,
  },
];

const LOCK = `<svg viewBox="0 0 16 16" width="10" height="10" aria-hidden="true"><path fill="#5f6368" d="M8 1a3 3 0 0 0-3 3v2H4.5A1.5 1.5 0 0 0 3 7.5v6A1.5 1.5 0 0 0 4.5 15h7a1.5 1.5 0 0 0 1.5-1.5v-6A1.5 1.5 0 0 0 11.5 6H11V4a3 3 0 0 0-3-3Zm-1.5 5V4a1.5 1.5 0 1 1 3 0v2h-3Z"/></svg>`;

const AVATAR = `<svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true"><circle cx="10" cy="10" r="9" fill="#e5e7eb"/><circle cx="10" cy="7.5" r="3" fill="#9ca3af"/><path d="M4.5 16c1-2.6 3-3.9 5.5-3.9s4.5 1.3 5.5 3.9" fill="#9ca3af"/></svg>`;

function html(shot) {
  const width = Math.round(1440 * shot.scale);
  const left = Math.round((shot.left ?? 0) * shot.scale);
  const top = Math.round(shot.top * shot.scale);

  return `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; width: ${WIDTH}px; height: ${HEIGHT}px; background: #fff; }
  body { font: 400 13px/1.35 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; -webkit-font-smoothing: antialiased; }
  .window {
    position: absolute; left: 14px; top: 12px; width: 584px; height: 384px;
    border-radius: 11px; overflow: hidden; background: #f1f3f4;
    border: 1px solid #d8dce1;
    box-shadow: 0 10px 26px rgba(15, 23, 42, 0.14), 0 2px 5px rgba(15, 23, 42, 0.06);
  }
  .tabs { height: 28px; background: #dfe3e8; display: flex; align-items: flex-end; padding: 0 8px; gap: 4px; }
  .tab {
    height: 24px; width: 246px; background: #f1f3f4; border-radius: 7px 7px 0 0;
    display: flex; align-items: center; gap: 6px; padding: 0 8px; color: #3c4043;
    font-size: 10px; letter-spacing: -0.1px; white-space: nowrap; overflow: hidden;
  }
  .favicon { width: 10px; height: 10px; border-radius: 3px; flex: none; background: #0f766e; opacity: .9; }
  .tab span { overflow: hidden; text-overflow: ellipsis; }
  .tab .close { margin-left: auto; color: #80868b; font-size: 12px; line-height: 1; }
  .newtab { color: #5f6368; font-size: 14px; line-height: 1; padding: 0 4px 3px; }
  .toolbar { height: 36px; background: #f1f3f4; display: flex; align-items: center; gap: 3px; padding: 0 7px; }
  .nav { display: flex; align-items: center; gap: 1px; color: #5f6368; }
  .nav div { width: 20px; height: 20px; display: grid; place-items: center; font-size: 13px; line-height: 1; }
  .address {
    flex: 1; height: 24px; margin: 0 5px; background: #fff; border: 1px solid #dadce0;
    border-radius: 12px; display: flex; align-items: center; gap: 5px; padding: 0 9px;
    font-size: 10px; color: #202124; white-space: nowrap; overflow: hidden;
  }
  .address span { overflow: hidden; text-overflow: ellipsis; }
  .ext {
    width: 26px; height: 26px; border-radius: 7px; display: grid; place-items: center;
    background: #fff; box-shadow: 0 0 0 2px #0f766e, 0 1px 3px rgba(15, 23, 42, .18);
    flex: none;
  }
  .ext img { width: 18px; height: 18px; display: block; }
  .avatar { width: 24px; height: 24px; display: grid; place-items: center; margin-left: 3px; }
  .content { position: relative; width: 584px; height: 320px; overflow: hidden; background: #fff; }
  .content img { position: absolute; width: ${width}px; height: auto; left: ${-left}px; top: ${-top}px; }
</style>
</head>
<body>
  <div class="window">
    <div class="tabs">
      <div class="tab"><i class="favicon"></i><span>${shot.tab}</span><span class="close">×</span></div>
      <div class="newtab">+</div>
    </div>
    <div class="toolbar">
      <div class="nav"><div>‹</div><div>›</div><div>⟳</div></div>
      <div class="address">${LOCK}<span>${shot.url}</span></div>
      <div class="ext"><img src="${ICON}" alt=""></div>
      <div class="avatar">${AVATAR}</div>
    </div>
    <div class="content"><img src="${shot.image}" alt=""></div>
  </div>
</body>
</html>`;
}

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 1 });

for (const shot of SHOTS) {
  await page.setContent(html(shot), { waitUntil: 'load' });
  await page.evaluate(() => Promise.all([...document.images].map((img) => img.decode())));
  const path = join(OUT, shot.file);
  await page.screenshot({ path, type: 'png' });
  const size = readFileSync(path).length;
  console.log(`${shot.file}: ${WIDTH}×${HEIGHT}, ${size} байт`);
}

await browser.close();
