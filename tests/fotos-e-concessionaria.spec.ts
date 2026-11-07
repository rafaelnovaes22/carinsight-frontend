import { existsSync, readFileSync } from 'node:fs';
import { test, expect, Page } from '@playwright/test';

/** As fotos não mostram contato da loja nem cortam o carro, e a mensagem do WhatsApp diz de qual concessionária ele é. */

const texto = readFileSync('fotos-recortadas.js', 'utf8');
const manifesto = JSON.parse(texto.slice(texto.indexOf('{'), texto.lastIndexOf('}') + 1).replace(/(\w+):/g, (m, chave) => (['origem', 'destino', 'nomes'].includes(chave) ? `"${chave}":` : m)));
const ORIGEM: string = manifesto.origem;
const [FOTO_A, FOTO_B]: string[] = manifesto.nomes;

const carro = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  title: `HONDA FIT LX 2019 ${id}`,
  make: 'HONDA',
  model: 'FIT',
  version: 'LX',
  yearModel: 2019,
  yearFab: 2019,
  price: '79990',
  mileage: 50000,
  condition: 'USED',
  status: 'AVAILABLE',
  bodyType: 'hatch',
  technicalSpecs: { transmission: 'Automático', fuel: 'Flex', engine: '1.5' },
  features: [],
  aiTags: [],
  media: [
    { url: ORIGEM + FOTO_A, type: 'IMAGE', order: 0 },
    { url: ORIGEM + FOTO_B, type: 'IMAGE', order: 1 },
  ],
  dealer: { name: "Renatinhu's Cars", verificationStatus: 'PENDING' },
  ...extra,
});

const ESTOQUE = [
  carro('recortado'),
  carro('sem-recorte', { media: [{ url: `${ORIGEM}394_999_1-1.jpg`, type: 'IMAGE', order: 0 }] }),
  carro('sem-loja', { dealer: undefined }),
];

async function preparar(page: Page) {
  await page.route('**/localhost:3000/**', (route) => {
    const url = new URL(route.request().url());
    const json = (corpo: unknown) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(corpo) });
    if (url.pathname === '/vehicles') return json({ data: ESTOQUE, meta: { total: ESTOQUE.length, page: 1, limit: 100, totalPages: 1 } });
    const id = url.pathname.split('/vehicles/')[1];
    const achado = id && ESTOQUE.find((v) => v.id === id);
    return json(achado || []);
  });
  // A foto original nunca é carregada de verdade no teste.
  await page.route('https://www.armazena.net/**', (route) => route.fulfill({ status: 200, contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>' }));
}

const card = (page: Page, posicao: number) => page.locator('.cars-grid .car-card').nth(posicao);
const textoDoLink = async (link: ReturnType<Page['locator']>) => decodeURIComponent((await link.getAttribute('href'))!.split('?text=')[1]);

const retoques = JSON.parse(readFileSync('scripts/retoques.json', 'utf8'));

test.describe('fotos sem contato da loja', () => {
  test('cada foto listada existe no site e não foi cortada em cima nem embaixo', async ({ page }) => {
    expect(manifesto.nomes.length).toBeGreaterThan(0);
    for (const nome of manifesto.nomes) expect(existsSync(`fotos/renatinhus/${nome}`), nome).toBe(true);

    await page.goto('/index.html');
    const alturas: Record<string, number> = await page.evaluate(async (nomes: string[]) => {
      const pares = await Promise.all(nomes.map(async (nome) => {
        const img = new Image();
        img.src = `/fotos/renatinhus/${nome}`;
        await img.decode();
        return [nome, img.naturalHeight];
      }));
      return Object.fromEntries(pares);
    }, manifesto.nomes);
    for (const nome of manifesto.nomes) {
      const esperada = retoques[nome.replace('.jpg', '')]?.fimY ?? 480;
      expect(alturas[nome], nome).toBe(esperada);
    }
  });

  test('todo retoque se refere a uma foto da lista', () => {
    for (const nome of Object.keys(retoques).filter((chave) => !chave.startsWith('_'))) {
      expect(manifesto.nomes, nome).toContain(`${nome}.jpg`);
    }
  });

  test('nos resultados o card usa a foto tratada e carro novo usa a versão sem a tarja', async ({ page }) => {
    await preparar(page);
    await page.goto('/buscando-carro.html');
    await expect(page.locator('.cars-grid .car-card')).toHaveCount(3, { timeout: 15000 });
    await expect(card(page, 0).locator('img').first()).toHaveAttribute('src', `/fotos/renatinhus/${FOTO_A}`);
    await expect(card(page, 1).locator('img').first()).toHaveAttribute('src', `${ORIGEM}394_999_1-0.jpg`);
  });

  for (const [nome, largura, altura] of [['no computador', 1440, 900], ['no celular', 390, 844]] as const) {
    test(`o card mostra a foto inteira ${nome}`, async ({ page }) => {
      await preparar(page);
      await page.setViewportSize({ width: largura, height: altura });
      await page.goto('/buscando-carro.html');
      await expect(page.locator('.cars-grid .car-card')).toHaveCount(3, { timeout: 15000 });
      const foto = card(page, 0).locator('.car-image img').first();
      // A tela de carregamento esconde os resultados: antes de sair, a foto mede 0 por 0.
      await expect(foto).toBeVisible({ timeout: 15000 });
      await expect(foto).toHaveCSS('object-fit', 'contain');
      const caixa = (await foto.boundingBox())!;
      expect(Math.abs(caixa.width - caixa.height)).toBeLessThanOrEqual(1);
      expect(caixa.width).toBeGreaterThanOrEqual(largura >= 1025 ? 340 : 300);
    });
  }

  test('a página do carro não carrega nenhuma foto com telefone', async ({ page }) => {
    await preparar(page);
    const originais: string[] = [];
    page.on('request', (r) => { if (r.url().startsWith(ORIGEM)) originais.push(r.url()); });
    await page.goto('/detalhes-carro.html?id=recortado');
    await expect(page.locator('img[src*="/fotos/renatinhus/"]').first()).toBeAttached({ timeout: 15000 });
    // A foto principal aparece inteira.
    const principal = page.locator('.main-image img').first();
    await expect(principal).toHaveCSS('object-fit', 'contain');
    // A regra só vale se a foto couber na galeria: maior que ela, a parte de baixo é cortada.
    await expect(principal).toHaveAttribute('src', /fotos\/renatinhus/);
    const caixas = await page.evaluate(() => {
      const altura = (seletor: string) => document.querySelector(seletor)!.getBoundingClientRect().height;
      return { galeria: altura('.gallery-container'), foto: altura('.main-image img'), lateral: altura('.side-images') };
    });
    expect(caixas.galeria).toBe(500);
    expect(caixas.foto).toBeLessThanOrEqual(caixas.galeria);
    expect(caixas.lateral).toBeLessThanOrEqual(caixas.galeria);
    await page.waitForTimeout(500);
    expect(originais).toEqual([]);
  });
});

test.describe('mensagem do WhatsApp diz a concessionária', () => {
  const ESPERADA = "Olá! Vi o HONDA FIT LX 2019, da concessionária Renatinhu's Cars, no site CarInsight e quero mais informações.";

  test('no card dos resultados', async ({ page }) => {
    await preparar(page);
    await page.goto('/buscando-carro.html');
    await expect(page.locator('.cars-grid .car-card')).toHaveCount(3, { timeout: 15000 });
    expect(await textoDoLink(card(page, 0).locator('.btn-check-availability'))).toBe(ESPERADA);
    expect(await card(page, 0).locator('.btn-check-availability').getAttribute('href')).toMatch(/^https:\/\/wa\.me\/5511949105033\?text=/);
  });

  test('em Meus Salvos', async ({ page }) => {
    await preparar(page);
    await page.addInitScript(() => localStorage.setItem('carinsight_favorites', JSON.stringify(['recortado'])));
    await page.goto('/meus-salvos.html');
    await expect(page.locator('.cars-grid .car-card')).toHaveCount(1, { timeout: 15000 });
    expect(await textoDoLink(card(page, 0).locator('.btn-check-availability'))).toBe(ESPERADA);
  });

  test('na página do carro', async ({ page }) => {
    await preparar(page);
    await page.goto('/detalhes-carro.html?id=recortado');
    const botao = page.locator('.btn-card-action-whats');
    await expect(botao).toHaveAttribute('href', /^https:\/\/wa\.me\/5511949105033\?text=/, { timeout: 15000 });
    expect(await textoDoLink(botao)).toBe(ESPERADA);
  });

  test('sem loja no cadastro a mensagem não inventa nem deixa buraco', async ({ page }) => {
    await preparar(page);
    await page.goto('/buscando-carro.html');
    await expect(page.locator('.cars-grid .car-card')).toHaveCount(3, { timeout: 15000 });
    expect(await textoDoLink(card(page, 2).locator('.btn-check-availability'))).toBe('Olá! Vi o HONDA FIT LX 2019 no site CarInsight e quero mais informações.');
  });
});
