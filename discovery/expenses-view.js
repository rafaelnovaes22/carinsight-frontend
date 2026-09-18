import { element, input, node } from './dom.js';
import { money, monthlyExpenses, optionalNumber } from './decision-math.js';
import { referenceKey } from './shortlist-storage.js';

/** @typedef {import('./contracts.js').SavedReference} SavedReference */
/** @typedef {{efficiency: string, insurance: string, tax: string, maintenance: string}} Assumptions */
/** @type {Map<string, Assumptions>} */
const assumptions = new Map();
/** @type {SavedReference[]} */
let currentReferences = [];

/** @param {string} key @returns {Assumptions} */
function valuesFor(key) {
  if (!assumptions.has(key))
    assumptions.set(key, { efficiency: '', insurance: '', tax: '', maintenance: '' });
  return /** @type {Assumptions} */ (assumptions.get(key));
}

/** @param {string} key @param {keyof Assumptions} field @param {string} title @param {string} placeholder @returns {HTMLLabelElement} */
function expenseField(key, field, title, placeholder) {
  const label = node('label', '', title);
  const control = node('input');
  control.type = 'number';
  control.min = '0';
  control.step = '0.01';
  control.inputMode = 'decimal';
  control.placeholder = placeholder;
  control.value = valuesFor(key)[field];
  control.name = field;
  control.addEventListener('input', () => {
    valuesFor(key)[field] = control.value;
    refreshExpense(key);
  });
  label.append(control);
  return label;
}

/** @param {SavedReference} reference @returns {HTMLElement} */
function costCard(reference) {
  const key = referenceKey(reference.selection);
  const card = node('article', 'cost-card');
  card.dataset.reference = key;
  card.append(node('h3', '', reference.valuation.model));
  const electric = /el[eé]tric/i.test(reference.valuation.fuel);
  if (electric)
    card.append(
      node('p', 'source-note', 'Modelo elétrico: esta conta por litro não estima recarga.'),
    );
  else card.append(expenseField(key, 'efficiency', 'Consumo informado (km/l)', 'Ex.: 12'));
  const annual = node('details');
  annual.append(node('summary', '', 'Adicionar despesas anuais'));
  annual.append(
    expenseField(key, 'insurance', 'Seguro por ano (R$)', 'Não informado'),
    expenseField(key, 'tax', 'IPVA por ano (R$)', 'Não informado'),
    expenseField(key, 'maintenance', 'Manutenção por ano (R$)', 'Não informado'),
  );
  const total = node('output');
  total.id = `expense-total-${key}`;
  const omissions = node('p', 'source-note');
  omissions.id = `expense-missing-${key}`;
  card.append(
    annual,
    total,
    node('p', 'source-note', 'Subtotal mensal das despesas informadas'),
    omissions,
  );
  return card;
}

/** @param {string} key @returns {ReturnType<typeof monthlyExpenses>} */
export function expenseEstimate(key) {
  const values = valuesFor(key);
  const reference = currentReferences.find((item) => referenceKey(item.selection) === key);
  const electric = /el[eé]tric/i.test(reference?.valuation.fuel || '');
  return monthlyExpenses({
    distance: optionalNumber(input('monthly-distance').value),
    fuelPrice: optionalNumber(input('fuel-price').value),
    efficiency: electric ? null : optionalNumber(values.efficiency),
    insurance: optionalNumber(values.insurance),
    tax: optionalNumber(values.tax),
    maintenance: optionalNumber(values.maintenance),
  });
}

/** @param {string} key @returns {void} */
function refreshExpense(key) {
  const result = expenseEstimate(key);
  element(`expense-total-${key}`).textContent =
    result.subtotal === null ? 'A preencher' : `${money(result.subtotal)}/mês`;
  element(`expense-missing-${key}`).textContent = result.missing.length
    ? `Ainda falta: ${result.missing.join('; ')}.`
    : 'Todos os campos desta conta foram preenchidos. Outros gastos permanecem fora da estimativa.';
}

/** @param {SavedReference[]} references @returns {void} */
export function renderExpenses(references) {
  currentReferences = references;
  element('expenses-section').hidden = !references.length;
  element('cost-comparison').replaceChildren(...references.map(costCard));
  for (const reference of references) refreshExpense(referenceKey(reference.selection));
}

/** @returns {void} */
export function initializeExpenses() {
  for (const id of ['monthly-distance', 'fuel-price'])
    input(id).addEventListener('input', () => {
      for (const reference of currentReferences) refreshExpense(referenceKey(reference.selection));
    });
}
