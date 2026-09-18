import { cpSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const destination = resolve(root, 'dist');
const publicFiles = [
  'index.html',
  'detalhes-carro.html',
  'api.js',
  'api-origin.mjs',
  'chat.js',
  'chat-ui.js',
  'chat.css',
  'details-page.js',
  'style.css',
  'serve.json',
];

/** @param {string} origin @returns {string} */
function publicOrigin(origin) {
  if (!origin) return '';
  if (origin.startsWith('/') && !origin.startsWith('//')) return origin;
  const parsed = new URL(origin);
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password)
    throw new Error(
      'CARINSIGHT_API_ORIGIN must be HTTPS or a same-origin path without credentials.',
    );
  return origin.replace(/\/$/, '');
}

if (dirname(destination) !== root)
  throw new Error('Build destination must stay inside the repository.');
rmSync(destination, { recursive: true, force: true });
mkdirSync(resolve(destination, 'discovery'), { recursive: true });
for (const file of publicFiles) cpSync(resolve(root, file), resolve(destination, file));
for (const file of readdirSync(resolve(root, 'discovery')).filter((name) =>
  /\.(js|css)$/.test(name),
))
  cpSync(resolve(root, 'discovery', file), resolve(destination, 'discovery', file));
cpSync(resolve(root, 'assets'), resolve(destination, 'assets'), { recursive: true });
const origin = publicOrigin(process.env.CARINSIGHT_API_ORIGIN || '');
const configuration = origin
  ? `const apiOriginMeta = document.createElement('meta'); apiOriginMeta.name = 'carinsight-api-origin'; apiOriginMeta.content = ${JSON.stringify(origin)}; document.head.append(apiOriginMeta);\n`
  : '// Default public API origin is selected by the application.\n';
writeFileSync(resolve(destination, 'runtime-config.js'), configuration);
console.log(
  JSON.stringify({
    event: 'frontend_build_complete',
    destination: 'dist',
    publicFiles: publicFiles.length,
  }),
);
