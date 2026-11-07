/**
 * CarInsight Compare Page Integration
 * Handles comparar.html functionality
 */

document.addEventListener('DOMContentLoaded', () => {
  console.log('📊 Compare Page loaded');

  // DOM Elements
  const loadingScreen = document.getElementById('loading-screen');
  const resultsScreen = document.getElementById('results-screen');
  const comparisonGrid = document.querySelector('.comparison-grid-modern');
  const addButtons = document.querySelectorAll('.btn-add-car');

  // State
  let savedVehicles = [];
  let compareVehicles = [];

  // Initialize
  init();

  async function init() {
    try {
      // Load saved vehicles for selection
      savedVehicles = await FavoritesManager.getFavoriteVehicles();
      
      // Load vehicles already in compare list
      compareVehicles = await CompareManager.getCompareVehicles();
      
      // Estilos da janela de escolha, que não dependem de haver carros.
      addCompareTableStyles();
      renderComparisonSlots();
    } catch (error) {
      console.error('❌ Failed to initialize compare page:', error);
    } finally {
      hideLoading();
    }
  }

  const FORMATO_MOEDA = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  const FORMATO_NUMERO = new Intl.NumberFormat('pt-BR');
  const ITENS = 'Itens';
  const criteriosDesligados = new Set();

  function escaparTexto(valor) {
    return String(valor).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // Todas as especificações do carro, na mesma ordem em todas as colunas.
  // "melhor" diz qual lado vence em números: menor preço e km, maior ano.
  function especificacoes(v) {
    const t = v.technicalSpecs || {};
    const ano = v.yearModel
      ? (v.yearFab && v.yearFab !== v.yearModel ? `${v.yearFab}/${v.yearModel}` : String(v.yearModel))
      : null;
    return [
      { rotulo: 'Preço', valor: v.price ? FORMATO_MOEDA.format(Number(v.price)) : null, numero: Number(v.price) || null, melhor: 'menor' },
      { rotulo: 'Quilometragem', valor: v.mileage ? FORMATO_NUMERO.format(v.mileage) + ' km' : null, numero: Number(v.mileage) || null, melhor: 'menor' },
      { rotulo: 'Ano', valor: ano, numero: Number(v.yearModel) || null, melhor: 'maior' },
      { rotulo: 'Carroceria', valor: v.bodyType || null },
      { rotulo: 'Combustível', valor: t.fuel || t.fuelType || null },
      { rotulo: 'Câmbio', valor: v.transmission || t.transmission || null },
      { rotulo: 'Motor', valor: t.engine || v.engineSize || null },
      { rotulo: 'Potência', valor: t.power || null },
      { rotulo: 'Cor', valor: t.color || null },
      { rotulo: 'Condição', valor: v.condition === 'NEW' ? 'Novo' : (v.condition ? 'Seminovo' : null) },
    ];
  }

  function itensDo(v) {
    return Array.isArray(v.features) ? v.features : [];
  }

  function fotoDo(v) {
    const VI = window.VehicleImages;
    return {
      url: VI ? VI.resolve(v) : 'assets/sem-foto.svg',
      reserva: VI ? VI.curatedFor(v.make, v.model) || VI.GENERIC_FALLBACK : 'assets/sem-foto.svg',
    };
  }

  function nomeDo(v) {
    return v.title || `${v.make} ${v.model}`;
  }

  // Meus Carros Salvos: pode salvar quantos quiser e escolher até 3 para comparar.
  function renderSelecao() {
    const grade = document.querySelector('.saved-selection-grid');
    if (!grade) return;
    if (savedVehicles.length === 0) {
      grade.innerHTML = `
        <p class="compare-sem-salvos">
          Você ainda não salvou nenhum carro. Toque no coração de um carro em
          <a href="veiculos.html">Veículos</a> para ele aparecer aqui.
        </p>`;
      return;
    }
    const escolhidos = CompareManager.getCompareList();
    grade.innerHTML = savedVehicles.map((v) => {
      const ativo = escolhidos.includes(v.id);
      const foto = fotoDo(v);
      const km = v.mileage ? ` • ${FORMATO_NUMERO.format(v.mileage)} km` : '';
      return `
        <div class="selection-card">
          <div class="selection-img">
            <img src="${foto.url}" alt="${escaparTexto(nomeDo(v))}" onerror="this.onerror=null;this.src='${foto.reserva}'">
          </div>
          <div class="selection-info">
            <h5>${escaparTexto(nomeDo(v))}</h5>
            <span>${v.yearModel || ''}${km}</span>
          </div>
          <button type="button" class="btn-select-car${ativo ? ' active' : ''}" onclick="alternarSelecao('${v.id}')">
            <i data-lucide="${ativo ? 'check' : 'plus'}"></i> ${ativo ? 'Selecionado' : 'Selecionar'}
          </button>
        </div>`;
    }).join('');
  }

  function temDado(rotulo, carros) {
    if (rotulo === ITENS) return carros.some((v) => itensDo(v).length > 0);
    return carros.some((v) => especificacoes(v).find((s) => s.rotulo === rotulo).valor);
  }

  // Critérios de Comparação: só o que existe nos carros escolhidos. Desmarcar tira a linha da grade.
  function renderCriterios() {
    const tags = document.querySelector('.criteria-tags');
    if (!tags) return;
    const carros = compareVehicles.slice(0, 3);
    const secao = tags.closest('.comparison-criteria-section');
    if (secao) secao.style.display = carros.length ? '' : 'none';
    const rotulos = [...especificacoes({}).map((s) => s.rotulo), ITENS].filter((r) => temDado(r, carros));
    tags.innerHTML = rotulos.map((rotulo) => {
      const ativo = !criteriosDesligados.has(rotulo);
      return `
        <label class="criteria-tag${ativo ? ' active' : ''}">
          <input type="checkbox" ${ativo ? 'checked' : ''} onchange="alternarCriterio('${rotulo}')">
          ${ativo ? '<i data-lucide="check" style="width:14px;"></i>' : ''} ${rotulo}
        </label>`;
    }).join('');
  }

  // Para cada linha numérica, quais colunas têm o melhor valor. Se todos forem iguais, ninguém destaca.
  function destacados(celulas) {
    if (celulas.length < 2 || !celulas[0].melhor) return [];
    const comNumero = celulas.map((c, i) => ({ c, i })).filter((x) => x.c.numero);
    if (comNumero.length < 2) return [];
    const numeros = comNumero.map((x) => x.c.numero);
    if (Math.min(...numeros) === Math.max(...numeros)) return [];
    const alvo = celulas[0].melhor === 'menor' ? Math.min(...numeros) : Math.max(...numeros);
    return comNumero.filter((x) => x.c.numero === alvo).map((x) => x.i);
  }

  function colunaVazia(i) {
    return `
      <div class="comparison-item-column placeholder">
        <button type="button" class="btn-add-comparison" onclick="showVehicleSelector(${i})">
          <i data-lucide="plus-circle"></i>
          <span>Adicionar <br>${i + 1}º carro</span>
        </button>
      </div>`;
  }

  // Grade do Diego: coluna de nomes à esquerda e 3 espaços, um por carro.
  function renderGrade() {
    if (!comparisonGrid) return;
    const carros = compareVehicles.slice(0, 3);
    const visivel = (rotulo) => !criteriosDesligados.has(rotulo) && temDado(rotulo, carros);
    const linhas = especificacoes({}).map((s) => s.rotulo).filter(visivel);
    const comItens = visivel(ITENS);
    const celulasDe = (rotulo) => carros.map((v) => especificacoes(v).find((s) => s.rotulo === rotulo));

    const nomes = `
      <div class="comparison-labels">
        <div class="label-spacer"></div>
        ${linhas.map((r) => `<div class="criteria-label">${r}</div>`).join('')}
        ${comItens ? `<div class="criteria-label linha-itens">${ITENS}</div>` : ''}
      </div>`;

    const colunas = carros.map((v, i) => {
      const foto = fotoDo(v);
      const valores = linhas.map((rotulo) => {
        const celulas = celulasDe(rotulo);
        const destaque = destacados(celulas).includes(i);
        return `<div class="item-value${destaque ? ' highlight' : ''}" data-label="${rotulo}">${celulas[i].valor ? escaparTexto(celulas[i].valor) : 'N/A'}</div>`;
      }).join('');
      const itens = itensDo(v);
      const lista = !comItens ? '' : `
        <div class="item-value item-lista" data-label="${ITENS}">
          ${itens.length ? `<ul>${itens.map((x) => `<li>${escaparTexto(x)}</li>`).join('')}</ul>` : 'N/A'}
        </div>`;
      return `
        <div class="comparison-item-column" data-vehicle-id="${v.id}">
          <div class="item-header">
            <button type="button" class="btn-change-item" title="Mudar veículo" onclick="showVehicleSelector(${i})">
              <i data-lucide="refresh-cw"></i>
            </button>
            <div class="item-img">
              <img src="${foto.url}" alt="${escaparTexto(nomeDo(v))}" onerror="this.onerror=null;this.src='${foto.reserva}'">
            </div>
            <h4>${escaparTexto(nomeDo(v))}</h4>
          </div>
          ${valores}
          ${lista}
        </div>`;
    }).join('');

    let vazias = '';
    for (let i = carros.length; i < 3; i++) vazias += colunaVazia(i);
    comparisonGrid.innerHTML = nomes + colunas + vazias;
  }

  function renderComparisonSlots() {
    renderSelecao();
    renderCriterios();
    renderGrade();
    if (window.lucide) lucide.createIcons();
  }

  async function recarregarComparacao() {
    compareVehicles = await CompareManager.getCompareVehicles();
    renderComparisonSlots();
  }

  window.alternarCriterio = function (rotulo) {
    if (criteriosDesligados.has(rotulo)) criteriosDesligados.delete(rotulo);
    else criteriosDesligados.add(rotulo);
    renderComparisonSlots();
  };

  window.alternarSelecao = async function (vehicleId) {
    const resultado = CompareManager.toggle(vehicleId);
    if (!resultado.inCompare && /Máximo/.test(resultado.message || '')) {
      window.alert(`${resultado.message}. Tire um da comparação para escolher outro.`);
    }
    await recarregarComparacao();
  };

  function addCompareTableStyles() {
    if (document.getElementById('compare-table-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'compare-table-styles';
    styles.textContent = `
      .comparison-table-section {
        margin-top: 40px;
        padding: 24px;
        background: white;
        border-radius: 16px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.05);
      }
      .comparison-table-wrapper {
        overflow-x: auto;
      }
      .comparison-table {
        width: 100%;
        border-collapse: collapse;
      }
      .comparison-table th,
      .comparison-table td {
        padding: 12px 16px;
        text-align: left;
        border-bottom: 1px solid #eee;
      }
      .comparison-table th {
        background: #f8f9fa;
        font-weight: 600;
      }
      .comparison-table .spec-label {
        font-weight: 500;
        color: #666;
      }
      .comparison-table .best-value {
        background: #f0fdf4;
        color: #16a34a;
        font-weight: 600;
      }
      .comparison-vehicle-card {
        position: relative;
        padding: 20px;
        text-align: center;
      }
      .btn-remove-compare {
        position: absolute;
        top: 8px;
        right: 8px;
        background: #fee2e2;
        border: none;
        border-radius: 50%;
        width: 32px;
        height: 32px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #dc2626;
      }
      .btn-remove-compare:hover {
        background: #fecaca;
      }
      .compare-vehicle-image {
        width: 100%;
        height: 150px;
        overflow: hidden;
        border-radius: 12px;
        margin-bottom: 16px;
      }
      .compare-vehicle-image img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .compare-vehicle-info h4 {
        margin: 0 0 8px;
        font-size: 1rem;
      }
      .compare-vehicle-price {
        font-size: 1.25rem;
        font-weight: 700;
        color: #667eea;
        margin-bottom: 4px;
      }
      .compare-vehicle-mileage {
        font-size: 0.9rem;
        color: #666;
      }
      .slot-filled {
        background: white;
        border-radius: 16px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.05);
      }
      .vehicle-selector-modal {
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 10000;
      }
      .vehicle-selector-modal.show {
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .vehicle-selector-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.5);
      }
      .vehicle-selector-content {
        position: relative;
        width: 90%;
        max-width: 600px;
        max-height: 80vh;
        background: white;
        border-radius: 16px;
        overflow: hidden;
        display: flex;
        flex-direction: column;
      }
      .vehicle-selector-header {
        padding: 20px;
        border-bottom: 1px solid #eee;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .vehicle-selector-header h3 {
        margin: 0;
      }
      .vehicle-selector-list {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
      }
      .vehicle-selector-item {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 12px;
        border: 1px solid #eee;
        border-radius: 12px;
        margin-bottom: 12px;
        cursor: pointer;
        transition: all 0.2s;
      }
      .vehicle-selector-item:hover {
        border-color: #667eea;
        background: #f8f9ff;
      }
      .vehicle-selector-item.disabled {
        opacity: 0.5;
        pointer-events: none;
      }
      .vehicle-selector-item img {
        width: 80px;
        height: 60px;
        object-fit: cover;
        border-radius: 8px;
      }
      .vehicle-selector-item-info h4 {
        margin: 0 0 4px;
        font-size: 0.95rem;
      }
      .vehicle-selector-item-info span {
        font-size: 0.85rem;
        color: #666;
      }
    `;
    document.head.appendChild(styles);
  }

  function hideLoading() {
    setTimeout(() => {
      if (loadingScreen) {
        loadingScreen.style.opacity = '0';
        setTimeout(() => {
          loadingScreen.style.display = 'none';
          if (resultsScreen) {
            resultsScreen.style.display = 'block';
            void resultsScreen.offsetWidth;
            resultsScreen.style.opacity = '1';
          }
        }, 500);
      }
    }, 500);
  }

  // Expose functions globally
  window.showVehicleSelector = function(slotIndex) {
    // Create modal if not exists
    let modal = document.getElementById('vehicle-selector-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'vehicle-selector-modal';
      modal.className = 'vehicle-selector-modal';
      document.body.appendChild(modal);
    }

    // Get vehicles already in compare
    const compareIds = CompareManager.getCompareList();

    // Build vehicle list
    let listHTML = '';
    if (savedVehicles.length === 0) {
      listHTML = `
        <div style="text-align: center; padding: 40px;">
          <i data-lucide="heart" style="width:48px;height:48px;color:#ddd;margin-bottom:16px;"></i>
          <p style="color:#666;">Você ainda não tem veículos salvos.</p>
          <a href="buscando-carro.html" style="color:#667eea;">Buscar veículos</a>
        </div>
      `;
    } else {
      savedVehicles.forEach(v => {
        const isInCompare = compareIds.includes(v.id);
        const price = v.price ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v.price) : '';
        const imageUrl = window.VehicleImages
          ? window.VehicleImages.resolve(v)
          : v.media?.[0]?.url || 'assets/sem-foto.svg';
        const imageSafe = window.VehicleImages
          ? window.VehicleImages.curatedFor(v.make, v.model) || window.VehicleImages.GENERIC_FALLBACK
          : 'assets/sem-foto.svg';
        
        listHTML += `
          <div class="vehicle-selector-item ${isInCompare ? 'disabled' : ''}" 
               onclick="${isInCompare ? '' : `selectVehicleForCompare('${v.id}', ${slotIndex})`}">
            <img src="${imageUrl}" alt="${v.make} ${v.model}" onerror="this.onerror=null;this.src='${imageSafe}'">
            <div class="vehicle-selector-item-info">
              <h4>${v.yearModel} ${v.make} ${v.model}</h4>
              <span>${price} ${isInCompare ? '• Já na comparação' : ''}</span>
            </div>
          </div>
        `;
      });
    }

    modal.innerHTML = `
      <div class="vehicle-selector-overlay" onclick="hideVehicleSelector()"></div>
      <div class="vehicle-selector-content">
        <div class="vehicle-selector-header">
          <h3>Escolher Veículo</h3>
          <button onclick="hideVehicleSelector()" style="background:none;border:none;cursor:pointer;">
            <i data-lucide="x"></i>
          </button>
        </div>
        <div class="vehicle-selector-list">
          ${listHTML}
        </div>
      </div>
    `;

    modal.classList.add('show');
    if (window.lucide) lucide.createIcons();
  };

  window.hideVehicleSelector = function() {
    const modal = document.getElementById('vehicle-selector-modal');
    if (modal) {
      modal.classList.remove('show');
    }
  };

  // Espaço já ocupado troca o carro no mesmo lugar; espaço vazio acrescenta.
  window.selectVehicleForCompare = async function(vehicleId, slotIndex) {
    const lista = CompareManager.getCompareList();
    if (slotIndex < lista.length) {
      lista[slotIndex] = vehicleId;
      CompareManager.saveCompareList(lista);
    } else {
      CompareManager.add(vehicleId);
    }
    await recarregarComparacao();
    hideVehicleSelector();
  };
});
