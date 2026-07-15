import { expect, test } from '@playwright/test';

const stagingBaseUrl = process.env.E2E_STAGING_BASE_URL?.trim();
const stagingEmail = process.env.E2E_STAGING_EMAIL?.trim();
const stagingPassword = process.env.E2E_STAGING_PASSWORD;
const hasStagingCredentials = Boolean(stagingBaseUrl && stagingEmail && stagingPassword);

test.describe('authenticated staging journeys', () => {
  test.skip(!hasStagingCredentials, 'Dedicated staging URL and credentials are required.');

  test.beforeEach(async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.getByLabel('E-mail').fill(stagingEmail!);
    await page.getByLabel('Senha', { exact: true }).fill(stagingPassword!);
    await page.locator('form').getByRole('button', { name: 'Entrar', exact: true }).click();
    await expect(page).toHaveURL((url) => url.pathname !== '/login');
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