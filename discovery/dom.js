/** @template {keyof HTMLElementTagNameMap} K @param {K} tag @param {string} [className] @param {string} [text] @returns {HTMLElementTagNameMap[K]} */
export function node(tag, className = '', text = '') {
  const result = document.createElement(tag);
  result.className = className;
  result.textContent = text;
  return result;
}

/** @param {string} id @returns {HTMLElement} */
export function element(id) {
  const result = document.getElementById(id);
  if (!result) throw new Error(`Missing interface element: expected #${id}`);
  return result;
}

/** @param {string} id @returns {HTMLInputElement} */
export function input(id) {
  return /** @type {HTMLInputElement} */ (element(id));
}
/** @param {string} id @returns {HTMLSelectElement} */
export function select(id) {
  return /** @type {HTMLSelectElement} */ (element(id));
}
/** @param {string} id @returns {HTMLButtonElement} */
export function button(id) {
  return /** @type {HTMLButtonElement} */ (element(id));
}

/** @param {string} id @param {string} message @param {boolean} [error] @returns {void} */
export function status(id, message, error = false) {
  element(id).textContent = message;
  element(id).classList.toggle('error', error);
}

/** @param {string} href @returns {string|null} */
export function safeLink(href) {
  try {
    const url = new URL(href);
    return url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}

/** @param {unknown} error @returns {string} */
export function errorMessage(error) {
  if (error instanceof Error && error.name !== 'TimeoutError' && error.name !== 'TypeError')
    return error.message;
  return 'Não foi possível conectar agora. Confira sua conexão e tente novamente.';
}
