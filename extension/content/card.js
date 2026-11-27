// Карточка «забронировать напрямую» на странице отеля.
// Классический скрипт, работает в isolated world; UI изолирован Shadow DOM.
(function () {
  'use strict';

  const HOST_ID = 'hotel-direct-root';
  const ENABLED_KEY = 'hotel-direct:enabled';
  const HIDDEN_KEY = 'hotel-direct:hidden';
  const MAX_HIDDEN = 500;

  if (window.__hotelDirectLoaded) return;
  window.__hotelDirectLoaded = true;

  const extract = globalThis.HotelDirectExtract;
  if (!extract) return;

  const STYLE = `
    :host { all: initial; }
    * { box-sizing: border-box; }
    .card {
      position: fixed;
      left: 16px;
      bottom: max(16px, env(safe-area-inset-bottom));
      width: min(336px, calc(100vw - 32px));
      z-index: 2147483000;
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 14px;
      border-radius: 14px;
      background: #ffffff;
      color: #111827;
      border: 1px solid rgba(17, 24, 39, 0.08);
      box-shadow: 0 12px 32px rgba(17, 24, 39, 0.18), 0 2px 6px rgba(17, 24, 39, 0.08);
      font: 400 13px/1.35 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      text-align: left;
    }
    .eyebrow {
      display: flex; align-items: center; gap: 6px;
      font-size: 11px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase;
      color: #0f766e;
    }
    .dot { width: 6px; height: 6px; border-radius: 50%; background: #0f766e; flex: none; }
    .name {
      font-size: 15px; font-weight: 600; line-height: 1.25; color: #111827;
      display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
      padding-right: 20px;
    }
    .host { color: #4b5563; font-size: 12px; word-break: break-all; }
    .primary {
      display: block; text-align: center; text-decoration: none;
      padding: 10px 12px; border-radius: 10px;
      background: #0f766e; color: #ffffff; font-weight: 600; font-size: 14px;
    }
    .primary:hover { background: #115e59; }
    .secondary {
      display: block; text-align: center; text-decoration: none;
      padding: 9px 12px; border-radius: 10px;
      border: 1px solid rgba(17, 24, 39, 0.16); color: #111827; font-weight: 500; font-size: 13px;
    }
    .secondary:hover { background: #f9fafb; }
    .note { color: #6b7280; font-size: 11px; line-height: 1.35; }
    .actions { display: flex; flex-direction: column; gap: 6px; margin-top: 2px; }
    .footer { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-top: 2px; }
    .hide {
      border: 0; background: none; padding: 0; cursor: pointer;
      color: #6b7280; font-size: 11px; text-decoration: underline;
    }
    .hide:hover { color: #374151; }
    .close {
      position: absolute; top: 8px; right: 8px;
      width: 24px; height: 24px; border: 0; border-radius: 8px; cursor: pointer;
      background: transparent; color: #9ca3af; font-size: 18px; line-height: 1;
    }
    .close:hover { background: #f3f4f6; color: #374151; }
    @media (max-width: 560px) {
      .card { left: 8px; right: 8px; width: auto; bottom: max(8px, env(safe-area-inset-bottom)); }
    }
  `;

  let currentUuid = null;
  let currentHref = '';
  let emptyTicks = 0;
  let host = null;
  let shadow = null;
  let busy = false;

  // Переход внутри SPA: инлайн-скрипт со состоянием остался от прошлого отеля.
  // Такие случаи разрешаем повтором запроса страницы — но не чаще трёх раз на URL.
  let staleHref = '';
  let staleAttempts = 0;
  let resolved = { href: '', data: null };

  /**
   * Запрашивает ту же страницу (свой origin, без новых разрешений) и берёт
   * SSR-состояние уже нужного отеля.
   */
  async function resolveStale(href) {
    if (staleHref === href && staleAttempts >= 3) return null;
    if (staleHref === href) staleAttempts += 1;
    else {
      staleHref = href;
      staleAttempts = 1;
    }
    try {
      const response = await fetch(href, { credentials: 'include' });
      if (!response.ok) return null;
      const hotel = extract.hotelFromYandexHtml(await response.text());
      if (!hotel || !extract.yandexSlugMatches(hotel, href)) return null;
      const data = extract.dataFromYandexHotel(hotel);
      return data.uuid ? data : null;
    } catch {
      return null;
    }
  }

  function removeCard() {
    if (host) {
      host.remove();
      host = null;
      shadow = null;
    }
  }

  function ensureHost() {
    if (host && host.isConnected) return;
    host = document.createElement('div');
    host.id = HOST_ID;
    host.style.cssText = 'all: initial;';
    shadow = host.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = STYLE;
    shadow.append(style);
    (document.body || document.documentElement).append(host);
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  function render(hotel) {
    ensureHost();
    const existing = shadow.querySelector('.card');
    if (existing) existing.remove();

    const card = el('div', 'card');
    card.setAttribute('role', 'complementary');
    card.setAttribute('aria-label', 'Бронирование напрямую');

    const close = el('button', 'close', '×');
    close.type = 'button';
    close.setAttribute('aria-label', 'Закрыть');
    close.addEventListener('click', () => removeCard());

    const eyebrow = el('div', 'eyebrow');
    eyebrow.append(el('span', 'dot'), document.createTextNode(hotel.site ? 'Бронирование напрямую' : 'Телефон отеля'));

    const name = el('div', 'name', hotel.name || 'Отель');
    const actions = el('div', 'actions');

    if (hotel.site) {
      const site = el('div', 'host', hotel.site.host);
      const link = el('a', 'primary', 'Открыть сайт отеля');
      link.href = hotel.site.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      actions.append(link);
      card.append(close, eyebrow, name, site);

      if (hotel.phone) {
        const call = el('a', 'secondary', `Позвонить ${hotel.phone.pretty}`);
        call.href = `tel:${hotel.phone.tel}`;
        actions.append(call);
      }
      card.append(actions);
    } else if (hotel.phone) {
      const call = el('a', 'primary', `Позвонить ${hotel.phone.pretty}`);
      call.href = `tel:${hotel.phone.tel}`;
      actions.append(call);
      card.append(close, eyebrow, name, actions);
    }

    const note = el(
      'div',
      'note',
      hotel.site
        ? 'Официальный сайт отеля. Комиссию с брони мы не берём.'
        : 'Сайта в реестре нет — можно позвонить напрямую.',
    );

    const footer = el('div', 'footer');
    const hide = el('button', 'hide', 'Больше не показывать для этого отеля');
    hide.type = 'button';
    hide.addEventListener('click', async () => {
      await hideHotel(currentUuid);
      removeCard();
    });
    footer.append(hide);

    card.append(note, footer);
    shadow.append(card);
  }

  async function getHidden() {
    try {
      const store = await chrome.storage.local.get(HIDDEN_KEY);
      return Array.isArray(store[HIDDEN_KEY]) ? store[HIDDEN_KEY] : [];
    } catch {
      return [];
    }
  }

  async function hideHotel(uuid) {
    if (!uuid) return;
    try {
      const list = await getHidden();
      if (list.includes(uuid)) return;
      const next = [...list, uuid].slice(-MAX_HIDDEN);
      await chrome.storage.local.set({ [HIDDEN_KEY]: next });
    } catch {
      /* расширение перезагружено — молча выходим */
    }
  }

  async function isEnabled() {
    try {
      const store = await chrome.storage.local.get(ENABLED_KEY);
      return store[ENABLED_KEY] !== false;
    } catch {
      return true;
    }
  }

  function lookup(uuid) {
    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage({ type: 'hotel:lookup', uuid }, (response) => {
          if (chrome.runtime.lastError) return resolve(null);
          resolve(response?.data ?? null);
        });
      } catch {
        resolve(null);
      }
    });
  }

  async function sync(force) {
    if (busy) return;
    if (document.hidden && !force) return;

    const href = location.href;
    const known = currentUuid !== null;

    // На той же странице отель уже определён — дальше не работаем.
    if (!force && known && href === currentHref) return;

    // Скрипт-состояние страницы сканируем только первые ~13 секунд: дальше это
    // бессмысленная нагрузка на страницах, где отеля нет вовсе.
    let data = extract.extractFromDom(document, { deep: emptyTicks < 15 });

    if (data.stale) {
      if (resolved.href === href && resolved.data) {
        data = resolved.data;
      } else {
        const fresh = await resolveStale(href);
        if (location.href !== href) return;
        if (fresh) {
          data = fresh;
          resolved = { href, data: fresh };
        }
      }
    }

    const hrefChanged = href !== currentHref;
    currentHref = href;

    if (!data.uuid) {
      emptyTicks = hrefChanged ? 1 : emptyTicks + 1;
      currentUuid = null;
      removeCard();
      return;
    }
    emptyTicks = 0;
    if (!force && data.uuid === currentUuid) return;

    currentUuid = data.uuid;

    if (!(await isEnabled())) {
      removeCard();
      return;
    }
    if ((await getHidden()).includes(data.uuid)) {
      removeCard();
      return;
    }

    busy = true;
    try {
      const hotel = await lookup(data.uuid);
      if (currentUuid !== data.uuid) return;
      if (!hotel || (!hotel.site && !hotel.phone)) {
        removeCard();
        return;
      }
      // Название со страницы агрегатора понятнее реестрового («Отель X» вместо «X отель»).
      if (data.name && data.name.trim().length >= 4) hotel.name = data.name.trim();
      render(hotel);
    } finally {
      busy = false;
    }
  }

  sync(true);
  setInterval(() => sync(false), 900);

  chrome.storage.onChanged.addListener((changes) => {
    if (ENABLED_KEY in changes) {
      if (changes[ENABLED_KEY].newValue === false) removeCard();
      else sync(true);
    }
  });
})();
