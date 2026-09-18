import { catalogOptions, catalogValuation } from './catalog-client.js';
import { button, element, input, select, status, errorMessage, node } from './dom.js';
import { referenceCard } from './reference-view.js';

/** @typedef {import('./contracts.js').CatalogOption} CatalogOption */
/** @typedef {import('./contracts.js').SavedReference} SavedReference */
/** @type {CatalogOption[]} */
let models = [];
let revision = 0;
/** @type {SavedReference|null} */
let currentReference = null;
/** @type {() => number|null} */
let readBudget = () => null;
/** @type {(reference: SavedReference) => void} */
let saveReference = () => {};

/** @param {string} id @param {CatalogOption[]} options @param {string} placeholder @returns {void} */
function populate(id, options, placeholder) {
  const target = select(id);
  target.replaceChildren(
    new Option(placeholder, ''),
    ...options.map((option) => new Option(option.name, option.code)),
  );
  target.disabled = !options.length;
}

/** @param {string} message @returns {void} */
function loading(message) {
  status('catalog-status', message);
  button('catalog-retry').hidden = true;
}

/** @param {unknown} error @returns {void} */
function failure(error) {
  status('catalog-status', errorMessage(error), true);
  button('catalog-retry').hidden = false;
}

/** @returns {Promise<void>} */
async function loadBrands() {
  loading('Carregando marcas do catálogo…');
  try {
    const result = await catalogOptions('brands');
    populate('catalog-brand', result.items, 'Escolha uma marca');
    status(
      'catalog-status',
      result.items.length
        ? 'Escolha uma marca para ver os modelos.'
        : 'O catálogo não retornou marcas. Tente novamente mais tarde.',
    );
  } catch (error) {
    failure(error);
  }
}

/** @returns {void} */
function resetModel() {
  models = [];
  input('model-filter').value = '';
  input('model-filter').disabled = true;
  populate('catalog-model', [], 'Escolha uma marca primeiro');
  resetYear();
}

/** @returns {void} */
function resetYear() {
  populate('catalog-year', [], 'Escolha um modelo primeiro');
  button('valuation-submit').disabled = true;
  clearReference();
}

/** @returns {void} */
function clearReference() {
  currentReference = null;
  element('reference-result').setAttribute('aria-busy', 'false');
  element('reference-result').replaceChildren(
    node(
      'div',
      'reference-empty',
      'Sua seleção mudou. Escolha o modelo e ano e consulte a referência atual.',
    ),
  );
}

/** @returns {Promise<void>} */
async function loadModels() {
  const request = ++revision;
  resetModel();
  if (!select('catalog-brand').value) return;
  loading('Buscando modelos e versões…');
  try {
    const result = await catalogOptions('models', { brandId: select('catalog-brand').value });
    if (request !== revision) return;
    models = result.items;
    populate('catalog-model', models, 'Escolha o modelo e a versão');
    input('model-filter').disabled = !models.length;
    status(
      'catalog-status',
      `${models.length} versões no catálogo. A lista não representa estoque.`,
    );
  } catch (error) {
    if (request === revision) failure(error);
  }
}

/** @returns {Promise<void>} */
async function loadYears() {
  const request = ++revision;
  resetYear();
  if (!select('catalog-model').value) return;
  loading('Buscando anos e combustíveis…');
  try {
    const result = await catalogOptions('years', {
      brandId: select('catalog-brand').value,
      modelId: select('catalog-model').value,
    });
    if (request !== revision) return;
    populate('catalog-year', result.items, 'Escolha o ano e combustível');
    status(
      'catalog-status',
      result.items.length
        ? 'Escolha o ano para consultar a referência.'
        : 'Nenhum ano disponível para essa versão. Escolha outra.',
    );
  } catch (error) {
    if (request === revision) failure(error);
  }
}

/** @returns {Promise<void>} */
async function loadReference() {
  const request = ++revision;
  const selection = {
    brandId: select('catalog-brand').value,
    modelId: select('catalog-model').value,
    yearId: select('catalog-year').value,
  };
  element('reference-result').setAttribute('aria-busy', 'true');
  element('reference-result').replaceChildren(
    node('div', 'loading-reference', 'Consultando a referência e o mês de vigência…'),
  );
  button('valuation-submit').disabled = true;
  try {
    const valuation = await catalogValuation(selection);
    if (request !== revision) return;
    currentReference = { selection, valuation };
    refreshReference();
    status('catalog-status', 'Referência consultada. Compare o modelo antes de decidir.');
  } catch (error) {
    if (request === revision) showReferenceError(error);
  } finally {
    if (request === revision) finishReference();
  }
}

/** @returns {void} */
function finishReference() {
  element('reference-result').setAttribute('aria-busy', 'false');
  button('valuation-submit').disabled = !select('catalog-year').value;
}

/** @param {unknown} error @returns {void} */
function showReferenceError(error) {
  failure(error);
  element('reference-result').replaceChildren(
    node('h3', '', 'A referência não carregou.'),
    node(
      'p',
      'reference-meta',
      'Nenhum valor foi estimado. Você pode tentar novamente ou escolher outro ano.',
    ),
  );
}

/** @returns {void} */
export function refreshReference() {
  if (!currentReference) return;
  const reference = currentReference;
  element('reference-result').replaceChildren(
    referenceCard(reference.valuation, readBudget(), () => saveReference(reference)),
  );
}

/** @param {string} brandId @returns {Promise<void>} */
export async function chooseBrand(brandId) {
  select('catalog-brand').value = brandId;
  if (!select('catalog-brand').value) return;
  await loadModels();
  element('catalog').scrollIntoView({ block: 'start' });
  select('catalog-model').focus({ preventScroll: true });
}

/** @returns {void} */
function filterModels() {
  ++revision;
  resetYear();
  const query = input('model-filter').value.toLocaleLowerCase('pt-BR');
  const matches = models.filter((model) => model.name.toLocaleLowerCase('pt-BR').includes(query));
  populate(
    'catalog-model',
    matches,
    matches.length ? 'Escolha o modelo e a versão' : 'Nenhum modelo com esse nome',
  );
}

/** @param {() => number|null} budget @param {(reference: SavedReference) => void} onSave @returns {void} */
export function initializeCatalog(budget, onSave) {
  readBudget = budget;
  saveReference = onSave;
  select('catalog-brand').addEventListener('change', loadModels);
  select('catalog-model').addEventListener('change', loadYears);
  select('catalog-year').addEventListener('change', () => {
    ++revision;
    clearReference();
    button('valuation-submit').disabled = !select('catalog-year').value;
  });
  input('model-filter').addEventListener('input', filterModels);
  element('catalog-form').addEventListener('submit', (event) => {
    event.preventDefault();
    void loadReference();
  });
  button('catalog-retry').addEventListener('click', () => {
    if (select('catalog-year').value) void loadReference();
    else if (select('catalog-model').value) void loadYears();
    else if (select('catalog-brand').value) void loadModels();
    else void loadBrands();
  });
  void loadBrands();
}
