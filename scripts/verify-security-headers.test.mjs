import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assertRequiredSecurityHeaders,
  assertVercelSecurityHeaders,
  REQUIRED_SECURITY_HEADERS,
} from './verify-security-headers.mjs';

test('accepts the complete security header contract', () => {
  assert.doesNotThrow(() => {
    assertRequiredSecurityHeaders(REQUIRED_SECURITY_HEADERS);
  });
});

test('rejects a missing or weakened security header', () => {
  assert.throws(
    () => assertRequiredSecurityHeaders({
      ...REQUIRED_SECURITY_HEADERS,
      'X-Frame-Options': 'SAMEORIGIN',
    }),
    /X-Frame-Options/,
  );
});

test('requires a global Vercel header rule', () => {
  assert.throws(
    () => assertVercelSecurityHeaders({ headers: [] }),
    /global security header rule/,
  );
});

test('accepts the Vercel header representation', () => {
  assert.doesNotThrow(() => {
    assertVercelSecurityHeaders({
      headers: [{
        source: '/(.*)',
        headers: Object.entries(REQUIRED_SECURITY_HEADERS).map(([key, value]) => ({
          key,
          value,
        })),
      }],
    });
  });
});