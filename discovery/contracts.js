/**
 * @typedef {{code: string, name: string}} CatalogOption
 * @typedef {{provider: string, name: string, url: string}} CatalogSource
 * @typedef {{items: CatalogOption[], source: CatalogSource, retrievedAt: string, cached: boolean}} CatalogList
 * @typedef {{kind: 'reference_valuation', brand: string, model: string, modelYear: number, fuel: string, codeFipe: string, price: number, priceFormatted: string, currency: string, referenceMonth: string, source: CatalogSource, retrievedAt: string, cached: boolean, disclaimer: string}} Valuation
 * @typedef {{budget: number|null, usage: string, city: string, distance: number|null, efficiency: number|null, fuelPrice: number|null}} Brief
 * @typedef {{brandId: string, modelId: string, yearId: string}} CatalogSelection
 * @typedef {{selection: CatalogSelection, valuation: Valuation}} SavedReference
 */
export {};
