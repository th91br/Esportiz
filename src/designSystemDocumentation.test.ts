import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('design system documentation', () => {
  const designMarkdown = readFileSync(resolve(process.cwd(), 'DESIGN.md'), 'utf-8');
  const designSidecar = JSON.parse(
    readFileSync(resolve(process.cwd(), '.impeccable/design.json'), 'utf-8'),
  ) as {
    schemaVersion: number;
    title: string;
    narrative: {
      northStar: string;
      donts: string[];
    };
  };

  it('keeps the required DESIGN.md sections in parser-safe order', () => {
    const sections = [
      '## 1. Overview',
      '## 2. Colors',
      '## 3. Typography',
      '## 4. Elevation',
      '## 5. Components',
      "## 6. Do's and Don'ts",
    ];

    const positions = sections.map((section) => designMarkdown.indexOf(section));

    expect(positions.every((position) => position >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });

  it('documents the Esportiz anti-references as enforceable visual guardrails', () => {
    expect(designMarkdown).toContain("**Don't** make Esportiz look like a generic SaaS dashboard.");
    expect(designMarkdown).toContain("**Don't** create an overdecorated dark interface with excessive glow.");
    expect(designMarkdown).toContain("**Don't** regress into an old bureaucratic admin panel.");
    expect(designMarkdown).toContain("**Don't** build a visual experiment that slows routine work.");
    expect(designMarkdown).toContain("**Don't** use gradient text.");
  });

  it('keeps the Impeccable sidecar parseable and aligned with the Esportiz north star', () => {
    expect(designSidecar.schemaVersion).toBe(2);
    expect(designSidecar.title).toBe('Design System: Esportiz');
    expect(designSidecar.narrative.northStar).toBe('The Arena Operations Desk');
    expect(designSidecar.narrative.donts).toContain("Don't use gradient text. Emphasis comes from hierarchy, weight, spacing, and semantic color.");
  });
});
