import { test, expect, Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Nenhum carro, revenda ou avaliação de exemplo pode chegar ao visitante: nem com a API no ar,
 * nem com ela fora. O que aparece é só o que vem do estoque real. Dados de teste sintéticos.
 */

const EXEMPLOS =
  /RobustCar|City Motors|Adventure Ve[ií]culos|Elite Cars|Corolla Cross XR|Civic Sedan EXL|Compass Longitude|BMW 320i M Sport|Audi A3|BYD (Dolphin|Seal|Yuan)|Hilux SRX|Ranger Limited|48 avalia|Há 12 anos|7 Airbags|Encontramos 128|Você tem 4 ve|\+15 fotos/i;

const PAGINAS = ['index.html', 'veiculos.html', 'buscando-carro.html', 'meus-salvos.html', 'comparar.html', 'detalhes-carro.html'];

const CARRO = {
  id: 'v1',
  dealerId: 'd1',
  title: 'MARCA ZETA 1.0 2020',
  make: 'MARCA',
  model: 'ZETA',
  version: null,
  yearModel: 2020,
  yearFab: 2020,
  price: 70000,
  mileage: 45000,
  bodyType: 'suv',
  condition: 'USED',
  technicalSpecs: { transmission: 'Manual', fuel: 'Flex' },
  features: ['Ar condicionado'],
  aiTags: [],
  status: 'AVAILABLE',
  dealer: { name: 'Loja Sintética', verificationStatus: 'PENDING' },
  media: [
    { url: 'https://exemplo.test/fotos/zeta-1.jpg', type: 'IMAGE' },
    { url: 'https://exemplo.test/fotos/zeta-2.jpg', type: 'IMAGE' },
    { url: 'https://exemplo.test/fotos/zeta-3.jpg', type: 'IMAGE' },
    { url: 'https://exemplo.test/fotos/zeta-4.jpg', type: 'IMAGE' },
  ],
};
const HATCH = { ...CARRO, id: 'v2', model: 'KAPA', title: 'MARCA KAPA 1.0 2018', bodyType: 'hatch', media: [] };

async function apiNoAr(page: Page, carros = [CARRO, HATCH]) {
  await page.route('https://exemplo.test/**', (route) =>
    route.fulfill({ status: 200, contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="4" height="3"/>' }),
  );
  await page.route('**/localhost:3000/**', (route) => {
    const caminho = new URL(route.request().url()).pathname;
    const json = (body: unknown, status = 200) =>
      route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    if (caminho === '/vehicles') return json({ data: carros, meta: { total: carros.length, page: 1, totalPages: 1 } });
    const unico = carros.find((c) => caminho === `/vehicles/${c.id}`);
    if (unico) return json(unico);
    if (caminho.startsWith('/search')) return json(carros);
    if (caminho.startsWith('/favorites') || caminho.startsWith('/compare')) return json([]);
    return json({ message: 'não encontrado' }, 404);
  });
}

async function apiFora(page: Page) {
  await page.route('**/localhost:3000/**', (route) => route.abort());
}

async function textoDaPagina(page: Page, caminho: string) {
  await page.goto(caminho);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1600); // telas de carregamento das páginas
  return page.locator('body').innerText();
}

test.describe('código das páginas', () => {
  for (const arquivo of PAGINAS) {
    test(`${arquivo} não traz carro de exemplo escrito no HTML`, () => {
      const html = readFileSync(join(__dirname, '..', arquivo), 'utf8');
      expect(html.match(EXEMPLOS)?.[0] ?? null).toBeNull();
    });
  }

  test('a galeria não traz fotos de banco de imagens', () => {
    const html = readFileSync(join(__dirname, '..', 'detalhes-carro.html'), 'utf8');
    expect(html).not.toContain('images.unsplash.com');
    expect(html).not.toMatch(/galleryImages\s*=\s*\[\s*"/);
  });
});

test.describe('com a API no ar', () => {
  test.beforeEach(({ page }) => apiNoAr(page));

  for (const caminho of ['/index.html', '/veiculos.html', '/buscando-carro.html', '/meus-salvos.html', '/comparar.html', '/detalhes-carro.html?id=v1']) {
    test(`${caminho} não mostra exemplo`, async ({ page }) => {
      const texto = await textoDaPagina(page, caminho);
      expect(texto.match(EXEMPLOS)?.[0] ?? null).toBeNull();
    });
  }

  test('home: a prateleira mostra o estoque real e pode ser navegada', async ({ page }) => {
    await page.goto('/index.html');
    const prateleira = page.locator('#carros');
    await expect(prateleira).toBeVisible();
    await expect(prateleira.locator('.car-card')).toHaveCount(2);
    await expect(prateleira).toContainText('MARCA ZETA');
    await expect(prateleira.locator('.car-card a').first()).toHaveAttribute('href', /detalhes-carro\.html\?id=v1/);
  });

  test('catálogo: lista carros reais e filtra por categoria', async ({ page }) => {
    await page.goto('/veiculos.html');
    const grade = page.locator('#car-grid');
    await expect(grade.locator('.car-card')).toHaveCount(2);
    await expect(grade).toContainText('R$');

    await page.getByRole('button', { name: 'SUV' }).click();
    await expect(grade.locator('.car-card:not(.hidden)')).toHaveCount(1);
    await expect(grade.locator('.car-card:not(.hidden)')).toContainText('ZETA');
  });

  test('catálogo: a categoria vinda do link já abre filtrada', async ({ page }) => {
    await page.goto('/veiculos.html?categoria=hatch');
    await expect(page.locator('#car-grid .car-card:not(.hidden)')).toHaveCount(1);
    await expect(page.locator('#car-grid .car-card:not(.hidden)')).toContainText('KAPA');
  });

  test('catálogo: título não promete inspeção nem laudo', async ({ page }) => {
    const texto = await textoDaPagina(page, '/veiculos.html');
    expect(texto).not.toMatch(/inspecionados|laudo cautelar|garantia de procedência/i);
  });

  test('detalhe: só fotos e dados do carro real', async ({ page }) => {
    await page.goto('/detalhes-carro.html?id=v1');
    await expect(page.locator('.vehicle-header h1')).toContainText('ZETA');
    await expect(page.locator('.dealer-name')).toHaveText('Loja Sintética');
    await expect(page.locator('.main-image img')).toHaveAttribute('src', /zeta-1/);
    await expect(page.locator('.features-chips')).toContainText('Ar condicionado');
    await expect(page.locator('.dealer-rating')).toHaveCount(0);

    // O lightbox usava uma lista fixa de fotos de exemplo.
    const fotos = await page.evaluate(() => (window as unknown as { galleryImages: string[] }).galleryImages);
    expect(fotos).toEqual(CARRO.media.map((m) => m.url));
    await expect(page.locator('.modal-grid img')).toHaveCount(4);
  });

  test('detalhe: carro sem foto mostra a imagem neutra, não a de outro carro', async ({ page }) => {
    await page.goto('/detalhes-carro.html?id=v2');
    await expect(page.locator('.vehicle-header h1')).toContainText('KAPA');
    await expect(page.locator('.main-image img')).toHaveAttribute('src', /sem-foto/);
  });

  test('detalhe: carro vendido não aparece como disponível', async ({ page }) => {
    await page.unroute('**/localhost:3000/**');
    await apiNoAr(page, [{ ...CARRO, status: 'SOLD' }]);
    await page.goto('/detalhes-carro.html?id=v1');
    await expect(page.locator('body')).toContainText('não está mais disponível');
    await expect(page.locator('.price-tag-large')).toHaveCount(0);
  });

  test('detalhe: sem id, leva ao catálogo', async ({ page }) => {
    await page.goto('/detalhes-carro.html');
    await page.waitForURL(/veiculos/);
  });
});

test.describe('com a API fora do ar', () => {
  test.beforeEach(({ page }) => apiFora(page));

  for (const caminho of ['/index.html', '/veiculos.html', '/buscando-carro.html', '/meus-salvos.html', '/comparar.html', '/detalhes-carro.html?id=v1']) {
    test(`${caminho} não volta a mostrar exemplo`, async ({ page }) => {
      const texto = await textoDaPagina(page, caminho);
      expect(texto.match(EXEMPLOS)?.[0] ?? null).toBeNull();
    });
  }

  test('home: prateleiras sem dados ficam escondidas', async ({ page }) => {
    await page.goto('/index.html');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('#carros')).toBeHidden();
    await expect(page.locator('.cat-suggestions')).toBeHidden();
  });

  test('catálogo: avisa que não carregou', async ({ page }) => {
    await page.goto('/veiculos.html');
    await expect(page.locator('#car-grid')).toContainText('Não foi possível carregar');
  });

  test('detalhe: avisa em vez de mostrar outro carro', async ({ page }) => {
    await page.goto('/detalhes-carro.html?id=v1');
    await expect(page.locator('body')).toContainText('não está mais disponível');
  });
});
