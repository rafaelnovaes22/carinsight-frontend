/**
 * Link de "Conversar com vendedor": abre o WhatsApp do número final 5033 já dizendo qual é o carro e
 * de qual concessionária ele é, para o atendimento saber para onde encaminhar o interessado.
 */
(function () {
  var WHATSAPP_VENDEDOR = '5511949105033';

  window.linkDoVendedor = function (vehicle) {
    var nome = [vehicle.make, vehicle.model, vehicle.version, vehicle.yearModel].filter(Boolean).join(' ');
    var loja = vehicle.dealer && vehicle.dealer.name;
    var carro = loja ? nome + ', da concessionária ' + loja + ',' : nome;
    var texto = 'Olá! Vi o ' + carro + ' no site CarInsight e quero mais informações.';
    return 'https://wa.me/' + WHATSAPP_VENDEDOR + '?text=' + encodeURIComponent(texto);
  };
})();
