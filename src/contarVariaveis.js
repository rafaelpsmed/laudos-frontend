// O objetivo deste arquivo é contar as variáveis que aparecem no texto e nas frases do laudo
// para que elas possam ser indivualizadas, realçadas, localizadas e diferenciadas umas das outras, quando a mesma variável aparecer
// em múltiplas ocorrências no texto, a fim de facilitar a identificação e a substituição das variáveis no texto por parte do usuário

export const contarVariaveis = (elementosOrdenados) => {
  const contagemVariaveis = {};
  elementosOrdenados.forEach(elemento => {
    if (elemento.tipo === 'variavel') {
      const titulo = elemento.dados.tituloVariavel;
      contagemVariaveis[titulo] = (contagemVariaveis[titulo] || 0) + 1;
    }
  });
  return contagemVariaveis;
};