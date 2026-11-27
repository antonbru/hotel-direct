import assert from 'node:assert/strict';
import { test } from 'node:test';

import '../extension/content/extract.js';

const { uuidFromUrl, pickUuid, regNumberFromText, parseJsonLdHotel, extractFromDom } =
  globalThis.HotelDirectExtract;

const OSTROVOK_UUID = '4b943899-6153-11f0-bb42-5b3927de99dd';
const HOTELS101_UUID = '84d6eac9-c608-11ef-92da-9d83a6d25c52';

const ostrovokJsonLd = JSON.stringify({
  '@context': 'http://schema.org',
  '@type': 'Hotel',
  identifier: '13369156',
  name: 'Отель Cosmos Selection Москва Арбат',
  address: {
    '@type': 'PostalAddress',
    postalCode: '119019',
    streetAddress: 'улица Новый Арбат, 2, Москва',
  },
  geo: { '@type': 'PostalAddress', latitude: '55.75326156616211', longitude: '37.59944534301758' },
});

const listJsonLd = JSON.stringify({
  '@context': 'http://schema.org',
  '@type': 'ItemList',
  itemListElement: [
    { '@type': 'ListItem', item: { '@type': 'Hotel', name: 'чужой отель' } },
    { '@type': 'ListItem', item: { '@type': 'Hotel', name: 'второй отель' } },
  ],
});

function node(text, attrs = {}) {
  return {
    textContent: text,
    getAttribute: (name) => (name in attrs ? attrs[name] : null),
  };
}

function fakeDoc({
  links = [],
  jsonLd = [],
  scripts = [],
  h1 = '',
  title = '',
  props = {},
  hostname = 'ostrovok.ru',
}) {
  return {
    location: { hostname },
    title,
    querySelector(selector) {
      if (selector === 'h1') return h1 ? node(h1) : null;
      const match = selector.match(/itemprop="([^"]+)"/u);
      if (match && props[match[1]] !== undefined) {
        return node(String(props[match[1]]), { content: String(props[match[1]]) });
      }
      return null;
    },
    querySelectorAll(selector) {
      if (selector.includes('tourism.fsa.gov.ru')) {
        return links.map((link) => node(link.text ?? '', link.attrs ?? {}));
      }
      if (selector.includes('ld+json')) return jsonLd.map((block) => node(block));
      if (selector === 'script') return scripts.map((block) => node(block));
      return [];
    },
  };
}

test('uuidFromUrl вытаскивает UUID из ссылки реестра', () => {
  assert.equal(
    uuidFromUrl(`https://tourism.fsa.gov.ru/ru/resorts/hotels/${OSTROVOK_UUID}/about-resort`),
    OSTROVOK_UUID,
  );
  assert.equal(
    uuidFromUrl(`tourism.fsa.gov.ru/ru/resorts/hotels/${HOTELS101_UUID}/about-resort`),
    HOTELS101_UUID,
  );
  assert.equal(uuidFromUrl('https://example.com/hotel/123'), null);
  assert.equal(uuidFromUrl(null), null);
});

test('pickUuid берёт первый валидный', () => {
  assert.equal(pickUuid(['https://example.com', `https://tourism.fsa.gov.ru/ru/resorts/hotels/${OSTROVOK_UUID}/about-resort`]), OSTROVOK_UUID);
  assert.equal(pickUuid([]), null);
});

test('regNumberFromText находит номер реестровой записи', () => {
  assert.equal(regNumberFromText('Реестровая запись: С772025005143'), 'С772025005143');
  assert.equal(regNumberFromText('нет номера'), '');
});

test('parseJsonLdHotel читает Hotel и не путается в ItemList', () => {
  const hotel = parseJsonLdHotel([listJsonLd, ostrovokJsonLd]);
  assert.equal(hotel.name, 'Отель Cosmos Selection Москва Арбат');
  assert.equal(hotel.street, 'улица Новый Арбат, 2, Москва');
  assert.ok(Math.abs(hotel.lat - 55.75326156616211) < 1e-9);
  assert.ok(Math.abs(hotel.lng - 37.59944534301758) < 1e-9);
  assert.deepEqual(parseJsonLdHotel(['{ битый json']), { name: '', street: '', lat: null, lng: null });
});

test('extractFromDom на разметке Островка', () => {
  const data = extractFromDom(
    fakeDoc({
      links: [{ text: 'С772025005143', attrs: { href: `https://tourism.fsa.gov.ru/ru/resorts/hotels/${OSTROVOK_UUID}/about-resort` } }],
      jsonLd: [ostrovokJsonLd],
      h1: 'Отель Cosmos Selection Москва Арбат 4*',
      title: 'Отель Cosmos — Ostrovok',
    }),
  );

  assert.equal(data.uuid, OSTROVOK_UUID);
  assert.equal(data.regNumber, 'С772025005143');
  assert.equal(data.name, 'Отель Cosmos Selection Москва Арбат');
  assert.equal(data.street, 'улица Новый Арбат, 2, Москва');
  assert.equal(data.aggregator, 'ostrovok.ru');
  assert.ok(Number.isFinite(data.lat));
});

test('extractFromDom на разметке 101hotels (data-href, микроразметка)', () => {
  const data = extractFromDom(
    fakeDoc({
      hostname: '101hotels.com',
      links: [{ text: 'С772024011823', attrs: { 'data-href': `https://tourism.fsa.gov.ru/ru/resorts/hotels/${HOTELS101_UUID}/about-resort` } }],
      h1: 'Апартаменты Happy Home Москва',
      props: {
        streetAddress: 'Москва, Ленинский пр-т, д. 158',
        latitude: '55.650934595372',
        longitude: '37.4832',
      },
    }),
  );

  assert.equal(data.uuid, HOTELS101_UUID);
  assert.equal(data.regNumber, 'С772024011823');
  assert.equal(data.name, 'Апартаменты Happy Home Москва');
  assert.equal(data.street, 'Москва, Ленинский пр-т, д. 158');
  assert.equal(data.aggregator, '101hotels.com');
  assert.ok(Math.abs(data.lat - 55.650934595372) < 1e-9);
});

test('extractFromDom без ссылки на реестр возвращает uuid: null', () => {
  const data = extractFromDom(fakeDoc({ h1: 'Отель без реестра' }));
  assert.equal(data.uuid, null);
  assert.equal(data.name, 'Отель без реестра');
});

const ORSHA_UUID = 'e2d2bdd8-c606-11ef-92da-6307af62d0fc';
const nextData = JSON.stringify({
  props: {
    pageProps: {
      hotel: {
        facts: {
          register: {
            record: 'С692024020364',
            link: `https://tourism.fsa.gov.ru/ru/resorts/hotels/${ORSHA_UUID}/about-resort`,
          },
        },
      },
    },
  },
});

test('UUID достаётся из состояния страницы, когда блока в DOM нет', () => {
  const data = extractFromDom(fakeDoc({ h1: 'База отдыха Орша Ривер Клаб', scripts: [nextData] }));
  assert.equal(data.uuid, ORSHA_UUID);
  assert.equal(data.regNumber, 'С692024020364');
});

test('глубокий скан отключается опцией deep: false', () => {
  const data = extractFromDom(fakeDoc({ h1: 'Отель', scripts: [nextData] }), { deep: false });
  assert.equal(data.uuid, null);
});
