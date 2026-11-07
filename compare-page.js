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
      
      // Render comparison slots
      renderComparisonSlots();
    } catch (error) {
      console.error('❌ Failed to initialize compare page:', error);
    } finally {
      hideLoading();
    }
  }

  const FORMATO_MOEDA = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  const FORMATO_NUMERO = new Intl.NumberFormat('pt-BR');

  function escaparTexto(valor) {
    return String(valor).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // Todas as especificações do carro, na mesma ordem para todas as colunas.
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

  // Para cada linha numérica, quais colunas têm o melhor valor. Se todos forem iguais, ninguém destaca.
  function destaquesDe(linhas) {
    return linhas[0].map((_, idx) => {
      const celulas = linhas.map((l) => l[idx]);
      if (linhas.length < 2 || !celulas[0].melhor) return [];
      const comNumero = celulas.map((c, i) => ({ c, i })).filter((x) => x.c.numero);
      if (comNumero.length < 2) return [];
      const numeros = comNumero.map((x) => x.c.numero);
      if (Math.min(...numeros) === Math.max(...numeros)) return [];
      const alvo = celulas[0].melhor === 'menor' ? Math.min(...numeros) : Math.max(...numeros);
      return comNumero.filter((x) => x.c.numero === alvo).map((x) => x.i);
    });
  }

  function colunaDoCarro(v, linha, destaques, i) {
    const VI = window.VehicleImages;
    const imageUrl = VI ? VI.resolve(v) : 'assets/sem-foto.svg';
    const imageSafe = VI ? VI.curatedFor(v.make, v.model) || VI.GENERIC_FALLBACK : 'assets/sem-foto.svg';
    const title = v.title || `${v.make} ${v.model}`;
    const coluna = document.createElement('div');
    coluna.className = 'comparison-item-column';
    coluna.dataset.vehicleId = v.id;

    const valores = linha.map((s, idx) => {
      const destaque = (destaques[idx] || []).includes(i);
      return `<div class="item-value${destaque ? ' highlight' : ''}" data-label="${escaparTexto(s.rotulo)}">${s.valor ? escaparTexto(s.valor) : 'N/A'}</div>`;
    }).join('');
    const itens = itensDo(v);

    coluna.innerHTML = `
      <div class="item-header">
        <button class="btn-change-item" title="Remover da comparação" onclick="removeFromCompare('${v.id}')">
          <i data-lucide="x"></i>
        </button>
        <div class="item-img">
          <img src="${imageUrl}" alt="${escaparTexto(title)}" onerror="this.onerror=null;this.src='${imageSafe}'">
        </div>
        <h4>${escaparTexto(title)}</h4>
      </div>
      ${valores}
      <div class="item-value item-lista" data-label="Itens">${itens.length ? `<ul>${itens.map((x) => `<li>${escaparTexto(x)}</li>`).join('')}</ul>` : 'N/A'}</div>
    `;
    return coluna;
  }

  function colunaVazia(i) {
    const coluna = document.createElement('div');
    coluna.className = 'comparison-item-column placeholder';
    coluna.innerHTML = `
      <button class="btn-add-comparison" onclick="showVehicleSelector(${i})">
        <i data-lucide="plus-circle"></i>
        <span>Adicionar <br>${i + 1}º carro</span>
      </button>
    `;
    return coluna;
  }

  // Grade no formato do Diego: coluna de nomes à esquerda e uma coluna por carro, com 3 espaços.
  function renderComparisonSlots() {
    if (!comparisonGrid) return;
    const antiga = document.querySelector('.comparison-table-section');
    if (antiga) antiga.remove();
    comparisonGrid.innerHTML = '';

    const cards = compareVehicles.slice(0, 3);
    if (cards.length === 0) {
      comparisonGrid.appendChild(colunaVazia(0));
      if (window.lucide) lucide.createIcons();
      return;
    }

    const linhas = cards.map(especificacoes);
    const destaques = destaquesDe(linhas);

    const nomes = document.createElement('div');
    nomes.className = 'comparison-labels';
    nomes.innerHTML = '<div class="label-spacer"></div>' +
      linhas[0].map((s) => `<div class="criteria-label">${s.rotulo}</div>`).join('') +
      '<div class="criteria-label">Itens</div>';
    comparisonGrid.appendChild(nomes);

    cards.forEach((v, i) => comparisonGrid.appendChild(colunaDoCarro(v, linhas[i], destaques, i)));
    for (let i = cards.length; i < 3; i++) comparisonGrid.appendChild(colunaVazia(i));

    if (window.lucide) lucide.createIcons();
  }

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

  window.selectVehicleForCompare = async function(vehicleId, slotIndex) {
    const result = CompareManager.add(vehicleId);
    if (result.success) {
      // Reload compare vehicles
      compareVehicles = await CompareManager.getCompareVehicles();
      renderComparisonSlots();
    }
    hideVehicleSelector();
  };

  window.removeFromCompare = async function(vehicleId) {
    CompareManager.remove(vehicleId);
    compareVehicles = await CompareManager.getCompareVehicles();
    renderComparisonSlots();
    
    // Remove table if less than 2 vehicles
    if (compareVehicles.length < 2) {
      const tableSection = document.querySelector('.comparison-table-section');
      if (tableSection) tableSection.innerHTML = '';
    }
  };
});
