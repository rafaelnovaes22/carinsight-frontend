/**
 * CarInsight Vehicle Images
 * Fotos de referência por modelo (Wikimedia Commons, licença livre, URLs verificadas 200).
 * PORQUÊ: 6 veículos do seed nasceram com via.placeholder.com (fora do ar) e os links do
 * lojista podem morrer. Este mapa garante foto real do modelo em vez do genérico car1.png.
 *
 * Fontes (crédito aos autores no Commons):
 * - File:2009_Chevrolet_Corsa_1.8_GL_sedan.jpg
 * - File:Chevrolet_Spin_Activ_2017.jpg
 * - File:Harley-Davidson_V-Rod_black_DSCF0397.jpg
 * - File:Honda_Jazz_(first_generation)_(front),_Serdang.jpg (mesma geração GD do Fit 2008 BR)
 * - File:Hyundai_i30_GLS_2012.jpg
 * - File:Renault-Sandero-2013.jpg
 */

(function () {
  var CURATED_IMAGES = {
    'CHEVROLET|CORSA 1.8':
      'https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d7/2009_Chevrolet_Corsa_1.8_GL_sedan.jpg/960px-2009_Chevrolet_Corsa_1.8_GL_sedan.jpg',
    'CHEVROLET|SPIN 1.8':
      'https://thumb.wikimedia.org/wikipedia/commons/thumb/3/36/Chevrolet_Spin_Activ_2017.jpg/960px-Chevrolet_Spin_Activ_2017.jpg',
    'HARLEY-DAVIDSON|V-ROD':
      'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a5/Harley-Davidson_V-Rod_black_DSCF0397.jpg/960px-Harley-Davidson_V-Rod_black_DSCF0397.jpg',
    'HONDA|FIT 1.4':
      'https://thumb.wikimedia.org/wikipedia/commons/thumb/6/6f/Honda_Jazz_%28first_generation%29_%28front%29%2C_Serdang.jpg/960px-Honda_Jazz_%28first_generation%29_%28front%29%2C_Serdang.jpg',
    'HYUNDAI|I30 2.0':
      'https://thumb.wikimedia.org/wikipedia/commons/thumb/2/27/Hyundai_i30_GLS_2012.jpg/960px-Hyundai_i30_GLS_2012.jpg',
    'RENAULT|SANDERO 1.0':
      'https://thumb.wikimedia.org/wikipedia/commons/thumb/4/4f/Renault-Sandero-2013.jpg/960px-Renault-Sandero-2013.jpg',
  };

  var GENERIC_FALLBACK = 'assets/car1.png';
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
