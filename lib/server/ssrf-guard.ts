/**
 * SSRF (Server-Side Request Forgery) protection utilities.
 */

function isPrivate172(hostname: string): boolean {
  if (!hostname.startsWith('172.')) return false;
  const second = parseInt(hostname.split('.')[1], 10);
  return second >= 16 && second <= 31;
}

export function validateUrlForSSRF(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return 'Invalid URL';
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return 'Only HTTP(S) URLs are allowed';
  }

  const hostname = parsed.hostname.toLowerCase();
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname === '0.0.0.0' ||
    hostname.startsWith('10.') ||
    hostname.startsWith('192.168.') ||
    hostname.startsWith('169.254.') ||
    isPrivate172(hostname) ||
    hostname.endsWith('.local') ||
    hostname.startsWith('fd') ||
    hostname.startsWith('fe80')
  ) {
    return 'Local/private network URLs are not allowed';
  }

  return null;
}
