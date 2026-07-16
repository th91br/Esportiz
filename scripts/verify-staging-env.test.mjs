import assert from 'node:assert/strict';
import test from 'node:test';

import { validateStagingEnvironment } from './verify-staging-env.mjs';

const validEnvironment = {
  VITE_SUPABASE_URL: 'https://staging-project.supabase.co',
  VITE_SUPABASE_PUBLISHABLE_KEY: 'public-test-key',
  E2E_STAGING_EMAIL: 'automation@example.com',
  E2E_STAGING_PASSWORD: 'test-password',
  SUPABASE_STAGING_PROJECT_REF: 'staging-project',
  E2E_FORBIDDEN_SUPABASE_PROJECT_REF: 'production-project',
};

test('accepts a dedicated staging project', () => {
  assert.deepEqual(validateStagingEnvironment(validEnvironment), {
    projectRef: 'staging-project',
    productionProtected: true,
  });
});

test('rejects missing credentials', () => {
  assert.throws(
    () => validateStagingEnvironment({ ...validEnvironment, E2E_STAGING_PASSWORD: '' }),
    /Missing staging variables: E2E_STAGING_PASSWORD/,
  );
});

test('rejects a project ref mismatch', () => {
  assert.throws(
    () => validateStagingEnvironment({
      ...validEnvironment,
      SUPABASE_STAGING_PROJECT_REF: 'another-project',
    }),
    /does not match/,
  );
});

test('always rejects the Esportiz production project', () => {
  assert.throws(
    () => validateStagingEnvironment({
      ...validEnvironment,
      VITE_SUPABASE_URL: 'https://crwaerhlrzqzxqaijkqc.supabase.co',
      SUPABASE_STAGING_PROJECT_REF: 'crwaerhlrzqzxqaijkqc',
      E2E_FORBIDDEN_SUPABASE_PROJECT_REF: '',
    }),
    /blocked against the production/,
  );
});
