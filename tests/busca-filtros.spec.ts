import { readFileSync } from 'node:fs';
import { test, expect, Page } from '@playwright/test';

/** Todos os botões de busca precisam mudar o resultado: home, filtros laterais e categorias. */

const carro = (id: string, make: string, model: string, ano: number, price: number, extra: Record<string, unknown> = {}, specs: Record<string, unknown> = {}) => ({
  id,
  title: `${make} ${model} ${ano}`,
  make,
  model,
  version: null,
  yearModel: ano,
  yearFab: ano,
  price: String(price),
  mileage: 50000,
  condition: 'USED',
  status: 'AVAILABLE',
  bodyType: 'hatch',
  technicalSpecs: { transmission: 'Manual', fuel: 'Flex', engine: '1.0', ...specs },
  features: [],
  aiTags: [],
  media: [],
  dealer: { name: "Renatinhu's Cars", verificationStatus: 'PENDING' },
  ...extra,
});

const ROBUST = { dealer: { name: 'Robust Car', verificationStatus: 'PENDING' } };
const ESPECIAIS = [
  carro('fit', 'HONDA', 'FIT', 2019, 79990, {}, { transmission: 'Automático', engine: '1.5' }),
  carro('city', 'HONDA', 'CITY', 2018, 79990, { bodyType: 'sedan' }, { transmission: 'Automático', engine: '1.5' }),
  carro('toro', 'FIAT', 'TORO', 2017, 96990, { bodyType: 'pickup', ...ROBUST }, { transmission: 'Automático', fuel: 'Diesel', engine: '2.0 Turbo Diesel 170 cv' }),
  carro('creta', 'HYUNDAI', 'CRETA', 2025, 121990, { bodyType: 'suv', features: ['6 airbags'], ...ROBUST }, { transmission: 'Automático', engine: '1.0 Turbo', color: 'Prata' }),
  carro('fusca', 'VOLKSWAGEN', 'FUSCA', 1975, 45000, {}, { fuel: 'Gasolina', engine: null }),
  carro('c3', 'CITROËN', 'C3', 2024, 64990),
];
const ESTOQUE = [
  ...ESPECIAIS,
  // Dois carros de uma loja sem estado confirmado: o filtro de estado não pode afirmar onde estão.
  ...Array.from({ length: 19 }, (_, i) => carro(`mobi${i}`, 'FIAT', 'MOBI', 2017, 43990, i < 2 ? { dealer: { name: 'Loja Sem Estado', verificationStatus: 'PENDING' } } : {}, { engine: '1.6' })),
];

// Lista sintética: o teste não pode mudar de resultado quando a Uber atualizar a lista real.
const LISTA_UBER = {
  cidade: 'São Paulo',
  fonte: 'https://exemplo.test/uber',
  consultadoEm: '2026-11-06',
  modelos: {
    'honda|fit': { uberx: 2011 },
    'honda|city': { uberx: 2011, black: 2023 },
    'fiat|toro': { uberx: 2011 },
    'hyundai|creta': { uberx: 2011, black: 2019 },
    'citroen|c3': { uberx: 2011 },
    'fiat|mobi': { uberx: 2011 },
  },
  cores: { 'foto-preto': 'Preto', 'foto-laranja': 'Laranja' },
};

async function preparar(page: Page, busca: { q: string; ids: string[] } | null = null) {
  await page.route('**/uber-elegiveis.js', (route) =>
    route.fulfill({ status: 200, contentType: 'text/javascript', body: `window.UberElegiveis = ${JSON.stringify(LISTA_UBER)};` }),
  );
  await page.route('**/localhost:3000/**', (route) => {
    const url = new URL(route.request().url());
    const json = (corpo: unknown) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(corpo) });
    if (url.pathname === '/vehicles') {
      const limite = Number(url.searchParams.get('limit')) || 20;
      const pagina = Number(url.searchParams.get('page')) || 1;
      return json({
        data: ESTOQUE.slice((pagina - 1) * limite, pagina * limite),
        meta: { total: ESTOQUE.length, page: pagina, limit: limite, totalPages: Math.ceil(ESTOQUE.length / limite) },
      });
    }
    if (url.pathname === '/search') {
      // Como a API real: só alguns campos, sem câmbio nem combustível.
      const ids = busca ? busca.ids : [];
      return json(ids.map((id, i) => {
        const v = ESTOQUE.find((c) => c.id === id)!;
        return { id, make: v.make, model: v.model, yearModel: v.yearModel, price: v.price, mileage: v.mileage, bodyType: v.bodyType, condition: v.condition, score: 0.9 - i / 100, dealer: v.dealer, media: [] };
      }));
    }
    return json([]);
  });
}

const contagem = (page: Page) => page.locator('.results-count');
const cards = (page: Page) => page.locator('.cars-grid .car-card');
const abrirResultados = async (page: Page, busca = '') => {
  await page.goto(`/buscando-carro.html${busca}`);
  await expect(page.locator('.filters-sidebar select[data-filtro="marca"]')).toHaveCount(1, { timeout: 15000 });
};
const lateral = (page: Page) => page.locator('.filters-sidebar');
const marcar = (page: Page, rotulo: string) =>
  lateral(page).locator('.checkbox-item', { hasText: new RegExp(`^\\s*${rotulo}\\s*$`) }).click();

test.describe('Resultados', () => {
  test('mostra todo o estoque, não só os 20 primeiros', async ({ page }) => {
    await preparar(page);
    await abrirResultados(page);
    await expect(cards(page)).toHaveCount(25);
    await expect(contagem(page)).toContainText('Encontramos 25 veículos');
  });

  test('nenhum controle decorativo nos dois painéis de filtros', async ({ page }) => {
    await preparar(page);
    await abrirResultados(page);
    await expect(page.locator('.filter-section div.select-box')).toHaveCount(0);
    await expect(page.locator('select[data-filtro="marca"]')).toHaveCount(2);
    await expect(page.locator('select[data-filtro="modelo"]')).toHaveCount(2);
    await expect(page.locator('select[data-filtro="anoMin"]')).toHaveCount(2);
    await expect(page.locator('select[data-filtro="estado"]')).toHaveCount(2);
    await expect(page.locator('.distance-slider')).toHaveCount(2);
    // Mede o próprio elemento: a tela de carregamento e a janela fechada também escondem o filtro.
    const exibicoes = await page.locator('.distance-slider').evaluateAll((els) => els.map((el) => getComputedStyle(el).display));
    expect(exibicoes).toEqual(['none', 'none']);
    await expect(page.locator('.location-box').first()).not.toContainText('São Paulo, SP');
  });

  test('Localização filtra pela loja e o estado escolhido aparece nos dois painéis', async ({ page }) => {
    await preparar(page);
    await abrirResultados(page);
    await lateral(page).locator('select[data-filtro="estado"]').selectOption({ label: 'SP' });
    await expect(cards(page)).toHaveCount(23);
    await expect(cards(page).filter({ hasText: 'TORO' })).toHaveCount(1);
    await expect(contagem(page)).toContainText('em SP');
    await expect(page.locator('#mobile-filter-modal select[data-filtro="estado"]')).toHaveValue('sp');
    await lateral(page).locator('select[data-filtro="estado"]').selectOption('');
    await expect(cards(page)).toHaveCount(25);
  });

  test('lê todas as páginas do catálogo quando o estoque não cabe em uma', async ({ page }) => {
    await preparar(page);
    await page.route('**/localhost:3000/vehicles?*', (route) => {
      const pagina = Number(new URL(route.request().url()).searchParams.get('page')) || 1;
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: ESTOQUE.slice((pagina - 1) * 10, pagina * 10),
          meta: { total: ESTOQUE.length, page: pagina, limit: 10, totalPages: 3 },
        }),
      });
    });
    await abrirResultados(page);
    await expect(cards(page)).toHaveCount(25);
  });

  test('não mostra filtro de exemplo nem preço pré-preenchido', async ({ page }) => {
    await preparar(page);
    await abrirResultados(page);
    await expect(page.locator('.active-filter-chip')).toHaveCount(0);
    await expect(page.locator('body')).not.toContainText('Até R$ 180k');
    await expect(lateral(page).locator('.price-inputs input').first()).toHaveValue('');
  });

  test('carroceria aceita mais de uma, e câmbio e combustível filtram de verdade', async ({ page }) => {
    await preparar(page);
    await abrirResultados(page);
    await marcar(page, 'SUV');
    await expect(cards(page)).toHaveCount(1);
    await marcar(page, 'Picape');
    await expect(cards(page)).toHaveCount(2);
    await marcar(page, 'Picape');
    await marcar(page, 'SUV');
    await expect(cards(page)).toHaveCount(25);

    await marcar(page, 'Automático');
    await expect(cards(page)).toHaveCount(4);
    await marcar(page, 'Diesel');
    await expect(cards(page)).toHaveCount(1);
    await expect(cards(page).first()).toContainText('TORO');
  });

  test('condição: desmarcar Usados deixa só os novos, e nenhum aqui', async ({ page }) => {
    await preparar(page);
    await abrirResultados(page);
    await marcar(page, 'Usados');
    await expect(cards(page)).toHaveCount(0);
    await expect(page.locator('.no-results')).toContainText('Nenhum veículo');
    await marcar(page, 'Usados');
    await expect(cards(page)).toHaveCount(25);
  });

  test('marca filtra e o modelo mostra só os daquela marca, com todos os anos do estoque', async ({ page }) => {
    await preparar(page);
    await abrirResultados(page);
    const marca = lateral(page).locator('select[data-filtro="marca"]');
    const modelo = lateral(page).locator('select[data-filtro="modelo"]');
    await marca.selectOption({ label: 'HONDA' });
    await expect(cards(page)).toHaveCount(2);
    expect(await modelo.locator('option').allTextContents()).toEqual(['Todos os modelos', 'CITY', 'FIT']);
    await modelo.selectOption({ label: 'CITY' });
    await expect(cards(page)).toHaveCount(1);
    await marca.selectOption({ label: 'CITROËN' });
    await expect(cards(page)).toHaveCount(1);
    await expect(cards(page).first()).toContainText('C3');
    await expect(lateral(page).locator('select[data-filtro="anoMin"] option', { hasText: '1975' })).toHaveCount(1);
  });

  test('ano e preço filtram pelos campos, e a faixa também', async ({ page }) => {
    await preparar(page);
    await abrirResultados(page);
    await lateral(page).locator('select[data-filtro="anoMin"]').selectOption('2024');
    await expect(cards(page)).toHaveCount(2);
    await lateral(page).locator('select[data-filtro="anoMin"]').selectOption('');

    const [min, max] = [lateral(page).locator('.price-inputs input').nth(0), lateral(page).locator('.price-inputs input').nth(1)];
    await max.fill('50000');
    await max.press('Tab');
    await expect(cards(page)).toHaveCount(20);
    await expect(max).toHaveValue(/50\.000/);
    await min.fill('45000');
    await min.press('Tab');
    await expect(cards(page)).toHaveCount(1);
    await lateral(page).locator('.btn-clear').click();
    await expect(cards(page)).toHaveCount(25);

    await lateral(page).locator('.faixa-preco[data-filtro="precoMin"]').evaluate((el: HTMLInputElement) => {
      el.value = '100000';
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await expect(cards(page)).toHaveCount(1);
    await expect(cards(page).first()).toContainText('CRETA');
    await expect(lateral(page).locator('.price-inputs input').first()).toHaveValue(/100\.000/);
  });

  test('Limpar zera os filtros e mantém o texto buscado', async ({ page }) => {
    await preparar(page, { q: 'honda', ids: ['fit', 'city', 'toro'] });
    await abrirResultados(page, '?q=honda&marca=Honda&anoMin=2019');
    await expect(cards(page)).toHaveCount(1);
    await lateral(page).locator('.btn-clear').click();
    await expect(cards(page)).toHaveCount(3);
    expect(page.url()).toContain('q=honda');
    expect(page.url()).not.toContain('marca');
  });

  test('texto ordena por relevância e os filtros usam os dados do catálogo', async ({ page }) => {
    await preparar(page, { q: 'carro', ids: ['toro', 'fit', 'c3'] });
    await abrirResultados(page, '?q=carro');
    await expect(cards(page)).toHaveCount(3);
    await expect(cards(page).first()).toContainText('TORO');
    await marcar(page, 'Automático');
    await expect(cards(page)).toHaveCount(2);
  });

  test('a busca fica na URL: recarregar mantém o filtro', async ({ page }) => {
    await preparar(page);
    await abrirResultados(page);
    await marcar(page, 'SUV');
    await expect(cards(page)).toHaveCount(1);
    expect(page.url()).toContain('carroceria=suv');
    await page.reload();
    await expect(cards(page)).toHaveCount(1, { timeout: 15000 });
    await expect(lateral(page).locator('.checkbox-item', { hasText: 'SUV' }).locator('input')).toBeChecked();
  });

  test('categorias filtram por dado do carro, e clicar de novo desliga', async ({ page }) => {
    await preparar(page);
    await abrirResultados(page);
    const categoria = (nome: string) => page.locator('.category-filter-btn', { hasText: new RegExp(`^\\s*${nome}\\s*$`) });
    await categoria('Clássicos').click();
    await expect(cards(page)).toHaveCount(1);
    await expect(cards(page).first()).toContainText('FUSCA');
    await expect(categoria('Clássicos')).toHaveClass(/active/);
    await categoria('Trabalho').click();
    await expect(cards(page)).toHaveCount(1);
    await expect(cards(page).first()).toContainText('TORO');
    await categoria('Desempenho').click();
    await expect(cards(page)).toHaveCount(2);
    await categoria('Segurança').click();
    await expect(cards(page)).toHaveCount(1);
    await expect(cards(page).first()).toContainText('CRETA');
    await categoria('Economia').click();
    await expect(cards(page)).toHaveCount(1);
    await expect(cards(page).first()).toContainText('C3');
    await categoria('Elétricos').click();
    await expect(cards(page)).toHaveCount(0);
    await categoria('Elétricos').click();
    await expect(cards(page)).toHaveCount(25);
  });

  test('Sem IPVA mostra só carro com mais de 20 anos de fabricação', async ({ page }) => {
    await preparar(page);
    await abrirResultados(page);
    await page.locator('.cat-sem-ipva').click();
    await expect(cards(page)).toHaveCount(1);
    await expect(cards(page).first()).toContainText('FUSCA');
    await expect(page).toHaveURL(/categoria=sem-ipva/);
    await expect(page.locator('.active-filters-scroll')).toContainText('Sem IPVA');

    const limites = await page.evaluate(() => {
      const { FiltrosBusca } = window as any;
      const ano = new Date().getFullYear();
      const filtro = { ...FiltrosBusca.vazio(), categoria: 'sem-ipva' };
      const atende = (yearFab: unknown) => FiltrosBusca.atende({ yearFab, yearModel: ano }, filtro);
      return [atende(ano - 21), atende(ano - 20), atende(null), atende(undefined)];
    });
    expect(limites).toEqual([true, false, false, false]);
  });

  test('Uber e Uber Black filtram pela lista oficial e dizem que a aprovação é da Uber', async ({ page }) => {
    await preparar(page);
    await abrirResultados(page);
    await expect(page.locator('.aviso-categoria')).toHaveCount(0);

    await page.locator('.cat-uber').click();
    await expect(cards(page)).toHaveCount(24);
    await expect(cards(page).filter({ hasText: 'FUSCA' })).toHaveCount(0);
    await expect(page).toHaveURL(/categoria=uber(&|$)/);
    await expect(page.locator('.aviso-categoria')).toContainText('consultada em 06/11/2026');
    await expect(page.locator('.aviso-categoria')).toContainText('A aprovação é da Uber');

    await page.locator('.cat-uber-black').click();
    await expect(cards(page)).toHaveCount(1);
    await expect(cards(page).first()).toContainText('CRETA');
    await expect(page.locator('.active-filters-scroll')).toContainText('Uber Black');

    await page.locator('.cat-uber-black').click();
    await expect(page.locator('.aviso-categoria')).toHaveCount(0);
  });

  test('a etiqueta Uber não afirma nada sem modelo, ano, cor ou portas', async ({ page }) => {
    await preparar(page);
    await abrirResultados(page);
    const r = await page.evaluate(() => {
      const { FiltrosBusca } = window as any;
      const ano = new Date().getFullYear();
      const passa = (categoria: string, carro: Record<string, unknown>) =>
        FiltrosBusca.atende(
          { make: 'HYUNDAI', model: 'CRETA', title: 'HYUNDAI CRETA 4P', yearFab: ano, technicalSpecs: { color: 'Prata' }, ...carro },
          { ...FiltrosBusca.vazio(), categoria },
        );
      return {
        dezAnos: passa('uber', { yearFab: ano - 10 }),
        onzeAnos: passa('uber', { yearFab: ano - 11 }),
        semAno: passa('uber', { yearFab: null }),
        duasPortas: passa('uber', { title: 'HYUNDAI CRETA 2P' }),
        foraDaLista: passa('uber', { model: 'FUSCA' }),
        semUberX: passa('uber', { model: 'CITY', make: 'HONDA' }),
        blackOk: passa('uber-black', {}),
        blackCorProibida: passa('uber-black', { technicalSpecs: { color: 'Vinho' } }),
        blackSemCor: passa('uber-black', { technicalSpecs: {} }),
        blackCorDaFoto: passa('uber-black', { id: 'foto-preto', technicalSpecs: {} }),
        blackFotoCorProibida: passa('uber-black', { id: 'foto-laranja', technicalSpecs: {} }),
        cadastroValeMaisQueFoto: passa('uber-black', { id: 'foto-preto', technicalSpecs: { color: 'Vinho' } }),
        blackAbaixoDoAno: passa('uber-black', { make: 'HONDA', model: 'CITY', yearFab: 2022 }),
        blackModeloDeFora: passa('uber-black', { make: 'HONDA', model: 'FIT' }),
      };
    });
    expect(r).toEqual({
      dezAnos: true,
      onzeAnos: false,
      semAno: false,
      duasPortas: false,
      foraDaLista: false,
      semUberX: true,
      blackOk: true,
      blackCorProibida: false,
      blackSemCor: false,
      blackCorDaFoto: true,
      blackFotoCorProibida: false,
      cadastroValeMaisQueFoto: false,
      blackAbaixoDoAno: false,
      blackModeloDeFora: false,
    });
  });

  test('o arquivo de etiquetas gerado tem o formato que o site lê', () => {
    const texto = readFileSync('uber-elegiveis.js', 'utf8');
    const dados = JSON.parse(texto.slice(texto.indexOf('{'), texto.lastIndexOf('}') + 1));
    expect(dados.cidade).toBe('São Paulo');
    expect(dados.consultadoEm).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const regras = Object.entries(dados.modelos) as [string, Record<string, number>][];
    expect(regras.length).toBeGreaterThan(0);
    for (const cor of Object.values(dados.cores)) expect(cor).toMatch(/^\p{L}/u);
    for (const [chave, regra] of regras) {
      expect(chave).toMatch(/^[^|A-Z]+\|[^|A-Z]+$/);
      for (const ano of Object.values(regra)) expect(ano).toBeGreaterThan(1900);
    }
  });

  test('não oferece o que o site não consegue cumprir', async ({ page }) => {
    await preparar(page);
    await abrirResultados(page);
    // Espera a tela de carregamento sair: antes disso tudo está escondido e o teste não prova nada.
    await expect(page.locator('.cat-familia')).toBeVisible({ timeout: 15000 });
    await expect(lateral(page).locator('.filter-section', { has: page.locator('h4:text-is("Condição")') })).toBeVisible();
    for (const titulo of ['Cor Exterior', 'Cor Interior', 'Tração']) {
      await expect(lateral(page).locator('.filter-section', { has: page.locator(`h4:text-is("${titulo}")`) })).toBeHidden();
    }
  });
});

test('Meus Salvos mostra só os salvos, sem o catálogo por cima', async ({ page }) => {
  await preparar(page);
  await page.route('**/localhost:3000/vehicles/*', (route) => {
    const id = new URL(route.request().url()).pathname.split('/').pop();
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(ESTOQUE.find((v) => v.id === id)) });
  });
  await page.addInitScript(() => localStorage.setItem('carinsight_favorites', JSON.stringify(['fit', 'toro'])));
  await page.goto('/meus-salvos.html');
  await expect(cards(page)).toHaveCount(2, { timeout: 15000 });
  await page.waitForTimeout(1500);
  await expect(cards(page)).toHaveCount(2);
});

test.describe('Celular', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('Marca, Modelo, ano e preço funcionam no painel do celular', async ({ page }) => {
    await preparar(page);
    await page.goto('/buscando-carro.html');
    await expect(cards(page)).toHaveCount(25, { timeout: 15000 });
    await page.locator('#btn-mobile-open-filters').click();
    const janela = page.locator('#mobile-filter-modal');
    await janela.locator('select[data-filtro="marca"]').selectOption({ label: 'HONDA' });
    await expect(janela.locator('select[data-filtro="modelo"] option')).toHaveCount(3);
    await janela.locator('select[data-filtro="modelo"]').selectOption({ label: 'FIT' });
    await janela.locator('.mobile-filter-footer .btn-primary').click();
    await expect(cards(page)).toHaveCount(1);
    await expect(cards(page).first()).toContainText('FIT');

    await page.locator('#btn-mobile-open-filters').click();
    await janela.locator('.btn-clear').click();
    await janela.locator('select[data-filtro="anoMin"]').selectOption('2024');
    await janela.locator('.price-inputs input').nth(1).fill('70000');
    await janela.locator('.price-inputs input').nth(1).press('Tab');
    await janela.locator('.mobile-filter-footer .btn-primary').click();
    await expect(cards(page)).toHaveCount(1);
    await expect(cards(page).first()).toContainText('C3');
  });

  test('o filtro aplica, a janela fecha, e a etiqueta real remove o filtro', async ({ page }) => {
    await preparar(page);
    await page.goto('/buscando-carro.html');
    await expect(cards(page)).toHaveCount(25, { timeout: 15000 });
    await page.locator('#btn-mobile-open-filters').click();
    const janela = page.locator('#mobile-filter-modal');
    await expect(janela).toHaveClass(/active/);
    await janela.locator('.checkbox-item', { hasText: /^\s*SUV\s*$/ }).click();
    await janela.locator('.mobile-filter-footer .btn-primary').click();
    await expect(janela).not.toHaveClass(/active/);
    await expect(cards(page)).toHaveCount(1);
    const etiqueta = page.locator('.active-filter-chip', { hasText: 'SUV' });
    await expect(etiqueta).toBeVisible();
    await etiqueta.click();
    await expect(cards(page)).toHaveCount(25);
    await expect(page.locator('.active-filter-chip')).toHaveCount(0);
  });
});

test.describe('Botões da home', () => {
  const botao = (page: Page, nome: string) => page.locator(`.filter-btn[data-tooltip="${nome}"]`);

  test('Marca leva aos carros da marca, mantendo o texto digitado', async ({ page }) => {
    await preparar(page, { q: 'econômico', ids: ['fit', 'city', 'toro'] });
    await page.goto('/index.html');
    await page.locator('#search-form-id input[type="text"]').fill('econômico');
    await botao(page, 'Marca de Carro').click();
    await page.locator('.brand-item[data-brand="Honda"]').click();
    await page.waitForURL(/buscando-carro/);
    expect(page.url()).toContain('marca=Honda');
    expect(decodeURIComponent(page.url())).toContain('q=econômico');
    await expect(cards(page)).toHaveCount(2, { timeout: 15000 });
    await expect(page.locator('.filters-sidebar select[data-filtro="marca"]')).toHaveValue('honda');
  });

  test('Marca fora do estoque avisa que não há carro', async ({ page }) => {
    await preparar(page);
    await page.goto('/index.html');
    await botao(page, 'Marca de Carro').click();
    await page.locator('.brand-item[data-brand="Audi"]').click();
    await page.waitForURL(/marca=Audi/);
    await expect(page.locator('.no-results')).toContainText('Nenhum veículo', { timeout: 15000 });
  });

  test('Ano leva aos carros a partir do ano escolhido', async ({ page }) => {
    await preparar(page);
    await page.goto('/index.html');
    await botao(page, 'Ano').click();
    await page.locator('.year-quick-btn[data-year="2020"]').click();
    await page.locator('#year-confirm').click();
    await page.waitForURL(/anoMin=2020/);
    await expect(cards(page)).toHaveCount(2, { timeout: 15000 });
  });

  test('Preço leva aos carros até o valor escolhido', async ({ page }) => {
    await preparar(page);
    await page.goto('/index.html');
    await botao(page, 'Preço').click();
    await page.locator('#price-slider').first().evaluate((el: HTMLInputElement) => {
      el.value = '50000';
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.locator('#price-confirm').first().click();
    await page.waitForURL(/precoMax=50000/);
    await expect(cards(page)).toHaveCount(20, { timeout: 15000 });
  });

  test('0 km mostra que não há carro novo, e Seminovo mostra o estoque', async ({ page }) => {
    await preparar(page);
    await page.goto('/index.html');
    await botao(page, '0 km').click();
    await page.locator('.condition-item[data-value="0km"]').click();
    await page.waitForURL(/condicao=NEW/);
    await expect(page.locator('.no-results')).toBeVisible({ timeout: 15000 });

    await page.goto('/index.html');
    await botao(page, '0 km').click();
    await page.locator('.condition-item[data-value="seminovo"]').click();
    await page.waitForURL(/condicao=USED/);
    await expect(cards(page)).toHaveCount(25, { timeout: 15000 });
  });

  test('Localização mostra só as lojas com estado confirmado', async ({ page }) => {
    await preparar(page);
    await page.goto('/index.html');
    await botao(page, 'Localização').click();
    await page.locator('.state-item[data-state="SP"]').click();
    await page.waitForURL(/estado=SP/);
    await expect(cards(page)).toHaveCount(23, { timeout: 15000 });
    await expect(contagem(page)).toContainText('em SP');

    await page.goto('/index.html');
    await botao(page, 'Localização').click();
    await page.locator('.state-item[data-state="RJ"]').click();
    await page.waitForURL(/estado=RJ/);
    await expect(page.locator('.no-results')).toBeVisible({ timeout: 15000 });
  });

  test('Mais Opções abre os filtros completos', async ({ page }) => {
    await preparar(page);
    await page.goto('/index.html');
    await botao(page, 'Mais Opções').click();
    await page.waitForURL(/buscando-carro/);
    await expect(cards(page)).toHaveCount(25, { timeout: 15000 });
  });
});
