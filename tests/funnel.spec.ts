import { test, expect, Page } from '@playwright/test';

/**
 * E2E do funil de lead: home → busca → detalhe → chat → handoff WhatsApp.
 * Backend mockado via page.route (não requer API rodando).
 */

const VEHICLE = {
  id: 'v1',
  make: 'Jeep',
  model: 'Renegade',
  version: 'Longitude',
  yearModel: 2022,
  yearFab: 2021,
  price: 89900,
  mileage: 35000,
  bodyType: 'suv',
  condition: 'USED',
  title: 'Jeep Renegade Longitude 2022 impecável',
  features: ['Câmera de ré', 'Central multimídia'],
  aiTags: ['Familiar', 'Confortável'],
  technicalSpecs: { transmission: 'Automático', engine: '1.3 Turbo', fuel: 'Flex' },
  media: [],
  dealer: { name: 'RobustCar Veículos', verificationStatus: 'VERIFIED' },
};

const RECOMMENDATION = {
  vehicleId: 'v1',
  matchScore: 92,
  reasoning: 'SUV dentro do orçamento, ideal para família',
  highlights: [],
  concerns: [],
  vehicle: {
    id: 'v1',
    make: 'Jeep',
    model: 'Renegade',
    yearModel: 2022,
    price: 89900,
    mileage: 35000,
    bodyType: 'suv',
  },
};

const WA_LINK = 'https://wa.me/5511999999999?text=Ol%C3%A1%21%20Vim%20do%20site%20CarInsight';

/** Mock central da API: um handler por pathname */
async function mockApi(page: Page, options: { handoffOnMessage?: boolean } = {}) {
  let messageCount = 0;

  await page.route('**/localhost:3000/**', async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    const method = route.request().method();

    const json = (body: unknown) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });

    if (path === '/vehicles' && method === 'GET') {
      return json({ data: [VEHICLE], meta: { total: 1, page: 1, totalPages: 1 } });
    }
    if (path === '/vehicles/v1' && method === 'GET') {
      return json(VEHICLE);
    }
    if (path === '/search' && method === 'GET') {
      return json([{ ...VEHICLE, score: 0.9 }]);
    }
    if (path === '/api/chat/start' && method === 'POST') {
      return json({
        sessionId: 'session-e2e',
        greeting: 'Olá! Sou a assistente do CarInsight. Qual é o seu nome?',
        vehicle: VEHICLE,
      });
    }
    if (path === '/api/chat/session-e2e/message' && method === 'POST') {
      messageCount++;
      if (options.handoffOnMessage && messageCount >= 2) {
        return json({
          response: 'Perfeito! Preparei um resumo. Clique no botão abaixo para continuar no WhatsApp da loja.',
          suggestedActions: ['OPEN_WHATSAPP'],
          recommendations: [RECOMMENDATION],
          currentNode: 'negotiation',
          handoff: { leadId: 'lead-e2e', waLink: WA_LINK, summary: 'resumo' },
        });
      }
      return json({
        response: 'Encontrei uma ótima opção para você!',
        suggestedActions: ['SHOW_FINANCING'],
        recommendations: [RECOMMENDATION],
        currentNode: 'recommendation',
      });
    }
    if (path.startsWith('/interactions')) {
      return json({ success: true });
    }

    return json({});
  });
}

test.describe('Funil de lead', () => {
  test('home: busca propaga o texto para buscando-carro.html?q=', async ({ page }) => {
    await mockApi(page);
    await page.goto('/index.html');

    const input = page.locator('#search-form-id input[type="text"]');
    await input.fill('suv para família');
    await input.press('Enter');

    await expect(page).toHaveURL(/buscando-carro\.html\?q=suv(\+|%20)para(\+|%20)fam/);
  });

  test('busca: renderiza resultados reais e link com ?id=', async ({ page }) => {
    await mockApi(page);
    await page.goto('/buscando-carro.html?q=suv');

    const grid = page.locator('.cars-grid');
    await expect(grid.getByText('Jeep Renegade', { exact: false }).first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.results-count')).toContainText('1 veículo');

    const detailLink = page.locator('.cars-grid a[href*="detalhes-carro.html?id=v1"]').first();
    await expect(detailLink).toBeVisible();
  });

  test('detalhe: carrega o veículo do ?id= e abre o chat', async ({ page }) => {
    await mockApi(page);
    await page.goto('/detalhes-carro.html?id=v1');

    await expect(page.locator('.vehicle-header h1')).toContainText('Jeep Renegade', { timeout: 10000 });
    await expect(page.locator('.price-tag-large')).toContainText('89.900');

    await page.locator('.btn-card-action-whats').click();
    await expect(page.locator('#chat-modal')).toBeVisible();
    await expect(page.locator('#chat-messages')).toContainText('assistente do CarInsight');
  });

  test('chat: recomendações viram cards e handoff vira botão de WhatsApp', async ({ page }) => {
    await mockApi(page, { handoffOnMessage: true });
    await page.goto('/detalhes-carro.html?id=v1');

    await page.locator('.btn-card-action-whats').click();
    await expect(page.locator('#chat-modal')).toBeVisible();

    // 1ª mensagem: recomendação em card
    await page.locator('#chat-input').fill('Quero um SUV até 90 mil');
    await page.locator('.chat-send-btn').click();
    await expect(page.locator('.chat-rec-card')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.chat-rec-card')).toContainText('Jeep Renegade 2022');
    await expect(page.locator('.chat-rec-reason')).toContainText('ideal para família');

    // 2ª mensagem: handoff → CTA WhatsApp com wa.me
    await page.locator('#chat-input').fill('Quero falar com um vendedor');
    await page.locator('.chat-send-btn').click();
    const waBtn = page.locator('.chat-whatsapp-btn');
    await expect(waBtn).toBeVisible({ timeout: 10000 });
    await expect(waBtn).toHaveAttribute('href', /wa\.me\/5511999999999/);
    await expect(waBtn).toContainText('WhatsApp');
  });

  test('chatbot flutuante abre o chat geral em qualquer página', async ({ page }) => {
    await mockApi(page);
    await page.goto('/index.html');

    await page.locator('.floating-chatbot').click();
    await expect(page.locator('#chat-modal')).toBeVisible();
  });

  test('favoritos: salvar dispara o endpoint com x-session-id', async ({ page }) => {
    await mockApi(page);

    const saveRequest = page.waitForRequest(
      (req) => req.url().includes('/interactions/save/') && req.method() === 'POST',
    );

    await page.goto('/buscando-carro.html?q=suv');
    await page.locator('.cars-grid').getByText('Salvar', { exact: false }).first().click();

    const request = await saveRequest;
    expect(request.headers()['x-session-id']).toMatch(/^anon-/);
  });
});
