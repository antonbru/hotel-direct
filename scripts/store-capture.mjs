#!/usr/bin/env node
// Снимает исходники для карточек магазина: страницы агрегаторов с карточкой,
// саму карточку и страницу настроек. Запускает headless Chrome, ставит
// распакованное расширение через CDP, убирает чужие модалки и cookie-баннеры.
//
//   node scripts/store-capture.mjs
//
// Результат: .tmp/store/*.png
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const EXTENSION = join(ROOT, 'extension');
const OUT = join(ROOT, '.tmp/store');
const PORT = 9334;
const CHROME =
  process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const VIEWPORT = { width: 1440, height: 900 };

const PAGES = [
  {
    name: 'ostrovok',
    url: 'https://ostrovok.ru/hotel/russia/moscow/mid13369156/hotel_cosmos_selection_moscow_arbat/',
  },
  {
    name: '101hotels',
    url: 'https://101hotels.com/main/cities/moskva/apart-otel_apart-otel_salyut.html',
  },
];

mkdirSync(OUT, { recursive: true });

const chrome = spawn(
  CHROME,
  [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    '--enable-unsafe-extension-debugging',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${join(ROOT, '.tmp/chrome-store')}`,
    `--window-size=${VIEWPORT.width},${VIEWPORT.height}`,
    'about:blank',
  ],
  { stdio: 'ignore' },
);

chrome.on('error', (error) => {
  console.error('не удалось запустить Chrome:', error.message);
  process.exit(1);
});

const wait = (ms) => new Promise((done) => setTimeout(done, ms));

async function waitForPort() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      if ((await fetch(`http://127.0.0.1:${PORT}/json/version`)).ok) return;
    } catch {
      /* ещё не поднялся */
    }
    await wait(250);
  }
  throw new Error('Chrome не открыл порт отладки');
}

function makeCdp(socket) {
  let nextId = 0;
  const pending = new Map();
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const { resolve: ok, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) reject(new Error(message.error.message));
      else ok(message.result);
    }
  });
  const send = (method, params = {}) =>
    new Promise((ok, reject) => {
      nextId += 1;
      pending.set(nextId, { resolve: ok, reject });
      socket.send(JSON.stringify({ id: nextId, method, params }));
    });
  return { send };
}

async function connect(wsUrl) {
  const socket = new WebSocket(wsUrl);
  await new Promise((done, fail) => {
    socket.addEventListener('open', () => done(), { once: true });
    socket.addEventListener('error', fail, { once: true });
  });
  return { socket, ...makeCdp(socket) };
}

const CLOSE_OVERLAYS = `(() => {
  const visible = (node) => {
    const rect = node.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && getComputedStyle(node).visibility !== 'hidden';
  };
  const text = (node) => (node.innerText || node.getAttribute('aria-label') || '').trim().toLowerCase();
  const buttons = [...document.querySelectorAll('button, [role="button"]')].filter(visible);
  let clicked = 0;
  for (const button of buttons) {
    const label = text(button);
    if (!/^(×|✕|x|закрыть|close|popup-close|хорошо|принять|согласен|согласна|понятно|ok)$/u.test(label)) continue;
    button.click();
    clicked += 1;
  }
  for (const node of document.querySelectorAll('[class*="cookie" i], [id*="cookie" i], [class*="Cookie" i]')) {
    if (!visible(node)) continue;
    node.style.setProperty('display', 'none', 'important');
  }
  return clicked;
})()`;

const CARD_STATE = `(() => {
  const host = document.querySelector('#hotel-direct-root');
  const card = host && host.shadowRoot && host.shadowRoot.querySelector('.card');
  if (!card) return null;
  const rect = card.getBoundingClientRect();
  return {
    text: card.innerText,
    rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
  };
})()`;

async function screenshot(send, path, clip) {
  const shot = await send('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: false,
    ...(clip ? { clip: { ...clip, scale: 1 } } : {}),
  });
  writeFileSync(path, Buffer.from(shot.data, 'base64'));
}

async function main() {
  await waitForPort();

  const version = await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json();
  const browser = await connect(version.webSocketDebuggerUrl);
  const loaded = await browser.send('Extensions.loadUnpacked', { path: EXTENSION });
  const extensionId = loaded.id;
  browser.socket.close();
  await wait(1200);
  console.log('extension id:', extensionId);

  const targets = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
  const pageTarget = targets.find((target) => target.type === 'page');
  if (!pageTarget) throw new Error('нет вкладки');

  const { send } = await connect(pageTarget.webSocketDebuggerUrl);
  await send('Runtime.enable');
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', {
    width: VIEWPORT.width,
    height: VIEWPORT.height,
    deviceScaleFactor: 1,
    mobile: false,
  });

  const pages = process.env.ONLY ? PAGES.filter((item) => item.name === process.env.ONLY) : PAGES;

  for (const item of pages) {
    console.log(`${item.name}: открываю`);
    await send('Page.navigate', { url: item.url });

    let state = null;
    for (let attempt = 0; attempt < 60; attempt += 1) {
      await wait(500);
      const result = await send('Runtime.evaluate', { expression: CARD_STATE, returnByValue: true });
      state = result.result?.value ?? null;
      if (state) break;
    }
    if (!state) {
      await screenshot(send, join(OUT, `${item.name}-page.png`));
      const debug = await send('Runtime.evaluate', {
        expression: `(() => ({
          url: location.href,
          title: document.title,
          hasRegistry: document.documentElement.innerHTML.includes('tourism.fsa.gov.ru'),
          links: [...document.querySelectorAll('a[href*="tourism.fsa.gov.ru"], [data-href*="tourism.fsa.gov.ru"]')].slice(0, 5).map((node) => node.getAttribute('href') || node.getAttribute('data-href')),
          h1: document.querySelector('h1')?.innerText || '',
          text: (document.body.innerText || '').slice(0, 400)
        }))()`,
        returnByValue: true,
      });
      console.log(debug.result?.value);
      throw new Error(`${item.name}: карточка не появилась`);
    }

    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await send('Runtime.evaluate', { expression: CLOSE_OVERLAYS, returnByValue: true });
    await wait(900);
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await send('Runtime.evaluate', { expression: CLOSE_OVERLAYS, returnByValue: true });
    await wait(400);

    if (process.env.DEBUG_BUTTONS) {
      const buttons = await send('Runtime.evaluate', {
        expression: `[...document.querySelectorAll('button, [role="button"]')]
          .filter((node) => { const r = node.getBoundingClientRect(); return r.width > 0 && r.height > 0; })
          .slice(0, 20)
          .map((node) => ({ text: (node.innerText || '').trim().slice(0, 40), aria: node.getAttribute('aria-label'), cls: String(node.className).slice(0, 80), html: node.outerHTML.slice(0, 160) }))`,
        returnByValue: true,
      });
      console.log(JSON.stringify(buttons.result?.value, null, 2));
    }

    const refreshed = await send('Runtime.evaluate', { expression: CARD_STATE, returnByValue: true });
    state = refreshed.result?.value ?? state;

    await screenshot(send, join(OUT, `${item.name}-page.png`));
    if (state?.rect) {
      const { x, y, width, height } = state.rect;
      const pad = 6;
      await screenshot(send, join(OUT, `${item.name}-card.png`), {
        x: Math.max(0, Math.round(x - pad)),
        y: Math.max(0, Math.round(y - pad)),
        width: Math.round(width + pad * 2),
        height: Math.round(height + pad * 2),
      });
    }
    console.log(`${item.name}: снято, карточка ${Math.round(state?.rect?.width ?? 0)}×${Math.round(state?.rect?.height ?? 0)}`);
  }

  console.log('options: открываю');
  await send('Page.navigate', { url: `chrome-extension://${extensionId}/options.html` });
  await wait(1200);
  await screenshot(send, join(OUT, 'options-page.png'));

  console.log('готово:', OUT);
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => {
    chrome.kill('SIGKILL');
  });
