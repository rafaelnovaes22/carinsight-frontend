/**
 * Correções de dados que a loja cadastrou errado. Ficam fora do banco porque o sincronismo com o site
 * da loja reescreveria o valor. A chave é o site e o código do carro na loja, que não mudam.
 */
window.CorrecoesEstoque = {
  // Honda City 2018: o nome do carro diz CVT.
  'renatinhuscars.com.br:881': { transmission: 'Automático' },
  // BMW 320i 2014: a foto da alavanca mostra P, R, N e D.
  'renatinhuscars.com.br:796': { transmission: 'Automático' },
};
