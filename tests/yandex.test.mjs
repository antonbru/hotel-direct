import assert from 'node:assert/strict';
import { test } from 'node:test';

import '../extension/content/extract.js';

const { extractFromDom, hotelFromYandexState, hotelFromYandexHtml, yandexSlugMatches, dataFromYandexHotel } =
  globalThis.HotelDirectExtract;

const CARLTON_UUID = '38b955af-c609-11ef-92da-5dcb6dbbe36a';
const OTHER_UUID = '5987baf2-c608-11ef-92da-f5ea7072c433';

const carlton = {
  permalink: '1064626577',
  hotelSlug: 'moscow/the-carlton-moscow',
  name: 'The Carlton Moscow',
  address: 'Москва, Тверская улица, 3',
  stars: 5,
  coordinates: { lon: 37.613116, lat: 55.757436 },
  fsaInfo: {
    registryId: 'С772024004849',
    registryUrl: `https://tourism.fsa.gov.ru/ru/resorts/hotels/${CARLTON_UUID}/about-resort`,
    fallbackInfo: null,
  },
};

const neighbour = {
  hotelSlug: 'moscow/doubletree-hilton-marina',
  name: 'DoubleTree by Hilton Moscow',
  coordinates: { lon: 37.484926, lat: 55.833117 },
  fsaInfo: {
    registryId: 'С772024007804',
    registryUrl: `https://tourism.fsa.gov.ru/ru/resorts/hotels/${OTHER_UUID}/about-resort`,
    fallbackInfo: null,
  },
};

function stateWith(hotel, similar = []) {
  return {
    common: { deviceType: { isDesktop: true } },
    hotels: {
      hotelPage: {
        hotelInfo: {
          data: {
            hotel,
            similarHotelsInfo: { hotels: similar.map((item) => ({ hotel: item })) },
          },
        },
        hotelImages: {},
      },
    },
  };
}

function node(text, attrs = {}) {
  return {
    textContent: text,
    getAttribute: (name) => (name in attrs ? attrs[name] : null),
  };
}

function fakeDoc({ href, scripts = [], label = '', h1 = '', title = '' }) {
  const url = new URL(href);
  return {
    location: { hostname: url.hostname, href: url.href, pathname: url.pathname },
    title,
    querySelector(selector) {
      if (selector === 'h1') return h1 ? node(h1) : null;
      return null;
    },
    querySelectorAll(selector) {
      if (selector === 'script') return scripts.map((block) => node(block));
      if (selector.includes('data-qa="text"')) {
        return label ? [node(`Объект №${label}`), node('Отзывы')] : [node('Отзывы')];
      }
      return [];
    },
  };
}

const scriptWith = (state) =>
  `window.__PRELOADED_REDUX_STATE__ = ${JSON.stringify(state)}`;

test('отель Яндекса: UUID и номер берутся из fsaInfo состояния страницы', () => {
  const href = 'https://travel.yandex.ru/hotels/moscow/the-carlton-moscow/';
  const data = extractFromDom(
    fakeDoc({ href, scripts: [scriptWith(stateWith(carlton, [neighbour]))], label: 'С772024004849' }),
  );

  assert.equal(data.uuid, CARLTON_UUID);
  assert.equal(data.regNumber, 'С772024004849');
  assert.equal(data.name, 'The Carlton Moscow');
  assert.equal(data.street, 'Москва, Тверская улица, 3');
  assert.equal(data.aggregator, 'travel.yandex.ru');
  assert.equal(data.stale, false);
  assert.ok(Math.abs(data.lat - 55.757436) < 1e-9);
  assert.ok(Math.abs(data.lng - 37.613116) < 1e-9);
});

test('похожие отели не подменяют текущий', () => {
  const href = 'https://travel.yandex.ru/hotels/moscow/otel-bez-reestra/';
  const безРеестра = { hotelSlug: 'moscow/otel-bez-reestra', name: 'Отель без реестра', fsaInfo: null };
  const data = extractFromDom(
    fakeDoc({ href, scripts: [scriptWith(stateWith(безРеестра, [carlton, neighbour]))] }),
  );

  assert.equal(data.uuid, null);
  assert.equal(data.name, 'Отель без реестра');
  assert.equal(data.stale, false);
});

test('чужое состояние (переход внутри SPA) даёт stale и не выдаёт UUID соседа', () => {
  const href = 'https://travel.yandex.ru/hotels/moscow/hotel-continental/';
  const data = extractFromDom(
    fakeDoc({ href, scripts: [scriptWith(stateWith(carlton))], label: 'С772024016586' }),
  );

  assert.equal(data.uuid, null);
  assert.equal(data.stale, true);
  assert.equal(data.regNumber, 'С772024016586');
});

test('состояние без скрипта: stale и ничего не выдумываем', () => {
  const href = 'https://travel.yandex.ru/hotels/moscow/hostel-test/';
  const data = extractFromDom(fakeDoc({ href, h1: 'Хостел Тест' }));
  assert.equal(data.uuid, null);
  assert.equal(data.stale, true);
  assert.equal(data.name, 'Хостел Тест');
});

test('hotelFromYandexHtml разбирает SSR-состояние из HTML', () => {
  const html = `<html><head></head><body><script nonce="x">${scriptWith(
    stateWith(carlton),
  )}</script></body></html>`;
  const hotel = hotelFromYandexHtml(html);
  assert.equal(hotel.name, 'The Carlton Moscow');

  const data = dataFromYandexHotel(hotel);
  assert.equal(data.uuid, CARLTON_UUID);
  assert.equal(data.regNumber, 'С772024004849');
  assert.equal(hotelFromYandexHtml('<html>нет состояния</html>'), null);
  assert.equal(hotelFromYandexState(null), null);
});

test('yandexSlugMatches сверяет slug с путём адреса', () => {
  assert.equal(yandexSlugMatches(carlton, 'https://travel.yandex.ru/hotels/moscow/the-carlton-moscow/'), true);
  assert.equal(yandexSlugMatches(carlton, 'https://travel.yandex.ru/hotels/moscow/the-carlton-moscow?adults=2'), true);
  assert.equal(yandexSlugMatches(carlton, 'https://travel.yandex.ru/hotels/moscow/hotel-continental/'), false);
  assert.equal(yandexSlugMatches({}, 'https://travel.yandex.ru/hotels/moscow/x/'), false);
});
