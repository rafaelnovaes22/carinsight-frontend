import { test, expect, Page } from '@playwright/test';

/**
 * Página Comparar no desenho do repositório do Diego: carros salvos, critérios e grade.
 * Estes testes medem a tela, porque o layout já foi ao ar quebrado com a suíte passando.
 */

const carro = (id: string, model: string, price: number, extra: Record<string, unknown> = {}) => ({
  id,
  title: `MARCA ${model} 2020`,
  make: 'MARCA',
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
  ...extra,
});

const ESTOQUE = [
  carro('a1', 'ALFA', 50000, {
    title: 'MARCA ALFA COM UM NOME BEM COMPRIDO - PASSAGEM POR LEILÃO 2020',
    features: ['Ar-condicionado', ...Array.from({ length: 24 }, (_, i) => `Item sintético de número ${i}`)],
  }),
  carro('a2', 'BETA', 120000),
  carro('a3', 'GAMA', 70000),
  carro('a4', 'DELTA', 80000),
];

async function abrir(page: Page, salvos: string[], comparando: string[], largura = 1280) {
  await page.setViewportSize({ width: largura, height: 1000 });
  await page.route('**/localhost:3000/**', (route) => {
    const caminho = new URL(route.request().url()).pathname;
    const achado = ESTOQUE.find((v) => caminho === `/vehicles/${v.id}`);
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(achado ?? []),
    });
  });
  await page.addInitScript(
    ([s, c]) => {
      if (sessionStorage.getItem('preparado')) return;
      sessionStorage.setItem('preparado', '1');
      localStorage.setItem('carinsight_favorites', JSON.stringify(s));
      localStorage.setItem('carinsight_compare', JSON.stringify(c));
    },
    [salvos, comparando],
  );
  await page.goto('/comparar.html');
  await expect(page.locator('.comparison-item-column').first()).toBeVisible({ timeout: 10000 });
}

const coluna = (page: Page, i: number) => page.locator('.comparison-item-column').nth(i);
const listaComparando = (page: Page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem('carinsight_compare') || '[]'));

test.describe('Comparar: medidas da tela', () => {
  test('a lista de itens não cobre nem vaza das outras linhas', async ({ page }) => {
    await abrir(page, ['a1', 'a2'], ['a1', 'a2']);
    const medida = await coluna(page, 0).locator('.item-lista').evaluate((el) => ({
      conteudo: el.scrollHeight,
      caixa: el.clientHeight,
      topo: el.getBoundingClientRect().top,
      anterior: (el.previousElementSibling as HTMLElement).getBoundingClientRect().bottom,
    }));
    expect(medida.conteudo).toBeLessThanOrEqual(medida.caixa + 1);
    expect(medida.topo).toBeGreaterThanOrEqual(medida.anterior - 1);
  });

  test('cada linha fica na mesma altura do seu nome, com nome de carro longo', async ({ page }) => {
    await abrir(page, ['a1', 'a2', 'a3'], ['a1', 'a2', 'a3']);
    const desvios = await page.evaluate(() => {
      const topo = (el: Element) => Math.round(el.getBoundingClientRect().top);
      const nomes = [...document.querySelectorAll('.comparison-labels .criteria-label')];
      const colunas = [...document.querySelectorAll('.comparison-item-column:not(.placeholder)')];
      return colunas.flatMap((c) => {
        const valores = [...c.querySelectorAll('.item-value')];
        return nomes.map((n, i) => Math.abs(topo(n) - topo(valores[i])));
      });
    });
    expect(desvios.length).toBeGreaterThan(0);
    expect(Math.max(...desvios)).toBeLessThanOrEqual(1);
    const titulo = await coluna(page, 0).locator('.item-header').evaluate((el) => el.scrollHeight <= el.clientHeight + 1);
    expect(titulo).toBe(true);
  });

  for (const largura of [1280, 1024, 390]) {
    test(`sem rolagem lateral em ${largura}px`, async ({ page }) => {
      await abrir(page, ['a1', 'a2', 'a3'], ['a1', 'a2', 'a3'], largura);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      // A grade esconde o que passa da largura: nenhuma coluna pode ficar cortada.
      const cortada = await page.locator('.comparison-grid-modern').evaluate((g) => g.scrollWidth > g.clientWidth + 1);
      expect(cortada).toBe(false);
    });
  }
});

test.describe('Comparar: uso', () => {
  test('tem as seções do desenho e mostra foto, especificações e o mais barato em destaque', async ({ page }) => {
    await abrir(page, ['a1', 'a2'], ['a1', 'a2']);
    await expect(page.locator('.saved-selection-section h2')).toHaveText('Meus Carros Salvos');
    await expect(page.locator('.comparison-criteria-section h3')).toHaveText('Critérios de Comparação');
    await expect(coluna(page, 0).locator('.item-img img')).toBeVisible();
    await expect(coluna(page, 0)).toContainText('Flex');
    await expect(coluna(page, 0).locator('.item-value').first()).toHaveClass(/highlight/);
    await expect(coluna(page, 1).locator('.item-value').first()).not.toHaveClass(/highlight/);
    await expect(coluna(page, 2)).toHaveClass(/placeholder/);
  });

  test('salvos sem limite: selecionar aceita 3, o 4º recebe aviso e desmarcar libera a vaga', async ({ page }) => {
    await abrir(page, ['a1', 'a2', 'a3', 'a4'], []);
    const botoes = page.locator('.btn-select-car');
    await expect(botoes).toHaveCount(4);
    await botoes.nth(0).click();
    await expect(botoes.nth(0)).toHaveClass(/active/);
    await botoes.nth(1).click();
    await expect(botoes.nth(1)).toHaveClass(/active/);
    await botoes.nth(2).click();
    await expect(botoes.nth(2)).toHaveClass(/active/);

    const avisos: string[] = [];
    page.on('dialog', async (d) => {
      avisos.push(d.message());
      await d.accept();
    });
    await botoes.nth(3).click();
    await expect.poll(() => avisos.length).toBe(1);
    expect(avisos[0]).toContain('Máximo de 3');
    expect(await listaComparando(page)).toEqual(['a1', 'a2', 'a3']);

    await botoes.nth(0).click();
    await expect(botoes.nth(0)).not.toHaveClass(/active/);
    await botoes.nth(3).click();
    await expect(botoes.nth(3)).toHaveClass(/active/);
    expect(await listaComparando(page)).toEqual(['a2', 'a3', 'a4']);
  });

  test('critério desmarcado tira a linha da grade, e marcar de novo devolve', async ({ page }) => {
    await abrir(page, ['a1', 'a2'], ['a1', 'a2']);
    const nomes = page.locator('.comparison-labels .criteria-label');
    await expect(nomes.filter({ hasText: 'Quilometragem' })).toHaveCount(1);
    await page.locator('.criteria-tag', { hasText: 'Quilometragem' }).click();
    await expect(nomes.filter({ hasText: 'Quilometragem' })).toHaveCount(0);
    await expect(coluna(page, 0).locator('.item-value[data-label="Quilometragem"]')).toHaveCount(0);
    await page.locator('.criteria-tag', { hasText: 'Quilometragem' }).click();
    await expect(nomes.filter({ hasText: 'Quilometragem' })).toHaveCount(1);
  });

  test('critério sem dado em nenhum carro não aparece', async ({ page }) => {
    await abrir(page, ['a2', 'a3'], ['a2', 'a3']);
    await expect(page.locator('.criteria-tag', { hasText: 'Potência' })).toHaveCount(0);
    await expect(page.locator('.comparison-labels .criteria-label', { hasText: 'Potência' })).toHaveCount(0);
  });

  test('Adicionar abre a janela de escolha com estilo, e o carro entra na grade', async ({ page }) => {
    await abrir(page, ['a1', 'a2', 'a3'], ['a1']);
    await page.locator('.btn-add-comparison').first().click();
    const janela = page.locator('#vehicle-selector-modal');
    await expect(janela).toHaveClass(/show/);
    expect(await janela.evaluate((el) => getComputedStyle(el).position)).toBe('fixed');
    await janela.locator('.vehicle-selector-item', { hasText: 'BETA' }).click();
    await expect(coluna(page, 1)).toContainText('BETA');
    await expect(janela).not.toHaveClass(/show/);
  });

  test('Mudar veículo troca o carro no mesmo lugar', async ({ page }) => {
    await abrir(page, ['a1', 'a2', 'a3'], ['a1', 'a2']);
    await coluna(page, 0).locator('.btn-change-item').click();
    await page.locator('#vehicle-selector-modal .vehicle-selector-item', { hasText: 'GAMA' }).click();
    await expect(coluna(page, 0)).toContainText('GAMA');
    expect(await listaComparando(page)).toEqual(['a3', 'a2']);
  });

  test('sem carro salvo, explica como salvar e mostra os 3 espaços', async ({ page }) => {
    await abrir(page, [], []);
    await expect(page.locator('.compare-sem-salvos')).toContainText('coração');
    await expect(page.locator('.comparison-item-column.placeholder')).toHaveCount(3);
  });

  test('não afirma regra de categoria que o site não aplica', async ({ page }) => {
    await abrir(page, ['a1'], ['a1']);
    expect(await page.locator('body').innerText()).not.toContain('categorias similares');
  });
});
