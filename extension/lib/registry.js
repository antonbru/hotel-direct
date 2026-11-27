// Нормализация ответа Единого реестра объектов классификации (tourism.fsa.gov.ru).
// Модуль используется service worker'ом и тестами; content script его не импортирует.

const AGGREGATOR_HOSTS = [
  '101hotels.com',
  'ostrovok.ru',
  'yandex.ru',
  'travel.yandex.ru',
  'booking.com',
  'tripadvisor.com',
  'tripadvisor.ru',
  'avito.ru',
  'sutochno.ru',
  'ozon.ru',
  'tvil.ru',
  'bronevik.com',
  'onetwotrip.com',
  'agoda.com',
  'expedia.com',
  'airbnb.com',
];

const SOCIAL_HOSTS = [
  'vk.com',
  'vk.ru',
  'ok.ru',
  'instagram.com',
  'facebook.com',
  't.me',
  'youtube.com',
  'dzen.ru',
];

// Автосайты Яндекса (clients.site) — страница-визитка без бронирования.
const JUNK_SUFFIXES = ['clients.site'];

function hostOf(raw) {
  try {
    return new URL(raw).hostname.toLowerCase().replace(/^www\./u, '');
  } catch {
    return '';
  }
}

export function isJunkHost(host) {
  if (!host) return true;
  if (JUNK_SUFFIXES.some((suffix) => host === suffix || host.endsWith(`.${suffix}`))) return true;
  return [...AGGREGATOR_HOSTS, ...SOCIAL_HOSTS].some(
    (blocked) => host === blocked || host.endsWith(`.${blocked}`),
  );
}

/**
 * Приводит поле websiteAddress к виду { url, host } или null.
 * В реестре встречаются: "www.hotel.ru", "hotel.ru", "https://hotel.ru/", "vk.com/club".
 */
export function normalizeSite(raw) {
  if (typeof raw !== 'string') return null;
  const value = raw.trim();
  if (!value) return null;

  let candidate = value;
  if (!/^https?:\/\//iu.test(candidate)) {
    // Строки вида "hotel.ru/path" и "www.hotel.ru" — домен впереди.
    candidate = `https://${candidate.replace(/^\/+/u, '')}`;
  }

  let url;
  try {
    url = new URL(candidate);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;

  const host = url.hostname.toLowerCase().replace(/^www\./u, '');
  if (!host.includes('.')) return null;
  if (isJunkHost(host)) return null;

  // http апгрейдим до https: современные сайты отелей это переживают.
  url.protocol = 'https:';
  url.hash = '';
  const href = url.toString().replace(/\/$/u, '');

  return { url: href, host };
}

/** "+7 (999) 123-45-67" → { tel: "+79991234567", pretty: "+7 999 123-45-67" } или null. */
export function normalizePhone(raw) {
  if (typeof raw !== 'string') return null;
  let digits = raw.replace(/\D/gu, '');
  if (digits.length === 11 && digits.startsWith('8')) digits = `7${digits.slice(1)}`;
  if (digits.length === 10 && digits.startsWith('9')) digits = `7${digits}`;
  if (digits.length !== 11 || !digits.startsWith('7')) return null;

  const pretty = `+7 ${digits.slice(1, 4)} ${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9, 11)}`;
  return { tel: `+${digits}`, pretty };
}

/** Ответ GET /api/v1/resorts/hotels/{uuid}/main → данные для карточки. */
export function pickFromRegistry(data) {
  if (!data || typeof data !== 'object') return null;

  const status = data.status?.name ?? '';
  if (status && status !== 'Действует') return null;

  const site = normalizeSite(data.websiteAddress);
  const phone = normalizePhone(data.phone);
  if (!site && !phone) return null;

  const name = String(data.shortName || data.fullName || '').trim();

  return {
    name,
    site,
    phone,
    record: typeof data.registerRecord === 'string' ? data.registerRecord : '',
    region: String(data.region?.name ?? ''),
    status,
  };
}
