import { test, expect, Page } from '@playwright/test';

/**
 * Caminho do cliente: salvar e comparar pelos cards e pela página do carro,
 * depois ver a tabela na página Comparar. Antes disso, nenhum teste cobria esse fluxo.
 */

const carro = (id: string, make: string, model: string, price: number) => ({
  id,
  title: `${make} ${model} 2020`,
  make,
  model,
  version: null,
  yearModel: 2020,
  yearFab: 2020,
  price,
  mileage: 40000,
  condition: 'USED',
  status: 'AVAILABLE',
  bodyType: 'hatch',
  technicalSpecs: { transmission: 'Manual', fuel: 'Flex' },
  features: ['Ar-condicionado'],
  aiTags: [],
  media: [],
  dealer: { name: 'Loja Sintética', verificationStatus: 'PENDING' },
});

const ESTOQUE = [
  carro('a1', 'MARCA', 'ALFA', 50000),
  carro('a2', 'MARCA', 'BETA', 60000),
  carro('a3', 'MARCA', 'GAMA', 70000),
];

async function preparar(page: Page) {
  await page.route('**/localhost:3000/**', (route) => {
    const caminho = new URL(route.request().url()).pathname;
    const json = (corpo: unknown) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(corpo) });
    if (caminho === '/vehicles') {
      return json({ data: ESTOQUE, meta: { total: ESTOQUE.length, page: 1, totalPages: 1 } });
    }
    const achado = ESTOQUE.find((v) => caminho === `/vehicles/${v.id}`);
    if (achado) return json(achado);
    return json([]);
  });
  await page.route('https://exemplo.test/**', (route) => route.abort());
}

test.describe('salvar e comparar', () => {
  test('nos cards: salvar e comparar dois carros, e a tabela aparece na página Comparar', async ({ page }) => {
    await preparar(page);
    await page.goto('/veiculos.html');
    await expect(page.locator('.vehicle-actions')).toHaveCount(3, { timeout: 10000 });

    await page.locator('.vehicle-actions').nth(0).locator('[data-acao="salvar"]').click();
    await expect(page.locator('.vehicle-actions').nth(0).locator('[data-acao="salvar"]')).toHaveText('Salvo');
    expect(await page.evaluate(() => localStorage.getItem('carinsight_favorites'))).toContain('a1');

    await page.locator('.vehicle-actions').nth(0).locator('[data-acao="comparar"]').click();
    await page.locator('.vehicle-actions').nth(1).locator('[data-acao="comparar"]').click();
    await expect(page.locator('.vehicle-actions').nth(1).locator('[data-acao="comparar"]')).toHaveText('Na comparação');

    await page.goto('/comparar.html');
    await expect(page.locator('table').first()).toBeVisible({ timeout: 10000 });
    const texto = await page.locator('body').innerText();
    expect(texto).toContain('ALFA');
    expect(texto).toContain('BETA');
    expect(texto).not.toContain('GAMA');
  });

  test('na página do carro: salvar e comparar pelo botão do detalhe', async ({ page }) => {
    await preparar(page);
    await page.goto('/detalhes-carro.html?id=a2');
    const bloco = page.locator('.vehicle-actions');
    await expect(bloco).toBeVisible({ timeout: 10000 });

    await bloco.locator('[data-acao="salvar"]').click();
    await expect(bloco.locator('[data-acao="salvar"]')).toHaveText('Salvo');
    expect(await page.evaluate(() => localStorage.getItem('carinsight_favorites'))).toContain('a2');

    await bloco.locator('[data-acao="comparar"]').click();
    await expect(bloco.locator('[data-acao="comparar"]')).toHaveText('Na comparação');
    expect(await page.evaluate(() => localStorage.getItem('carinsight_compare'))).toContain('a2');
  });

  test('desmarcar tira o carro da lista e o botão volta ao texto normal', async ({ page }) => {
    await preparar(page);
    await page.goto('/detalhes-carro.html?id=a1');
    const bloco = page.locator('.vehicle-actions');
    await expect(bloco).toBeVisible({ timeout: 10000 });
    await bloco.locator('[data-acao="salvar"]').click();
    await bloco.locator('[data-acao="salvar"]').click();
    await expect(bloco.locator('[data-acao="salvar"]')).toHaveText('Salvar');
    expect(await page.evaluate(() => localStorage.getItem('carinsight_favorites'))).not.toContain('a1');
  });
});
