import { resolveApiOrigin } from '../api-origin.mjs';

/** @typedef {import('./contracts.js').CatalogList} CatalogList */
/** @typedef {import('./contracts.js').Valuation} Valuation */
/** @typedef {import('./contracts.js').CatalogSelection} CatalogSelection */

/** @param {string} path @param {Record<string, string>} query @returns {Promise<unknown>} */
async function requestCatalog(path, query) {
  const configured =
    document.querySelector('meta[name="carinsight-api-origin"]')?.getAttribute('content') || '';
  const origin = resolveApiOrigin(location.hostname, configured);
  const response = await fetch(`${origin}/catalog/${path}?${new URLSearchParams(query)}`, {
    signal: AbortSignal.timeout(12000),
    headers: { Accept: 'application/json' },
  });
  if (!response.ok)
    throw new Error(`Catálogo indisponível (HTTP ${response.status}). Tente novamente.`);
  return response.json();
}

/** @param {string} path @param {Record<string, string>} [query] @returns {Promise<CatalogList>} */
export async function catalogOptions(path, query = {}) {
  const payload = /** @type {CatalogList} */ (await requestCatalog(path, query));
  if (
    !Array.isArray(payload.items) ||
    !payload.items.every((item) => typeof item.code === 'string' && typeof item.name === 'string')
  ) {
    throw new Error(
      'O catálogo retornou opções inválidas. Era esperada uma lista de código e nome.',
    );
  }
  return payload;
}

/** @param {CatalogSelection} selection @returns {Promise<Valuation>} */
export async function catalogValuation(selection) {
  const payload = /** @type {Valuation} */ (await requestCatalog('valuation', selection));
  if (
    payload.kind !== 'reference_valuation' ||
    !Number.isFinite(payload.price) ||
    payload.price <= 0 ||
    !payload.model ||
    !payload.source?.name
  ) {
    throw new Error('O catálogo retornou uma referência incompleta. Tente outro modelo ou ano.');
  }
  return payload;
}
