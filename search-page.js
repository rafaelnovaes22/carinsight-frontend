/**
 * CarInsight Search Page Integration
 * Handles search results page (buscando-carro.html)
 */

document.addEventListener('DOMContentLoaded', () => {
  console.log('🔍 Search Page loaded');

  // Get search params from URL
  const urlParams = new URLSearchParams(window.location.search);
  const searchQuery = urlParams.get('q') || '';

  // Initialize filters state
  const filters = {
    query: searchQuery,
    priceMin: null,
    priceMax: null,
    yearMin: null,
    yearMax: null,
    make: null,
    bodyType: null,
    condition: null,
  };

  // DOM Elements
  const loadingScreen = document.getElementById('loading-screen');
  const resultsScreen = document.getElementById('results-screen');
  const carsGrid = document.querySelector('.cars-grid');
  const resultsCount = document.querySelector('.results-count');

  // Show loading, then fetch
  showLoading();
  performSearch();

  // ==================== SEARCH ====================
  async function performSearch() {
    try {
      console.log('🔄 Searching with filters:', filters);

      let results;
      if (filters.query) {
        results = await CarInsightAPI.search(filters.query, {
          priceMin: filters.priceMin,
          priceMax: filters.priceMax,
          yearMin: filters.yearMin,
          yearMax: filters.yearMax,
          make: filters.make,
          bodyType: filters.bodyType,
          condition: filters.condition,
          limit: 20,
        });
      } else {
        const response = await CarInsightAPI.getVehicles({
          priceMin: filters.priceMin,
          priceMax: filters.priceMax,
          make: filters.make,
          limit: 20,
        });
        results = response.data || response;
      }

      console.log('✅ Search results:', results.length || results);
      renderResults(results);
    } catch (error) {
      console.error('❌ Search failed:', error);
      renderError(error.message);
    } finally {
      hideLoading();
    }
  }

  // ==================== RENDER ====================
  function renderResults(vehicles) {
    if (!carsGrid) return;

    // Clear existing
    carsGrid.innerHTML = '';

    // Update count
    const count = Array.isArray(vehicles) ? vehicles.length : 0;
    if (resultsCount) {
      resultsCount.textContent = `Encontramos ${count} veículo${count !== 1 ? 's' : ''} para você`;
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
    const imageUrl = vehicle.media?.[0]?.url || 'assets/car1.png';
    const dealerName = vehicle.dealer?.name || 'Vendedor';
    const title = vehicle.title || `${vehicle.make} ${vehicle.model} ${vehicle.yearModel}`;
    const year = vehicle.yearFab && vehicle.yearModel 
      ? `${vehicle.yearFab}/${vehicle.yearModel}` 
      : vehicle.yearModel;

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
          <img src="${imageUrl}" alt="${title}" onerror="this.src='assets/car1.png'">
        </div>
        <div class="car-info">
          <div class="info-top">
            <div class="info-header">
              <span class="condition-badge">${condition}</span>
              <button class="save-btn" onclick="toggleSave(this, '${vehicle.id}')">
                <i data-lucide="heart"></i> Salvar
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
          <button class="btn-check-availability" onclick="openChat('${vehicle.id}')">
            <i data-lucide="message-circle"></i> Conversar com vendedor
          </button>
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
  // Price filter
  const priceInputs = document.querySelectorAll('.price-inputs input');
  priceInputs.forEach((input, index) => {
    input.addEventListener('change', () => {
      const value = parseInt(input.value.replace(/\D/g, ''));
      if (index === 0) filters.priceMin = value || null;
      else filters.priceMax = value || null;
      performSearch();
    });
  });

  // Body type checkboxes
  const bodyTypeCheckboxes = document.querySelectorAll('.filter-section:has(h4:contains("Carroceria")) .checkbox-item input');
  // Note: :has and :contains may not work in all browsers, using alternative approach

  // Clear filters button
  const clearBtn = document.querySelector('.btn-clear');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      filters.priceMin = null;
      filters.priceMax = null;
      filters.yearMin = null;
      filters.yearMax = null;
      filters.make = null;
      filters.bodyType = null;
      filters.condition = null;
      performSearch();
    });
  }

  // Expose to window for inline handlers
  window.performSearch = performSearch;
  window.updateFilter = (key, value) => {
    filters[key] = value;
    performSearch();
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

function toggleSave(button, vehicleId) {
  button.classList.toggle('saved');
  const icon = button.querySelector('i');
  
  if (button.classList.contains('saved')) {
    icon.setAttribute('data-lucide', 'heart');
    icon.style.fill = 'currentColor';
    button.innerHTML = '<i data-lucide="heart" style="fill:currentColor;"></i> Salvo';
    
    // Save to API if logged in
    if (CarInsightAPI.isLoggedIn() && vehicleId) {
      CarInsightAPI.saveVehicle(vehicleId).catch(console.error);
    }
  } else {
    button.innerHTML = '<i data-lucide="heart"></i> Salvar';
  }
  
  if (window.lucide) lucide.createIcons();
}

function openChat(vehicleId) {
  if (!CarInsightAPI.isLoggedIn()) {
    // Show login modal or redirect
    alert('Faça login para conversar com o vendedor');
    return;
  }

  // Open chat modal (to be implemented)
  console.log('Opening chat for vehicle:', vehicleId);
  CarInsightAPI.startChat(vehicleId)
    .then((response) => {
      console.log('Chat started:', response);
      // TODO: Open chat UI with response.greeting
    })
    .catch(console.error);
}
