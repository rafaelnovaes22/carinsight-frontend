// Atualiza as etiquetas Uber do estoque a partir da página oficial de veículos elegíveis de São Paulo.
// Abre a página uma vez, como um navegador comum, e guarda só as linhas dos modelos do nosso estoque.
// Rodar quando o estoque mudar ou a Uber mudar a lista: node scripts/atualizar-uber.cjs
// Em máquina sem o navegador padrão do Playwright, informe o executável em CHROMIUM_PATH.
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const PAGINA = 'https://www.uber.com/br/pt-br/eligible-vehicles/?city=sao-paulo';
const ESTOQUE = 'https://api.carinsight.com.br/vehicles';
const SAIDA = path.join(__dirname, '..', 'uber-elegiveis.js');
// Cor lida nas fotos, por id do carro, para quem não tem cor no cadastro. O sincronismo da loja não a apaga.
const CORES_DAS_FOTOS = path.join(__dirname, 'cores-das-fotos.json');
const MINIMO_DE_MODELOS = 1000;

const comparavel = (texto) => String(texto).normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const chave = (texto) => String(texto).normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();

// Nomes que o estoque escreve diferente da tabela da Uber.
const APELIDOS = { bmw320i: '3series' };

// Formato da tabela: "1996 (Envios Carro) / 2011 (Bag, UberX) / 2019 (Black, Black Bag)".
function anosPorCategoria(texto) {
  const anos = {};
  for (const [, ano, categorias] of String(texto).matchAll(/(\d{4})\s*\(([^)]*)\)/g)) {
    categorias.split(',').forEach((categoria) => { anos[categoria.trim()] = Number(ano); });
  }
  return anos;
}

async function lerTabela() {
  const navegador = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  try {
    const pagina = await (await navegador.newContext({ locale: 'pt-BR' })).newPage();
    const resposta = pagina.waitForResponse((r) => r.url().includes('/api/getEligibleVehiclesForCity'), { timeout: 45000 });
    await pagina.goto(PAGINA, { waitUntil: 'domcontentloaded', timeout: 45000 });
    const corpo = await (await resposta).json();
    if (corpo.status !== 'success' || !corpo.data) throw new Error('a página não devolveu a tabela');
    return corpo.data;
  } finally {
    await navegador.close();
  }
}

async function lerEstoque() {
  const carros = [];
  for (let pagina = 1, total = 1; pagina <= total; pagina += 1) {
    const resposta = await fetch(`${ESTOQUE}?limit=100&page=${pagina}`);
    if (!resposta.ok) throw new Error(`estoque respondeu ${resposta.status}`);
    const corpo = await resposta.json();
    carros.push(...corpo.data);
    total = corpo.meta.totalPages;
  }
  return carros;
}

function modeloNaTabela(tabela, carro) {
  const marca = Object.keys(tabela).find((m) => comparavel(m) === comparavel(carro.make));
  if (!marca) return null;
  const nome = comparavel(carro.model);
  const completo = comparavel(carro.make) + nome;
  const alvos = [nome, completo, APELIDOS[completo]].filter(Boolean);
  const modelo = Object.keys(tabela[marca]).find((m) => alvos.includes(comparavel(m)));
  return modelo ? tabela[marca][modelo] : null;
}

(async () => {
  const [tabela, carros] = await Promise.all([lerTabela(), lerEstoque()]);
  const totalDeModelos = Object.values(tabela).reduce((n, modelos) => n + Object.keys(modelos).length, 0);
  // Se a Uber mudar a página, para aqui em vez de apagar as etiquetas do site.
  if (totalDeModelos < MINIMO_DE_MODELOS) throw new Error(`tabela suspeita: só ${totalDeModelos} modelos`);

  const modelos = {};
  const fora = [];
  for (const carro of carros) {
    const linha = modeloNaTabela(tabela, carro);
    if (!linha) { fora.push(`${carro.make} ${carro.model}`); continue; }
    const anos = anosPorCategoria(linha);
    const regra = {};
    if (anos.UberX) regra.uberx = anos.UberX;
    if (anos.Black) regra.black = anos.Black;
    modelos[`${chave(carro.make)}|${chave(carro.model)}`] = regra;
  }
  if (!Object.values(modelos).some((regra) => regra.uberx)) throw new Error('nenhum modelo do estoque com UberX: formato mudou?');

  const coresDasFotos = JSON.parse(fs.readFileSync(CORES_DAS_FOTOS, 'utf8'));
  const cores = Object.fromEntries(carros.filter((c) => coresDasFotos[c.id]).map((c) => [c.id, coresDasFotos[c.id]]));

  const dados = {
    cidade: 'São Paulo',
    fonte: PAGINA,
    consultadoEm: new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' }),
    modelos: Object.fromEntries(Object.entries(modelos).sort(([a], [b]) => a.localeCompare(b))),
    cores,
  };
  fs.writeFileSync(SAIDA, `// Gerado por scripts/atualizar-uber.cjs. Não editar à mão.\nwindow.UberElegiveis = ${JSON.stringify(dados, null, 2)};\n`);
  console.log(`tabela: ${totalDeModelos} modelos | estoque: ${carros.length} carros | etiquetas: ${Object.keys(modelos).length} modelos`);
  console.log(`fora da tabela: ${[...new Set(fora)].join(', ') || 'nenhum'}`);
  console.log(`cores das fotos em uso: ${Object.keys(cores).length} de ${Object.keys(coresDasFotos).length}`);
})().catch((erro) => {
  console.error(`não atualizado: ${erro.message}`);
  process.exit(1);
});
