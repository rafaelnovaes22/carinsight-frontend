# CarInsight frontend

Preserve the existing blue identity, logos and vehicle assets. This is a static HTML/CSS/JavaScript app. Do not introduce a framework.

- Use Node from `.nvmrc`. Run `npm run setup` on a clean machine; on Linux install browser system packages with `npx playwright install-deps chromium` if needed.
- Run `npm start` for port 8080. Run `npm run verify` before each commit. Tests mock backend endpoints and require no credentials.
- Keep new discovery modules in `discovery/`, typed with JSDoc and checked by `npm run typecheck`. Keep files below 500 lines, functions small, errors contextual.
- Prefer DOM textContent for API content. Never present fixture cars, photos, financing approval or unavailable inspection claims as real inventory.
- API defaults to the public Railway backend outside local hosts. A `carinsight-api-origin` meta tag may select an HTTPS origin or a same-origin `/api` proxy. Never expose secrets in HTML.
- Preserve working tree changes. Run agent commands through ai-jail. Use `npm run format` before verification. Legacy formatting is deliberately outside the new-code gate.
- See README for architecture and `docs/implementation-sources.md` for protocol references.
