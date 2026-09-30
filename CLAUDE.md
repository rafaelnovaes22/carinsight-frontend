# carinsight-frontend

Sirva o frontend estático e preserve o layout base descrito em NOTICE.md.

## Comandos reais

1. Rode dev com: `npm start` (serve na porta 8080).
2. Rode e2e com: `npx playwright test` (usa tests/funnel.spec.ts e sobe npm start).
3. Sirva produção com a imagem do Dockerfile (`npx serve . -l 8080`).

## Estrutura

1. Leia index.html, veiculos.html e detalhes-carro.html como entrada do funil.
2. Edite api.js, chat.js, search-page.js e details-page.js por página, sem framework.
3. Consulte playwright.config.ts, vercel.json e serve.json antes de mudar porta ou rota.

## Limites

1. Não invente script de build, lint ou typecheck, eles não existem no repo.
2. Não refatore lógica de negócio, faça só ajuste pontual pedido.
3. Não commite, não faça push, não crie branch sem pedido.

## Débitos explícitos

1. Sem lint, sem build, sem typecheck configurados.
2. Cobertura de teste limitada a tests/funnel.spec.ts.
