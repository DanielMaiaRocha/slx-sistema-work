const text = `Cláusula 12ª. Como aluguel mensal, o LOCATÁRIO se obrigará a pagar o valor de R$ 450,00 (quatrocentos e cinquenta`;
const patterns = {
  rent: /valor\s+de\s+R\$\s*([\d.,]+)/i,
};
const rentMatch = text.match(patterns.rent);
console.log('Match:', rentMatch ? rentMatch[1] : 'NONE');
