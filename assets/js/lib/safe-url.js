export function sanitizeHttpsUrl(value) {
  if (!value) return '';
  try {
    const url = new URL(String(value).trim());
    return url.protocol === 'https:' ? url.href : '';
  } catch {
    return '';
  }
}

const DATA_IMAGE_PATTERN = /^data:image\/(jpeg|png|webp);base64,/i;
const MAX_DATA_IMAGE_LENGTH = 500_000;

export function sanitizeImageUrl(value) {
  const str = String(value ?? '').trim();
  if (!str) return '';

  if (DATA_IMAGE_PATTERN.test(str)) {
    return str.length <= MAX_DATA_IMAGE_LENGTH ? str : '';
  }

  return sanitizeHttpsUrl(str);
}

export function isDataImageUrl(value) {
  return DATA_IMAGE_PATTERN.test(String(value ?? '').trim());
}
