/**
 * CarInsight Home Page
 * - Form de busca do hero envia para buscando-carro.html?q=<texto>
 * - Prateleiras "Carros disponíveis" e "Sugestões" carregadas do backend
 * - Sem dados, ou com a API fora, a prateleira fica escondida: não há carro de exemplo
 */

(function () {
  function formatPrice(price) {
    const num = typeof price === 'string' ? parseFloat(price) : price;
    if (!num || isNaN(num)) return 'Consulte';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    }).format(num);
  }

  function vehicleCard(vehicle, tag) {
    const specs = vehicle.technicalSpecs || {};
    const transmission = specs.transmission || (vehicle.aiTags || []).find((t) => /autom|manual/i.test(t)) || '';
    const km = vehicle.mileage ? `${Math.round(vehicle.mileage / 1000)}k km` : '';
    const VI = window.VehicleImages;
    const img = VI
      ? VI.resolve(vehicle)
      : (vehicle.media && vehicle.media[0] && vehicle.media[0].url) || 'assets/sem-foto.svg';
    const imgSafe = VI
      ? VI.curatedFor(vehicle.make, vehicle.model) || VI.GENERIC_FALLBACK
      : 'assets/sem-foto.svg';

    return `
      <div class="car-card">
        <div class="car-image">
          ${tag ? `<span class="car-tag">${tag}</span>` : ''}
           <img src="${img}" alt="${vehicle.make} ${vehicle.model}" loading="lazy"
                onerror="this.onerror=null;this.src='${imgSafe}'">
        </div>
        <div class="car-info">
          <div class="car-price">${formatPrice(vehicle.price)}</div>
          <div class="car-name">${vehicle.make} ${vehicle.model}${vehicle.version ? ' ' + vehicle.version : ''}</div>
          <div class="car-specs">
            <div class="spec-item"><i data-lucide="calendar"></i> ${vehicle.yearModel || ''}</div>
            ${km ? `<div class="spec-item"><i data-lucide="gauge"></i> ${km}</div>` : ''}
            <div class="spec-item"><i data-lucide="car"></i> ${vehicle.bodyType || ''}</div>
            ${transmission ? `<div class="spec-item"><i data-lucide="settings"></i> ${transmission}</div>` : ''}
          </div>
          ${window.VehicleActions ? VehicleActions.html(vehicle.id) : ''}
          <a href="detalhes-carro.html?id=${encodeURIComponent(vehicle.id)}" class="btn-card-action">Saiba mais</a>
        </div>
      </div>
    `;
  }

  function fillShelf(trackId, vehicles, tags) {
    const track = document.getElementById(trackId);
    if (!track || !vehicles || vehicles.length === 0) return false;
    track.innerHTML = vehicles
      .map((v, i) => vehicleCard(v, tags && tags[i]))
      .join('');
    if (window.lucide) lucide.createIcons();
    const secao = track.closest('section');
    if (secao) {
      secao.hidden = false;
      // As prateleiras nascem vazias: o carrossel só pode ser montado agora.
      if (window.initSliders) window.initSliders(secao);
    }
    return true;
  }

  function setupFilterButtons() {
    const input = document.querySelector('#search-form-id input[type="text"]');
    const texto = () => (input ? input.value.trim() : '');
    const irParaResultados = (filtro) => {
      const busca = FiltrosBusca.paraUrl({ ...FiltrosBusca.vazio(), q: texto(), ...filtro });
      window.location.href = `buscando-carro.html${busca ? `?${busca}` : ''}`;
    };

    // As janelas de filtro fecham com uma animação curta antes de sair da página.
    document.addEventListener('carinsight:filtro-home', (event) => {
      setTimeout(() => irParaResultados(event.detail), 350);
    });

    // Mais Opções leva aos filtros completos da página de resultados.
    const maisOpcoes = document.querySelector('.filter-btn.btn-plus');
    if (maisOpcoes) maisOpcoes.addEventListener('click', () => irParaResultados({}));
  }

  function setupSearchForm() {
    const form = document.getElementById('search-form-id');
    if (!form) return;
    const input = form.querySelector('input[type="text"]');

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const q = input && input.value.trim();
      window.location.href = q
        ? `buscando-carro.html?q=${encodeURIComponent(q)}`
        : 'buscando-carro.html';
    });

    // O ícone-lupa também respeita o texto digitado
    const iconLink = form.querySelector('.search-icon-link');
    if (iconLink) {
      iconLink.addEventListener('click', (event) => {
        event.preventDefault();
        form.dispatchEvent(new Event('submit', { cancelable: true }));
      });
    }
  }

  /** Cards estáticos sem ?id= levariam a um detalhe mock; redireciona para a busca */
  async function loadShelves() {
    if (!window.CarInsightAPI) return;

    try {
      const response = await CarInsightAPI.getVehicles({ limit: 100 });
      const vehicles = response.data || response;
      if (Array.isArray(vehicles) && vehicles.length > 0) {
        fillShelf('slider-bestsellers', vehicles);
      }
    } catch (error) {
      console.warn('Home: não foi possível carregar veículos', error);
    }

    try {
      const response = await CarInsightAPI.search('econômico versátil dia a dia', { limit: 8 });
      const results = response.data || response.results || response;
      if (Array.isArray(results) && results.length > 0) {
        fillShelf('slider-suggestions', results.slice(0, 8));
      }
    } catch (error) {
      console.warn('Home: busca de sugestões indisponível', error);
    }
  }

  function updateFavoritesCount() {
    if (!window.FavoritesManager) return;

    const count = FavoritesManager.getCount();
    const savedLink = document.querySelector('.sidebar-links a[href="meus-salvos.html"]');

    if (savedLink && count > 0) {
      let badge = savedLink.querySelector('.favorites-badge');
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'favorites-badge';
        badge.style.cssText = 'background:#667eea;color:white;padding:2px 8px;border-radius:12px;font-size:0.75rem;margin-left:8px;';
        savedLink.appendChild(badge);
      }
      badge.textContent = count;
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    setupSearchForm();
    setupFilterButtons();
    loadShelves();
    updateFavoritesCount();
    window.addEventListener('authChange', updateFavoritesCount);
  });
})();

console.log('🏠 HomePage loaded');
