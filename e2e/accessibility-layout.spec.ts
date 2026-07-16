import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const publicRoutes = [
  { name: 'login', path: '/login' },
  { name: 'invalid student portal', path: '/portal-aluno?ct=invalid' },
  { name: 'invalid public booking', path: '/agendar?ct=invalid' },
];

function formatViolations(
  violations: Awaited<ReturnType<AxeBuilder['analyze']>>['violations'],
) {
  return violations.map((violation) => ({
    help: violation.help,
    id: violation.id,
    impact: violation.impact,
    nodes: violation.nodes.map((node) => node.target.join(' ')),
  }));
}

test.describe('public accessibility and layout quality', () => {
  for (const route of publicRoutes) {
    test(`${route.name} meets WCAG AA and viewport contracts`, async ({ page }) => {
      await page.goto(route.path, { waitUntil: 'domcontentloaded' });
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

      const layout = await page.evaluate(() => ({
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth,
      }));

      expect(
        layout.documentWidth,
        `${route.path} creates horizontal viewport overflow`,
      ).toBeLessThanOrEqual(layout.viewportWidth + 1);

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
        .analyze();

      expect(
        formatViolations(results.violations),
        `${route.path} has accessibility violations`,
      ).toEqual([]);
    });
  }
});
