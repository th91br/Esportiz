import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { pathToFileURL } from 'node:url';

export const MIGRATION_FILE_PATTERN = /^(\d{14})_[A-Za-z0-9][A-Za-z0-9_-]*\.sql$/;
export const MIGRATION_LOCK_VERSION = 1;

const ALLOW_DESTRUCTIVE_MARKER = /--\s*esportiz:\s*allow-destructive-migration\s+\S/i;
const DESTRUCTIVE_PATTERNS = [
  { label: 'DROP TABLE or DROP SCHEMA', pattern: /\bdrop\s+(?:table|schema)\b/i },
  { label: 'TRUNCATE', pattern: /\btruncate(?:\s+table)?\b/i },
  {
    label: 'ALTER TABLE DROP COLUMN',
    pattern: /\balter\s+table\b[^;]*\bdrop\s+column\b/i,
  },
  {
    label: 'unqualified DELETE',
    pattern: /\bdelete\s+from\s+(?:public\.)?[A-Za-z_][A-Za-z0-9_]*\s*;/i,
  },
];

export function hashMigration(content) {
  const normalizedContent = content.replace(/\r\n?/g, '\n');
  return createHash('sha256').update(normalizedContent).digest('hex');
}

export function createMigrationManifest(files) {
  return {
    version: MIGRATION_LOCK_VERSION,
    algorithm: 'sha256',
    migrations: Object.fromEntries(
      [...files]
        .sort((left, right) => left.name.localeCompare(right.name))
        .map((file) => [file.name, file.hash]),
    ),
  };
}

export function validateMigrationSet(files, manifest) {
  const errors = [];
  const timestamps = new Map();
  const fileNames = new Set(files.map((file) => file.name));

  if (files.length === 0) {
    errors.push('No migration files were found');
  }

  if (manifest?.version !== MIGRATION_LOCK_VERSION) {
    errors.push('Migration lock version must be ' + MIGRATION_LOCK_VERSION);
  }

  if (manifest?.algorithm !== 'sha256') {
    errors.push('Migration lock algorithm must be sha256');
  }

  for (const file of [...files].sort((left, right) => left.name.localeCompare(right.name))) {
    const match = file.name.match(MIGRATION_FILE_PATTERN);

    if (!match) {
      errors.push(file.name + ': invalid migration file name');
      continue;
    }

    const timestamp = match[1];
    if (timestamps.has(timestamp)) {
      errors.push(
        file.name + ': duplicate timestamp also used by ' + timestamps.get(timestamp),
      );
    } else {
      timestamps.set(timestamp, file.name);
    }

    if (!file.content.trim()) {
      errors.push(file.name + ': migration is empty');
    }

    if (file.content.charCodeAt(0) === 0xfeff) {
      errors.push(file.name + ': UTF-8 BOM is not allowed');
    }

    if (/^\s*\\(?:connect|copy|!)/m.test(file.content)) {
      errors.push(file.name + ': unsafe psql meta-command is not allowed');
    }

    const destructive = DESTRUCTIVE_PATTERNS.find(({ pattern }) => pattern.test(file.content));
    if (destructive && !ALLOW_DESTRUCTIVE_MARKER.test(file.content)) {
      errors.push(
        file.name + ': ' + destructive.label
          + ' requires an esportiz allow-destructive-migration marker with a reason',
      );
    }

    const expectedHash = manifest?.migrations?.[file.name];
    if (!expectedHash) {
      errors.push(file.name + ': missing from migration lock');
    } else if (expectedHash !== file.hash) {
      errors.push(file.name + ': content differs from migration lock');
    }
  }

  for (const lockedName of Object.keys(manifest?.migrations ?? {})) {
    if (!fileNames.has(lockedName)) {
      errors.push(lockedName + ': locked migration file is missing');
    }
  }

  return errors;
}

export async function loadMigrationFiles(directory = 'supabase/migrations') {
  const entries = await readdir(directory, { withFileTypes: true });
  const sqlEntries = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.sql'))
    .sort((left, right) => left.name.localeCompare(right.name));

  return Promise.all(sqlEntries.map(async (entry) => {
    const content = await readFile(join(directory, entry.name), 'utf8');
    return {
      content,
      hash: hashMigration(content),
      name: entry.name,
    };
  }));
}

export async function verifyMigrations({
  lockPath = 'supabase/migrations.lock.json',
  migrationsDirectory = 'supabase/migrations',
  updateLock = false,
} = {}) {
  const files = await loadMigrationFiles(migrationsDirectory);
  let manifest;

  if (updateLock) {
    manifest = createMigrationManifest(files);
    await writeFile(lockPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  } else {
    manifest = JSON.parse(await readFile(lockPath, 'utf8'));
  }

  const errors = validateMigrationSet(files, manifest);
  if (errors.length > 0) {
    throw new Error(errors.join('\n'));
  }

  return {
    count: files.length,
    lockFile: basename(lockPath),
    updated: updateLock,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  verifyMigrations({
    updateLock: process.argv.includes('--update-lock'),
  }).then((result) => {
    console.log(
      'Verified ' + result.count + ' migrations against ' + result.lockFile
        + (result.updated ? ' (updated)' : ''),
    );
  }).catch((error) => {
    console.error('Migration verification failed:\n' + error.message);
    process.exitCode = 1;
  });
}