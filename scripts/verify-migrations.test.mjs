import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createMigrationManifest,
  hashMigration,
  validateMigrationSet,
} from './verify-migrations.mjs';

function migration(name, content) {
  return {
    content,
    hash: hashMigration(content),
    name,
  };
}

test('accepts immutable, ordered migration files', () => {
  const files = [
    migration('20260101000000_create_profiles.sql', 'create table profiles(id uuid);'),
    migration('20260101000100_add_name.sql', 'alter table profiles add column name text;'),
  ];
  const manifest = createMigrationManifest(files);

  assert.deepEqual(validateMigrationSet(files, manifest), []);
});

test('rejects duplicate timestamps and migration history changes', () => {
  const original = migration(
    '20260101000000_create_profiles.sql',
    'create table profiles(id uuid);',
  );
  const changed = migration(
    '20260101000000_create_profiles.sql',
    'create table profiles(id bigint);',
  );
  const duplicate = migration(
    '20260101000000_create_settings.sql',
    'create table settings(id uuid);',
  );
  const manifest = createMigrationManifest([original, duplicate]);

  assert.deepEqual(validateMigrationSet([changed, duplicate], manifest), [
    '20260101000000_create_profiles.sql: content differs from migration lock',
    '20260101000000_create_settings.sql: duplicate timestamp also used by 20260101000000_create_profiles.sql',
  ]);
});

test('blocks destructive SQL unless the migration records an explicit reason', () => {
  const unsafe = migration(
    '20260101000000_drop_legacy.sql',
    'drop table public.legacy;',
  );
  const unsafeManifest = createMigrationManifest([unsafe]);

  assert.match(
    validateMigrationSet([unsafe], unsafeManifest)[0],
    /allow-destructive-migration/,
  );

  const reviewed = migration(
    '20260101000100_drop_legacy_reviewed.sql',
    '-- esportiz: allow-destructive-migration legacy table is empty after expand-contract rollout\n'
      + 'drop table public.legacy;',
  );
  const reviewedManifest = createMigrationManifest([reviewed]);

  assert.deepEqual(validateMigrationSet([reviewed], reviewedManifest), []);
});

test('rejects missing files and unsafe psql meta-commands', () => {
  const locked = migration(
    '20260101000000_create_profiles.sql',
    'create table profiles(id uuid);',
  );
  const command = migration(
    '20260101000100_connect.sql',
    '\\connect production\nselect 1;',
  );
  const manifest = createMigrationManifest([locked, command]);

  assert.deepEqual(validateMigrationSet([command], manifest), [
    '20260101000100_connect.sql: unsafe psql meta-command is not allowed',
    '20260101000000_create_profiles.sql: locked migration file is missing',
  ]);
});