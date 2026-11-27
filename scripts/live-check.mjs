#!/usr/bin/env node
// Живая проверка расширения: запускает headless Chrome, ставит распакованное
// расширение через CDP, открывает страницу отеля и проверяет, что карточка
// отрисовалась.
//
//   node scripts/live-check.mjs [url]
//
// Нужен установленный Chrome. Скриншот кладётся в .tmp/live.png.
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const EXTENSION = join(ROOT, 'extension');
const PORT = 9333;
const CHROME =
  process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const URL_TO_CHECK =
  process.argv[2] ||
  'https://ostrovok.ru/hotel/russia/moscow/mid13369156/hotel_cosmos_selection_moscow_arbat/';

mkdirSync(join(ROOT, '.tmp'), { recursive: true });

const chrome = spawn(
  CHROME,
  [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--hide-scrollbars',
    '--enable-unsafe-extension-debugging',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${join(ROOT, '.tmp/chrome-live')}`,
    '--window-size=1280,900',
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
  const events = [];
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const { resolve: ok, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) reject(new Error(message.error.message));
      else ok(message.result);
    } else if (message.method) {
      events.push(message);
    }
  });
  const send = (method, params = {}) =>
    new Promise((ok, reject) => {
      nextId += 1;
      pending.set(nextId, { resolve: ok, reject });
      socket.send(JSON.stringify({ id: nextId, method, params }));
    });
  return { send, events };
}

async function connect(wsUrl) {
  const socket = new WebSocket(wsUrl);
  await new Promise((done, fail) => {
    socket.addEventListener('open', () => done(), { once: true });
    socket.addEventListener('error', fail, { once: true });
  });
  return { socket, ...makeCdp(socket) };
}

async function main() {
  await waitForPort();

  // Расширение ставим через CDP: флаг --load-extension в Chrome 137+ отключён.
  const version = await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json();
  const browser = await connect(version.webSocketDebuggerUrl);
  await browser.send('Extensions.loadUnpacked', { path: EXTENSION });
  browser.socket.close();
  await wait(1500);

  const targets = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
  const page = targets.find((target) => target.type === 'page');
  if (!page) throw new Error('нет вкладки для проверки');

  const { socket, send, events } = await connect(page.webSocketDebuggerUrl);
  await send('Runtime.enable');
  await send('Page.enable');
  await send('Page.navigate', { url: URL_TO_CHECK });

  let text = '';
  for (let attempt = 0; attempt < 40; attempt += 1) {
    await wait(500);
    const result = await send('Runtime.evaluate', {
      expression: `(() => {
        const host = document.querySelector('#hotel-direct-root');
        const card = host && host.shadowRoot && host.shadowRoot.querySelector('.card');
        return card ? card.innerText : '';
      })()`,
      returnByValue: true,
    });
    text = result.result?.value ?? '';
    if (text) break;
  }

  const shot = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(join(ROOT, '.tmp/live.png'), Buffer.from(shot.data, 'base64'));

  const problems = events
    .filter((message) => message.method === 'Runtime.exceptionThrown')
    .map((message) => message.params.exceptionDetails?.exception?.description ?? 'exception');
  socket.close();

  if (!text) {
    console.error('карточка не появилась');
    if (problems.length) console.error('ошибки:', problems.slice(0, 5));
    process.exitCode = 1;
    return;
  }

  console.log('карточка отрисована:');
  console.log(
    text
      .split('\n')
      .map((line) => `  ${line}`)
      .join('\n'),
  );
  console.log('скриншот: .tmp/live.png');
  if (problems.length) console.log('ошибки:', problems.slice(0, 5));
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => {
    chrome.kill('SIGKILL');
  });
