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
          <img src="${imageUrl}" alt="${title}" onerror="this.src='assets/car1.png'">
        </div>
        <div class="car-info">
          <div class="info-top">
            <div class="info-header">
              <span class="condition-badge">${condition}</span>
              <button class="${saveButtonClass}" onclick="toggleSave(this, '${vehicle.id}')">
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

function openChat(vehicleId) {
  console.log('🗨️ Opening chat for vehicle:', vehicleId);
  
  // Initialize chat manager
  ChatManager.init(vehicleId)
    .then((response) => {
      console.log('✅ Chat initialized:', response);
      
      // Store vehicle ID for reference
      window.currentChatVehicleId = vehicleId;
      
      // Show chat UI (modal or panel)
      showChatUI(response.greeting, response.vehicle);
    })
    .catch((error) => {
      console.error('❌ Failed to start chat:', error);
      alert('Erro ao iniciar conversa. Tente novamente.');
    });
}

/**
 * Show chat UI - creates a simple chat modal
 * This can be replaced with a more sophisticated UI by the design team
 */
function showChatUI(greeting, vehicle) {
  // Check if modal already exists
  let modal = document.getElementById('chat-modal');
  
  if (!modal) {
    // Create modal structure
    modal = document.createElement('div');
    modal.id = 'chat-modal';
    modal.className = 'chat-modal';
    modal.innerHTML = `
      <div class="chat-modal-overlay" onclick="closeChatUI()"></div>
      <div class="chat-modal-content">
        <div class="chat-header">
          <div class="chat-header-info">
            <h3>💬 Assistente CarInsight</h3>
            <span class="chat-status">Online</span>
          </div>
          <button class="chat-close-btn" onclick="closeChatUI()">
            <i data-lucide="x"></i>
          </button>
        </div>
        <div class="chat-vehicle-context" id="chat-vehicle-context"></div>
        <div class="chat-messages" id="chat-messages"></div>
        <div class="chat-actions" id="chat-actions"></div>
        <div class="chat-input-area">
          <input type="text" id="chat-input" placeholder="Digite sua mensagem..." 
                 onkeypress="handleChatKeypress(event)">
          <button class="chat-send-btn" onclick="sendChatMessage()">
            <i data-lucide="send"></i>
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    
    // Add minimal styles if not already present
    addChatStyles();
  }
  
  // Show vehicle context if available
  const contextEl = document.getElementById('chat-vehicle-context');
  if (vehicle && contextEl) {
    const price = vehicle.price 
      ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(vehicle.price)
      : '';
    contextEl.innerHTML = `
      <div class="chat-vehicle-card">
        <strong>${vehicle.make} ${vehicle.model} ${vehicle.yearModel}</strong>
        ${price ? `<span>${price}</span>` : ''}
      </div>
    `;
    contextEl.style.display = 'block';
  } else if (contextEl) {
    contextEl.style.display = 'none';
  }
  
  // Clear and add greeting
  const messagesEl = document.getElementById('chat-messages');
  if (messagesEl) {
    messagesEl.innerHTML = '';
    addMessageToUI('assistant', greeting);
  }
  
  // Setup callbacks
  ChatManager.onMessageReceived = (msg) => {
    addMessageToUI(msg.role, msg.content, msg.suggestedActions);
  };
  
  ChatManager.onLoadingChange = (loading) => {
    const input = document.getElementById('chat-input');
    const sendBtn = document.querySelector('.chat-send-btn');
    if (input) input.disabled = loading;
    if (sendBtn) sendBtn.disabled = loading;
    
    // Show typing indicator
    if (loading) {
      showTypingIndicator();
    } else {
      hideTypingIndicator();
    }
  };
  
  // Show modal
  modal.classList.add('show');
  
  // Focus input
  setTimeout(() => {
    const input = document.getElementById('chat-input');
    if (input) input.focus();
  }, 300);
  
  // Re-init icons
  if (window.lucide) lucide.createIcons();
}

/**
 * Close chat UI
 */
function closeChatUI() {
  const modal = document.getElementById('chat-modal');
  if (modal) {
    modal.classList.remove('show');
  }
}

/**
 * Add message to chat UI
 */
function addMessageToUI(role, content, suggestedActions = null) {
  const messagesEl = document.getElementById('chat-messages');
  if (!messagesEl) return;
  
  const messageDiv = document.createElement('div');
  messageDiv.className = `chat-message chat-message-${role}`;
  messageDiv.innerHTML = `
    <div class="chat-message-content">
      ${ChatManager.formatMessage(content)}
    </div>
  `;
  messagesEl.appendChild(messageDiv);
  
  // Add action buttons if present
  if (suggestedActions && suggestedActions.length > 0) {
    const actionsEl = document.getElementById('chat-actions');
    if (actionsEl) {
      actionsEl.innerHTML = suggestedActions.map(action => `
        <button class="chat-action-btn" onclick="handleChatAction('${action}')">
          ${ChatManager.getActionLabel(action)}
        </button>
      `).join('');
    }
  }
  
  // Scroll to bottom
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

/**
 * Show typing indicator
 */
function showTypingIndicator() {
  const messagesEl = document.getElementById('chat-messages');
  if (!messagesEl) return;
  
  // Remove existing indicator
  hideTypingIndicator();
  
  const indicator = document.createElement('div');
  indicator.id = 'typing-indicator';
  indicator.className = 'chat-message chat-message-assistant';
  indicator.innerHTML = `
    <div class="chat-message-content typing-indicator">
      <span></span><span></span><span></span>
    </div>
  `;
  messagesEl.appendChild(indicator);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

/**
 * Hide typing indicator
 */
function hideTypingIndicator() {
  const indicator = document.getElementById('typing-indicator');
  if (indicator) indicator.remove();
}

/**
 * Handle chat input keypress
 */
function handleChatKeypress(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    sendChatMessage();
  }
}

/**
 * Send chat message from input
 */
function sendChatMessage() {
  const input = document.getElementById('chat-input');
  if (!input || !input.value.trim()) return;
  
  const message = input.value.trim();
  input.value = '';
  
  // Clear action buttons
  const actionsEl = document.getElementById('chat-actions');
  if (actionsEl) actionsEl.innerHTML = '';
  
  ChatManager.sendMessage(message)
    .catch((error) => {
      console.error('Failed to send message:', error);
      addMessageToUI('assistant', 'Desculpe, ocorreu um erro. Tente novamente.');
    });
}

/**
 * Handle chat action button click
 */
function handleChatAction(action) {
  // Clear action buttons
  const actionsEl = document.getElementById('chat-actions');
  if (actionsEl) actionsEl.innerHTML = '';
  
  ChatManager.sendAction(action)
    .catch((error) => {
      console.error('Failed to send action:', error);
    });
}

/**
 * Add minimal chat styles (can be overridden by CSS file)
 */
function addChatStyles() {
  if (document.getElementById('chat-styles')) return;
  
  const styles = document.createElement('style');
  styles.id = 'chat-styles';
  styles.textContent = `
    .chat-modal {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 9999;
    }
    .chat-modal.show {
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .chat-modal-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.5);
    }
    .chat-modal-content {
      position: relative;
      width: 90%;
      max-width: 500px;
      max-height: 80vh;
      background: white;
      border-radius: 16px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    .chat-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    .chat-header h3 {
      margin: 0;
      font-size: 1rem;
    }
    .chat-status {
      font-size: 0.75rem;
      opacity: 0.8;
    }
    .chat-close-btn {
      background: none;
      border: none;
      color: white;
      cursor: pointer;
      padding: 4px;
    }
    .chat-vehicle-context {
      padding: 12px 16px;
      background: #f8f9fa;
      border-bottom: 1px solid #eee;
    }
    .chat-vehicle-card {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.9rem;
    }
    .chat-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      min-height: 300px;
      max-height: 400px;
    }
    .chat-message {
      max-width: 85%;
    }
    .chat-message-user {
      align-self: flex-end;
    }
    .chat-message-assistant {
      align-self: flex-start;
    }
    .chat-message-content {
      padding: 12px 16px;
      border-radius: 16px;
      font-size: 0.9rem;
      line-height: 1.5;
    }
    .chat-message-user .chat-message-content {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-bottom-right-radius: 4px;
    }
    .chat-message-assistant .chat-message-content {
      background: #f1f3f4;
      color: #333;
      border-bottom-left-radius: 4px;
    }
    .chat-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      padding: 0 16px 12px;
    }
    .chat-action-btn {
      padding: 8px 16px;
      border: 1px solid #667eea;
      background: white;
      color: #667eea;
      border-radius: 20px;
      font-size: 0.85rem;
      cursor: pointer;
      transition: all 0.2s;
    }
    .chat-action-btn:hover {
      background: #667eea;
      color: white;
    }
    .chat-input-area {
      display: flex;
      gap: 8px;
      padding: 16px;
      border-top: 1px solid #eee;
    }
    #chat-input {
      flex: 1;
      padding: 12px 16px;
      border: 1px solid #ddd;
      border-radius: 24px;
      font-size: 0.9rem;
      outline: none;
    }
    #chat-input:focus {
      border-color: #667eea;
    }
    .chat-send-btn {
      width: 44px;
      height: 44px;
      border: none;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .chat-send-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .typing-indicator {
      display: flex;
      gap: 4px;
      padding: 16px !important;
    }
    .typing-indicator span {
      width: 8px;
      height: 8px;
      background: #999;
      border-radius: 50%;
      animation: typing 1.4s infinite ease-in-out;
    }
    .typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
    .typing-indicator span:nth-child(3) { animation-delay: 0.4s; }
    @keyframes typing {
      0%, 60%, 100% { transform: translateY(0); }
      30% { transform: translateY(-8px); }
    }
  `;
  document.head.appendChild(styles);
}
