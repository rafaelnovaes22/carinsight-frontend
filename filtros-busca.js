/**
 * Regras dos filtros da busca, usadas pela home e pela página de resultados.
 * O filtro roda sobre o estoque já carregado, porque câmbio e combustível ficam em
 * technicalSpecs e a API só filtra marca, modelo e preço.
 */
(function () {
  function normalizar(texto) {
    return String(texto === null || texto === undefined ? '' : texto)
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .toLowerCase()
      .trim();
  }

  // O estoque não tem cidade por carro: a localização vem da loja. Loja fora desta lista não
  // aparece em filtro de estado, para o site não afirmar um lugar que ninguém confirmou.
  const ESTADO_DAS_LOJAS = { "Renatinhu's Cars": 'SP', 'Robust Car': 'SP' };

  const specs = (v) => v.technicalSpecs || {};
  const motor = (v) => normalizar(specs(v).engine || v.engineSize);
  const cambio = (v) => normalizar(specs(v).transmission || v.transmission);
  const combustivel = (v) => normalizar(specs(v).fuel || specs(v).fuelType);
  const carroceria = (v) => normalizar(v.bodyType);
  const automatico = (v) => cambio(v).startsWith('autom');

  // Cada categoria é uma regra sobre dados do próprio carro.
  const CATEGORIAS = {
    familia: { rotulo: 'Família', regra: (v) => ['suv', 'minivan', 'perua', 'sedan'].includes(carroceria(v)) },
    lazer: { rotulo: 'Lazer', regra: (v) => ['suv', 'pickup'].includes(carroceria(v)) },
    trabalho: { rotulo: 'Trabalho', regra: (v) => ['pickup', 'perua'].includes(carroceria(v)) },
    economia: { rotulo: 'Economia', regra: (v) => /^1\.0\b/.test(motor(v)) && !/turbo/.test(motor(v)) },
    conforto: { rotulo: 'Conforto', regra: automatico },
    seguranca: {
      rotulo: 'Segurança',
      regra: (v) => /air\s*-?bag|\babs\b|estabilidade/.test(normalizar((v.features || []).join(' '))),
    },
    desempenho: { rotulo: 'Desempenho', regra: (v) => /turbo/.test(motor(v)) || parseFloat(motor(v)) >= 2 },
    classicos: { rotulo: 'Clássicos', regra: (v) => Number(v.yearModel) <= 1999 },
    // EC 137/2025: 20 anos ou mais de fabricação. A Sefaz-SP só isenta a partir do ano seguinte ao que
    // o carro completa 20 anos, então 2026 vale até 2005. Sem ano de fabricação, o site não afirma.
    'sem-ipva': {
      rotulo: 'Sem IPVA',
      regra: (v) => {
        const fabricacao = Number(v.yearFab);
        return fabricacao > 0 && new Date().getFullYear() - fabricacao > 20;
      },
    },
    eletricos: { rotulo: 'Elétricos', regra: (v) => combustivel(v) === 'eletrico' },
  };

  const LISTAS = { carrocerias: 'carroceria', cambios: 'cambio', combustiveis: 'combustivel' };
  const TEXTOS = ['q', 'estado', 'marca', 'modelo'];
  const NUMEROS = ['precoMin', 'precoMax', 'anoMin', 'anoMax'];

  function vazio() {
    return {
      q: '',
      estado: null,
      condicao: null,
      marca: null,
      modelo: null,
      precoMin: null,
      precoMax: null,
      anoMin: null,
      anoMax: null,
      carrocerias: [],
      cambios: [],
      combustiveis: [],
      categoria: null,
    };
  }

  function deUrl(busca) {
    const params = new URLSearchParams(busca || '');
    const filtros = vazio();
    TEXTOS.forEach((chave) => {
      const valor = (params.get(chave) || '').trim();
      if (valor) filtros[chave] = valor;
    });
    NUMEROS.forEach((chave) => {
      const valor = Number(params.get(chave));
      if (Number.isFinite(valor) && valor > 0) filtros[chave] = valor;
    });
    Object.keys(LISTAS).forEach((chave) => {
      filtros[chave] = (params.get(LISTAS[chave]) || '').split(',').map(normalizar).filter(Boolean);
    });
    if (['NEW', 'USED'].includes(params.get('condicao'))) filtros.condicao = params.get('condicao');
    if (CATEGORIAS[params.get('categoria')]) filtros.categoria = params.get('categoria');
    return filtros;
  }

  function paraUrl(filtros) {
    const params = new URLSearchParams();
    [...TEXTOS, ...NUMEROS, 'condicao', 'categoria'].forEach((chave) => {
      if (filtros[chave]) params.set(chave, filtros[chave]);
    });
    Object.keys(LISTAS).forEach((chave) => {
      if (filtros[chave] && filtros[chave].length) params.set(LISTAS[chave], filtros[chave].join(','));
    });
    return params.toString();
  }

  function atende(v, f) {
    const preco = Number(v.price);
    const ano = Number(v.yearModel);
    if (f.estado && ESTADO_DAS_LOJAS[v.dealer && v.dealer.name] !== f.estado) return false;
    if (f.condicao && v.condition !== f.condicao) return false;
    if (f.marca && normalizar(v.make) !== normalizar(f.marca)) return false;
    if (f.modelo && normalizar(v.model) !== normalizar(f.modelo)) return false;
    if (f.precoMin && !(preco >= f.precoMin)) return false;
    if (f.precoMax && !(preco <= f.precoMax)) return false;
    if (f.anoMin && !(ano >= f.anoMin)) return false;
    if (f.anoMax && !(ano <= f.anoMax)) return false;
    if (f.carrocerias.length && !f.carrocerias.includes(carroceria(v))) return false;
    if (f.cambios.length && !f.cambios.some((c) => (c === 'automatico' ? automatico(v) : cambio(v) === c))) return false;
    if (f.combustiveis.length && !f.combustiveis.includes(combustivel(v))) return false;
    if (f.categoria && !CATEGORIAS[f.categoria].regra(v)) return false;
    return true;
  }

  const ESTADOS_COM_LOJA = [...new Set(Object.values(ESTADO_DAS_LOJAS))];

  window.FiltrosBusca = { normalizar, vazio, deUrl, paraUrl, atende, CATEGORIAS, ESTADOS_COM_LOJA };
})();
