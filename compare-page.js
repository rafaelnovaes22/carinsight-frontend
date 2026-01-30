/**
 * CarInsight Compare Page Integration
 * Handles comparar.html functionality
 */

document.addEventListener('DOMContentLoaded', () => {
  console.log('📊 Compare Page loaded');

  // DOM Elements
  const loadingScreen = document.getElementById('loading-screen');
  const resultsScreen = document.getElementById('results-screen');
  const comparisonGrid = document.querySelector('.comparison-grid');
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

  function renderComparisonSlots() {
    if (!comparisonGrid) return;

    comparisonGrid.innerHTML = '';

    // Create 3 slots
    for (let i = 0; i < 3; i++) {
      const vehicle = compareVehicles[i];
      const slot = vehicle ? createFilledSlot(vehicle, i) : createEmptySlot(i);
      comparisonGrid.appendChild(slot);
    }

    // Render comparison table if we have 2+ vehicles
    if (compareVehicles.length >= 2) {
      renderComparisonTable();
    }

    if (window.lucide) lucide.createIcons();
  }

  function createEmptySlot(index) {
    const slot = document.createElement('div');
    slot.className = 'comparison-slot slot-empty';
    slot.innerHTML = `
      <button class="btn-add-car" onclick="showVehicleSelector(${index})">
        <div class="add-icon-circle">
          <i data-lucide="plus" style="width: 32px; height: 32px;"></i>
        </div>
        <h4>Adicionar Veículo</h4>
        <span style="font-size:0.9rem; color: #94a3b8;">Escolha dos seus salvos</span>
      </button>
    `;
    return slot;
  }

  function createFilledSlot(vehicle, index) {
    const slot = document.createElement('div');
    slot.className = 'comparison-slot slot-filled';
    slot.dataset.vehicleId = vehicle.id;

    const price = vehicle.price
      ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(vehicle.price)
      : 'Consulte';
    const mileage = vehicle.mileage
      ? new Intl.NumberFormat('pt-BR').format(vehicle.mileage) + ' km'
      : 'N/A';
    const imageUrl = vehicle.media?.[0]?.url || 'assets/car1.png';
    const title = vehicle.title || `${vehicle.make} ${vehicle.model}`;
    const year = vehicle.yearModel;

    slot.innerHTML = `
      <div class="comparison-vehicle-card">
        <button class="btn-remove-compare" onclick="removeFromCompare('${vehicle.id}')" title="Remover">
          <i data-lucide="x"></i>
        </button>
        <div class="compare-vehicle-image">
          <img src="${imageUrl}" alt="${title}" onerror="this.src='assets/car1.png'">
        </div>
        <div class="compare-vehicle-info">
          <h4>${year} ${title}</h4>
          <div class="compare-vehicle-price">${price}</div>
          <div class="compare-vehicle-mileage">${mileage}</div>
        </div>
      </div>
    `;

    return slot;
  }

  function renderComparisonTable() {
    // Check if table already exists
    let tableSection = document.querySelector('.comparison-table-section');
    if (!tableSection) {
      tableSection = document.createElement('section');
      tableSection.className = 'comparison-table-section';
      comparisonGrid.parentNode.appendChild(tableSection);
    }

    const comparison = CompareManager.generateComparison(compareVehicles);
    if (!comparison) {
      tableSection.innerHTML = '';
      return;
    }

    const specs = [
      { key: 'price', label: 'Preço', format: (v) => v ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v) : 'N/A' },
      { key: 'mileage', label: 'Quilometragem', format: (v) => v ? new Intl.NumberFormat('pt-BR').format(v) + ' km' : 'N/A' },
      { key: 'yearModel', label: 'Ano', format: (v) => v || 'N/A' },
      { key: 'bodyType', label: 'Carroceria', format: (v) => v || 'N/A' },
      { key: 'fuelType', label: 'Combustível', format: (v) => v || 'N/A' },
      { key: 'transmission', label: 'Câmbio', format: (v) => v || 'N/A' },
      { key: 'engineSize', label: 'Motor', format: (v) => v || 'N/A' },
    ];

    let tableHTML = `
      <h3 style="margin-bottom: 20px;">Comparativo Detalhado</h3>
      <div class="comparison-table-wrapper">
        <table class="comparison-table">
          <thead>
            <tr>
              <th>Especificação</th>
              ${compareVehicles.map(v => `<th>${v.make} ${v.model}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
    `;

    specs.forEach(spec => {
      const highlight = comparison.highlights[spec.key];
      tableHTML += `<tr>
        <td class="spec-label">${spec.label}</td>
        ${compareVehicles.map((v, i) => {
          const isBest = highlight && highlight.bestIndex === i;
          return `<td class="${isBest ? 'best-value' : ''}">${spec.format(v[spec.key])}${isBest ? ' ✓' : ''}</td>`;
        }).join('')}
      </tr>`;
    });

    tableHTML += `
          </tbody>
        </table>
      </div>
    `;

    tableSection.innerHTML = tableHTML;

    // Add table styles if not present
    addCompareTableStyles();
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
        const imageUrl = v.media?.[0]?.url || 'assets/car1.png';
        
        listHTML += `
          <div class="vehicle-selector-item ${isInCompare ? 'disabled' : ''}" 
               onclick="${isInCompare ? '' : `selectVehicleForCompare('${v.id}', ${slotIndex})`}">
            <img src="${imageUrl}" alt="${v.make} ${v.model}" onerror="this.src='assets/car1.png'">
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
