const PLACE_ID_PATTERN = /ChIJ[a-zA-Z0-9_-]+/;

function decodeSegment(value) {
  if (!value) return '';
  try {
    return decodeURIComponent(String(value).replace(/\+/g, ' ')).trim();
  } catch {
    return String(value).replace(/\+/g, ' ').trim();
  }
}

export function isShortGoogleMapsUrl(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    const host = parsed.hostname.replace(/^www\./, '');
    return host === 'maps.app.goo.gl'
      || (host === 'goo.gl' && parsed.pathname.startsWith('/maps'));
  } catch {
    return false;
  }
}

export function isGoogleMapsUrl(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    const host = parsed.hostname.replace(/^www\./, '');

    if (host === 'maps.app.goo.gl') return true;
    if (host === 'goo.gl' && parsed.pathname.startsWith('/maps')) return true;
    if (host === 'maps.google.com') return true;
    if (host === 'google.com' && parsed.pathname.startsWith('/maps')) return true;
    if (host === 'google.fr' && parsed.pathname.startsWith('/maps')) return true;

    return false;
  } catch {
    return false;
  }
}

function extractPlaceIdFromText(text) {
  if (!text) return null;

  const fromParam = text.match(/place_id:([^&]+)/i);
  if (fromParam?.[1]) {
    const candidate = decodeSegment(fromParam[1]);
    if (PLACE_ID_PATTERN.test(candidate)) return candidate.match(PLACE_ID_PATTERN)[0];
  }

  const direct = text.match(PLACE_ID_PATTERN);
  return direct?.[0] || null;
}

function extractCoordsFromText(text) {
  const atMatch = text.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (atMatch) {
    return {
      lat: Number(atMatch[1]),
      lng: Number(atMatch[2]),
    };
  }

  const dataMatch = text.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
  if (dataMatch) {
    return {
      lat: Number(dataMatch[1]),
      lng: Number(dataMatch[2]),
    };
  }

  const queryMatch = text.match(/query=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (queryMatch) {
    return {
      lat: Number(queryMatch[1]),
      lng: Number(queryMatch[2]),
    };
  }

  return { lat: null, lng: null };
}

function extractNameFromPath(pathname) {
  const match = pathname.match(/\/maps\/place\/([^/@?]+)/i)
    || pathname.match(/\/place\/([^/@?]+)/i);
  if (!match?.[1]) return '';

  const decoded = decodeSegment(match[1]);
  if (!decoded || PLACE_ID_PATTERN.test(decoded)) return '';
  return decoded;
}

export function parseGoogleMapsUrl(rawUrl) {
  const cleaned = String(rawUrl || '')
    .trim()
    .replace(/\u2026/g, '')
    .replace(/…/g, '')
    .replace(/&+$/, '');

  let url;
  try {
    url = new URL(cleaned);
  } catch {
    return null;
  }

  const href = url.href;
  const placeId = extractPlaceIdFromText(href)
    || extractPlaceIdFromText(url.searchParams.get('q') || '')
    || extractPlaceIdFromText(url.searchParams.get('query') || '')
    || extractPlaceIdFromText(url.searchParams.get('place_id') || '');

  const { lat, lng } = extractCoordsFromText(href);
  const name = extractNameFromPath(url.pathname);
  const query = decodeSegment(
    url.searchParams.get('query')
    || url.searchParams.get('q')
    || '',
  );
  const cidRaw = url.searchParams.get('cid')?.trim() || '';
  const cid = /^\d+$/.test(cidRaw) ? cidRaw : null;

  return {
    url: href,
    placeId,
    cid,
    name,
    lat: Number.isFinite(lat) ? lat : null,
    lng: Number.isFinite(lng) ? lng : null,
    query: query && !/^place_id:/i.test(query) ? query : '',
  };
}
