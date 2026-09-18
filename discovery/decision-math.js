/** @typedef {{distance: number|null, efficiency: number|null, fuelPrice: number|null, insurance: number|null, tax: number|null, maintenance: number|null}} Expenses */

/** @param {string} value @returns {number|null} */
export function optionalNumber(value) {
  if (!value.trim()) return null;
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

/** @param {number|null|undefined} amount @returns {string} */
export function money(amount) {
  if (amount === null || amount === undefined || !Number.isFinite(amount)) return 'Não informado';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(amount);
}

/** @param {Expenses} expenses @returns {{subtotal: number|null, fuel: number|null, missing: string[]}} */
export function monthlyExpenses(expenses) {
  const { distance, efficiency, fuelPrice } = expenses;
  const fuel =
    distance !== null && efficiency !== null && efficiency > 0 && fuelPrice !== null
      ? (distance / efficiency) * fuelPrice
      : null;
  const annual = [expenses.insurance, expenses.tax, expenses.maintenance];
  const known = annual.filter((value) => value !== null);
  const subtotal =
    fuel === null && !known.length
      ? null
      : (fuel ?? 0) + known.reduce((sum, value) => sum + value, 0) / 12;
  const missing = ['Seguro', 'IPVA', 'Manutenção'].filter((_, index) => annual[index] === null);
  if (fuel === null) missing.unshift('Combustível: informe km/mês, consumo e preço/litro');
  return { subtotal, fuel, missing };
}

/** @param {number} price @param {number|null} budget @returns {string} */
export function budgetReason(price, budget) {
  if (budget === null) return 'Informe seu limite para comparar a referência com seu orçamento.';
  if (price <= budget)
    return `${money(budget - price)} abaixo do seu limite. Preço de compra e despesas ainda precisam ser confirmados.`;
  return `${money(price - budget)} acima do seu limite. Considere outro ano, versão ou modelo.`;
}
