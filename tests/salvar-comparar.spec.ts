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
  price: String(price),
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
  carro('a2', 'MARCA', 'BETA', 120000),
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
    await expect(page.locator('.vehicle-actions').nth(0).locator('[data-acao="salvar"]')).toHaveClass(/ativo/);
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
    // Combustível e câmbio vêm de technicalSpecs e não podem aparecer como N/A.
    expect(texto).toContain('Flex');
    // Preço é texto na API: o check tem que ir para o mais barato, não para o que vem primeiro em ordem de texto.
    const linhaPreco = page.locator('tr', { has: page.locator('td.spec-label', { hasText: 'Preço' }) });
    await expect(linhaPreco.locator('td').nth(1)).toContainText('✓');
    await expect(linhaPreco.locator('td').nth(2)).not.toContainText('✓');
    expect(texto).toContain('Manual');
  });

  test('na página do carro: salvar e comparar pelo botão do detalhe', async ({ page }) => {
    await preparar(page);
    await page.goto('/detalhes-carro.html?id=a2');
    const bloco = page.locator('.vehicle-actions');
    await expect(bloco).toBeVisible({ timeout: 10000 });

    expect(await bloco.locator('[data-acao="salvar"]').innerHTML()).toContain('heart');
    await bloco.locator('[data-acao="salvar"]').click();
    await expect(bloco.locator('[data-acao="salvar"]')).toHaveClass(/ativo/);
    expect(await bloco.locator('[data-acao="salvar"]').innerHTML()).toContain('heart');
    expect(await bloco.locator('[data-acao="salvar"]').textContent()).toBe('');
    expect(await page.evaluate(() => localStorage.getItem('carinsight_favorites'))).toContain('a2');

    await bloco.locator('[data-acao="comparar"]').click();
    await expect(bloco.locator('[data-acao="comparar"]')).toHaveText('Na comparação');
    expect(await page.evaluate(() => localStorage.getItem('carinsight_compare'))).toContain('a2');
  });

  test('na busca: Conversar com vendedor abre o WhatsApp 5033 com o carro, ao lado de Saiba mais', async ({ page }) => {
    await preparar(page);
    await page.goto('/buscando-carro.html');
    const conversar = page.locator('.btn-check-availability');
    await expect(conversar).toHaveCount(3, { timeout: 10000 });
    const href = await conversar.first().getAttribute('href');
    expect(href).toMatch(/^https:\/\/wa\.me\/5511949105033\?text=/);
    expect(decodeURIComponent(href ?? '')).toContain('ALFA');
    await expect(page.locator('.btn-card-action').first()).toBeVisible();
  });

  test('desmarcar tira o carro da lista e o botão volta ao texto normal', async ({ page }) => {
    await preparar(page);
    await page.goto('/detalhes-carro.html?id=a1');
    const bloco = page.locator('.vehicle-actions');
    await expect(bloco).toBeVisible({ timeout: 10000 });
    await bloco.locator('[data-acao="salvar"]').click();
    await bloco.locator('[data-acao="salvar"]').click();
    await expect(bloco.locator('[data-acao="salvar"]')).not.toHaveClass(/ativo/);
    expect(await page.evaluate(() => localStorage.getItem('carinsight_favorites'))).not.toContain('a1');
  });
});
