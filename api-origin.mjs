/** @param {string} hostname @param {string} configured @returns {string} */
export function resolveApiOrigin(hostname, configured = '') {
  if (configured.startsWith('/') && !configured.startsWith('//'))
    return configured.replace(/\/$/, '');
  if (configured && new URL(configured).protocol === 'https:') return configured.replace(/\/$/, '');
  if (['localhost', '127.0.0.1', '[::1]'].includes(hostname)) return 'http://localhost:3000';
  return 'https://backend-production-8159.up.railway.app';
}
