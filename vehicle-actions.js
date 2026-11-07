/**
 * Botões Salvar e Comparar do carro, usados nos cards e na página do carro.
 * Salvar e comparar ficam no próprio navegador, em favorites.js e compare.js.
 */
(function () {
  var ESTILO = '.vehicle-actions{display:flex;gap:8px;margin:10px 0 6px}' +
    '.btn-acao{flex:1;padding:8px 10px;border-radius:8px;border:1px solid var(--accent-primary,#0a5bd3);' +
    'background:#fff;color:var(--accent-primary,#0a5bd3);font-weight:600;font-size:.85rem;cursor:pointer}' +
    '.btn-acao.ativo{background:var(--accent-primary,#0a5bd3);color:#fff}';

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

  function rotulos(id) {
    return {
      salvar: salvo(id) ? 'Salvo' : 'Salvar',
      comparar: naComparacao(id) ? 'Na comparação' : 'Comparar',
      salvarAtivo: salvo(id),
      compararAtivo: naComparacao(id),
    };
  }

  function iconeSalvar(ativo) {
    return '<i data-lucide="heart"' + (ativo ? ' style="fill:currentColor"' : '') + '></i> ';
  }

  function criarIcones() {
    if (window.lucide && lucide.createIcons) lucide.createIcons();
  }

  function html(id) {
    garantirEstilo();
    var r = rotulos(id);
    return '<div class="vehicle-actions" data-vehicle-id="' + escapar(id) + '">' +
      '<button type="button" class="btn-acao' + (r.salvarAtivo ? ' ativo' : '') + '" data-acao="salvar">' + iconeSalvar(r.salvarAtivo) + r.salvar + '</button>' +
      '<button type="button" class="btn-acao' + (r.compararAtivo ? ' ativo' : '') + '" data-acao="comparar">' + r.comparar + '</button>' +
      '</div>';
  }

  function atualizar(id) {
    var r = rotulos(id);
    document.querySelectorAll('.vehicle-actions[data-vehicle-id]').forEach(function (bloco) {
      if (bloco.getAttribute('data-vehicle-id') !== id) return;
      var s = bloco.querySelector('[data-acao="salvar"]');
      var c = bloco.querySelector('[data-acao="comparar"]');
      if (s) { s.innerHTML = iconeSalvar(r.salvarAtivo) + r.salvar; s.classList.toggle('ativo', r.salvarAtivo); }
      if (c) { c.textContent = r.comparar; c.classList.toggle('ativo', r.compararAtivo); }
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
      var resultado = CompareManager.toggle(id);
      if (!resultado.inCompare && /Máximo/.test(resultado.message || '')) {
        window.alert(resultado.message);
      }
    }
    atualizar(id);
    criarIcones();
  });

  window.VehicleActions = { html: html, criarIcones: criarIcones };
})();
