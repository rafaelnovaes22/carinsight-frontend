import { test, expect, Page } from '@playwright/test';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * O site só afirma o que existe: sem serviços que não prestamos, sem depoimentos inventados,
 * sem números de audiência e sem telas de mentira. Cards alinhados, com todo o estoque.
 */

const RAIZ = join(__dirname, '..');
const ARQUIVOS = readdirSync(RAIZ).filter((f) => /\.(html|js)$/.test(f));
const HTML = ARQUIVOS.filter((f) => f.endsWith('.html'));

const PROIBIDO: Array<[string, RegExp]> = [
  ['depoimento inventado', /Ricardo Silva|Ana Costa|Carlos Mendes|Mariana Souza|Felipe Rocha|Quem Já Encontrou|Histórias reais/i],
  ['laudo que não emitimos', /laudo cautelar (integralmente )?aprovado|laudo cautelar homologado|Laudo Cautelar/],
  ['inspeção que não fazemos', /150 (itens|pontos)|Inspeção de|inspecionados e certificados|Veículos Inspecionados/i],
  ['devolução que não oferecemos', /7 dias|reembolso integral|devolvemos 100%|compra garantida|Período de Teste/i],
  ['pagamento que não intermediamos', /conta garantia|Transações Financeiras Blindadas|portal blindado|pagamento imediato/i],
  ['entrega que não fazemos', /entrega delivery|Receba o carro na sua casa/i],
  ['crédito que não oferecemos', /pré-aprovad|instituições financeiras parceiras/i],
  ['garantia que não damos', /garantia legal estendida|90 dias|garantia de procedência/i],
  ['audiência inventada', /milhões de compradores|milhares de usuários/i],
  ['atendimento inventado', /menos de 5 minutos|Ligação Personalizada|Suporte via E-mail/i],
  ['parceiro sem verificação', /concessionárias homologadas|Parceiros Verificados|parceiros certificados|parceiros credenciados/i],
  ['promessa de qualidade', /Qualidade Garantida|rigoroso critério|Apenas os melhores|melhor preço do mercado/i],
  ['selo sem base', /Preço CarInsight|melhor custo-benefício|Top 1/i],
  ['parcela calculada', /Ou em parcelas|monthlyEstimate/],
  ['tela de mentira', /Vendas no Mês|VGV Estimado|Loja Premium/],
  ['contagem inventada', /Novos \(\d|Usados \(\d|Certificados|Aplicar Filtros \(\d/],
  ['login que não funciona', /Entrar com Google|Entrar com Apple|Continuar com Google/],
];

for (const arquivo of ARQUIVOS) {
  test(`${arquivo} só afirma o que existe`, () => {
    const texto = readFileSync(join(RAIZ, arquivo), 'utf8');
    const achados = PROIBIDO.filter(([, padrao]) => padrao.test(texto)).map(([nome]) => nome);
    expect(achados).toEqual([]);
  });
}

for (const arquivo of ARQUIVOS) {
  test(`${arquivo} sem acento quebrado`, () => {
    const texto = readFileSync(join(RAIZ, arquivo), 'utf8');
    expect(texto.match(/Ã[£¡¢©ª³µ§­‰“š•]|â€/)?.[0] ?? null).toBeNull();
  });
}

for (const arquivo of HTML) {
  test(`${arquivo} sem links para o que não existe`, () => {
    const html = readFileSync(join(RAIZ, arquivo), 'utf8');
    expect(html).not.toMatch(/href="painel-(loja|usuario|admin)\.html"/);
    expect(html).not.toContain('id="login-popup"');
    expect(html).not.toContain('id="login-link-btn"');
    expect(html).not.toMatch(/<li><a href="#">(Instagram|LinkedIn)<\/a><\/li>/);
    expect(html).not.toContain('id="depoimentos"');
  });
}

const carro = (i: number, modelo: string, bodyType = 'suv') => ({
  id: `v${i}`,
  title: `MARCA ${modelo} 2020`,
  make: 'MARCA',
  model: modelo,
  version: null,
  yearModel: 2020,
  yearFab: 2020,
  price: 50000 + i,
  mileage: 40000 + i,
  bodyType,
  condition: 'USED',
  status: 'AVAILABLE',
  technicalSpecs: { transmission: 'Manual', fuel: 'Flex' },
  features: [],
  aiTags: [],
  dealer: { name: 'Loja Sintética', verificationStatus: 'PENDING' },
  media: [{ url: `https://exemplo.test/${i}.jpg`, type: 'IMAGE' }],
});

const ESTOQUE = [
  carro(1, 'CURTO'),
  carro(2, 'NOME MUITO LONGO 1.8 VVT-I HYBRID XRV CVT COM VERSÃO QUE OCUPA VÁRIAS LINHAS NO CARD'),
  carro(3, 'MÉDIO 1.0 COMFORT'),
  ...Array.from({ length: 17 }, (_, i) => carro(i + 4, `MODELO${i + 4}`, i % 2 ? 'hatch' : 'sedan')),
];

async function preparar(page: Page) {
  await page.route('https://exemplo.test/**', (route) =>
    route.fulfill({ status: 200, contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="4" height="3"/>' }),
  );
  await page.route('**/localhost:3000/**', (route) => {
    const caminho = new URL(route.request().url()).pathname;
    const json = (b: unknown) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(b) });
    if (caminho === '/vehicles') {
      const limite = Number(new URL(route.request().url()).searchParams.get('limit')) || 20;
      return json({ data: ESTOQUE.slice(0, limite), meta: { total: ESTOQUE.length, page: 1, totalPages: 1 } });
    }
    if (caminho.startsWith('/search')) return json(ESTOQUE.slice(0, 8));
    return json([]);
  });
}

/** Na mesma linha, foto, nome e botão precisam começar na mesma altura. */
async function medir(page: Page, seletor: string) {
  return page.evaluate((s) => {
    const cards = [...document.querySelectorAll(s)].slice(0, 3) as HTMLElement[];
    const topo = (c: HTMLElement, q: string) => {
      const e = c.querySelector(q);
      return e ? Math.round(e.getBoundingClientRect().top - c.getBoundingClientRect().top) : null;
    };
    const altura = (c: HTMLElement, q: string) => Math.round(c.querySelector(q)?.getBoundingClientRect().height ?? 0);
    return cards.map((c) => ({
      card: Math.round(c.getBoundingClientRect().height),
      foto: altura(c, '.car-image, .card-image, img'),
      nome: topo(c, '.car-name'),
      specs: topo(c, '.car-specs'),
      botao: topo(c, 'a.btn-card-action'),
    }));
  }, seletor);
}

function todosIguais(valores: Array<number | null>) {
  expect(new Set(valores).size).toBe(1);
}

test.describe('cards alinhados, com nome curto e longo', () => {
  test.beforeEach(({ page }) => preparar(page));

  test('catálogo', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/veiculos.html');
    await expect(page.locator('#car-grid .car-card')).toHaveCount(ESTOQUE.length);
    const m = await medir(page, '#car-grid .car-card');
    todosIguais(m.map((x) => x.card));
    todosIguais(m.map((x) => x.foto));
    todosIguais(m.map((x) => x.nome));
    todosIguais(m.map((x) => x.specs));
    todosIguais(m.map((x) => x.botao));
  });

  test('home', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/index.html');
    await expect(page.locator('#slider-bestsellers .car-card').first()).toBeVisible();
    const m = await medir(page, '#slider-bestsellers .car-card');
    todosIguais(m.map((x) => x.card));
    todosIguais(m.map((x) => x.foto));
    todosIguais(m.map((x) => x.nome));
    todosIguais(m.map((x) => x.specs));
    todosIguais(m.map((x) => x.botao));
  });
});

test.describe('todo o estoque aparece', () => {
  test.beforeEach(({ page }) => preparar(page));

  test('home não corta em 8 carros', async ({ page }) => {
    await page.goto('/index.html');
    await expect(page.locator('#slider-bestsellers .car-card')).toHaveCount(ESTOQUE.length);
  });

  test('catálogo traz os 20', async ({ page }) => {
    await page.goto('/veiculos.html');
    await expect(page.locator('#car-grid .car-card')).toHaveCount(20);
  });
});

test.describe('páginas', () => {
  test.beforeEach(({ page }) => preparar(page));

  for (const caminho of ['index.html', 'veiculos.html', 'buscando-carro.html', 'meus-salvos.html', 'comparar.html', 'processo.html', 'seguranca.html', 'faq.html', 'falar-consultor.html', 'termos-de-uso.html', 'vender-carro.html']) {
    test(`${caminho} abre sem erro de script`, async ({ page }) => {
      const erros: string[] = [];
      page.on('pageerror', (e) => erros.push(e.message));
      await page.goto(`/${caminho}`);
      await page.waitForLoadState('networkidle');
      expect(erros).toEqual([]);
    });
  }

  test('detalhe: mostra todos os itens da ficha e o vídeo', async ({ page }) => {
    const itens = Array.from({ length: 24 }, (_, i) => `Item ${i + 1}`);
    const completo = {
      ...carro(1, 'COMPLETO'),
      features: itens,
      media: [
        { url: 'https://exemplo.test/1.jpg', type: 'IMAGE' },
        { url: 'https://exemplo.test/video.mp4', type: 'VIDEO' },
      ],
    };
    await page.route('**/localhost:3000/vehicles/v1', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(completo) }),
    );
    await page.goto('/detalhes-carro.html?id=v1');
    await expect(page.locator('.features-chips .feature-chip-active')).toHaveCount(24);
    await expect(page.locator('.detail-main video')).toHaveAttribute('src', /video\.mp4/);
    const fotos = await page.evaluate(() => (window as unknown as { galleryImages: string[] }).galleryImages);
    expect(fotos).toEqual(['https://exemplo.test/1.jpg']);
  });

  test('a foto do card nunca é o vídeo, mesmo vindo antes', async ({ page }) => {
    await page.goto('/veiculos.html');
    await page.waitForFunction(() => 'VehicleImages' in window);
    const url = await page.evaluate(() =>
      (window as unknown as { VehicleImages: { resolve: (v: unknown) => string } }).VehicleImages.resolve({
        media: [
          { url: 'https://exemplo.test/video.mp4', type: 'VIDEO' },
          { url: 'https://exemplo.test/1.jpg', type: 'IMAGE' },
        ],
      }),
    );
    expect(url).toBe('https://exemplo.test/1.jpg');
  });

  test('quem vende fica claro, sem prometer vistoria', async ({ page }) => {
    await page.goto('/seguranca.html');
    const texto = await page.locator('main').innerText();
    expect(texto).toMatch(/não vende|quem vende é a loja/i);
    expect(texto).toMatch(/não faz vistoria/i);
    expect(texto).toMatch(/não recebe pagamento/i);
  });

  test('anunciar leva ao WhatsApp, sem formulário que não salva', async ({ page }) => {
    await page.goto('/vender-carro.html');
    await expect(page.locator('main a[href^="https://wa.me/"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toHaveCount(0);
  });

  for (const painel of ['painel-loja.html', 'painel-usuario.html', 'painel-admin.html', 'login.html']) {
    test(`${painel} não mostra dados inventados e leva à home`, async ({ page }) => {
      await page.goto(`/${painel}`);
      await page.waitForURL((u) => !u.pathname.includes(painel.replace('.html', '')));
    });
  }
});
