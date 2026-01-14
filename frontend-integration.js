/**
 * CarInsight Frontend Integration Script
 * Connects to the NestJS Backend API
 */

// Configuração da API: Tenta usar variável global (injetada em prod) ou fallback para localhost
const API_URL = window.API_URL || 'http://localhost:3000';
console.log('🚀 Frontend Integration Script carregado!');
console.log('API URL:', API_URL);

document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM Loaded - Iniciando fetch de veículos...');
    fetchVehicles();
});

async function fetchVehicles() {
    console.log('🔄 Fazendo fetch para:', `${API_URL}/vehicles`);
    try {
        const response = await fetch(`${API_URL}/vehicles`);
        console.log('📡 Resposta recebida:', response.status);

        if (!response.ok) throw new Error('Falha ao buscar veículos');

        const vehicles = await response.json();
        console.log('✅ Veículos carregados:', vehicles.length);
        renderVehicles(vehicles);
    } catch (error) {
        console.error('❌ Erro na integração:', error);
        // Fallback or error message could be shown here
    }
}

function renderVehicles(vehicles) {
    const grid = document.querySelector('.cars-grid');
    if (!grid) return;

    // Clear existing static cards (mockups)
    grid.innerHTML = '';

    // Update count
    const countEl = document.querySelector('.results-count');
    if (countEl) countEl.textContent = `Encontramos ${vehicles.length} veículos para você`;

    vehicles.forEach(vehicle => {
        const card = createCarCard(vehicle);
        grid.appendChild(card);
    });

    // Re-initialize icons
    if (window.lucide) lucide.createIcons();
}

function createCarCard(vehicle) {
    const card = document.createElement('div');
    card.className = 'car-card';

    // Format currency
    const priceFormatted = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(vehicle.price);

    // Format mileage
    const kmFormatted = new Intl.NumberFormat('pt-BR').format(vehicle.mileage) + ' km';

    // Condition logic
    const isNew = vehicle.condition === 'NEW';
    const conditionText = isNew ? 'Novo' : 'Seminovo';

    // Image logic (placeholder if empty)
    const imageUrl = vehicle.media && vehicle.media.length > 0 ? vehicle.media[0].url : 'assets/car1.png'; // Fallback to asset

    // Dealer logic
    const dealerName = vehicle.dealer?.name || 'Vendedor Particular';
    const dealerLoc = 'São Paulo, SP'; // Mock location if missing in backend

    // AI Tags / Badges
    let badgeHtml = '';
    if (vehicle.aiTags && vehicle.aiTags.includes('Bom Negócio')) {
        badgeHtml = `
            <div class="deal-badge-purple">
                <i data-lucide="arrow-down"></i> Bom Negócio
            </div>
        `;
    }

    card.innerHTML = `
        <div class="card-main-content">
            <div class="car-image">
                <span class="match-tag" style="position:absolute; top:12px; left:12px; z-index:2; padding:4px 8px; background:rgba(0,0,0,0.7); color:white; border-radius:4px; font-weight:700; font-size:0.75rem;">1/1</span>
                <img src="${imageUrl}" alt="${vehicle.title}" onerror="this.src='assets/car1.png'">
            </div>
            <div class="car-info">
                <div class="info-top">
                    <div class="info-header">
                        <span class="condition-badge">${conditionText}</span>
                        <button class="save-btn" onclick="toggleSave(this)"><i data-lucide="heart"></i> Salvar</button>
                    </div>
                    <h2 class="car-name">${vehicle.title}</h2>
                    <div class="mileage-text">${kmFormatted}</div>
                    <div class="car-price">${priceFormatted}</div>
                    ${badgeHtml}
                </div>

                <div class="dealer-section">
                    <div class="dealer-details">
                        <h4>${dealerName}</h4>
                        <div class="dealer-location">${dealerLoc}</div>
                    </div>
                </div>
                <button class="btn-check-availability"><i data-lucide="message-circle"></i> Conversar com vendedor</button>
            </div>
        </div>
        <div class="card-details-toggle" onclick="toggleDetails(this)">
            <span class="toggle-text">Mostrar detalhes</span> <i data-lucide="chevron-down"></i>
        </div>
        <div class="card-details-expanded">
            <div class="details-grid-section">
                <h3>Informações do Veículo</h3>
                <div class="specs-grid">
                    <div class="spec-row"><span class="spec-label">Modelo:</span> <span class="spec-value">${vehicle.model}</span></div>
                    <div class="spec-row"><span class="spec-label">Versão:</span> <span class="spec-value">${vehicle.version}</span></div>
                    <div class="spec-row"><span class="spec-label">Ano:</span> <span class="spec-value">${vehicle.yearFab}/${vehicle.yearModel}</span></div>
                    <div class="spec-row"><span class="spec-label">Carroceria:</span> <span class="spec-value">${vehicle.bodyType}</span></div>
                </div>
            </div>
            <div class="details-grid-section">
                <h3>Recursos</h3>
                <div class="features-list">
                    <div class="feature-group">
                        <span>${vehicle.features ? vehicle.features.join(', ') : 'N/A'}</span>
                    </div>
                </div>
            </div>
        </div>
    `;

    return card;
}
