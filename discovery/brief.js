import { resolveApiOrigin } from '../api-origin.mjs';
import { chooseBrand, refreshReference } from './catalog.js';
import { money, optionalNumber } from './decision-math.js';
import { button, element, errorMessage, input, node, select } from './dom.js';

/** @typedef {{profile: {budgetMax?: number}, summary: string, followUpQuestions: string[], interpretation: 'rules'|'llm', suggestedBrands: {code:string,name:string}[], modelSearchTerms: string[], limitations: string[]}} DecisionBrief */
/** @type {() => void} */
let notifyBudget = () => {};

/** @returns {number|null} */
export function readBudget() {
  return optionalNumber(input('brief-budget').value);
}

/** @param {string} message @returns {Promise<DecisionBrief>} */
async function requestBrief(message) {
  const configured =
    document.querySelector('meta[name="carinsight-api-origin"]')?.getAttribute('content') || '';
  const origin = resolveApiOrigin(location.hostname, configured);
  const naturalLanguage = `${message}\nUso: ${select('brief-usage').value || 'a definir'}. Região: ${input('brief-city').value || 'não informada'}.`;
  const budgetMax = readBudget() ?? undefined;
  const response = await fetch(`${origin}/decision/brief`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ naturalLanguage, constraints: { budgetMax } }),
    signal: AbortSignal.timeout(25000),
  });
  if (!response.ok)
    throw new Error(
      `Não foi possível montar o plano (HTTP ${response.status}). O catálogo continua disponível.`,
    );
  const result = /** @type {DecisionBrief} */ (await response.json());
  if (typeof result.summary !== 'string' || !['rules', 'llm'].includes(result.interpretation))
    throw new Error('Recebemos um plano incompleto. Você pode continuar pelo catálogo.');
  return result;
}

/** @param {DecisionBrief} result @param {boolean} mayFillBudget @returns {void} */
function renderBrief(result, mayFillBudget) {
  const target = element('brief-response');
  const heading =
    result.interpretation === 'llm'
      ? 'Seu plano, com apoio de IA.'
      : 'Seu plano, pelos seus critérios.';
  target.replaceChildren(
    node('p', 'eyebrow', 'O que vamos colocar na balança'),
    node('h3', '', heading),
    node('p', '', result.summary),
  );
  const interpretedBudget = result.profile?.budgetMax;
  if (
    mayFillBudget &&
    typeof interpretedBudget === 'number' &&
    Number.isFinite(interpretedBudget) &&
    interpretedBudget > 0
  )
    input('brief-budget').value = String(interpretedBudget);
  if (readBudget() !== null)
    target.append(
      node('p', '', `Limite de compra: ${money(readBudget())}. Você pode editar o valor acima.`),
    );
  const questions = node('ul');
  for (const question of (result.followUpQuestions || []).slice(0, 3))
    questions.append(node('li', '', question));
  target.append(questions, brandSuggestions(result.suggestedBrands || []));
  if (result.modelSearchTerms?.length)
    target.append(
      node(
        'p',
        'source-note',
        `Termos para explorar no catálogo: ${result.modelSearchTerms.join(', ')}. Não representam modelos validados ou disponíveis.`,
      ),
    );
  for (const limitation of (result.limitations || []).slice(0, 3))
    target.append(node('p', 'source-note', limitation));
  const explore = node('a', '', 'Explorar modelos com esse contexto →');
  explore.href = '#catalog';
  target.append(explore);
  notifyBudget();
  refreshReference();
}

/** @param {{code:string,name:string}[]} brands @returns {HTMLElement} */
function brandSuggestions(brands) {
  const group = node('div', 'prompt-chips');
  for (const brand of brands.slice(0, 5)) {
    const action = node('button', '', `Explorar ${brand.name}`);
    action.type = 'button';
    action.addEventListener('click', () => {
      void chooseBrand(brand.code);
    });
    group.append(action);
  }
  return group;
}

/** @returns {Promise<void>} */
async function submitBrief() {
  const message = /** @type {HTMLTextAreaElement} */ (element('brief-message')).value.trim();
  if (!message) return;
  const target = element('brief-response');
  target.hidden = false;
  target.textContent = 'Organizando suas prioridades…';
  button('brief-submit').disabled = true;
  const submittedBudget = input('brief-budget').value;
  try {
    const result = await requestBrief(message);
    renderBrief(result, !submittedBudget && input('brief-budget').value === submittedBudget);
    saveBrief();
  } catch (error) {
    target.replaceChildren(
      node('h3', '', 'Você ainda pode explorar os modelos.'),
      node('p', '', errorMessage(error)),
    );
  } finally {
    button('brief-submit').disabled = false;
  }
}

/** @returns {void} */
function saveBrief() {
  const brief = {
    message: /** @type {HTMLTextAreaElement} */ (element('brief-message')).value,
    budget: input('brief-budget').value,
    city: input('brief-city').value,
    usage: select('brief-usage').value,
  };
  try {
    localStorage.setItem('carinsight_decision_brief', JSON.stringify(brief));
  } catch {
    element('brief-response').append(
      node('p', 'source-note', 'Este navegador não permitiu salvar o plano localmente.'),
    );
  }
}

/** @returns {void} */
function restoreBrief() {
  try {
    const stored = JSON.parse(localStorage.getItem('carinsight_decision_brief') || 'null');
    if (!stored || typeof stored.message !== 'string') return;
    /** @type {HTMLTextAreaElement} */ (element('brief-message')).value = stored.message.slice(
      0,
      1500,
    );
    input('brief-budget').value = typeof stored.budget === 'string' ? stored.budget : '';
    input('brief-city').value = typeof stored.city === 'string' ? stored.city.slice(0, 100) : '';
    select('brief-usage').value = typeof stored.usage === 'string' ? stored.usage : '';
  } catch {
    /* Corrupt local state must not prevent a new decision. */
  }
}

/** @param {() => void} onBudgetChange @returns {void} */
export function initializeBrief(onBudgetChange) {
  notifyBudget = onBudgetChange;
  restoreBrief();
  element('brief-form').addEventListener('submit', (event) => {
    event.preventDefault();
    void submitBrief();
  });
  input('brief-budget').addEventListener('input', () => {
    notifyBudget();
    refreshReference();
  });
  document.querySelectorAll('button[data-prompt]').forEach((action) =>
    action.addEventListener('click', () => {
      const message = /** @type {HTMLTextAreaElement} */ (element('brief-message'));
      message.value = action.getAttribute('data-prompt') || '';
      message.focus();
    }),
  );
}
