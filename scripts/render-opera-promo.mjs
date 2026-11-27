#!/usr/bin/env node
// Промо-картинка 300×188 для карточки Opera Add-ons (блок recommended).
// Рисуется HTML/CSS в headless Chrome, шрифт — Tilda Sans из docs/promo/assets.
//
//   node scripts/render-opera-promo.mjs
//
// Результат: store/opera/promo/300x188.png
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'store/opera/promo');
const OUT = join(OUT_DIR, '300x188.png');
const TMP = join(ROOT, '.tmp/opera-promo@2x.png');
const CHROME =
  process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

mkdirSync(OUT_DIR, { recursive: true });
mkdirSync(dirname(TMP), { recursive: true });

const font = readFileSync(join(ROOT, 'docs/promo/assets/TildaSans-VF.ttf')).toString('base64');
const icon = readFileSync(join(ROOT, 'extension/icons/icon128.png')).toString('base64');

const html = `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<style>
  @font-face {
    font-family: "Tilda Sans";
    src: url(data:font/ttf;base64,${font}) format("truetype");
    font-weight: 100 900;
    font-display: block;
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; width: 300px; height: 188px; overflow: hidden; }
  body {
    position: relative;
    background: #0a3a36;
    color: #fff;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
  }
  .bg {
    position: absolute; inset: 0;
    background:
      radial-gradient(120% 150% at 100% 0%, #12746b 0%, #0a3a36 52%, #072b27 100%);
  }
  .glow {
    position: absolute; right: -36px; top: -42px; width: 190px; height: 190px;
    background: radial-gradient(circle, rgba(94, 234, 212, 0.16), rgba(94, 234, 212, 0) 66%);
  }
  .logo {
    position: absolute; left: 16px; top: 16px; width: 40px; height: 40px;
    border-radius: 9px; overflow: hidden;
    box-shadow: 0 5px 14px rgba(0, 0, 0, 0.3);
  }
  .logo img { width: 100%; height: 100%; display: block; }
  .name {
    position: absolute; left: 16px; top: 60px;
    font-family: "Tilda Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    font-weight: 700; font-size: 21px; line-height: 1; letter-spacing: -0.3px;
    white-space: nowrap;
  }
  .tagline {
    position: absolute; left: 16px; top: 88px; width: 156px;
    font-size: 10.5px; line-height: 1.38; color: #99f6e4; letter-spacing: 0.05px;
  }
  .tagline b { font-weight: 600; color: #ccfbf1; }
  .places {
    position: absolute; left: 16px; bottom: 15px;
    font-size: 8px; letter-spacing: 0.2px; color: rgba(204, 251, 241, 0.62);
    text-transform: uppercase;
  }
  .card {
    position: absolute; left: 189px; top: 31px; width: 96px; height: 126px;
    background: #fff; border-radius: 9px; padding: 8px;
    box-shadow: 0 12px 28px rgba(0, 0, 0, 0.4), 0 2px 5px rgba(0, 0, 0, 0.2);
    color: #111827;
  }
  .eyebrow { display: flex; align-items: center; gap: 3px; margin-bottom: 7px; }
  .eyebrow i { width: 3.5px; height: 3.5px; border-radius: 50%; background: #0f766e; }
  .eyebrow span { width: 38px; height: 2.5px; border-radius: 2px; background: #0f766e; opacity: 0.85; }
  .title span { display: block; height: 5px; border-radius: 2px; background: #111827; }
  .title span:first-child { width: 76px; margin-bottom: 3px; }
  .title span:last-child { width: 54px; }
  .domain { width: 44px; height: 2.5px; border-radius: 2px; background: #9ca3af; margin: 6px 0 8px; }
  .btn {
    height: 18px; border-radius: 5px; background: #0f766e; color: #fff;
    display: flex; align-items: center; justify-content: center;
    font-size: 7px; font-weight: 600; letter-spacing: 0.1px; margin-bottom: 4px;
  }
  .btn.ghost {
    height: 14px; background: #fff; color: #111827; border: 0.8px solid #d1d5db;
    font-weight: 500; font-size: 6.4px; margin-bottom: 7px;
  }
  .note span { display: block; height: 2px; border-radius: 2px; background: #d1d5db; }
  .note span:first-child { width: 58px; margin-bottom: 2.5px; }
  .note span:last-child { width: 42px; }
</style>
</head>
<body>
  <div class="bg"></div><div class="glow"></div>
  <div class="logo"><img src="data:image/png;base64,${icon}" alt=""></div>
  <div class="name">Прямые брони</div>
  <div class="tagline">Сайт и телефон отеля<br><b>без комиссии посредника</b></div>
  <div class="places">Островок · 101hotels</div>
  <div class="card">
    <div class="eyebrow"><i></i><span></span></div>
    <div class="title"><span></span><span></span></div>
    <div class="domain"></div>
    <div class="btn">Открыть сайт</div>
    <div class="btn ghost">Позвонить</div>
    <div class="note"><span></span><span></span></div>
  </div>
</body>
</html>`;

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const page = await browser.newPage({
  viewport: { width: 300, height: 188 },
  deviceScaleFactor: 2,
});
await page.setContent(html, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: TMP, type: 'png' });
await browser.close();

execFileSync('sips', ['-z', '188', '300', TMP, '--out', OUT], { stdio: 'ignore' });
rmSync(TMP, { force: true });
console.log(`${OUT}: 300×188`);
