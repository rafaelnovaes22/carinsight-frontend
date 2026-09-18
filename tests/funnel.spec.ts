import { expect, test, type Page } from '@playwright/test';

const SOURCE = { provider: 'parallelum', name: 'FIPE via Parallelum (provedor independente)', url: 'https://fipe.parallelum.com.br/api/v2/cars/brands/23/models/100/years/2022-1' };
const MODELS = [{ code: '100', name: 'Modelo Alfa 1.0' }, { code: '200', name: 'Modelo Beta 1.6' }, { code: '300', name: 'Modelo Gama 2.0' }, { code: '400', name: 'Modelo Delta 1.4' }];

async function mockCatalog(page: Page, unavailable = false): Promise<void> {
  await page.route('**/localhost:3000/**', async (route) => {
    const url = new URL(route.request().url());
    if (unavailable && url.pathname === '/catalog/brands') return route.fulfill({ status: 503, body: '{}' });
    let payload: object = { items: [], source: SOURCE, retrievedAt: '2026-09-18T12:00:00Z', cached: false };
    if (url.pathname === '/catalog/brands') payload = { ...payload, items: [{ code: '23', name: 'Marca de teste' }] };
    if (url.pathname === '/catalog/models') payload = { ...payload, items: MODELS };
    if (url.pathname === '/catalog/years') payload = { ...payload, items: [{ code: '2022-1', name: '2022 Gasolina' }] };
    if (url.pathname === '/catalog/valuation') payload = { kind: 'reference_valuation', brand: 'Marca de teste', model: MODELS.find((item) => item.code === url.searchParams.get('modelId'))?.name, modelYear: 2022, fuel: 'Gasolina', codeFipe: '000001-1', price: 65000 + Number(url.searchParams.get('modelId')), priceFormatted: 'R$ 65.100,00', currency: 'BRL', referenceMonth: 'setembro de 2026', source: SOURCE, retrievedAt: '2026-09-18T12:00:00Z', cached: false, disclaimer: 'Referência, não oferta.' };
    if (url.pathname === '/decision/brief') payload = { profile: { budgetMax: 80000 }, summary: 'Vamos comparar referências com seu limite de compra e confirmar os custos da sua rotina.', followUpQuestions: ['Quanto você roda por mês?'], interpretation: 'rules', suggestedBrands: [{ code: '23', name: 'Marca de teste' }], modelSearchTerms: [], limitations: ['Consumo e condição de um veículo específico precisam ser confirmados.'] };
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(payload) });
  });
}

async function chooseReference(page: Page, model = '100'): Promise<void> {
  await page.locator('#catalog-brand').selectOption('23');
  await page.locator('#catalog-model').selectOption(model);
  await page.locator('#catalog-year').selectOption('2022-1');
  await page.getByRole('button', { name: 'Consultar referência' }).click();
  await expect(page.locator('#reference-result')).toContainText('setembro de 2026');
}

test('root serves the decision product and briefing drives the real catalog controls', async ({ page }) => {
  await mockCatalog(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('O próximo carro.');
  await page.getByLabel('Como você pretende usar o carro?').fill('Quero um carro para a cidade até 80 mil');
  await page.getByRole('button', { name: 'Montar meu plano' }).click();
  await expect(page.locator('#brief-response')).toContainText('pelos seus critérios');
  await expect(page.locator('#brief-budget')).toHaveValue('80000');
  await page.getByRole('button', { name: 'Explorar Marca de teste' }).click();
  await expect(page.locator('#catalog-model')).toBeEnabled();
  await expect(page.locator('body')).not.toContainText('Parceiros Certificados');
});

test('catalog states source and reference month, and duplicate choices stay a single item', async ({ page }) => {
  await mockCatalog(page); await page.goto('/');
  await page.locator('#brief-budget').fill('80000');
  await chooseReference(page);
  await expect(page.locator('#reference-result')).toContainText('65.100');
  await expect(page.locator('#reference-result')).toContainText('abaixo do seu limite');
  await expect(page.locator('#reference-result')).toContainText('Não é anúncio');
  await page.getByRole('button', { name: 'Adicionar à comparação' }).click();
  await page.getByRole('button', { name: 'Adicionar à comparação' }).click();
  await expect(page.locator('.shortlist-card')).toHaveCount(1);
  await page.reload();
  await expect(page.locator('.shortlist-card')).toHaveCount(1);
});

test('shortlist has a hard limit and monthly costs keep unknowns explicit', async ({ page }) => {
  await mockCatalog(page); await page.goto('/');
  for (const model of ['100', '200', '300', '400']) { await chooseReference(page, model); await page.getByRole('button', { name: 'Adicionar à comparação' }).click(); }
  await expect(page.locator('.shortlist-card')).toHaveCount(3);
  await expect(page.locator('#catalog-status')).toContainText('Você já escolheu 3');
  const first = page.locator('.cost-card').first();
  await expect(first.locator('output')).toHaveText('A preencher');
  await page.getByLabel('Distância por mês (km)').fill('1200');
  await page.getByLabel('Preço do combustível (R$/litro)').fill('6');
  await first.getByLabel('Consumo informado (km/l)').fill('12');
  await expect(first.locator('output')).toContainText('600');
  await first.getByText('Adicionar despesas anuais').click();
  await first.getByLabel('Seguro por ano (R$)').fill('2400');
  await expect(first.locator('output')).toContainText('800');
  await expect(first).toContainText('IPVA; Manutenção');
  await expect(page.locator('.cost-card').nth(1).locator('output')).toHaveText('A preencher');
});

test('catalog failure can be retried without fabricating prices or models', async ({ page }) => {
  await mockCatalog(page, true); await page.goto('/');
  await expect(page.locator('#catalog-status')).toContainText('HTTP 503');
  await expect(page.locator('#catalog-brand')).toBeDisabled();
  await expect(page.locator('#reference-result')).not.toContainText('R$');
  await page.unroute('**/localhost:3000/**'); await mockCatalog(page);
  await page.getByRole('button', { name: 'Tentar novamente' }).click();
  await expect(page.locator('#catalog-brand')).toBeEnabled();
});

test('shared links exclude personal preferences and restore API references', async ({ page }) => {
  await mockCatalog(page); await page.goto('/?compare=23:100:2022-1,23:200:2022-1#comparison');
  await expect(page.locator('.shortlist-card')).toHaveCount(2);
  await page.locator('#brief-budget').fill('80000');
  await page.locator('#brief-city').fill('Cidade privada');
  await page.getByRole('button', { name: 'Copiar link' }).click();
  const url = await page.locator('#share-link').inputValue();
  expect(url).toContain('compare=23'); expect(url).not.toContain('80000'); expect(url).not.toContain('privada');
});

test('mobile 360px remains readable, keyboard operable and free of horizontal overflow', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await mockCatalog(page); await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Ir para o assistente' })).toBeFocused();
  await page.keyboard.press('Enter');
  await chooseReference(page);
  await page.getByRole('button', { name: 'Adicionar à comparação' }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('decision-mobile-360.png'), fullPage: true });
});

test('production build excludes source files and redirects old marketplace prototypes', async ({ page, request }) => {
  await mockCatalog(page);
  for (const route of ['/package.json', '/AGENTS.md', '/tests/funnel.spec.ts', '/search-page.js', '/.git/config']) expect((await request.get(route)).status()).toBe(404);
  await page.goto('/buscando-carro.html');
  await expect(page).toHaveURL(/\/#catalog$/);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});

test('desktop reference view has verified hierarchy', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 }); await mockCatalog(page); await page.goto('/');
  await expect(page.locator('#catalog-brand')).toBeEnabled();
  await page.screenshot({ path: testInfo.outputPath('decision-desktop.png'), fullPage: true });
  await chooseReference(page); await page.getByRole('button', { name: 'Adicionar à comparação' }).click();
  await page.locator('#catalog').scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath('decision-catalog-desktop.png') });
});
