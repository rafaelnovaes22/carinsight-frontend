/**
 * Botões Salvar e Comparar do carro, usados nos cards e na página do carro.
 * Salvar é um coração que fica preenchido quando o carro está salvo.
 * Salvar e comparar ficam no próprio navegador, em favorites.js e compare.js.
 */
(function () {
  var ESTILO = '.vehicle-actions{display:flex;gap:8px;margin:10px 0 6px;align-items:center}' +
    '.btn-acao{flex:1;padding:8px 10px;border-radius:8px;border:1px solid var(--accent-primary,#0a5bd3);' +
    'background:#fff;color:var(--accent-primary,#0a5bd3);font-weight:600;font-size:.85rem;cursor:pointer}' +
    '.btn-acao.ativo{background:var(--accent-primary,#0a5bd3);color:#fff}' +
    '.btn-coracao{flex:0 0 auto;width:42px;height:38px;padding:0;display:inline-flex;align-items:center;justify-content:center}' +
    '.btn-coracao.ativo{background:#fff;color:#e11d48;border-color:#e11d48}';

  function garantirEstilo() {
    if (document.getElementById('vehicle-actions-style')) return;
    var style = document.createElement('style');
    style.id = 'vehicle-actions-style';
    style.textContent = ESTILO;
    document.head.appendChild(style);
  }

  function escapar(valor) {
    return String(valor).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function salvo(id) {
    return !!(window.FavoritesManager && FavoritesManager.isFavorite(id));
  }

  function naComparacao(id) {
    return !!(window.CompareManager && CompareManager.isInCompare(id));
  }

  function criarIcones() {
    if (window.lucide && lucide.createIcons) lucide.createIcons();
  }

  function conteudoCoracao(ativo) {
    return '<i data-lucide="heart"' + (ativo ? ' style="fill:currentColor"' : '') + '></i>';
  }

  function rotuloCoracao(ativo) {
    return ativo ? 'Remover dos salvos' : 'Salvar carro';
  }

  function html(id) {
    garantirEstilo();
    var salvoAgora = salvo(id);
    var comparadoAgora = naComparacao(id);
    return '<div class="vehicle-actions" data-vehicle-id="' + escapar(id) + '">' +
      '<button type="button" class="btn-acao btn-coracao' + (salvoAgora ? ' ativo' : '') + '" data-acao="salvar"' +
      ' aria-label="' + rotuloCoracao(salvoAgora) + '" title="' + rotuloCoracao(salvoAgora) + '">' +
      conteudoCoracao(salvoAgora) + '</button>' +
      '<button type="button" class="btn-acao' + (comparadoAgora ? ' ativo' : '') + '" data-acao="comparar">' +
      (comparadoAgora ? 'Na comparação' : 'Comparar') + '</button>' +
      '</div>';
  }

  function atualizar(id) {
    var salvoAgora = salvo(id);
    var comparadoAgora = naComparacao(id);
    document.querySelectorAll('.vehicle-actions[data-vehicle-id]').forEach(function (bloco) {
      if (bloco.getAttribute('data-vehicle-id') !== id) return;
      var s = bloco.querySelector('[data-acao="salvar"]');
      var c = bloco.querySelector('[data-acao="comparar"]');
      if (s) {
        s.innerHTML = conteudoCoracao(salvoAgora);
        s.classList.toggle('ativo', salvoAgora);
        s.setAttribute('aria-label', rotuloCoracao(salvoAgora));
        s.setAttribute('title', rotuloCoracao(salvoAgora));
      }
      if (c) {
        c.textContent = comparadoAgora ? 'Na comparação' : 'Comparar';
        c.classList.toggle('ativo', comparadoAgora);
      }
    });
  }

  document.addEventListener('click', function (event) {
    var botao = event.target.closest && event.target.closest('.btn-acao[data-acao]');
    if (!botao) return;
    var bloco = botao.closest('.vehicle-actions[data-vehicle-id]');
    if (!bloco) return;
    var id = bloco.getAttribute('data-vehicle-id');
    event.preventDefault();
    if (botao.getAttribute('data-acao') === 'salvar' && window.FavoritesManager) {
      FavoritesManager.toggle(id);
    }
    if (botao.getAttribute('data-acao') === 'comparar' && window.CompareManager) {
      var jaComparando = naComparacao(id);
      if (!jaComparando && CompareManager.getCompareList().length >= CompareManager.MAX_VEHICLES) {
        window.alert('Máximo de ' + CompareManager.MAX_VEHICLES + ' veículos para comparar. Tire um da comparação para escolher outro.');
      } else {
        // Comparar exige o carro salvo: salva antes, se ainda não estiver salvo.
        if (!jaComparando && window.FavoritesManager && !salvo(id)) {
          FavoritesManager.add(id);
        }
        CompareManager.toggle(id);
      }
    }
    atualizar(id);
    criarIcones();
  });

  window.VehicleActions = { html: html, criarIcones: criarIcones };
})();
