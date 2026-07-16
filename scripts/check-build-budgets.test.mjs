import assert from 'node:assert/strict';
import test from 'node:test';

import { evaluateBuildBudgets } from './check-build-budgets.mjs';

const budgets = {
  largestJavaScriptBytes: 100,
  precacheBytes: 250,
  totalCssBytes: 100,
  totalJavaScriptBytes: 200,
};

test('accepts a build inside every budget', () => {
  const result = evaluateBuildBudgets([
    { path: 'index.html', bytes: 10 },
    { path: 'assets/app.js', bytes: 90 },
    { path: 'assets/app.css', bytes: 80 },
    { path: 'screens/marketing.png', bytes: 5000 },
  ], budgets);

  assert.deepEqual(result.failures, []);
  assert.equal(result.totals.precacheBytes, 180);
});

test('reports each exceeded budget without counting runtime images in precache', () => {
  const result = evaluateBuildBudgets([
    { path: 'index.html', bytes: 10 },
    { path: 'assets/app.js', bytes: 120 },
    { path: 'assets/vendor.js', bytes: 110 },
    { path: 'assets/app.css', bytes: 120 },
    { path: 'assets/photo.png', bytes: 5000 },
  ], budgets);

  assert.deepEqual(result.failures, [
    'largest JavaScript chunk assets/app.js',
    'estimated PWA precache',
    'total CSS',
    'total JavaScript',
  ]);
  assert.equal(result.totals.precacheBytes, 360);
});
