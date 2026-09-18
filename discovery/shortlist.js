import { catalogValuation } from './catalog-client.js';
import { button, element, input, node, status } from './dom.js';
import { money } from './decision-math.js';
import { expenseEstimate, initializeExpenses, renderExpenses } from './expenses-view.js';
import { referenceContent } from './reference-view.js';
import {
  persistShortlist,
  referenceKey,
  restoreShortlist,
  sharedSelections,
} from './shortlist-storage.js';

/** @typedef {import('./contracts.js').SavedReference} SavedReference */
/** @type {SavedReference[]} */
let references = [];
/** @type {() => number|null} */
let readBudget = () => null;

/** @param {SavedReference} reference @returns {HTMLElement} */
function shortlistCard(reference) {
  const card = node('article', 'shortlist-card');
  card.append(referenceContent(reference.valuation, readBudget()));
  const remove = node('button', 'text-button remove-reference', 'Remover da comparação');
  remove.type = 'button';
  remove.setAttribute('aria-label', `Remover ${reference.valuation.model} da comparação`);
  remove.addEventListener('click', () => removeReference(referenceKey(reference.selection)));
  card.append(remove);
  return card;
}

/** @returns {HTMLElement} */
function emptyShortlist() {
  const empty = node('div', 'shortlist-empty');
  const link = node('a', '', 'Explorar modelos');
  link.href = '#catalog';
  empty.append(node('p', '', 'Sua primeira escolha começa com uma referência.'), link);
  return empty;
}

/** @returns {void} */
export function refreshShortlist() {
  element('shortlist-grid').replaceChildren(
    ...(references.length ? references.map(shortlistCard) : [emptyShortlist()]),
  );
  element('shortlist-count').textContent = String(references.length);
  element('comparison-description').textContent = references.length
    ? `${references.length} de 3 referências selecionadas. Valores de referência, sem oferta de venda.`
    : 'Adicione até 3 referências do catálogo para começar.';
  button('share-shortlist').disabled = !references.length;
  button('export-shortlist').disabled = !references.length;
  renderExpenses(references);
}

/** @param {SavedReference} reference @returns {void} */
export function addReference(reference) {
  const key = referenceKey(reference.selection);
  const existing = references.findIndex((item) => referenceKey(item.selection) === key);
  if (existing < 0 && references.length >= 3) {
    status(
      'catalog-status',
      'Você já escolheu 3 referências. Remova uma na comparação para incluir outra.',
      true,
    );
    return;
  }
  if (existing >= 0) references[existing] = reference;
  else references.push(reference);
  const saved = persistShortlist(references);
  refreshShortlist();
  status(
    'catalog-status',
    `${reference.valuation.model} na comparação. ${saved ? 'Sua seleção ficou salva neste navegador.' : 'O navegador não permitiu salvar para depois.'}`,
  );
  status('shortlist-status', 'Compare as referências e preencha as despesas do seu cenário.');
}

/** @param {string} key @returns {void} */
function removeReference(key) {
  references = references.filter((item) => referenceKey(item.selection) !== key);
  persistShortlist(references);
  refreshShortlist();
  status('shortlist-status', 'Referência removida. Você pode adicionar outra opção.');
}

/** @returns {Promise<void>} */
async function shareShortlist() {
  const url = new URL(location.href);
  url.search = '';
  url.hash = 'comparison';
  url.searchParams.set('compare', references.map((item) => referenceKey(item.selection)).join(','));
  element('share-link-wrapper').hidden = false;
  input('share-link').value = url.href;
  try {
    await navigator.clipboard.writeText(url.href);
    status(
      'shortlist-status',
      'Link copiado. Ele compartilha apenas os modelos, sem seu orçamento ou texto pessoal.',
    );
  } catch {
    input('share-link').focus();
    input('share-link').select();
    status(
      'shortlist-status',
      'Selecione e copie o link abaixo. Apenas os modelos são compartilhados.',
    );
  }
}

/** @param {SavedReference} reference @returns {string} */
function exportedReference(reference) {
  const valuation = reference.valuation;
  const expenses = expenseEstimate(referenceKey(reference.selection));
  return [
    `${valuation.brand} ${valuation.model} (${valuation.modelYear})`,
    `Referência FIPE: ${money(valuation.price)} | ${valuation.referenceMonth}`,
    `Fonte: ${valuation.source.name} | ${valuation.source.url}`,
    `Consulta: ${valuation.retrievedAt}`,
    `Subtotal mensal informado: ${money(expenses.subtotal)}`,
    `Dados não informados: ${expenses.missing.join('; ') || 'nenhum campo desta conta'}`,
    'Confirmar consumo, segurança, estado e histórico. Referência não é anúncio.',
  ].join('\n');
}

/** @returns {void} */
function exportShortlist() {
  const report = `CarInsight | Minha comparação\n\n${references.map(exportedReference).join('\n\n')}\n\nDespesas parciais: não incluem depreciação, financiamento ou outros custos fora dos campos informados.`;
  const url = URL.createObjectURL(new Blob([report], { type: 'text/plain;charset=utf-8' }));
  const link = node('a');
  link.href = url;
  link.download = 'minha-comparacao-carinsight.txt';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  status('shortlist-status', 'Resumo baixado. Nenhum envio externo foi feito.');
}

/** @returns {Promise<void>} */
async function restoreShared() {
  const selections = sharedSelections(new URLSearchParams(location.search).get('compare') || '');
  if (!selections.length) return;
  status('shortlist-status', 'Consultando as referências do link compartilhado…');
  const results = await Promise.allSettled(
    selections.map(async (selection) => ({
      selection,
      valuation: await catalogValuation(selection),
    })),
  );
  references = results.flatMap((result) => (result.status === 'fulfilled' ? [result.value] : []));
  if (references.length) persistShortlist(references);
  refreshShortlist();
  status(
    'shortlist-status',
    references.length === selections.length
      ? 'Referências do link atualizadas com a fonte. Seus dados pessoais não vieram no link.'
      : `${references.length} de ${selections.length} referências carregadas. Tente abrir o link novamente para consultar as restantes.`,
    references.length !== selections.length,
  );
}

/** @param {() => number|null} budget @returns {void} */
export function initializeShortlist(budget) {
  readBudget = budget;
  references = restoreShortlist();
  initializeExpenses();
  refreshShortlist();
  button('share-shortlist').addEventListener('click', () => {
    void shareShortlist();
  });
  button('export-shortlist').addEventListener('click', exportShortlist);
  void restoreShared();
}
