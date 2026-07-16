import { expect, test } from '@playwright/test';

const stagingEmail = process.env.E2E_STAGING_EMAIL?.trim();
const stagingPassword = process.env.E2E_STAGING_PASSWORD;
const stagingSupabaseUrl = process.env.VITE_SUPABASE_URL?.trim();
const stagingPublishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
const hasStagingCredentials = Boolean(
  stagingEmail &&
  stagingPassword &&
  stagingSupabaseUrl &&
  stagingPublishableKey,
);
const expectedStagingProjectRef = process.env.SUPABASE_STAGING_PROJECT_REF?.trim();
const forbiddenProjectRef = process.env.E2E_FORBIDDEN_SUPABASE_PROJECT_REF?.trim()
  || 'crwaerhlrzqzxqaijkqc';

test.describe('authenticated staging journeys', () => {
  test.skip(!hasStagingCredentials, 'Dedicated staging URL and credentials are required.');

  test.beforeAll(() => {
    if (!hasStagingCredentials) return;

    const projectRef = new URL(stagingSupabaseUrl!).hostname.split('.')[0];
    if (
      !expectedStagingProjectRef
      || projectRef !== expectedStagingProjectRef
      || projectRef === forbiddenProjectRef
      || projectRef === 'crwaerhlrzqzxqaijkqc'
    ) {
      throw new Error('Authenticated E2E is blocked outside the dedicated staging project.');
    }
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL((url) => url.pathname === '/login');
    await page.getByLabel('E-mail').fill(stagingEmail!);
    await page.getByLabel('Senha', { exact: true }).fill(stagingPassword!);
    await page.locator('form').getByRole('button', { name: 'Entrar', exact: true }).click();
    await expect(page).toHaveURL((url) => url.pathname !== '/login');
  });

  test('loads critical arena routes without mutating business data', async ({ page }) => {
    const routes = [
      { path: '/agenda', heading: 'Agenda' },
      { path: '/pagamentos', heading: 'Pagamentos' },
      { path: '/produtos', heading: 'Produtos' },
      { path: '/vendas', heading: 'Vendas' },
      { path: '/comandas', heading: 'Controle de Comandas' },
      { path: '/quadras', heading: 'Quadras' },
      { path: '/relatorios', heading: 'Relatórios Analíticos' },
    ];

    for (const route of routes) {
      await page.goto(route.path, { waitUntil: 'domcontentloaded' });
      await expect(page).toHaveURL((url) => url.pathname === route.path);
      await expect(
        page.getByRole('heading', { name: route.heading, level: 1, exact: true }),
      ).toBeVisible();
    }
  });
  test('loads protected financial data and performs a reversible comanda write', async ({ page }) => {
    await page.goto('/pagamentos', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Pagamentos', level: 1, exact: true })).toBeVisible();

    const comandaName = `E2E ${Date.now()}`;
    const comandaCard = page.getByRole('button', { name: `Abrir comanda ${comandaName}` });

    await page.goto('/comandas', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Controle de Comandas', level: 1, exact: true })).toBeVisible();

    try {
      await page.getByRole('button', { name: 'Abrir Nova Comanda' }).click();
      await page.getByPlaceholder('Ex: Mesa 12 ou Thiago Silva').fill(comandaName);
      await page.getByRole('button', { name: 'Abrir Comanda', exact: true }).click();
      await expect(comandaCard).toBeVisible();

      await comandaCard.click();
      await page.getByRole('button', { name: 'Cancelar Comanda' }).click();
      await expect(page.getByRole('alertdialog', { name: 'Cancelar comanda?' })).toBeVisible();
      await page.getByRole('button', { name: 'Cancelar Comanda', exact: true }).click();
      await expect(comandaCard).toHaveCount(0);
    } finally {
      if (await comandaCard.count()) {
        await comandaCard.click();
        await page.getByRole('button', { name: 'Cancelar Comanda' }).click();
        await page.getByRole('button', { name: 'Cancelar Comanda', exact: true }).click();
      }
    }
  });
});