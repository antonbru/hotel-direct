import assert from 'node:assert/strict';
import { test } from 'node:test';

import { isJunkHost, normalizePhone, normalizeSite, pickFromRegistry } from '../extension/lib/registry.js';

test('normalizeSite приводит домен к https-ссылке', () => {
  assert.deepEqual(normalizeSite('www.orshariver.club'), {
    url: 'https://www.orshariver.club',
    host: 'orshariver.club',
  });
  assert.deepEqual(normalizeSite('https://hotel1780.ru/'), { url: 'https://hotel1780.ru', host: 'hotel1780.ru' });
  assert.deepEqual(normalizeSite('http://ivanhotel.ru'), { url: 'https://ivanhotel.ru', host: 'ivanhotel.ru' });
  // Кириллический домен — валидный IDN, браузер его откроет.
  const idn = normalizeSite('леон-отель.ру');
  assert.equal(idn.host, 'xn----itbbvdjgc0b4g.xn--p1ag');
  assert.match(idn.url, /^https:\/\/xn--/u);
});

test('normalizeSite отбрасывает соцсети, автосайты и агрегаторы', () => {
  for (const raw of [
    'https://vk.com/hotel',
    'vk.ru/urmani86',
    'https://hotel-1.clients.site/',
    'https://101hotels.com/main/cities/lesosibirsk/otel.html',
    'https://ostrovok.ru/hotel/russia/moscow/',
    'https://travel.yandex.ru/hotels/1',
    'https://www.tripadvisor.ru/Hotel_Review',
    '',
    null,
  ]) {
    assert.equal(normalizeSite(raw), null, `должно отбрасываться: ${raw}`);
  }
});

test('isJunkHost ловит поддомены агрегаторов', () => {
  assert.equal(isJunkHost('ostrovok.ru'), true);
  assert.equal(isJunkHost('m.ostrovok.ru'), true);
  assert.equal(isJunkHost('hotel.ru'), false);
});

test('normalizePhone приводит к +7', () => {
  assert.deepEqual(normalizePhone('+7 (999) 123-45-67'), { tel: '+79991234567', pretty: '+7 999 123-45-67' });
  assert.deepEqual(normalizePhone('8 999 123 45 67'), { tel: '+79991234567', pretty: '+7 999 123-45-67' });
  assert.deepEqual(normalizePhone('9991234567'), { tel: '+79991234567', pretty: '+7 999 123-45-67' });
  assert.equal(normalizePhone('+7 (495) 660-01-90 доб. 12'), null);
});

test('pickFromRegistry собирает карточку', () => {
  const hotel = pickFromRegistry({
    fullName: 'Загородный отель "Orsha River Club"',
    shortName: 'Orsha River Club',
    websiteAddress: 'www.orshariver.club',
    phone: '+79290993300',
    registerRecord: 'С692024020364',
    region: { name: 'Тверская область' },
    status: { name: 'Действует' },
  });
  assert.equal(hotel.name, 'Orsha River Club');
  assert.equal(hotel.site.host, 'orshariver.club');
  assert.equal(hotel.phone.tel, '+79290993300');
  assert.equal(hotel.record, 'С692024020364');
});

test('pickFromRegistry отбрасывает снятые с учёта и пустые карточки', () => {
  assert.equal(
    pickFromRegistry({ fullName: 'X', websiteAddress: 'x.ru', status: { name: 'Прекращен' } }),
    null,
  );
  assert.equal(pickFromRegistry({ fullName: 'X', status: { name: 'Действует' } }), null);
  assert.equal(pickFromRegistry(null), null);
});

test('pickFromRegistry: телефон без сайта остаётся', () => {
  const hotel = pickFromRegistry({ fullName: 'X', phone: '+79110000000', status: { name: 'Действует' } });
  assert.equal(hotel.site, null);
  assert.equal(hotel.phone.tel, '+79110000000');
});
