/**
 * CarInsight Catalog Page
 * Lista o estoque real do backend em veiculos.html e filtra por categoria.
 * Se a API estiver fora, avisa: não há carro de exemplo para cair de volta.
 */

(function () {
  const LIMITE = 100;
  let categoriaAtual = 'all';

  function escapar(valor) {
    return String(valor ?? '').replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
    );
  }

  function formatarPreco(preco) {
    const numero = Number(preco);
    if (!numero) return 'Consulte';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    }).format(numero);
  }

  function categoriaDe(veiculo) {
    return (veiculo.bodyType || '').toString().trim().toLowerCase();
  }

  function card(veiculo) {
    const VI = window.VehicleImages;
    const foto = VI ? VI.resolve(veiculo) : veiculo.media?.[0]?.url || 'assets/sem-foto.svg';
    const specs = veiculo.technicalSpecs || {};
    const itens = [
      ['calendar', veiculo.yearModel],
      ['gauge', veiculo.mileage ? `${Math.round(veiculo.mileage / 1000)}k km` : null],
      ['fuel', specs.fuel || specs.fuelType],
      ['settings', specs.transmission],
    ].filter(([, valor]) => valor);
    const nome = [veiculo.make, veiculo.model, veiculo.version].filter(Boolean).join(' ');

    return `
      <div class="car-card" data-category="${escapar(categoriaDe(veiculo))}">
        <div class="car-image">
          <img src="${escapar(foto)}" alt="${escapar(nome)}" loading="lazy"
               onerror="this.onerror=null;this.src='assets/sem-foto.svg'">
        </div>
        <div class="car-info">
          <div class="car-price">${formatarPreco(veiculo.price)}</div>
          <div class="car-name">${escapar(nome)}</div>
          <div class="car-specs">
            ${itens
              .map(([icone, valor]) => `<div class="spec-item"><i data-lucide="${icone}"></i> ${escapar(valor)}</div>`)
              .join('')}
          </div>
          <a href="detalhes-carro.html?id=${encodeURIComponent(veiculo.id)}" class="btn-card-action">Saiba mais</a>
        </div>
      </div>`;
  }

  function aviso(grade, titulo, texto) {
    grade.innerHTML = `
      <div class="no-results" style="grid-column: 1/-1; text-align: center; padding: 60px 20px;">
        <h3 style="margin-bottom: 8px;">${titulo}</h3>
        <p style="color: var(--text-secondary);">${texto}</p>
      </div>`;
  }

  function aplicarFiltro(categoria) {
    categoriaAtual = categoria;
    const cards = document.querySelectorAll('#car-grid .car-card');
    let visiveis = 0;
    cards.forEach((c) => {
      const mostra = categoria === 'all' || c.dataset.category === categoria;
      c.classList.toggle('hidden', !mostra);
      if (mostra) visiveis++;
    });
    document.getElementById('sem-resultado')?.remove();
    if (cards.length > 0 && visiveis === 0) {
      const vazio = document.createElement('p');
      vazio.id = 'sem-resultado';
      vazio.style.cssText = 'grid-column: 1/-1; text-align: center; padding: 40px 20px;';
      vazio.textContent = 'Nenhum veículo nesta categoria agora.';
      document.getElementById('car-grid').appendChild(vazio);
    }
  }

  window.filterCategory = function (categoria, aba) {
    document.querySelectorAll('.filter-tab').forEach((t) => t.classList.remove('active'));
    aba.classList.add('active');
    aplicarFiltro(categoria);
  };

  function categoriaDaUrl() {
    const pedida = new URLSearchParams(window.location.search).get('categoria');
    if (!pedida) return;
    const aba = document.querySelector(`.filter-tab[data-categoria="${CSS.escape(pedida)}"]`);
    if (aba) window.filterCategory(pedida, aba);
  }

  async function carregar() {
    const grade = document.getElementById('car-grid');
    if (!grade) return;
    try {
      const resposta = await CarInsightAPI.getVehicles({ limit: LIMITE });
      const veiculos = (resposta.data || resposta || []).filter(
        (v) => !v.status || v.status === 'AVAILABLE',
      );
      if (veiculos.length === 0) {
        aviso(grade, 'Nenhum veículo disponível agora', 'Volte em breve para ver o estoque.');
        return;
      }
      grade.innerHTML = veiculos.map(card).join('');
      if (window.lucide) lucide.createIcons();
      aplicarFiltro(categoriaAtual);
      categoriaDaUrl();
    } catch (erro) {
      console.warn('Catálogo: API indisponível', erro);
      aviso(grade, 'Não foi possível carregar os veículos', 'Tente de novo em instantes.');
    }
  }

  document.addEventListener('DOMContentLoaded', carregar);
})();
