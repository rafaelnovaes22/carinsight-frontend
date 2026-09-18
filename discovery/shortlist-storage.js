/** @typedef {import('./contracts.js').SavedReference} SavedReference */
/** @typedef {import('./contracts.js').CatalogSelection} CatalogSelection */
const STORAGE_KEY = 'carinsight_decision_shortlist';

/** @param {CatalogSelection} selection @returns {string} */
export function referenceKey(selection) {
  return `${selection.brandId}:${selection.modelId}:${selection.yearId}`;
}

/** @param {unknown} selection @returns {selection is CatalogSelection} */
export function validSelection(selection) {
  if (!selection || typeof selection !== 'object') return false;
  const candidate = /** @type {CatalogSelection} */ (selection);
  return (
    /^\d{1,10}$/.test(candidate.brandId) &&
    /^\d{1,10}$/.test(candidate.modelId) &&
    /^\d{1,5}-\d{1,2}$/.test(candidate.yearId)
  );
}

/** @returns {SavedReference[]} */
export function restoreShortlist() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item) =>
          validSelection(item?.selection) &&
          item?.valuation?.kind === 'reference_valuation' &&
          Number.isFinite(item.valuation.price) &&
          item.valuation.price > 0 &&
          item.valuation.source?.name,
      )
      .slice(0, 3);
  } catch {
    return [];
  }
}

/** @param {SavedReference[]} references @returns {boolean} */
export function persistShortlist(references) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(references));
    return true;
  } catch {
    return false;
  }
}

/** @param {string} serialized @returns {CatalogSelection[]} */
export function sharedSelections(serialized) {
  if (!serialized || serialized.length > 200) return [];
  const candidates = serialized
    .split(',')
    .slice(0, 3)
    .map((item) => {
      const [brandId, modelId, yearId] = item.split(':');
      return { brandId, modelId, yearId };
    });
  return candidates.filter(validSelection);
}
