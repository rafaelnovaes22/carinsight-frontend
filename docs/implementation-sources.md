# Fontes e decisões

- Fetch: checar status HTTP e limitar requisições para o estado de erro ser recuperável. https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch
- CheckJs/JSDoc: contrato explícito em JS sem introduzir framework ou compilação de frontend. https://www.typescriptlang.org/tsconfig/checkJs.html
- Playwright webServer: testes iniciam o mesmo servidor que publica `dist/`. https://playwright.dev/docs/test-webserver
- Catálogo: endpoints internos `/catalog/*`, alinhados com o backend CarInsight. Fonte externa é FIPE via Parallelum, provedor independente. Documentação do provedor: https://deividfortuna.github.io/fipe/v2/
- Briefing: endpoint interno `/decision/brief`; `interpretation` determina texto de interface sobre análise por regras ou apoio de IA. Nunca simular ativação de IA quando o backend retorna regras.

Direção de arte: clareza azul do CarInsight existente, com briefing que se transforma em escolhas justificadas. Logo, paleta azul, fundo claro e imagens originais preservados. A fotografia do hero é explicitamente ilustrativa; cards de referência não usam fotos de outros carros.

Removidos da publicação: carros de demonstração como estoque, descontos fictícios, percentuais de match sem critério, estatísticas inventadas, depoimentos, inspeções/garantias não demonstradas e CTAs de vendedor sem parceiro. Os arquivos legados seguem no Git, fora da lista pública do build.

## Gate visual

Desktop: hierarquia de título/ação/contexto clara; comparação e fonte no mesmo card. Mobile: 360px, sem scroll horizontal; botões e selects acessíveis por teclado; tipografia 15px no corpo, 12px só em notas/rótulos. Estado vazio orienta o próximo passo, carregamento mantém espaço e erros oferecem tentativa. Movimento respeita prefers-reduced-motion.

As screenshots de QA usam APIs mockadas para provar carregamento e comparação de forma determinística. Marcas/modelos e preços dessas capturas são fixtures, não inventário ou referências de produção. Validar novamente com o backend publicado antes da entrega final.
