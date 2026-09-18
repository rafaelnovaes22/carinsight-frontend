/**
 * CarInsight Vehicle Details Page
 * Lê ?id= da URL, busca o veículo no backend e preenche a página.
 * Uma consulta ausente ou indisponível nunca é substituída por um anúncio de exemplo.
 */

/**
 * @typedef {{id: string, make?: string, model?: string, version?: string,
 * yearModel?: number, yearFab?: number, price?: number|string, mileage?: number,
 * bodyType?: string, condition?: string, title?: string, features?: string[],
 * technicalSpecs?: Record<string, unknown>, media?: {type?: string, url: string}[],
 * dealer?: {name?: string}}} VehicleDetails
 */

(function () {
  /** @param {string} selector @param {unknown} text @returns {void} */
  function setText(selector, text) {
    const element = document.querySelector(selector);
    if (element) element.textContent = String(text ?? 'Não informado');
  }

  /** @param {string} tag @param {string} className @param {unknown} text @returns {HTMLElement} */
  function textElement(tag, className, text) {
    const element = document.createElement(tag);
    element.className = className;
    element.textContent = String(text ?? 'Não informado');
    return element;
  }

  /** @param {string} selector @param {boolean} hidden @returns {void} */
  function setHidden(selector, hidden) {
    const element = document.querySelector(selector);
    if (element instanceof HTMLElement) element.hidden = hidden;
  }

  /** @param {unknown} price @returns {string} */
  function formatPrice(price) {
    const amount = Number(price);
    if (!Number.isFinite(amount) || amount <= 0) return 'Preço não informado';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount);
  }

  /** @param {VehicleDetails} vehicle @returns {[string, unknown][]} */
  function specificationRows(vehicle) {
    const specs = vehicle.technicalSpecs || {};
    return [
      [
        'Quilometragem',
        typeof vehicle.mileage === 'number' && Number.isFinite(vehicle.mileage)
          ? `${vehicle.mileage.toLocaleString('pt-BR')} km`
          : null,
      ],
      ['Ano de fabricação', vehicle.yearFab],
      ['Ano do modelo', vehicle.yearModel],
      ['Carroceria', vehicle.bodyType],
      ['Motor', specs.engine],
      ['Transmissão', specs.transmission],
      ['Combustível', specs.fuel || specs.fuelType],
      ['Potência', specs.power],
      [
        'Condição',
        vehicle.condition === 'NEW' ? 'Novo' : vehicle.condition === 'USED' ? 'Usado' : null,
      ],
    ];
  }

  /** @param {VehicleDetails} vehicle @returns {void} */
  function fillSpecs(vehicle) {
    const grid = document.querySelector('.specs-list-grid');
    if (!grid) return;
    grid.replaceChildren();
    for (const [label, value] of specificationRows(vehicle)) {
      const row = textElement('div', 'spec-row-detail', '');
      row.append(textElement('span', 'label', label), textElement('span', 'value', value));
      grid.append(row);
    }
  }

  /** @param {VehicleDetails} vehicle @returns {void} */
  function fillFeatures(vehicle) {
    const chips = document.querySelector('.features-chips');
    if (!chips) return;
    const features = Array.isArray(vehicle.features) ? vehicle.features : [];
    chips.replaceChildren();
    if (!features.length) chips.append(textElement('p', '', 'Itens não informados.'));
    features
      .slice(0, 20)
      .forEach((feature) => chips.append(textElement('div', 'feature-chip-active', feature)));
  }

  /** @param {unknown} candidate @returns {string|null} */
  function safePhotoUrl(candidate) {
    if (typeof candidate !== 'string') return null;
    try {
      const url = new URL(candidate, window.location.origin);
      if (url.username || url.password) return null;
      return url.protocol === 'https:' || url.origin === window.location.origin ? url.href : null;
    } catch {
      return null;
    }
  }

  /** @param {string} url @param {string} title @returns {HTMLImageElement} */
  function vehicleImage(url, title) {
    const image = document.createElement('img');
    image.src = url;
    image.alt = `Foto informada para ${title}`;
    image.className = 'vehicle-photo';
    image.loading = 'lazy';
    return image;
  }

  /** @param {VehicleDetails} vehicle @returns {void} */
  function fillGallery(vehicle) {
    const gallery = document.getElementById('vehicle-gallery');
    if (!gallery) return;
    gallery.replaceChildren();
    const media = Array.isArray(vehicle.media) ? vehicle.media : [];
    const photos = media.filter((item) => item.type === 'IMAGE' || !item.type).slice(0, 20);
    for (const photo of photos) {
      const url = safePhotoUrl(photo.url);
      if (url)
        gallery.append(vehicleImage(url, `${vehicle.make || ''} ${vehicle.model || ''}`.trim()));
    }
    if (!gallery.childElementCount) gallery.append(textElement('p', '', 'Fotos não informadas.'));
    gallery.hidden = false;
  }

  /** @param {VehicleDetails} vehicle @returns {void} */
  function fillVehicle(vehicle) {
    const title = [vehicle.make, vehicle.model, vehicle.version, vehicle.yearModel]
      .filter(Boolean)
      .join(' ');
    document.title = `${title} | CarInsight`;
    setText('.vehicle-header h1', title);
    setText('.price-tag-large', formatPrice(vehicle.price));
    // Descrição: usa o título do anúncio (backend não tem campo de descrição).
    setText('#vehicle-description', vehicle.title || 'Descrição não informada.');
    // Localização mockada não se aplica: mostra só o nome do lojista.
    setText('.dealer-name', vehicle.dealer?.name || 'Anunciante não informado');
    fillSpecs(vehicle);
    fillFeatures(vehicle);
    fillGallery(vehicle);
    setHidden('#detail-status', true);
    setHidden('#vehicle-details', false);
    wireConversation(vehicle.id);
  }

  /** @param {string} vehicleId @returns {void} */
  function wireConversation(vehicleId) {
    const button = document.querySelector('.btn-card-action-whats');
    button?.addEventListener('click', () => window.openChat(vehicleId));
  }

  /** @param {boolean} missingId @returns {void} */
  function showUnavailable(missingId) {
    setText(
      '#detail-status-title',
      missingId ? 'Escolha um veículo para consultar' : 'Veículo indisponível',
    );
    setText(
      '#detail-status-copy',
      'Não há informações confirmadas para este link. Você pode explorar modelos e referências no catálogo.',
    );
    setHidden('#vehicle-details', true);
    setHidden('#vehicle-gallery', true);
  }

  /** @returns {Promise<void>} */
  async function init() {
    const vehicleId = new URLSearchParams(window.location.search).get('id');
    if (!vehicleId || !window.CarInsightAPI) return showUnavailable(true);
    try {
      const vehicle = await window.CarInsightAPI.getVehicle(encodeURIComponent(vehicleId));
      if (!vehicle || vehicle.id !== vehicleId) return showUnavailable(false);
      fillVehicle(vehicle);
      // Registro de visualização (lead tracking) não bloqueia a leitura.
      window.CarInsightAPI.viewVehicle?.(vehicleId).catch(() => {});
    } catch {
      showUnavailable(false);
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
