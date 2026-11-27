// Извлечение идентификатора отеля со страницы агрегатора.
// Классический скрипт: content scripts не поддерживают ES-модули.
(function () {
  'use strict';

  const UUID_RE =
    /\/resorts\/hotels\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/iu;
  const REG_NUMBER_RE = /С\d{12}/u;

  function uuidFromUrl(url) {
    if (typeof url !== 'string') return null;
    const match = url.match(UUID_RE);
    return match ? match[1].toLowerCase() : null;
  }

  function pickUuid(urls) {
    if (!urls || typeof urls[Symbol.iterator] !== 'function') return null;
    for (const url of urls) {
      const uuid = uuidFromUrl(url);
      if (uuid) return uuid;
    }
    return null;
  }

  function regNumberFromText(text) {
    if (typeof text !== 'string') return '';
    const match = text.match(REG_NUMBER_RE);
    return match ? match[0] : '';
  }

  function attrValue(element, name) {
    if (!element || typeof element.getAttribute !== 'function') return '';
    return element.getAttribute(name) || '';
  }

  function textOf(element) {
    if (!element) return '';
    if (typeof element.textContent === 'string') return element.textContent;
    return '';
  }

  function isHotelNode(node) {
    return (
      node &&
      typeof node === 'object' &&
      (node['@type'] === 'Hotel' || node['@type'] === 'LodgingBusiness')
    );
  }

  function readHotelNode(node, result) {
    if (!result.name && typeof node.name === 'string') result.name = node.name.trim();
    if (!result.street && node.address && typeof node.address === 'object') {
      const street = node.address.streetAddress;
      if (typeof street === 'string') result.street = street.trim();
    }
    if (result.lat === null && node.geo && typeof node.geo === 'object') {
      const lat = Number(node.geo.latitude);
      const lng = Number(node.geo.longitude);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        result.lat = lat;
        result.lng = lng;
      }
    }
  }

  /**
   * Разбирает JSON-LD блоки и достаёт отель.
   * Сначала смотрит верхний уровень (карточка отеля), и только потом вложенные
   * ItemList — иначе на странице отеля можно поймать соседний отель из блока «похожие».
   */
  function parseJsonLdHotel(blocks) {
    const result = { name: '', street: '', lat: null, lng: null };
    if (!Array.isArray(blocks)) return result;

    const parsed = [];
    for (const block of blocks) {
      try {
        parsed.push(JSON.parse(block));
      } catch {
        /* битый блок пропускаем */
      }
    }

    for (const data of parsed) {
      const nodes = Array.isArray(data) ? data : [data];
      for (const node of nodes) {
        if (isHotelNode(node)) readHotelNode(node, result);
      }
    }
    if (result.name) return result;

    for (const data of parsed) {
      const queue = Array.isArray(data) ? [...data] : [data];
      while (queue.length) {
        const node = queue.shift();
        if (!node || typeof node !== 'object') continue;
        if (Array.isArray(node.itemListElement)) queue.push(...node.itemListElement);
        if (node.item && typeof node.item === 'object') queue.push(node.item);
        if (isHotelNode(node)) readHotelNode(node, result);
      }
    }
    return result;
  }

  /**
   * Запасной путь: ссылка на реестр часто лежит не в DOM, а в состоянии страницы
   * (Next.js `__NEXT_DATA__`, `facts.register.link`), потому что Ostrovok не всегда
   * рендерит блок «Аккредитация».
   */
  function scanScripts(doc) {
    const urls = [];
    let record = '';
    for (const script of doc.querySelectorAll('script')) {
      const text = textOf(script);
      if (!text || text.length < 40) continue;
      if (text.includes('tourism.fsa.gov.ru')) {
        const match = text.match(/tourism\.fsa\.gov\.ru\/ru\/resorts\/hotels\/[0-9a-f-]{36}/iu);
        if (match) urls.push(match[0]);
      }
      if (!record) record = regNumberFromText(text);
    }
    return { urls, record };
  }

  function readMeta(doc, selector) {
    const element = doc.querySelector(selector);
    if (!element) return '';
    return attrValue(element, 'content') || textOf(element).trim();
  }

  /**
   * @param {Document} doc — документ страницы агрегатора.
   * @returns {{uuid: string|null, name: string, street: string, lat: number|null, lng: number|null, regNumber: string, aggregator: string}}
   */
  function extractFromDom(doc, options = {}) {
    const aggregator = String(doc.location?.hostname || '').replace(/^www\./u, '');
    const urls = [];
    let regNumber = '';

    const links = doc.querySelectorAll(
      'a[href*="tourism.fsa.gov.ru"], [data-href*="tourism.fsa.gov.ru"]',
    );
    for (const link of links) {
      const raw = attrValue(link, 'href') || attrValue(link, 'data-href');
      if (raw) urls.push(raw);
      if (!regNumber) regNumber = regNumberFromText(textOf(link));
    }

    let uuid = pickUuid(urls);
    if (!uuid && options.deep !== false) {
      const scanned = scanScripts(doc);
      uuid = pickUuid(scanned.urls);
      if (!regNumber) regNumber = scanned.record;
    }

    const jsonLd = [];
    for (const script of doc.querySelectorAll('script[type="application/ld+json"]')) {
      jsonLd.push(textOf(script));
    }
    const hotel = parseJsonLdHotel(jsonLd);

    const name =
      hotel.name ||
      textOf(doc.querySelector('h1')).trim() ||
      String(doc.title || '').trim();

    const lat = Number(readMeta(doc, '[itemprop="latitude"]')) || hotel.lat;
    const lng = Number(readMeta(doc, '[itemprop="longitude"]')) || hotel.lng;

    return {
      uuid,
      name,
      street: hotel.street || readMeta(doc, '[itemprop="streetAddress"]'),
      lat: Number.isFinite(lat) ? lat : null,
      lng: Number.isFinite(lng) ? lng : null,
      regNumber,
      aggregator,
    };
  }

  globalThis.HotelDirectExtract = {
    uuidFromUrl,
    pickUuid,
    regNumberFromText,
    parseJsonLdHotel,
    extractFromDom,
  };
})();
