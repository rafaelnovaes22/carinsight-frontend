/**
 * CarInsight Vehicle Details Page
 * Lê ?id= da URL, busca o veículo no backend e preenche a página.
 * Sem id (ou com API fora), mantém o conteúdo estático e o chat geral.
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

  function monthlyEstimate(price) {
    // Estimativa simples: 20% de entrada, 48x, mesma taxa default do backend
    const rate = 0.0179;
    const months = 48;
    const financed = price * 0.8;
    const payment =
      (financed * rate * Math.pow(1 + rate, months)) /
      (Math.pow(1 + rate, months) - 1);
    return formatPrice(Math.round(payment));
  }

  function setText(selector, text) {
    const el = document.querySelector(selector);
    if (el && text) el.textContent = text;
  }

  function fillSpecs(vehicle) {
    const grid = document.querySelector('.specs-list-grid');
    if (!grid) return;

    const specs = vehicle.technicalSpecs || {};
    const rows = [
      ['Quilometragem', vehicle.mileage ? `${vehicle.mileage.toLocaleString('pt-BR')} km` : null],
      ['Ano', `${vehicle.yearFab || vehicle.yearModel}/${vehicle.yearModel}`],
      ['Carroceria', vehicle.bodyType],
      ['Motor', specs.engine],
      ['Transmissão', specs.transmission],
      ['Combustível', specs.fuel || specs.fuelType],
      ['Potência', specs.power],
      ['Condição', vehicle.condition === 'NEW' ? 'Novo' : 'Seminovo'],
    ].filter(([, value]) => value);

    grid.innerHTML = rows
      .map(
        ([label, value]) =>
          `<div class="spec-row-detail"><span class="label">${label}</span><span class="value">${value}</span></div>`,
      )
      .join('');
  }

  function fillFeatures(vehicle) {
    const chips = document.querySelector('.features-chips');
    if (!chips) return;
    const features = (vehicle.features || []).concat(vehicle.aiTags || []);
    if (features.length === 0) return;

    chips.innerHTML = features
      .slice(0, 10)
      .map(
        (f) =>
          `<div class="feature-chip-active"><i data-lucide="check"></i> ${f}</div>`,
      )
      .join('');
  }

  function fillGallery(vehicle) {
    const media = (vehicle.media || []).filter((m) => m.type === 'IMAGE' || !m.type);
    if (media.length === 0) return;

    const mainImg = document.querySelector('.main-image img');
    if (mainImg) mainImg.src = media[0].url;

    const sideImgs = document.querySelectorAll('.side-images img');
    sideImgs.forEach((img, i) => {
      if (media[i + 1]) img.src = media[i + 1].url;
    });

    const modalImgs = document.querySelectorAll('.modal-grid img');
    modalImgs.forEach((img, i) => {
      if (media[i]) img.src = media[i].url;
    });

    const galleryTitle = document.querySelector('.modal-header h3');
    if (galleryTitle) galleryTitle.textContent = `Galeria de Fotos (${media.length})`;
  }

  function fillBadges(vehicle) {
    const badges = document.querySelector('.vehicle-badges');
    if (!badges) return;
    const tags = (vehicle.aiTags || []).slice(0, 3);
    if (tags.length === 0) {
      badges.innerHTML = '<span class="badge-detail badge-premium">CarInsight</span>';
      return;
    }
    badges.innerHTML = tags
      .map((t, i) =>
        i === 0
          ? `<span class="badge-detail badge-premium">${t}</span>`
          : `<span class="badge-detail">${t}</span>`,
      )
      .join('');
  }

  function fillVehicle(vehicle) {
    document.title = `${vehicle.make} ${vehicle.model} ${vehicle.yearModel} | CarInsight`;

    setText(
      '.vehicle-header h1',
      `${vehicle.yearModel} ${vehicle.make} ${vehicle.model}${vehicle.version ? ' ' + vehicle.version : ''}`,
    );
    setText('.price-tag-large', formatPrice(vehicle.price));
    setText(
      '.monthly-estimate',
      `Ou em parcelas de ${monthlyEstimate(Number(vehicle.price))} /mês`,
    );

    // Descrição: usa o título do anúncio (backend não tem campo de descrição)
    const description = document.querySelector('.info-card p');
    if (description && vehicle.title) description.textContent = vehicle.title;

    // Localização mockada não se aplica: mostra só o nome do lojista
    const location = document.querySelector('.vehicle-header p');
    if (location) location.remove();

    if (vehicle.dealer?.name) {
      setText('.dealer-name', vehicle.dealer.name);
    }

    fillSpecs(vehicle);
    fillFeatures(vehicle);
    fillGallery(vehicle);
    fillBadges(vehicle);

    if (window.lucide) lucide.createIcons();
  }

  function wireSellerButton(vehicleId) {
    const btn = document.querySelector('.btn-card-action-whats');
    if (!btn) return;
    btn.setAttribute('href', '#');
    btn.addEventListener('click', (event) => {
      event.preventDefault();
      openChat(vehicleId || null);
    });
  }

  async function init() {
    const params = new URLSearchParams(window.location.search);
    const vehicleId = params.get('id');

    window.currentVehicleId = vehicleId || null;
    wireSellerButton(vehicleId);

    if (!vehicleId || !window.CarInsightAPI) return;

    try {
      const vehicle = await CarInsightAPI.getVehicle(vehicleId);
      if (vehicle && vehicle.id) {
        fillVehicle(vehicle);
        // Registro de visualização (lead tracking) - não bloqueia
        if (CarInsightAPI.viewVehicle) {
          CarInsightAPI.viewVehicle(vehicleId).catch(() => {});
        }
      }
    } catch (error) {
      console.warn('Detalhes: veículo não encontrado ou API indisponível', error);
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();

console.log('🚗 DetailsPage loaded');
