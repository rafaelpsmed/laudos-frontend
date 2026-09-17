export function parseNumeroOpcao(raw) {
  if (raw === null || raw === undefined) return null;
  const s = String(raw).trim();
  if (!s) return null;
  const normalized = s.replace(/\s/g, '').replace(',', '.');
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

export function montarOpcaoVariavel(descricao, valor, numeroRaw) {
  const opcao = { descricao, valor };
  const trimmed = String(numeroRaw ?? '').trim();
  if (trimmed) opcao.numero = trimmed;
  return opcao;
}

export function textoNumeroOpcao(opcao) {
  if (opcao?.numero === null || opcao?.numero === undefined) return '';
  return String(opcao.numero).trim();
}

function coletarOpcoesDeSelecao(listaValores, selecionado) {
  if (selecionado == null || selecionado === '') return [];
  const escolhas = Array.isArray(selecionado) ? selecionado : [selecionado];
  const lista = Array.isArray(listaValores) ? listaValores : [];
  const encontradas = [];
  for (const val of escolhas) {
    const opcao = lista.find((item) => item.valor === val);
    if (opcao) encontradas.push(opcao);
  }
  return encontradas;
}

export function formatarSomaNumeros(soma) {
  if (Number.isInteger(soma)) return String(soma);
  return String(soma).replace('.', ',');
}

export function normalizarNomeScore(inner) {
  const nome = String(inner || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (nome === 'soma') return 'soma';
  if (nome === 'classificacao') return 'classificacao';
  return null;
}

export function isTokenSomaClassificacao(inner) {
  return normalizarNomeScore(inner) != null;
}

export function rotuloOpcaoComPontos(opcao) {
  const descricao = opcao?.descricao ?? '';
  const n = textoNumeroOpcao(opcao);
  return n ? `${descricao} (${n})` : descricao;
}

export function opcoesComPontos(valores) {
  return (valores || []).map((v) => ({
    value: v.valor,
    label: rotuloOpcaoComPontos(v),
  }));
}

export function normalizarFaixasClassificacao(faixas) {
  return (faixas || [])
    .map((f) => ({
      min: String(f?.min ?? '').trim(),
      max: String(f?.max ?? '').trim(),
      rotulo: String(f?.rotulo ?? '').trim(),
    }))
    .filter((f) => f.rotulo);
}

export function rotuloClassificacao(soma, faixas) {
  if (soma == null || !Array.isArray(faixas) || faixas.length === 0) return '';
  const n = Number(soma);
  if (!Number.isFinite(n)) return '';

  const ordenadas = [...faixas].sort((a, b) => {
    const minA = parseNumeroOpcao(a.min) ?? 0;
    const minB = parseNumeroOpcao(b.min) ?? 0;
    return minA - minB;
  });

  for (const faixa of ordenadas) {
    const min = parseNumeroOpcao(faixa.min) ?? 0;
    const max =
      faixa.max === '' || faixa.max == null
        ? Infinity
        : parseNumeroOpcao(faixa.max);
    if (max === null) continue;
    if (n >= min && n <= max) return String(faixa.rotulo || '').trim();
  }
  return '';
}

export function aplicarTokensSomaClassificacao(texto, { soma, classificacao }) {
  const somaTxt = soma == null ? '' : formatarSomaNumeros(soma);
  const classTxt = classificacao || '';
  return String(texto || '')
    .replace(/\{soma\}/gi, somaTxt)
    .replace(/\{classifica[cç][aã]o\}/gi, classTxt);
}

export function resolverTextoClassificacao(texto, soma, faixas) {
  return aplicarTokensSomaClassificacao(texto, {
    soma: soma ?? 0,
    classificacao: rotuloClassificacao(soma ?? 0, faixas),
  });
}

export function somarNumerosOpcoesSelecionadas({
  valoresSelecionados,
  variaveisDetalhes,
  elementosOrdenados,
}) {
  const opcoes = [];
  const contagemVariaveis = {};

  (elementosOrdenados || []).forEach((elemento) => {
    if (elemento.tipo === 'variavel') {
      const titulo = elemento.dados.tituloVariavel;
      contagemVariaveis[titulo] = (contagemVariaveis[titulo] || 0) + 1;
    }
  });

  (variaveisDetalhes || []).forEach((variavel) => {
    const titulo = variavel.tituloVariavel;
    const aparicoes = contagemVariaveis[titulo] || 1;
    const lista = variavel.variavel?.valores || [];

    if (aparicoes > 1) {
      for (let i = 0; i < aparicoes; i += 1) {
        opcoes.push(...coletarOpcoesDeSelecao(lista, valoresSelecionados[`${titulo}_${i}`]));
      }
    } else {
      opcoes.push(...coletarOpcoesDeSelecao(lista, valoresSelecionados[variavel.id]));
    }
  });

  (elementosOrdenados || []).forEach((elemento) => {
    if (elemento.tipo !== 'variavelLocal') return;
    const variavelLocal = elemento.dados;
    const lista = variavelLocal.variavel?.valores || [];
    opcoes.push(
      ...coletarOpcoesDeSelecao(lista, valoresSelecionados[variavelLocal.textoOriginal]),
    );
  });

  let soma = 0;
  let count = 0;
  for (const opcao of opcoes) {
    const n = parseNumeroOpcao(opcao.numero);
    if (n !== null) {
      soma += n;
      count += 1;
    }
  }

  return count > 0 ? { soma, count } : null;
}
