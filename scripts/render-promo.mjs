// Рендер промо-ролика: HTML-сцена (docs/promo/index.html) -> PNG-кадры.
// Кадры детерминированы: сцена рисуется функцией setTime(t), без CSS-анимаций.
//
//   npm install && npm run promo                 # 30 с, 30 fps -> /tmp/promo-frames
//   node scripts/render-promo.mjs --frames /tmp/x --from 9 --to 12
//
// Дальше кадры кодируются в mp4 (см. docs/promo/README.md).

import { createServer } from 'node:http';
import { readFile, mkdir, rm, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = path.join(ROOT, 'docs/promo');

const args = process.argv.slice(2);
const arg = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : def;
};
const FPS = Number(arg('fps', 30));
const DUR = Number(arg('dur', 30));
const W = Number(arg('w', 1920));
const H = Number(arg('h', 1080));
const FRAMES = path.resolve(arg('frames', '/tmp/promo-frames'));
const FROM = Number(arg('from', 0));
const TO = Math.min(DUR, Number(arg('to', DUR)));
const PORT = Number(arg('port', 8899));

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.ttf': 'font/ttf',
  '.png': 'image/png',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
};

async function findChrome() {
  if (process.env.PROMO_CHROME && existsSync(process.env.PROMO_CHROME)) {
    return process.env.PROMO_CHROME;
  }
  const cache = path.join(homedir(), 'Library/Caches/ms-playwright');
  if (existsSync(cache)) {
    const dirs = (await readdir(cache)).filter((d) => d.startsWith('chromium-')).sort().reverse();
    for (const d of dirs) {
      const p = path.join(cache, d, 'chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing');
      if (existsSync(p)) return p;
    }
  }
  const system = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  if (existsSync(system)) return system;
  throw new Error('Не нашёл Chrome: задай PROMO_CHROME');
}

function serve() {
  return new Promise((resolve) => {
    const server = createServer(async (req, res) => {
      try {
        const url = new URL(req.url, 'http://localhost');
        const rel = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
        const file = path.join(SITE, rel);
        if (!file.startsWith(SITE)) return res.writeHead(403).end();
        const buf = await readFile(file);
        res.writeHead(200, {
          'content-type': MIME[path.extname(file)] || 'application/octet-stream',
          'cache-control': 'no-store',
        });
        res.end(buf);
      } catch {
        res.writeHead(404).end();
      }
    });
    server.listen(PORT, '127.0.0.1', () => resolve(server));
  });
}

async function main() {
  await rm(FRAMES, { recursive: true, force: true });
  await mkdir(FRAMES, { recursive: true });

  const server = await serve();
  const exe = await findChrome();
  console.log(`chrome: ${path.basename(exe)}`);

  const browser = await chromium.launch({ executablePath: exe, args: ['--hide-scrollbars'] });
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });

  try {
    await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'load' });
    await page.evaluate(() => window.__ready);

    const total = Math.round(DUR * FPS);
    const start = Math.round(FROM * FPS);
    const end = Math.round(TO * FPS);
    const t0 = Date.now();

    for (let i = start; i < end; i++) {
      const t = i / FPS;
      await page.evaluate((tt) => window.setTime(tt), t);
      await page.screenshot({
        path: path.join(FRAMES, `f_${String(i).padStart(4, '0')}.png`),
        type: 'png',
        animations: 'disabled',
      });
      if (i % 60 === 0) {
        const rate = (i - start + 1) / ((Date.now() - t0) / 1000);
        console.log(`frame ${i}/${end - 1} · ${rate.toFixed(1)} fps`);
      }
    }
    console.log(`готово: ${end - start} кадров -> ${FRAMES}`);
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
