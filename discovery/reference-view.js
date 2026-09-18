import { node, safeLink } from './dom.js';
import { budgetReason, money } from './decision-math.js';

/** @typedef {import('./contracts.js').Valuation} Valuation */

/** @param {string} title @param {string} text @returns {HTMLElement} */
export function explanation(title, text) {
  const section = node('div', 'reference-reason');
  section.append(node('h4', '', title), node('p', '', text));
  return section;
}

/** @param {Valuation} valuation @returns {HTMLElement} */
function sourceDetails(valuation) {
  const source = node('div', 'reference-source');
  const retrieved = new Date(valuation.retrievedAt);
  const date = Number.isNaN(retrieved.getTime())
    ? 'Data indisponível'
    : retrieved.toLocaleDateString('pt-BR');
  const link = node('a', '', valuation.source.name);
  const safe = safeLink(valuation.source.url);
  if (safe) {
    link.href = safe;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
  }
  source.append(link, node('p', '', `Consultado em ${date} · Código FIPE ${valuation.codeFipe}`));
  return source;
}

/** @param {Valuation} valuation @param {number|null} budget @returns {HTMLElement} */
export function referenceContent(valuation, budget) {
  const content = node('div');
  const year = valuation.modelYear === 32000 ? 'Zero km (referência)' : String(valuation.modelYear);
  content.append(
    node('p', 'eyebrow', 'Referência de modelo'),
    node('h3', '', `${valuation.brand} ${valuation.model}`),
  );
  content.append(node('p', 'reference-meta', `${year} · ${valuation.fuel}`));
  content.append(
    node('p', 'reference-price', money(valuation.price)),
    node('p', 'reference-period', `FIPE · ${valuation.referenceMonth}`),
  );
  content.append(explanation('Em relação ao seu orçamento', budgetReason(valuation.price, budget)));
  content.append(
    explanation(
      'O que falta confirmar',
      'Consumo, segurança, espaço e custos da versão. Estado, histórico e preço de um carro específico.',
    ),
  );
  content.append(sourceDetails(valuation));
  content.append(
    node(
      'p',
      'source-note',
      'Referência média de preço. Não é anúncio, disponibilidade ou garantia do valor de compra.',
    ),
  );
  return content;
}

/** @param {Valuation} valuation @param {number|null} budget @param {() => void} onSave @returns {HTMLElement} */
export function referenceCard(valuation, budget, onSave) {
  const content = referenceContent(valuation, budget);
  const save = node('button', 'primary-button', 'Adicionar à comparação');
  save.type = 'button';
  save.addEventListener('click', onSave);
  content.append(save);
  return content;
}
