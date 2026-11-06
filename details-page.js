/**
 * CarInsight Vehicle Details Page
 * Lê ?id= da URL, busca o veículo no backend e preenche a página.
 * Sem id, leva ao catálogo. Carro vendido, inexistente ou API fora vira aviso:
 * a página não tem conteúdo de exemplo para mostrar.
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
  }  function setText(selector, text) {
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
    if (features.length === 0) {
      chips.closest('.info-card')?.remove();
      return;
    }

    chips.innerHTML = features
      .map(
        (f) =>
          `<div class="feature-chip-active"><i data-lucide="check"></i> ${f}</div>`,
      )
      .join('');
  }

  function fillGallery(vehicle) {
    const media = (vehicle.media || []).filter((m) => m.type === 'IMAGE' || !m.type);
    const urls = media
      .map((m) => m.url)
      .filter((u) => u && !/via\.placeholder\.com|placehold\.co|placeholder/i.test(u));
    window.galleryImages = urls;

    const galleryTitle = document.querySelector('.modal-header h3');
    if (galleryTitle) galleryTitle.textContent = `Galeria de Fotos (${urls.length})`;
    if (urls.length === 0) return;

    const arm = (img, url) => {
      img.onerror = () => {
        img.onerror = null;
        img.src = 'assets/sem-foto.svg';
      };
      img.src = url;
    };

    const mainImg = document.querySelector('.main-image img');
    if (mainImg) arm(mainImg, urls[0]);

    const sideImg = document.querySelector('.side-images > img');
    if (sideImg && urls[1]) {
      arm(sideImg, urls[1]);
      sideImg.hidden = false;
    }

    const more = document.querySelector('.more-images-container');
    if (more && urls[2]) {
      arm(more.querySelector('img'), urls[2]);
      const restantes = urls.length - 3;
      const contagem = more.querySelector('.more-count');
      if (contagem) contagem.textContent = restantes > 1 ? `+${restantes} fotos` : 'Ver fotos';
      more.hidden = false;
    }

    const grid = document.querySelector('.modal-grid');
    if (grid) {
      grid.innerHTML = urls
        .map(
          (_, i) =>
            `<div class="modal-img-wrapper${i === 0 ? ' full-width' : ''}" onclick="openLightbox(${i})"><img alt="Foto ${i + 1} do veículo"></div>`,
        )
        .join('');
      grid.querySelectorAll('img').forEach((img, i) => arm(img, urls[i]));
    }
  }

  function fillVideo(vehicle) {
    const video = (vehicle.media || []).find((m) => m.type === 'VIDEO' && m.url);
    const primeiro = document.querySelector('.detail-main .info-card');
    if (!video || !primeiro) return;
    const card = document.createElement('div');
    card.className = 'info-card';
    card.innerHTML = '<h3><i data-lucide="video"></i> Vídeo</h3>';
    const player = document.createElement('video');
    player.controls = true;
    player.preload = 'metadata';
    player.playsInline = true;
    player.src = video.url;
    player.style.cssText = 'display: block; width: 100%; max-height: 520px; background: #000; border-radius: 12px;';
    card.appendChild(player);
    primeiro.parentNode.insertBefore(card, primeiro);
  }

  function fillBadges(vehicle) {
    const badges = document.querySelector('.vehicle-badges');
    if (!badges) return;
    const tags = (vehicle.aiTags || []).slice(0, 3);
    if (tags.length === 0) {
      badges.innerHTML = '';
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
    fillVideo(vehicle);
    fillBadges(vehicle);

    if (window.lucide) lucide.createIcons();
  }

  function showUnavailable() {
    document.title = 'Veículo indisponível | CarInsight';
    document.querySelector('.gallery-container')?.remove();
    const layout = document.querySelector('.detail-layout');
    if (layout) {
      layout.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px;">
          <h1 style="margin-bottom: 12px;">Este veículo não está mais disponível</h1>
          <p style="margin-bottom: 24px;">Veja os outros carros do estoque.</p>
          <a href="veiculos.html" class="btn-card-action" style="display: inline-block;">Ver estoque</a>
        </div>`;
    }
  }

  // WhatsApp da vendedora final: o clique abre a conversa direto, com o carro na mensagem.
  const WHATSAPP_VENDEDOR = '5511949105033';

  function wireSellerButton(vehicle) {
    const btn = document.querySelector('.btn-card-action-whats');
    if (!btn || !vehicle) return;
    const nome = [vehicle.make, vehicle.model, vehicle.version, vehicle.yearModel]
      .filter(Boolean)
      .join(' ');
    const texto = `Olá! Vi o ${nome} no site CarInsight e quero mais informações.`;
    btn.setAttribute('href', `https://wa.me/${WHATSAPP_VENDEDOR}?text=${encodeURIComponent(texto)}`);
    btn.setAttribute('target', '_blank');
    btn.setAttribute('rel', 'noopener');
  }

  async function init() {
    const params = new URLSearchParams(window.location.search);
    const vehicleId = params.get('id');

    window.currentVehicleId = vehicleId || null;

    if (!vehicleId) {
      window.location.replace('veiculos.html');
      return;
    }
    if (!window.CarInsightAPI) {
      showUnavailable();
      return;
    }

    try {
      const vehicle = await CarInsightAPI.getVehicle(vehicleId);
      if (!vehicle || !vehicle.id || (vehicle.status && vehicle.status !== 'AVAILABLE')) {
        showUnavailable();
        return;
      }
      {
        fillVehicle(vehicle);
        wireSellerButton(vehicle);
        var acoesCarro = document.querySelector('.btn-card-action-whats');
        if (acoesCarro && window.VehicleActions && !document.querySelector('.vehicle-actions')) {
          acoesCarro.insertAdjacentHTML('afterend', VehicleActions.html(vehicle.id));
        }
        // Registro de visualização (lead tracking) - não bloqueia
        if (CarInsightAPI.viewVehicle) {
          CarInsightAPI.viewVehicle(vehicleId).catch(() => {});
        }
      }
    } catch (error) {
      console.warn('Detalhes: veículo não encontrado ou API indisponível', error);
      showUnavailable();
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();

console.log('🚗 DetailsPage loaded');
