import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

export const REQUIRED_SECURITY_HEADERS = {
  'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Strict-Transport-Security': 'max-age=31536000',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
};

function createHeaderGetter(headers) {
  if (headers && typeof headers.get === 'function') {
    return (name) => headers.get(name);
  }

  const normalized = new Map(
    Object.entries(headers ?? {}).map(([name, value]) => [
      name.toLowerCase(),
      String(value),
    ]),
  );

  return (name) => normalized.get(name.toLowerCase()) ?? null;
}

export function assertRequiredSecurityHeaders(
  headers,
  { context = 'response' } = {},
) {
  const getHeader = createHeaderGetter(headers);

  for (const [name, expected] of Object.entries(REQUIRED_SECURITY_HEADERS)) {
    const actual = getHeader(name);

    if (actual !== expected) {
      throw new Error(
        context + ' must set ' + name + ' to "' + expected
          + '" (received ' + JSON.stringify(actual) + ')',
      );
    }
  }
}

export function assertVercelSecurityHeaders(config) {
  const globalRule = config.headers?.find((rule) => rule.source === '/(.*)');

  if (!globalRule) {
    throw new Error('vercel.json must define a global security header rule for /(.*)');
  }

  const headers = Object.fromEntries(
    globalRule.headers.map(({ key, value }) => [key, value]),
  );

  assertRequiredSecurityHeaders(headers, { context: 'vercel.json' });
}

export async function verifySecurityHeaders(configPath = 'vercel.json') {
  const config = JSON.parse(await readFile(configPath, 'utf8'));
  assertVercelSecurityHeaders(config);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  verifySecurityHeaders().catch((error) => {
    console.error('Security header verification failed: ' + error.message);
    process.exitCode = 1;
  });
}