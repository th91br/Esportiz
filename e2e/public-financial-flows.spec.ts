import { expect, test } from '@playwright/test';

const ownerId = '11111111-1111-4111-8111-111111111111';

test.describe('public and financial journeys', () => {
  test('submits the public contact form with the hardened anti-spam contract', async ({ page }) => {
    let requestBody: Record<string, unknown> | null = null;

    await page.route('**/functions/v1/contact-form', async (route) => {
      requestBody = route.request().postDataJSON() as Record<string, unknown>;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    await page.goto('/contato.html', { waitUntil: 'domcontentloaded' });
    await page.locator('#name').fill('Maria Silva');
    await page.locator('#formEmail').fill('maria@example.com');
    await page.locator('#phone').fill('11999998888');
    await page.locator('#arenaName').fill('Arena Central');
    await page.locator('#reason').selectOption('demo');
    await page.locator('#message').fill('Quero conhecer a plataforma Esportiz.');
    await page.getByRole('button', { name: 'Enviar Mensagem' }).click();

    await expect(page.getByRole('heading', { name: 'Mensagem enviada com sucesso!' })).toBeVisible();
    expect(requestBody).toMatchObject({
      name: 'Maria Silva',
      email: 'maria@example.com',
      phone: '(11) 99999-8888',
      arenaName: 'Arena Central',
      reason: 'demo',
      message: 'Quero conhecer a plataforma Esportiz.',
      website: '',
    });
    expect(requestBody?.formStartedAt).toEqual(expect.any(Number));
  });

  test('rejects invalid public tenant links without calling tenant RPCs', async ({ page }) => {
    let rpcCalls = 0;
    await page.route('**/rest/v1/rpc/**', async (route) => {
      rpcCalls += 1;
      await route.abort();
    });

    await page.goto('/portal-aluno?ct=invalid', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /link inválido/i })).toBeVisible();

    await page.goto('/agendar?ct=invalid', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /link inválido/i })).toBeVisible();
    expect(rpcCalls).toBe(0);
  });

  test('redirects unauthenticated access away from the protected financial route', async ({ page }) => {
    await page.goto('/pagamentos', { waitUntil: 'domcontentloaded' });

    await expect(page).toHaveURL((url) => url.pathname === '/login');
    await expect(page.getByRole('heading', { name: /entre na sua operação/i })).toBeVisible();
  });

  test('authenticates a student and opens a partial Pix payment with a generated QR Code', async ({ page }) => {
    await page.route('**/rest/v1/rpc/**', async (route) => {
      const rpcName = new URL(route.request().url()).pathname.split('/').pop();

      if (rpcName === 'get_student_portal_branding') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            school_name: 'Arena Central',
            logo_url: null,
            school_whatsapp: '11999998888',
          }),
        });
        return;
      }

      if (rpcName === 'get_student_portal_data') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            authenticated: true,
            student: {
              id: 'student-1',
              name: 'Maria Silva',
              school_name: 'Arena Central',
              school_whatsapp: '11999998888',
              plan_name: 'Plano mensal',
              plan_price: 120,
              signed: true,
            },
            groups: [],
            attendance_stats: {
              percent: 100,
              total_classes: 4,
              presences: 4,
              absences: 0,
            },
            attendance_logs: [],
            payments: [{
              id: 'payment-1',
              amount: 120,
              paid_amount: 20,
              paid: false,
              due_date: '2026-07-15',
              paid_at: null,
              month_ref: 'Julho/2026',
            }],
            payment_config: {
              pix_key: 'pix@esportiz.com.br',
              pix_receiver: 'Arena Central',
            },
          }),
        });
        return;
      }

      if (rpcName === 'get_student_portal_requests') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, requests: [] }),
        });
        return;
      }

      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ message: `Unexpected RPC: ${rpcName}` }),
      });
    });

    await page.goto(`/portal-aluno?ct=${ownerId}`, { waitUntil: 'domcontentloaded' });
    await page.locator('input[placeholder="000.000.000-00"]').fill('52998224725');
    await page.locator('input[placeholder="DD/MM/AAAA"]').fill('15051990');
    await page.getByRole('button', { name: 'Acessar Portal' }).click();

    await expect(page.getByText('Maria Silva', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Pagar com Pix' }).click();

    const pixDialog = page.getByRole('dialog', { name: 'Pagamento via Pix' });
    await expect(pixDialog).toBeVisible();
    await expect(pixDialog.getByText('Mensalidade, Julho/2026')).toBeVisible();
    await expect(pixDialog.getByText('R$ 100,00', { exact: true })).toBeVisible();
    await expect(pixDialog.getByAltText('QR Code Pix')).toBeVisible();
    await expect(pixDialog.getByRole('button', { name: 'Copiar código Pix' })).toBeEnabled();
  });
});