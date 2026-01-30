/**
 * CarInsight Saved Page Integration
 * Handles meus-salvos.html functionality
 */

document.addEventListener('DOMContentLoaded', () => {
  console.log('💜 Saved Page loaded');

  // DOM Elements
  const loadingScreen = document.getElementById('loading-screen');
  const resultsScreen = document.getElementById('results-screen');
  const carsGrid = document.querySelector('.cars-grid');
  const resultsCount = document.querySelector('.results-count');

  // Load saved vehicles
  loadSavedVehicles();

  async function loadSavedVehicles() {
    try {
      const vehicles = await FavoritesManager.getFavoriteVehicles();
      console.log('✅ Loaded saved vehicles:', vehicles.length);
      renderSavedVehicles(vehicles);
    } catch (error) {
      console.error('❌ Failed to load saved vehicles:', error);
      renderError(error.message);
    } finally {
      hideLoading();
    }
  }

  function renderSavedVehicles(vehicles) {
    if (!carsGrid) return;

    // Update count
    const count = vehicles.length;
    if (resultsCount) {
      resultsCount.textContent = `Você tem ${count} veículo${count !== 1 ? 's' : ''} salvo${count !== 1 ? 's' : ''}`;
    }

    if (count === 0) {
      carsGrid.innerHTML = `
        <div class="no-results" style="grid-column: 1/-1; text-align: center; padding: 60px 20px;">
          <i data-lucide="heart" style="width:64px;height:64px;color:#ddd;margin-bottom:16px;"></i>
          <h3 style="margin-bottom:8px;">Nenhum veículo salvo</h3>
          <p style="color:#666;margin-bottom:24px;">Explore nosso catálogo e salve os veículos que mais te interessam!</p>
          <a href="buscando-carro.html" class="btn-search" style="display:inline-block;">Buscar Veículos</a>
        </div>
      `;
      if (window.lucide) lucide.createIcons();
      return;
    }

    // Clear and render
    carsGrid.innerHTML = '';
    vehicles.forEach((vehicle) => {
      const card = createSavedVehicleCard(vehicle);
      carsGrid.appendChild(card);
    });

    if (window.lucide) lucide.createIcons();
  }

  function createSavedVehicleCard(vehicle) {
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
    const imageUrl = vehicle.media?.[0]?.url || 'assets/car1.png';
    const dealerName = vehicle.dealer?.name || 'Vendedor';
    const title = vehicle.title || `${vehicle.make} ${vehicle.model}`;
    const year = vehicle.yearFab && vehicle.yearModel 
      ? `${vehicle.yearFab}/${vehicle.yearModel}` 
      : vehicle.yearModel;

    // Check if in compare list
    const inCompare = CompareManager.isInCompare(vehicle.id);

    card.innerHTML = `
      <div class="card-main-content">
        <div class="car-image">
          <img src="${imageUrl}" alt="${title}" onerror="this.src='assets/car1.png'">
        </div>
        <div class="car-info">
          <div class="info-top">
            <div class="info-header">
              <div class="header-left-group" style="display: flex; align-items: center;">
                <label class="compare-checkbox-wrapper">
                  <input type="checkbox" name="compare" ${inCompare ? 'checked' : ''} 
                         onchange="handleCompareToggle(this, '${vehicle.id}')">
                  <span class="checkmark-fancy"></span>
                  Comparar
                </label>
                <a href="comparar.html" class="btn-go-compare" 
                   style="display: ${inCompare ? 'inline-flex' : 'none'}; opacity: ${inCompare ? '1' : '0'}; transition: all 0.3s ease;">
                  Ir para comparar <i data-lucide="arrow-right" style="width: 14px; height: 14px;"></i>
                </a>
              </div>
              <button class="btn-delete-saved" onclick="handleRemoveSaved(this, '${vehicle.id}')" title="Remover dos salvos">
                <i data-lucide="trash-2"></i>
              </button>
            </div>
            <h2 class="car-name">${year} ${title}</h2>
            <div class="mileage-text">${mileage}</div>
            <div class="car-price">${price}</div>
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
            <div class="spec-row"><span class="spec-label">Carroceria:</span> <span class="spec-value">${vehicle.bodyType || 'N/A'}</span></div>
            ${vehicle.fuelType ? `<div class="spec-row"><span class="spec-label">Combustível:</span> <span class="spec-value">${vehicle.fuelType}</span></div>` : ''}
            ${vehicle.transmission ? `<div class="spec-row"><span class="spec-label">Câmbio:</span> <span class="spec-value">${vehicle.transmission}</span></div>` : ''}
          </div>
        </div>
      </div>
    `;

    return card;
  }

  function renderError(message) {
    if (!carsGrid) return;
    carsGrid.innerHTML = `
      <div class="no-results" style="grid-column: 1/-1; text-align: center; padding: 60px 20px;">
        <i data-lucide="alert-circle" style="width:64px;height:64px;color:#e74c3c;margin-bottom:16px;"></i>
        <h3 style="margin-bottom:8px;">Erro ao carregar favoritos</h3>
        <p style="color:#666;margin-bottom:24px;">${message}</p>
        <button onclick="location.reload()" class="btn-search" style="display:inline-block;">Tentar novamente</button>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
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
});

// Global functions for inline handlers
function toggleDetails(element) {
  const card = element.closest('.car-card');
  const expanded = card.querySelector('.card-details-expanded');
  const toggleText = element.querySelector('.toggle-text');
  const icon = element.querySelector('i');

  if (expanded.style.display === 'block') {
    expanded.style.display = 'none';
    toggleText.textContent = 'Mostrar detalhes';
    icon.setAttribute('data-lucide', 'chevron-down');
  } else {
    expanded.style.display = 'block';
    toggleText.textContent = 'Ocultar detalhes';
    icon.setAttribute('data-lucide', 'chevron-up');
  }
  if (window.lucide) lucide.createIcons();
}

function handleCompareToggle(checkbox, vehicleId) {
  const result = CompareManager.toggle(vehicleId);
  const wrapper = checkbox.closest('.header-left-group');
  const btn = wrapper.querySelector('.btn-go-compare');

  if (result.inCompare) {
    btn.style.display = 'inline-flex';
    void btn.offsetWidth;
    btn.style.opacity = '1';
  } else {
    btn.style.opacity = '0';
    setTimeout(() => {
      if (!checkbox.checked) btn.style.display = 'none';
    }, 300);
  }
  
  if (window.lucide) lucide.createIcons();
}

function handleRemoveSaved(button, vehicleId) {
  if (confirm('Tem certeza que deseja remover este veículo dos seus salvos?')) {
    FavoritesManager.remove(vehicleId);
    
    const card = button.closest('.car-card');
    card.style.opacity = '0';
    card.style.transform = 'scale(0.95)';
    card.style.transition = 'all 0.3s ease';
    
    setTimeout(() => {
      card.remove();
      // Update count
      const count = document.querySelectorAll('.car-card').length;
      const resultsCount = document.querySelector('.results-count');
      if (resultsCount) {
        resultsCount.textContent = `Você tem ${count} veículo${count !== 1 ? 's' : ''} salvo${count !== 1 ? 's' : ''}`;
      }
      
      // Show empty state if no more vehicles
      if (count === 0) {
        const carsGrid = document.querySelector('.cars-grid');
        if (carsGrid) {
          carsGrid.innerHTML = `
            <div class="no-results" style="grid-column: 1/-1; text-align: center; padding: 60px 20px;">
              <i data-lucide="heart" style="width:64px;height:64px;color:#ddd;margin-bottom:16px;"></i>
              <h3 style="margin-bottom:8px;">Nenhum veículo salvo</h3>
              <p style="color:#666;margin-bottom:24px;">Explore nosso catálogo e salve os veículos que mais te interessam!</p>
              <a href="buscando-carro.html" class="btn-search" style="display:inline-block;">Buscar Veículos</a>
            </div>
          `;
          if (window.lucide) lucide.createIcons();
        }
      }
    }, 300);
  }
}

function openChat(vehicleId) {
  if (window.ChatManager) {
    ChatManager.init(vehicleId)
      .then((response) => {
        if (window.showChatUI) {
          showChatUI(response.greeting, response.vehicle);
        } else {
          console.log('Chat initialized:', response);
          alert('Chat iniciado! Verifique o console.');
        }
      })
      .catch((error) => {
        console.error('Failed to start chat:', error);
        alert('Erro ao iniciar conversa. Tente novamente.');
      });
  }
}
