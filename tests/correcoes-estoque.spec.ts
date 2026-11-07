import { readFileSync } from 'node:fs';
import { test, expect, Page } from '@playwright/test';

/** Dado que a loja cadastrou errado é corrigido na ficha e nos filtros, sem mexer nos outros carros. */

const carro = (id: string, codigo: string) => ({
  id,
  title: `CARRO ${id} 2.0 4P 2014`,
  make: 'MARCA',
  model: id.toUpperCase(),
  version: '2.0',
  yearModel: 2014,
  yearFab: 2014,
  price: '87990',
  mileage: 50000,
  condition: 'USED',
  status: 'AVAILABLE',
  bodyType: 'sedan',
  technicalSpecs: { transmission: 'Manual', fuel: 'Flex', engine: '2.0', source: { site: 'loja-exemplo.test', id: codigo } },
  features: [],
  aiTags: [],
  media: [],
  dealer: { name: 'Loja Exemplo', verificationStatus: 'PENDING' },
});
const ESTOQUE = [carro('corrigido', '1'), carro('normal', '2')];

async function preparar(page: Page) {
  await page.route('**/correcoes-estoque.js', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'text/javascript',
      body: `window.CorrecoesEstoque = { 'loja-exemplo.test:1': { transmission: 'Automático' } };`,
    }),
  );
  await page.route('**/localhost:3000/**', (route) => {
    const url = new URL(route.request().url());
    const json = (corpo: unknown) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(corpo) });
    if (url.pathname === '/vehicles') return json({ data: ESTOQUE, meta: { total: 2, page: 1, limit: 100, totalPages: 1 } });
    const id = url.pathname.split('/vehicles/')[1];
    return json((id && ESTOQUE.find((v) => v.id === id)) || []);
  });
}

const cards = (page: Page) => page.locator('.cars-grid .car-card');
const fichaDoCambio = (page: Page) => page.locator('.specs-card, .spec-section, section, div').filter({ hasText: /^\s*Transmissão/ }).last();

test.describe('correção de câmbio', () => {
  test('a ficha do carro corrigido mostra automático e a do outro segue manual', async ({ page }) => {
    await preparar(page);
    await page.goto('/detalhes-carro.html?id=corrigido');
    await expect(page.locator('body')).toContainText('Transmissão', { timeout: 15000 });
    await expect(fichaDoCambio(page)).toContainText('Automático');

    await page.goto('/detalhes-carro.html?id=normal');
    await expect(page.locator('body')).toContainText('Transmissão', { timeout: 15000 });
    await expect(fichaDoCambio(page)).toContainText('Manual');
  });

  test('o filtro de câmbio usa o valor corrigido', async ({ page }) => {
    await preparar(page);
    await page.goto('/buscando-carro.html?cambio=automatico');
    await expect(cards(page)).toHaveCount(1, { timeout: 15000 });
    await expect(cards(page).first()).toContainText('CORRIGIDO');

    await page.goto('/buscando-carro.html?cambio=manual');
    await expect(cards(page)).toHaveCount(1, { timeout: 15000 });
    await expect(cards(page).first()).toContainText('NORMAL');
  });

  test('o arquivo real traz o City e o BMW como automáticos', () => {
    const texto = readFileSync('correcoes-estoque.js', 'utf8');
    expect(texto).toContain("'renatinhuscars.com.br:881': { transmission: 'Automático' }");
    expect(texto).toContain("'renatinhuscars.com.br:796': { transmission: 'Automático' }");
  });
});
