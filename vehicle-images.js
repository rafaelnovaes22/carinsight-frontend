/**
 * CarInsight Vehicle Images
 * Usa só as fotos do próprio carro. Foto de referência do modelo parece o carro à venda, mas
 * não é: sem foto do carro, a imagem é neutra e diz que a foto está indisponível.
 */

(function () {
  var CURATED_IMAGES = {};

  var GENERIC_FALLBACK = 'assets/sem-foto.svg';
  var DEAD_PATTERNS = /via\.placeholder\.com|placehold\.co|placeholder/i;

  function norm(value) {
    return (value || '').toString().trim().toUpperCase();
  }

  function curatedFor(make, model) {
    return CURATED_IMAGES[norm(make) + '|' + norm(model)] || null;
  }

  function primaryUrl(vehicle) {
    if (!vehicle) return null;
    var media = vehicle.media || [];
    for (var i = 0; i < media.length; i++) {
      var url = media[i] && media[i].url;
      if (url && !DEAD_PATTERNS.test(url)) return url;
    }
    return null;
  }

  /**
   * Resolve a melhor imagem do veículo: foto real da API, depois foto curada
   * do modelo, depois o genérico local. Nunca retorna placeholder morto.
   */
  function resolveVehicleImage(vehicle) {
    var primary = primaryUrl(vehicle);
    if (primary) return primary;
    var curated = vehicle && curatedFor(vehicle.make, vehicle.model);
    return curated || GENERIC_FALLBACK;
  }

  /**
   * Handler de onerror para <img>: tenta a foto curada antes do genérico,
   * sem loop (marca data-vimg-fallback).
   */
  function handleVehicleImageError(img, vehicle) {
    if (!img || img.dataset.vimgFallback) {
      if (img) img.src = GENERIC_FALLBACK;
      return;
    }
    img.dataset.vimgFallback = '1';
    var curated = vehicle && curatedFor(vehicle.make, vehicle.model);
    img.src = curated && img.src !== curated ? curated : GENERIC_FALLBACK;
  }

  window.VehicleImages = {
    resolve: resolveVehicleImage,
    handleError: handleVehicleImageError,
    curatedFor: curatedFor,
    GENERIC_FALLBACK: GENERIC_FALLBACK,
  };
})();
