// Service worker: единственное место, откуда идут сетевые запросы.
// Браузерный fetch из content script режет CORS (у реестра нет Access-Control-Allow-Origin),
// а у service worker'а с host_permissions CORS нет.
import { pickFromRegistry } from './lib/registry.js';

const API = 'https://tourism.fsa.gov.ru/api/v1/resorts/hotels';
const CACHE_PREFIX = 'reg:';
const TTL_OK = 30 * 24 * 60 * 60 * 1000;
const TTL_EMPTY = 7 * 24 * 60 * 60 * 1000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u;

async function readCache(key) {
  const store = await chrome.storage.local.get(key);
  const entry = store[key];
  if (!entry || typeof entry !== 'object') return null;
  const ttl = entry.data ? TTL_OK : TTL_EMPTY;
  if (Date.now() - Number(entry.ts || 0) > ttl) return null;
  return entry.data ?? null;
}

function writeCache(key, data) {
  return chrome.storage.local.set({ [key]: { ts: Date.now(), data: data ?? null } });
}

async function fetchHotel(uuid) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  try {
    const response = await fetch(`${API}/${uuid}/main`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) return null;
    const data = await response.json();
    return pickFromRegistry(data);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function lookup(uuid) {
  if (!UUID_RE.test(String(uuid))) return null;
  const key = CACHE_PREFIX + uuid;
  const cached = await readCache(key);
  if (cached !== null) return cached;

  // Один повтор на сетевой сбой: гос-API иногда отвечает 502.
  let data = await fetchHotel(uuid);
  if (!data) {
    await new Promise((resolve) => setTimeout(resolve, 400));
    data = await fetchHotel(uuid);
  }
  if (data) await writeCache(key, data);
  return data;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== 'hotel:lookup') return undefined;
  lookup(message.uuid)
    .then((data) => sendResponse({ ok: true, data }))
    .catch(() => sendResponse({ ok: false, data: null }));
  return true; // ответ асинхронный
});

chrome.action.onClicked.addListener(() => {
  chrome.runtime.openOptionsPage();
});
