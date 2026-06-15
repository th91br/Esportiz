import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('student portal date flow', () => {
  it('sends ISO birth dates to every portal RPC', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/pages/StudentPortalPage.tsx'),
      'utf8',
    );
    const birthDateArguments = Array.from(
      source.matchAll(/p_birth_date:\s*([^,\n]+)/g),
      (match) => match[1].trim(),
    );

    expect(birthDateArguments).toHaveLength(4);
    expect(birthDateArguments).toEqual([
      'isoBirthDate',
      'isoBirthDate',
      'isoBirthDate',
      'isoBirthDate',
    ]);
  });
});
