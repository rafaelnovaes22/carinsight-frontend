/**
 * CarInsight Search Page Integration
 * Handles search results page (buscando-carro.html)
 */

document.addEventListener('DOMContentLoaded', () => {
  console.log('🔍 Search Page loaded');

  // Meus Salvos carrega este arquivo pelas funções globais do fim: a busca só roda nos resultados.
  if (!document.querySelector('.filter-section')) return;

  // Filtros vindos da URL: botões da home, categorias e recarregar a página mantêm a busca.
  const filters = FiltrosBusca.deUrl(window.location.search);
  const searchQuery = filters.q;
  let catalogo = null;
  let ranking = null;
  let textoDoRanking = null;
  let controlesProntos = false;

  // DOM Elements
  const loadingScreen = document.getElementById('loading-screen');
  const resultsScreen = document.getElementById('results-screen');
  const carsGrid = document.querySelector('.cars-grid');
  const resultsCount = document.querySelector('.results-count');

  // Show loading, then fetch
  showLoading();
  performSearch();

  // Busca por texto dentro da própria página de resultados
  const resultsSearchForm = document.getElementById('results-search-form');
  const resultsSearchInput = document.getElementById('results-search-input');
  if (resultsSearchInput && searchQuery) resultsSearchInput.value = searchQuery;
  if (resultsSearchForm) {
    resultsSearchForm.addEventListener('submit', (event) => {
      event.preventDefault();
      filters.q = resultsSearchInput ? resultsSearchInput.value.trim() : '';
      showLoading();
      performSearch();
    });
  }

  // ==================== SEARCH ====================
  async function carregarCatalogo() {
    if (catalogo) return catalogo;
    const carros = [];
    let pagina = 1;
    let totalPaginas = 1;
    do {
      const resposta = await CarInsightAPI.getVehicles({ limit: 100, page: pagina });
      carros.push(...(resposta.data || resposta));
      totalPaginas = (resposta.meta && resposta.meta.totalPages) || 1;
      pagina += 1;
    } while (pagina <= totalPaginas);
    catalogo = carros;
    return catalogo;
  }

  // A busca por texto ordena por relevância, mas não traz câmbio nem combustível: cruza com o catálogo.
  async function carregarRanking() {
    if (!filters.q) {
      ranking = null;
      textoDoRanking = null;
      return;
    }
    if (textoDoRanking === filters.q) return;
    textoDoRanking = filters.q;
    try {
      const resposta = await CarInsightAPI.search(filters.q, { limit: 100 });
      ranking = resposta.data || resposta.results || resposta;
    } catch (error) {
      console.warn('Busca por texto indisponível; usando o nome do carro.', error);
      ranking = null;
    }
  }

  function carrosDaBusca() {
    if (!filters.q) return catalogo;
    if (Array.isArray(ranking)) {
      const porId = new Map(catalogo.map((v) => [v.id, v]));
      return ranking.map((v) => ({ ...v, ...(porId.get(v.id) || {}) }));
    }
    const palavras = FiltrosBusca.normalizar(filters.q).split(/\s+/);
    return catalogo.filter((v) => {
      const nome = FiltrosBusca.normalizar(v.title || `${v.make} ${v.model}`);
      return palavras.every((p) => nome.includes(p));
    });
  }

  function aplicar() {
    const busca = FiltrosBusca.paraUrl(filters);
    window.history.replaceState({}, '', `${window.location.pathname}${busca ? `?${busca}` : ''}`);
    refletirFiltros();
    const achados = carrosDaBusca().filter((v) => FiltrosBusca.atende(v, filters));
    renderResults(achados, achados.length);
    if (filters.estado && resultsCount) resultsCount.textContent += ` em ${filters.estado}`;
  }

  async function performSearch() {
    try {
      await carregarCatalogo();
      await carregarRanking();
      if (!controlesProntos) {
        montarControles();
        controlesProntos = true;
      }
      aplicar();
    } catch (error) {
      console.error('❌ Search failed:', error);
      renderError(error.message);
    } finally {
      hideLoading();
    }
  }

  // ==================== RENDER ====================
  function renderResults(vehicles, totalCount = null) {
    if (!carsGrid) return;

    // Clear existing
    carsGrid.innerHTML = '';

    // Update count (usa o total da paginação quando disponível)
    const count = Array.isArray(vehicles) ? vehicles.length : 0;
    const displayCount = totalCount ?? count;
    if (resultsCount) {
      resultsCount.textContent = `Encontramos ${displayCount} veículo${displayCount !== 1 ? 's' : ''} para você`;
    }

    if (count === 0) {
      carsGrid.innerHTML = `
        <div class="no-results">
          <i data-lucide="search-x" style="width:48px;height:48px;color:#999;"></i>
          <h3>Nenhum veículo encontrado</h3>
          <p>Tente ajustar os filtros ou buscar por outro termo</p>
        </div>
      `;
      if (window.lucide) lucide.createIcons();
      return;
    }

    vehicles.forEach((vehicle) => {
      const card = createVehicleCard(vehicle);
      carsGrid.appendChild(card);
    });

    // Re-initialize Lucide icons
    if (window.lucide) lucide.createIcons();
  }

  function createVehicleCard(vehicle) {
    const card = document.createElement('div');
    card.className = 'car-card';
    card.dataset.vehicleId = vehicle.id;

    // Format values
    const price = vehicle.price
      ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(vehicle.price)
      : 'Consulte';
    const mileage = vehicle.mileage
      ? new Intl.NumberFormat('pt-BR').format(vehicle.mileage) + ' km'
      : 'N/A';
    const condition = vehicle.condition === 'NEW' ? 'Novo' : 'Seminovo';
    const VI = window.VehicleImages;
    const imageUrl = VI ? VI.resolve(vehicle) : vehicle.media?.[0]?.url || 'assets/sem-foto.svg';
    const imageSafe = VI
      ? VI.curatedFor(vehicle.make, vehicle.model) || VI.GENERIC_FALLBACK
      : 'assets/sem-foto.svg';
    const dealerName = vehicle.dealer?.name || 'Vendedor';
    const title = vehicle.title || `${vehicle.make} ${vehicle.model} ${vehicle.yearModel}`;
    const year = vehicle.yearFab && vehicle.yearModel
      ? `${vehicle.yearFab}/${vehicle.yearModel}`
      : vehicle.yearModel;

    // Check if vehicle is already favorited
    const isFavorite = window.FavoritesManager ? FavoritesManager.isFavorite(vehicle.id) : false;
    const saveButtonClass = isFavorite ? 'save-btn saved' : 'save-btn';
    const saveButtonContent = isFavorite
      ? '<i data-lucide="heart" style="fill:currentColor;"></i> Salvo'
      : '<i data-lucide="heart"></i> Salvar';

    // Score badge (for semantic search)
    let scoreBadge = '';
    if (vehicle.score && vehicle.score < 1) {
      const relevance = Math.round(vehicle.score * 100);
      if (relevance >= 80) {
        scoreBadge = `<div class="deal-badge-purple"><i data-lucide="sparkles"></i> ${relevance}% relevante</div>`;
      }
    }

    // AI Tags
    let tagsBadge = '';
    if (vehicle.aiTags && vehicle.aiTags.length > 0) {
      const tag = vehicle.aiTags[0];
      if (tag === 'Baixa Quilometragem' || tag === 'Zero km') {
        tagsBadge = `<div class="deal-badge-purple"><i data-lucide="gauge"></i> ${tag}</div>`;
      } else if (tag === 'Econômico') {
        tagsBadge = `<div class="deal-badge-purple"><i data-lucide="leaf"></i> ${tag}</div>`;
      }
    }

    card.innerHTML = `
      <div class="card-main-content">
        <div class="car-image">
          <span class="match-tag" style="position:absolute; top:12px; left:12px; z-index:2; padding:4px 8px; background:rgba(0,0,0,0.7); color:white; border-radius:4px; font-weight:700; font-size:0.75rem;">
            1/${vehicle.media?.length || 1}
          </span>
          <img src="${imageUrl}" alt="${title}" onerror="this.onerror=null;this.src='${imageSafe}'">
        </div>
        <div class="car-info">
          <div class="info-top">
            <div class="info-header">
              <span class="condition-badge">${condition}</span>
              <button class="${saveButtonClass}" onclick="toggleSaveVehicle(this, '${vehicle.id}')">
                ${saveButtonContent}
              </button>
            </div>
            <h2 class="car-name">${year} ${title}</h2>
            <div class="mileage-text">${mileage}</div>
            <div class="car-price">${price}</div>
            ${scoreBadge || tagsBadge}
          </div>

          <div class="dealer-section">
            <div class="dealer-details">
              <h4>${dealerName}</h4>
              <div class="dealer-location">
                ${vehicle.dealer?.verificationStatus === 'VERIFIED' ? '✓ Verificado' : ''}
              </div>
            </div>
          </div>
          <a class="btn-check-availability" href="${linkDoVendedor(vehicle)}" target="_blank" rel="noopener">
            <i data-lucide="message-circle"></i> Conversar com vendedor
          </a>
          <a href="detalhes-carro.html?id=${vehicle.id}" class="btn-card-action">Saiba mais </a>
        </div>
      </div>
      <div class="card-details-toggle" onclick="toggleDetails(this)">
        <span class="toggle-text">Mostrar detalhes</span> <i data-lucide="chevron-down"></i>
      </div>
      <div class="card-details-expanded">
        <div class="details-grid-section">
          <h3>Informações do Veículo</h3>
          <div class="specs-grid">
            <div class="spec-row"><span class="spec-label">Marca:</span> <span class="spec-value">${vehicle.make}</span></div>
            <div class="spec-row"><span class="spec-label">Modelo:</span> <span class="spec-value">${vehicle.model}</span></div>
            <div class="spec-row"><span class="spec-label">Ano:</span> <span class="spec-value">${year}</span></div>
            <div class="spec-row"><span class="spec-label">Carroceria:</span> <span class="spec-value">${vehicle.bodyType}</span></div>
          </div>
        </div>
        ${vehicle.features?.length ? `
        <div class="details-grid-section">
          <h3>Recursos</h3>
          <div class="features-list">
            <div class="feature-group">
              <span>${vehicle.features.join(', ')}</span>
            </div>
          </div>
        </div>
        ` : ''}
      </div>
    `;

    return card;
  }

  function renderError(message) {
    if (!carsGrid) return;
    carsGrid.innerHTML = `
      <div class="no-results">
        <i data-lucide="alert-circle" style="width:48px;height:48px;color:#e74c3c;"></i>
        <h3>Erro ao buscar veículos</h3>
        <p>${message}</p>
        <button onclick="location.reload()" class="btn-retry">Tentar novamente</button>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
  }

  // ==================== LOADING ====================
  function showLoading() {
    if (loadingScreen) loadingScreen.style.display = 'flex';
    if (resultsScreen) resultsScreen.style.display = 'none';
  }

  function hideLoading() {
    setTimeout(() => {
      if (loadingScreen) loadingScreen.style.display = 'none';
      if (resultsScreen) resultsScreen.style.display = 'block';
    }, 800); // Minimum loading time for UX
  }

  // ==================== FILTER HANDLERS ====================
  const { normalizar, CATEGORIAS } = FiltrosBusca;

  // Rótulo do filtro lateral -> onde ele guarda a escolha.
  const CHECKS = {
    novos: ['condicao', 'NEW'],
    usados: ['condicao', 'USED'],
    suv: ['carrocerias', 'suv'],
    sedan: ['carrocerias', 'sedan'],
    hatchback: ['carrocerias', 'hatch'],
    picape: ['carrocerias', 'pickup'],
    coupe: ['carrocerias', 'coupe'],
    automatico: ['cambios', 'automatico'],
    manual: ['cambios', 'manual'],
    flex: ['combustiveis', 'flex'],
    gasolina: ['combustiveis', 'gasolina'],
    eletrico: ['combustiveis', 'eletrico'],
    hibrido: ['combustiveis', 'hibrido'],
    diesel: ['combustiveis', 'diesel'],
  };
  const ROTULOS_DE_LISTA = {
    carrocerias: { suv: 'SUV', sedan: 'Sedan', hatch: 'Hatchback', pickup: 'Picape', coupe: 'Coupe' },
    cambios: { automatico: 'Automático', manual: 'Manual' },
    combustiveis: { flex: 'Flex', gasolina: 'Gasolina', eletrico: 'Elétrico', hibrido: 'Híbrido', diesel: 'Diesel' },
  };
  // Sem dado no estoque: filtrar esconderia carros sem dizer por quê. Voltam quando o dado existir.
  const SECOES_SEM_DADO = ['Cor Exterior', 'Cor Interior', 'Tração'];

  const moeda = (valor) => `R$ ${Number(valor).toLocaleString('pt-BR')}`;
  const digitos = (texto) => parseInt(String(texto).replace(/\D/g, ''), 10) || null;
  const secoes = (titulo) =>
    [...document.querySelectorAll('.filter-section')].filter((s) => {
      const h4 = s.querySelector('h4');
      return h4 && h4.textContent.trim() === titulo;
    });
  const chaveDoCheck = (input) => {
    const item = input.closest('.checkbox-item');
    return normalizar(item ? item.textContent.replace(/\(\d+\)/g, '') : '');
  };
  const chaveDaCategoria = (botao) => {
    const classe = [...botao.classList].find((c) => c.startsWith('cat-'));
    return classe ? normalizar(classe.replace('cat-', '')) : null;
  };

  let limitesDePreco = { min: 0, max: 0 };

  function criarSelect(secao, rotulo, filtro, opcoes, vazioTexto) {
    [].concat(secao).flatMap(secoes).forEach((s) => {
      s.querySelectorAll('.filter-group').forEach((grupo) => {
        const label = grupo.querySelector('label');
        const caixa = grupo.querySelector('.select-box');
        if (!label || !caixa || normalizar(label.textContent) !== normalizar(rotulo)) return;
        const select = document.createElement('select');
        select.className = 'select-box';
        select.style.cssText = 'width:100%;cursor:pointer;';
        select.dataset.filtro = filtro;
        select.dataset.vazio = vazioTexto;
        caixa.replaceWith(select);
      });
    });
    preencherSelect(filtro, opcoes);
  }

  function preencherSelect(filtro, opcoes) {
    document.querySelectorAll(`select[data-filtro="${filtro}"]`).forEach((select) => {
      select.replaceChildren(new Option(select.dataset.vazio, ''), ...opcoes.map((o) => new Option(o, normalizar(o))));
    });
  }

  function valorDoSelect(filtro, valor) {
    document.querySelectorAll(`select[data-filtro="${filtro}"]`).forEach((select) => {
      const alvo = valor ? normalizar(valor) : '';
      // Marca da home que não está no estoque continua visível, com zero resultado.
      if (alvo && ![...select.options].some((o) => o.value === alvo)) select.add(new Option(String(valor), alvo));
      select.value = alvo;
    });
  }

  const ordenar = (lista) => [...new Set(lista.filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b), 'pt-BR'));

  function modelosDaMarca() {
    return ordenar(
      catalogo
        .filter((v) => !filters.marca || normalizar(v.make) === normalizar(filters.marca))
        .map((v) => v.model),
    );
  }

  function montarControles() {
    SECOES_SEM_DADO.forEach((titulo) => secoes(titulo).forEach((s) => { s.style.display = 'none'; }));

    // O painel do celular chama a mesma seção de outro nome.
    const SECAO_MARCA = ['Marca e Modelo', 'Detalhes do Veículo'];
    criarSelect(SECAO_MARCA, 'Marca', 'marca', ordenar(catalogo.map((v) => v.make)), 'Todas as marcas');
    criarSelect(SECAO_MARCA, 'Modelo', 'modelo', modelosDaMarca(), 'Todos os modelos');
    const anos = ordenar(catalogo.map((v) => v.yearModel)).reverse();
    criarSelect('Ano do Modelo', 'De', 'anoMin', anos, 'Qualquer');
    criarSelect('Ano do Modelo', 'Até', 'anoMax', anos, 'Qualquer');

    // Localização: o texto fixo do desenho parecia filtro aplicado, e não há coordenadas para medir distância.
    document.querySelectorAll('.distance-slider').forEach((el) => { el.style.display = 'none'; });
    document.querySelectorAll('.location-box').forEach((caixa) => {
      const select = document.createElement('select');
      select.dataset.filtro = 'estado';
      select.dataset.vazio = 'Todos os estados';
      select.setAttribute('aria-label', 'Estado');
      select.style.cssText = 'flex:1;min-width:0;border:0;background:transparent;font:inherit;color:inherit;cursor:pointer;';
      const texto = caixa.querySelector('span');
      if (texto) texto.replaceWith(select);
    });
    preencherSelect('estado', FiltrosBusca.ESTADOS_COM_LOJA);

    const precos = catalogo.map((v) => Number(v.price)).filter((p) => p > 0);
    limitesDePreco = precos.length
      ? { min: Math.floor(Math.min(...precos) / 1000) * 1000, max: Math.ceil(Math.max(...precos) / 1000) * 1000 }
      : limitesDePreco;

    document.querySelectorAll('.price-inputs').forEach((caixa) => {
      const [min, max] = caixa.querySelectorAll('input');
      if (min) min.placeholder = moeda(limitesDePreco.min);
      if (max) max.placeholder = moeda(limitesDePreco.max);
    });
    document.querySelectorAll('.range-slider-container').forEach((faixa) => {
      faixa.querySelectorAll('.left-0, .left-70, .w-70-pct').forEach((el) => el.classList.remove('left-0', 'left-70', 'w-70-pct'));
      ['precoMin', 'precoMax'].forEach((filtro) => {
        const input = document.createElement('input');
        input.type = 'range';
        input.className = 'faixa-preco';
        input.dataset.filtro = filtro;
        input.min = limitesDePreco.min;
        input.max = limitesDePreco.max;
        input.step = 1000;
        input.setAttribute('aria-label', filtro === 'precoMin' ? 'Preço mínimo' : 'Preço máximo');
        faixa.appendChild(input);
      });
    });
  }

  function montarEtiquetas() {
    const etiquetas = [];
    const soltar = (chave) => () => { filters[chave] = null; };
    if (filters.estado) etiquetas.push([filters.estado, soltar('estado')]);
    if (filters.categoria) etiquetas.push([CATEGORIAS[filters.categoria].rotulo, soltar('categoria')]);
    if (filters.condicao) etiquetas.push([filters.condicao === 'NEW' ? 'Novos' : 'Usados', soltar('condicao')]);
    if (filters.marca) etiquetas.push([filters.marca, () => { filters.marca = null; filters.modelo = null; }]);
    if (filters.modelo) etiquetas.push([filters.modelo, soltar('modelo')]);
    if (filters.precoMin) etiquetas.push([`De ${moeda(filters.precoMin)}`, soltar('precoMin')]);
    if (filters.precoMax) etiquetas.push([`Até ${moeda(filters.precoMax)}`, soltar('precoMax')]);
    if (filters.anoMin) etiquetas.push([`A partir de ${filters.anoMin}`, soltar('anoMin')]);
    if (filters.anoMax) etiquetas.push([`Até ${filters.anoMax}`, soltar('anoMax')]);
    Object.keys(ROTULOS_DE_LISTA).forEach((lista) => {
      filters[lista].forEach((valor) => {
        etiquetas.push([ROTULOS_DE_LISTA[lista][valor] || valor, () => {
          filters[lista] = filters[lista].filter((v) => v !== valor);
        }]);
      });
    });

    document.querySelectorAll('.active-filters-scroll').forEach((caixa) => {
      caixa.replaceChildren(...etiquetas.map(([texto, remover]) => {
        const etiqueta = document.createElement('button');
        etiqueta.type = 'button';
        etiqueta.className = 'active-filter-chip';
        etiqueta.textContent = texto;
        const icone = document.createElement('i');
        icone.dataset.lucide = 'x';
        icone.className = 'w-12 cursor-pointer';
        etiqueta.appendChild(icone);
        etiqueta.addEventListener('click', () => {
          remover();
          preencherSelect('modelo', modelosDaMarca());
          aplicar();
        });
        return etiqueta;
      }));
    });
  }

  // Desenha o estado atual nos dois painéis de filtros, o do computador e o do celular.
  function refletirFiltros() {
    document.querySelectorAll('.filter-section .checkbox-item input[type="checkbox"]').forEach((input) => {
      const alvo = CHECKS[chaveDoCheck(input)];
      if (!alvo) return;
      const [grupo, valor] = alvo;
      input.checked = grupo === 'condicao' ? !filters.condicao || filters.condicao === valor : filters[grupo].includes(valor);
    });

    valorDoSelect('estado', filters.estado);
    valorDoSelect('marca', filters.marca);
    valorDoSelect('modelo', filters.modelo);
    valorDoSelect('anoMin', filters.anoMin);
    valorDoSelect('anoMax', filters.anoMax);

    document.querySelectorAll('.price-inputs').forEach((caixa) => {
      const [min, max] = caixa.querySelectorAll('input');
      if (min) min.value = filters.precoMin ? moeda(filters.precoMin) : '';
      if (max) max.value = filters.precoMax ? moeda(filters.precoMax) : '';
    });
    const extensao = limitesDePreco.max - limitesDePreco.min || 1;
    const posicao = (valor) => Math.min(100, Math.max(0, ((valor - limitesDePreco.min) / extensao) * 100));
    const esquerda = posicao(filters.precoMin || limitesDePreco.min);
    const direita = posicao(filters.precoMax || limitesDePreco.max);
    document.querySelectorAll('.range-slider-container').forEach((faixa) => {
      const [bolaMin, bolaMax] = faixa.querySelectorAll('.range-thumb');
      const preenchido = faixa.querySelector('.range-fill');
      if (bolaMin) bolaMin.style.left = `${esquerda}%`;
      if (bolaMax) bolaMax.style.left = `${direita}%`;
      if (preenchido) {
        preenchido.style.left = `${esquerda}%`;
        preenchido.style.width = `${direita - esquerda}%`;
      }
      faixa.querySelectorAll('.faixa-preco').forEach((input) => {
        input.value = filters[input.dataset.filtro] || (input.dataset.filtro === 'precoMin' ? limitesDePreco.min : limitesDePreco.max);
      });
    });

    document.querySelectorAll('.category-filter-btn').forEach((botao) => {
      const chave = chaveDaCategoria(botao);
      botao.classList.toggle('active', Boolean(chave) && chave === filters.categoria);
    });

    montarEtiquetas();
    mostrarAvisoDaCategoria();
    if (window.lucide) lucide.createIcons();
  }

  // Categoria que depende de terceiros diz de onde veio a informação e quem decide.
  function mostrarAvisoDaCategoria() {
    if (!resultsCount) return;
    let aviso = document.querySelector('.aviso-categoria');
    const categoria = filters.categoria && CATEGORIAS[filters.categoria];
    const texto = categoria && categoria.aviso ? categoria.aviso() : '';
    if (!texto) { if (aviso) aviso.remove(); return; }
    if (!aviso) {
      aviso = document.createElement('p');
      aviso.className = 'aviso-categoria';
      resultsCount.after(aviso);
    }
    aviso.textContent = texto;
  }

  document.addEventListener('change', (event) => {
    const alvo = event.target;
    if (alvo.matches('.filter-section .checkbox-item input[type="checkbox"]')) {
      const mapa = CHECKS[chaveDoCheck(alvo)];
      if (!mapa) return;
      const [grupo, valor] = mapa;
      if (grupo === 'condicao') {
        const marcados = [...alvo.closest('.filter-section').querySelectorAll('input[type="checkbox"]')]
          .filter((i) => i.checked)
          .map((i) => CHECKS[chaveDoCheck(i)][1]);
        filters.condicao = marcados.length === 1 ? marcados[0] : null;
      } else if (alvo.checked) {
        filters[grupo] = [...new Set([...filters[grupo], valor])];
      } else {
        filters[grupo] = filters[grupo].filter((v) => v !== valor);
      }
      aplicar();
      return;
    }
    if (alvo.matches('.price-inputs input')) {
      const entradas = [...alvo.closest('.price-inputs').querySelectorAll('input')];
      filters[entradas.indexOf(alvo) === 0 ? 'precoMin' : 'precoMax'] = digitos(alvo.value);
      aplicar();
      return;
    }
    if (alvo.matches('select[data-filtro]')) {
      const filtro = alvo.dataset.filtro;
      if (filtro === 'anoMin' || filtro === 'anoMax') {
        filters[filtro] = alvo.value ? Number(alvo.value) : null;
      } else {
        filters[filtro] = alvo.value ? alvo.options[alvo.selectedIndex].text : null;
      }
      if (filtro === 'marca') {
        filters.modelo = null;
        preencherSelect('modelo', modelosDaMarca());
      }
      aplicar();
    }
  });

  // A faixa de preço filtra enquanto arrasta, sem uma ponta passar da outra.
  document.addEventListener('input', (event) => {
    const alvo = event.target;
    if (!alvo.matches('.faixa-preco')) return;
    const valor = Number(alvo.value);
    if (alvo.dataset.filtro === 'precoMin') {
      const teto = filters.precoMax || limitesDePreco.max;
      const novo = Math.min(valor, teto);
      filters.precoMin = novo > limitesDePreco.min ? novo : null;
    } else {
      const piso = filters.precoMin || limitesDePreco.min;
      const novo = Math.max(valor, piso);
      filters.precoMax = novo < limitesDePreco.max ? novo : null;
    }
    aplicar();
  });

  document.addEventListener('click', (event) => {
    const categoria = event.target.closest('.category-filter-btn');
    if (categoria) {
      const chave = chaveDaCategoria(categoria);
      if (!CATEGORIAS[chave]) return;
      filters.categoria = filters.categoria === chave ? null : chave;
      aplicar();
      return;
    }
    if (event.target.closest('.btn-clear')) {
      const texto = filters.q;
      Object.assign(filters, FiltrosBusca.vazio(), { q: texto });
      preencherSelect('modelo', modelosDaMarca());
      aplicar();
      return;
    }
    if (event.target.closest('.mobile-filter-footer .btn-primary')) {
      const janela = document.getElementById('mobile-filter-modal');
      if (janela) janela.classList.remove('active');
      document.body.style.overflow = '';
    }
  });

  // Expose to window for inline handlers
  window.performSearch = performSearch;
  window.updateFilter = (key, value) => {
    filters[key] = value;
    aplicar();
  };
});

// ==================== GLOBAL FUNCTIONS ====================
function toggleDetails(element) {
  const card = element.closest('.car-card');
  const expanded = card.querySelector('.card-details-expanded');
  const toggleText = element.querySelector('.toggle-text');
  const icon = element.querySelector('i');

  if (expanded.classList.contains('show')) {
    expanded.classList.remove('show');
    toggleText.textContent = 'Mostrar detalhes';
    icon.style.transform = 'rotate(0deg)';
  } else {
    expanded.classList.add('show');
    toggleText.textContent = 'Ocultar detalhes';
    icon.style.transform = 'rotate(180deg)';
  }
}

function toggleSaveVehicle(button, vehicleId) {
  // PORQUÊ: nome próprio da camada de integração. O toggleSave(button) do
  // design cuida dos cards estáticos; este cuida dos cards da API com sync.
  // Use FavoritesManager if available
  if (window.FavoritesManager) {
    const isFavorite = FavoritesManager.toggle(vehicleId);

    if (isFavorite) {
      button.classList.add('saved');
      button.innerHTML = '<i data-lucide="heart" style="fill:currentColor;"></i> Salvo';
    } else {
      button.classList.remove('saved');
      button.innerHTML = '<i data-lucide="heart"></i> Salvar';
    }
  } else {
    // Fallback to old behavior
    button.classList.toggle('saved');

    if (button.classList.contains('saved')) {
      button.innerHTML = '<i data-lucide="heart" style="fill:currentColor;"></i> Salvo';
      if (CarInsightAPI.isLoggedIn() && vehicleId) {
        CarInsightAPI.saveVehicle(vehicleId).catch(console.error);
      }
    } else {
      button.innerHTML = '<i data-lucide="heart"></i> Salvar';
    }
  }

  if (window.lucide) lucide.createIcons();
}

// Chat UI (openChat/showChatUI/addMessageToUI/estilos) extraído para chat-ui.js
