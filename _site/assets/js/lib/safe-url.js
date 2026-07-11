export function sanitizeHttpsUrl(value) {
  if (!value) return '';
  try {
    const url = new URL(String(value).trim());
    return url.protocol === 'https:' ? url.href : '';
  } catch {
    return '';
  }
}
