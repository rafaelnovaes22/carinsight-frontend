import { existsSync, readFileSync } from 'node:fs';
import { test, expect, Page } from '@playwright/test';

/** O telefone da loja não aparece nas fotos, e a mensagem do WhatsApp diz de qual concessionária é o carro. */

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
  carro('sem-recorte', { media: [{ url: `${ORIGEM}foto-nova-sem-recorte.jpg`, type: 'IMAGE', order: 0 }] }),
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

test.describe('fotos sem o telefone da loja', () => {
  test('cada foto listada existe no site e tem o tamanho do recorte', async ({ page }) => {
    expect(manifesto.nomes.length).toBeGreaterThan(0);
    for (const nome of manifesto.nomes) expect(existsSync(`fotos/renatinhus/${nome}`), nome).toBe(true);

    await page.goto('/index.html');
    for (const nome of [FOTO_A, FOTO_B]) {
      const altura = await page.evaluate(async (caminho) => {
        const img = new Image();
        img.src = caminho;
        await img.decode();
        return img.naturalHeight;
      }, `/fotos/renatinhus/${nome}`);
      expect(altura).toBeLessThanOrEqual(354);
    }
  });

  test('todo corte extra se refere a uma foto da lista', () => {
    const cortes = JSON.parse(readFileSync('scripts/cortes-extras.json', 'utf8'));
    for (const nome of Object.keys(cortes)) expect(manifesto.nomes, nome).toContain(`${nome}.jpg`);
  });

  test('nos resultados o card usa a foto recortada e carro novo mantém a original', async ({ page }) => {
    await preparar(page);
    await page.goto('/buscando-carro.html');
    await expect(page.locator('.cars-grid .car-card')).toHaveCount(3, { timeout: 15000 });
    await expect(card(page, 0).locator('img').first()).toHaveAttribute('src', `/fotos/renatinhus/${FOTO_A}`);
    await expect(card(page, 1).locator('img').first()).toHaveAttribute('src', `${ORIGEM}foto-nova-sem-recorte.jpg`);
  });

  test('a página do carro não carrega nenhuma foto com telefone', async ({ page }) => {
    await preparar(page);
    const originais: string[] = [];
    page.on('request', (r) => { if (r.url().startsWith(ORIGEM)) originais.push(r.url()); });
    await page.goto('/detalhes-carro.html?id=recortado');
    await expect(page.locator('img[src*="/fotos/renatinhus/"]').first()).toBeAttached({ timeout: 15000 });
    // A foto principal mostra a parte de baixo, onde está o carro, e não o letreiro da loja.
    const principal = page.locator('.main-image img').first();
    await expect(principal).toHaveCSS('object-position', '50% 100%');
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
