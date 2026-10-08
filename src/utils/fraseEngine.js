export function converterQuebrasDeLinha(texto) {
  if (!texto) return '';
  const textoComQuebraReal = texto.replace(/\\n/g, '\n');
  return textoComQuebraReal.replace(/\n/g, '<br>');
}

/** Remove tags HTML preservando quebras de parágrafo/br. */
export function htmlParaTextoPuro(html) {
  if (!html) return '';
  return html
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Extrai o bloco após "impressão:" ou "conclusão:" a partir de texto puro. */
export function extrairConclusaoDoTextoPuro(textoPuro) {
  if (!textoPuro) return '';
  const match = textoPuro.match(/(?:impressão:|conclusão:)\s*([\s\S]*)$/i);
  return match ? match[1].trim() : '';
}

export function extrairConclusaoDoHtml(html) {
  return extrairConclusaoDoTextoPuro(htmlParaTextoPuro(html));
}

export function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function aplicarFormatacao(conteudo, editor, defaults = { fontFamily: 'Arial', fontSize: '12pt' }) {
  if (!conteudo) return conteudo;

  let fonteAtual = defaults.fontFamily;
  let tamanhoAtual = defaults.fontSize;

  if (editor) {
    const formatacaoAtual = editor.getAttributes('textStyle');
    fonteAtual = formatacaoAtual.fontFamily || fonteAtual;
    tamanhoAtual = formatacaoAtual.fontSize || tamanhoAtual;
    editor.chain().focus().setMark('textStyle', {
      fontFamily: fonteAtual,
      fontSize: tamanhoAtual,
    }).run();
  }

  return `<span style="font-family: ${fonteAtual}; font-size: ${tamanhoAtual}">${conteudo}</span>`;
}

export function substituirPrimeiraOcorrenciaOutras(conteudoHtml, procurarTextoPlain, substituirHtml) {
  if (procurarTextoPlain == null || procurarTextoPlain === '') return conteudoHtml;
  const textoComQuebraReal = procurarTextoPlain.replace(/\\n/g, '\n');
  const normalized = textoComQuebraReal.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const linhas = normalized.split('\n');

  if (linhas.length <= 1) {
    const procurarPor = converterQuebrasDeLinha(procurarTextoPlain);
    const resultadoSimples = conteudoHtml.replace(procurarPor, substituirHtml);
    if (resultadoSimples !== conteudoHtml) {
      return resultadoSimples;
    }

    try {
      const partes = procurarTextoPlain.split(/(\s+)/);
      const pattern = partes.map((parte) => {
        if (parte.trim() === '') {
          return '(?:\\s|&nbsp;|<[^>]+>)*';
        }
        return escapeRegex(parte);
      }).join('(?:\\s|&nbsp;|<[^>]+>)*');

      const regex = new RegExp(pattern);
      const resultadoRegex = conteudoHtml.replace(regex, substituirHtml);
      return resultadoRegex !== conteudoHtml ? resultadoRegex : conteudoHtml;
    } catch {
      return conteudoHtml;
    }
  }

  const escapedParts = linhas.map((line) => escapeRegex(line));
  const separadorEntreLinhas =
    '(?:<br\\s*/?>' +
    '|</p>\\s*<p[^>]*>' +
    '|</span>\\s*</p>\\s*<p[^>]*>\\s*(?:<span[^>]*>)?' +
    '|</span>\\s*<p[^>]*>\\s*(?:<span[^>]*>)?' +
    '|</span>\\s*<br\\s*/?>\\s*<span[^>]*>' +
    ')';
  const pattern = escapedParts.join(separadorEntreLinhas);
  try {
    const regex = new RegExp(pattern);
    return conteudoHtml.replace(regex, () => substituirHtml);
  } catch {
    const procurarPor = converterQuebrasDeLinha(procurarTextoPlain);
    return conteudoHtml.replace(procurarPor, substituirHtml);
  }
}

function textoTemVariaveisNaoResolvidas(texto, medida = null) {
  if (!texto) return false;
  if (/\{[^}]+\}/.test(texto)) return true;
  if (texto.includes('[[LOCAL:') || texto.includes('[LOCAL:')) return true;
  if (/\[[^\]]+\/\/[^\]]+\]/.test(texto)) return true;
  if (texto.includes('$') && !medida) return true;
  return false;
}

export function fraseTemVariaveis(frase, medida = null) {
  const json = frase?.frase || {};
  const textos = [
    json.fraseBase,
    json.conclusao,
    json.substituicaoFraseBase,
    ...(json.substituicoesOutras || []).flatMap((s) => [s.procurarPor, s.substituirPor]),
  ].filter(Boolean);

  return textos.some((t) => textoTemVariaveisNaoResolvidas(t, medida));
}

/** Se o texto logo após o token já traz a unidade ("$ cm"), a medida entra só com o número. */
function medidaSemUnidadeRepetida(medida, resto) {
  const m = String(medida ?? '').trim();
  const seguinte = String(resto || '').replace(/^(?:\s|&nbsp;|<[^>]+>)*/i, '');
  const unidade = seguinte.match(/^(cm|mm)\b/i);
  if (!unidade) return m;
  const re = new RegExp(`\\s*${unidade[1]}\\s*$`, 'i');
  return m.replace(re, '').trim();
}

function substituirCifraoPorMedida(texto, medida) {
  return String(texto).replace(/\$/g, (match, offset, full) => (
    medidaSemUnidadeRepetida(medida, full.slice(offset + 1))
  ));
}

export function prepararFraseComMedida(frase, medida) {
  const clone = {
    ...frase,
    frase: { ...(frase.frase || {}) },
  };
  if (medida && clone.frase.fraseBase?.includes('$')) {
    clone.frase.fraseBase = substituirCifraoPorMedida(clone.frase.fraseBase, medida);
  }
  if (medida && clone.frase.conclusao?.includes('$')) {
    clone.frase.conclusao = substituirCifraoPorMedida(clone.frase.conclusao, medida);
  }
  return clone;
}

function appendNaSecaoLaudo(editor, fraseBaseHtml) {
  const html = editor.getHTML();
  const markerRegex = /(laudo\s*:)/i;
  if (markerRegex.test(html)) {
    const novoHtml = html.replace(markerRegex, (match) => `${match}<br>${fraseBaseHtml}`);
    editor.commands.setContent(novoHtml);
    return true;
  }

  const posFinal = editor.state.doc.content.size;
  editor.commands.insertContentAt(posFinal, `<br>${fraseBaseHtml}`);
  return true;
}

export function extrairParagrafosDoLaudo(html) {
  const texto = htmlParaTextoPuro(html || '');
  const inicio = texto.search(/laudo\s*:/i);
  if (inicio < 0) return [];
  let corpo = texto.slice(inicio).replace(/^laudo\s*:/i, '');
  const fim = corpo.search(/impress[aã]o\s*(?:diagn[oó]stica)?\s*:|conclus[aã]o\s*:/i);
  if (fim >= 0) corpo = corpo.slice(0, fim);
  return corpo
    .split(/\n+/)
    .map((linha) => linha.trim())
    .filter((linha) => linha.length > 15);
}

function inserirAposParagrafo(html, fraseHtml, textoParagrafo) {
  const alvo = String(textoParagrafo || '').trim();
  if (!alvo || !html) return null;
  const amostra = alvo.slice(0, 48);

  if (/<\/p>/i.test(html)) {
    const partes = html.split(/(<\/p>)/i);
    for (let i = 0; i < partes.length; i += 2) {
      const bloco = partes[i] + (partes[i + 1] || '');
      const puro = htmlParaTextoPuro(bloco);
      if (!puro.includes(amostra)) continue;
      if (/impress[aã]o|conclus[aã]o/i.test(puro) && /<br/i.test(bloco)) break;
      return (
        partes.slice(0, i).join('')
        + bloco
        + `<p>${fraseHtml}</p>`
        + partes.slice(i + 2).join('')
      );
    }
  }

  const brPartes = html.split(/(<br\s*\/?>)/i);
  for (let i = 0; i < brPartes.length; i += 2) {
    const bloco = brPartes[i];
    if (htmlParaTextoPuro(bloco).includes(amostra)) {
      const br = brPartes[i + 1] || '<br>';
      return (
        brPartes.slice(0, i).join('')
        + bloco
        + br
        + fraseHtml
        + '<br>'
        + brPartes.slice(i + 2).join('')
      );
    }
  }
  return null;
}

/**
 * Divide o HTML do editor em segmentos de linha (por <br> e </p>), mantendo os
 * separadores para remontagem. `linhas` lista só os segmentos com texto, com o
 * índice deles em `partes`.
 */
function segmentarHtmlEmLinhas(html) {
  const partes = String(html || '').split(/(<\/p>|<br\s*\/?>)/i);
  const linhas = [];
  for (let i = 0; i < partes.length; i += 2) {
    const puro = htmlParaTextoPuro(partes[i]).replace(/\s+/g, ' ').trim();
    if (puro) linhas.push({ pos: i, puro });
  }
  return { partes, linhas };
}

/** Linhas (texto puro, com texto) do laudo inteiro, na ordem em que aparecem no editor. */
export function listarLinhasDoLaudo(html) {
  return segmentarHtmlEmLinhas(html).linhas.map((l) => l.puro);
}

function trocarConteudoDoSegmento(segmento, novoHtml) {
  const abertura = segmento.match(/^\s*(?:<[^>]+>\s*)*/)?.[0] || '';
  const fechamento = segmento.match(/(?:\s*<\/[^>]+>\s*)*$/)?.[0] || '';
  return `${abertura}${novoHtml}${fechamento}`;
}

function inserirAposSegmento(partes, pos, novoHtml) {
  const sep = partes[pos + 1] || '';
  if (/<\/p>/i.test(sep)) {
    partes.splice(pos + 2, 0, `<p>${novoHtml}`, '</p>');
  } else if (sep) {
    partes.splice(pos + 2, 0, `<br>${novoHtml}`, '<br>');
  } else {
    partes.splice(pos + 1, 0, `<br>${novoHtml}`, '');
  }
}

function esqueletoLinha(texto) {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\d+(?:[.,]\d+)?(?:\s*x\s*\d+(?:[.,]\d+)?)*/g, '#')
    .replace(/[^\p{L}#\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Compara esqueletos aceitando diferenças depois do primeiro '#', desde que o início coincida. */
function esqueletosCompativeis(skModelo, skNova) {
  if (skModelo === skNova) return true;
  const prefixo = (sk) => sk.slice(0, sk.indexOf('#')).trim();
  const pModelo = prefixo(skModelo);
  const pNova = prefixo(skNova);
  if (pModelo.length < 6 || pNova.length < 6) return false;
  if (pModelo !== pNova) return false;
  const palavrasModelo = skModelo.split(' ').filter((p) => p !== '#');
  const palavrasNova = new Set(skNova.split(' '));
  const faltantes = palavrasModelo.filter((p) => !palavrasNova.has(p));
  return faltantes.length <= Math.max(1, Math.floor(palavrasModelo.length * 0.25));
}

function substituirSegmentoComCerquilha(html, linhaNova) {
  const skNova = esqueletoLinha(linhaNova);
  if (!skNova.includes('#')) return null;
  const { partes, linhas } = segmentarHtmlEmLinhas(html);
  for (const linha of linhas) {
    if (!linha.puro.includes('#')) continue;
    if (!esqueletosCompativeis(esqueletoLinha(linha.puro), skNova)) continue;
    partes[linha.pos] = trocarConteudoDoSegmento(partes[linha.pos], linhaNova);
    return partes.join('');
  }
  return null;
}

/**
 * Aplica acréscimos já posicionados pela IA:
 * `{ texto, substitui_linha, apos_linha, conclusao }` (índices de `listarLinhasDoLaudo`).
 */
export function aplicarAcrescimosEstruturados(editor, acrescimos) {
  if (!editor || !Array.isArray(acrescimos) || !acrescimos.length) return false;

  const formatar = (texto) => aplicarFormatacao(converterQuebrasDeLinha(String(texto).trim()), editor);
  const corpo = acrescimos.filter((a) => a?.texto && !a.conclusao);
  const conclusoes = acrescimos.filter((a) => a?.texto && a.conclusao);
  let alterou = false;

  let { partes, linhas } = segmentarHtmlEmLinhas(editor.getHTML());
  const htmlAtual = () => partes.join('');
  const jaExiste = (texto, html = htmlAtual()) => {
    const puro = String(texto).replace(/\s+/g, ' ').trim();
    return puro && htmlParaTextoPuro(html).replace(/\s+/g, ' ').includes(puro);
  };

  // 1) Substituições (não deslocam índices).
  const pendentes = [];
  corpo.forEach((item) => {
    const idx = Number(item.substitui_linha);
    if (Number.isInteger(idx) && idx >= 0 && idx < linhas.length) {
      const alvo = linhas[idx];
      partes[alvo.pos] = trocarConteudoDoSegmento(partes[alvo.pos], formatar(item.texto));
      alterou = true;
      return;
    }
    pendentes.push(item);
  });

  // 2) Linhas com '#' sem índice: match tolerante pelo esqueleto.
  const restantes = [];
  pendentes.forEach((item) => {
    const trocado = substituirSegmentoComCerquilha(htmlAtual(), String(item.texto).trim());
    if (trocado) {
      ({ partes, linhas } = segmentarHtmlEmLinhas(trocado));
      alterou = true;
    } else {
      restantes.push(item);
    }
  });

  // 3) Inserções após a linha do órgão, de trás para frente para não deslocar índices.
  const comAncora = restantes
    .filter((item) => Number.isInteger(Number(item.apos_linha)) && Number(item.apos_linha) >= 0
      && Number(item.apos_linha) < linhas.length)
    .sort((a, b) => Number(b.apos_linha) - Number(a.apos_linha));
  const semAncora = restantes.filter((item) => !comAncora.includes(item));

  comAncora.forEach((item) => {
    if (jaExiste(item.texto)) return;
    const alvo = linhas[Number(item.apos_linha)];
    inserirAposSegmento(partes, alvo.pos, formatar(item.texto));
    alterou = true;
  });

  if (alterou) editor.commands.setContent(partes.join(''));

  // 4) Sem âncora: início do corpo do laudo.
  semAncora.forEach((item) => {
    if (jaExiste(item.texto, editor.getHTML())) return;
    appendNaSecaoLaudo(editor, formatar(item.texto));
    alterou = true;
  });

  // 5) Conclusões.
  conclusoes.forEach((item) => {
    inserirConclusaoNaImpressao(editor, formatar(item.texto), '');
    alterou = true;
  });

  return alterou;
}

function aplicarSobreLinhasComCerquilha(html, fraseHtml) {
  const linhasNovas = htmlParaTextoPuro(fraseHtml)
    .split(/\n+/)
    .map((linha) => linha.trim())
    .filter(Boolean);
  let atual = html;
  const restantes = [];
  let substituiu = 0;
  linhasNovas.forEach((linha) => {
    const proximo = substituirSegmentoComCerquilha(atual, linha);
    if (proximo) {
      atual = proximo;
      substituiu += 1;
    } else {
      restantes.push(linha);
    }
  });
  return {
    html: atual,
    substituiuAlguma: substituiu > 0,
    substituiuTodas: substituiu > 0 && restantes.length === 0,
    restantes,
  };
}

function inserirFraseNoCorpo(editor, fraseHtml, textoParagrafo) {
  const troca = aplicarSobreLinhasComCerquilha(editor.getHTML(), fraseHtml);
  if (troca.substituiuAlguma) {
    editor.commands.setContent(troca.html);
    if (troca.substituiuTodas) return true;
    fraseHtml = aplicarFormatacao(troca.restantes.join('<br>'), editor);
  }
  if (textoParagrafo) {
    const novo = inserirAposParagrafo(editor.getHTML(), fraseHtml, textoParagrafo);
    if (novo && novo !== editor.getHTML()) {
      editor.commands.setContent(novo);
      return true;
    }
  }
  return appendNaSecaoLaudo(editor, fraseHtml);
}

function inserirConclusaoNaImpressao(editor, conclusaoHtml, conclusaoDoModelo = '') {
  if (!conclusaoHtml) return;
  let html = editor.getHTML();
  const puroConc = htmlParaTextoPuro(conclusaoHtml).trim();
  if (puroConc && htmlParaTextoPuro(html).includes(puroConc)) return;

  if (conclusaoDoModelo && html.includes(conclusaoDoModelo)) {
    const substituido = html.replace(conclusaoDoModelo, `<br>${conclusaoHtml}`);
    if (substituido !== html) {
      editor.commands.setContent(substituido);
      return;
    }
  }

  const marcador = /(impress[aã]o\s*(?:diagn[oó]stica)?\s*:|conclus[aã]o\s*:)/i;
  if (marcador.test(html)) {
    editor.commands.setContent(html.replace(marcador, (match) => `${match}<br>${conclusaoHtml}`));
    return;
  }

  const posFinalDoc = editor.state.doc.content.size;
  editor.commands.insertContentAt(posFinalDoc, `<br>${conclusaoHtml}`);
}

/**
 * Insere complemento do chat (modo catálogo) preservando HTML/formatação existente no editor.
 */
export function inserirComplementoFormatadoNoEditor(editor, textoPlain) {
  if (!editor || !textoPlain?.trim()) return false;

  // Linhas que preenchem campos '#' já existentes no modelo trocam a linha original.
  const troca = aplicarSobreLinhasComCerquilha(
    editor.getHTML(),
    converterQuebrasDeLinha(textoPlain.trim()),
  );
  if (troca.substituiuAlguma) {
    editor.commands.setContent(troca.html);
    if (troca.substituiuTodas) return true;
    textoPlain = troca.restantes.join('\n');
  }

  const blocoHtml = aplicarFormatacao(converterQuebrasDeLinha(textoPlain.trim()), editor);
  let html = editor.getHTML();

  const marcadorImpressao = /(<br\s*\/?>|\n|\r\n)*\s*(?:<[^>]+>\s*)*(impress[aã]o\s*(?:diagn[oó]stica)?\s*:)/i;
  const marcadorConclusao = /(<br\s*\/?>|\n|\r\n)*\s*(?:<[^>]+>\s*)*(conclus[aã]o\s*:)/i;

  const matchImpressao = html.match(marcadorImpressao);
  const matchConclusao = html.match(marcadorConclusao);
  const match = matchImpressao || matchConclusao;

  if (match && match.index !== undefined) {
    html = `${html.slice(0, match.index)}<br>${blocoHtml}<br>${html.slice(match.index)}`;
  } else {
    html = `${html}<br>${blocoHtml}`;
  }

  editor.commands.setContent(html);
  return true;
}

function aplicarConclusao(editor, conclusaoTexto, conclusaoDoModelo = '') {
  if (!conclusaoTexto) return;

  const conclusaoFormatada = aplicarFormatacao(
    converterQuebrasDeLinha(conclusaoTexto),
    editor
  );

  if (conclusaoDoModelo) {
    const conteudoAtual = editor.getHTML();
    if (conteudoAtual.includes(conclusaoDoModelo)) {
      const novoConteudo = conteudoAtual.replace(conclusaoDoModelo, `<br>${conclusaoFormatada}`);
      if (novoConteudo !== conteudoAtual) {
        editor.commands.setContent(novoConteudo);
        return;
      }
    }
  }

  inserirConclusaoNaImpressao(editor, conclusaoFormatada, '');
}

/**
 * Aplica uma frase cadastrada ao editor TipTap (modo catálogo IA / Laudos).
 */
export function applyFraseToEditor(editor, frase, options = {}) {
  if (!editor || !frase?.frase) {
    return { success: false, reason: 'Editor ou frase inválidos.' };
  }

  if (fraseTemVariaveis(frase, options.medida) && !options.ignoreVariaveis) {
    return {
      success: false,
      needsVariables: true,
      frase,
      reason: `A frase "${frase.tituloFrase}" possui variáveis a preencher.`,
    };
  }

  const fraseProcessada = prepararFraseComMedida(frase, options.medida);
  const dados = fraseProcessada.frase;
  let conteudoAtual = editor.getHTML();
  let novoConteudo = conteudoAtual;
  let alterou = false;

  if (dados.substituicaoFraseBase && dados.fraseBase) {
    const fraseBaseFormatada = aplicarFormatacao(
      converterQuebrasDeLinha(dados.fraseBase),
      editor
    );

    if (conteudoAtual.includes(dados.substituicaoFraseBase)) {
      novoConteudo = conteudoAtual.replace(dados.substituicaoFraseBase, fraseBaseFormatada);
      alterou = novoConteudo !== conteudoAtual;
    } else {
      novoConteudo = substituirPrimeiraOcorrenciaOutras(
        conteudoAtual,
        dados.substituicaoFraseBase,
        fraseBaseFormatada
      );
      alterou = novoConteudo !== conteudoAtual;
    }

    if (alterou) {
      editor.commands.setContent(novoConteudo);
      conteudoAtual = editor.getHTML();
    } else if (dados.fraseBase) {
      inserirFraseNoCorpo(
        editor,
        aplicarFormatacao(converterQuebrasDeLinha(dados.fraseBase), editor),
        options.ancoraParagrafo,
      );
      alterou = true;
      conteudoAtual = editor.getHTML();
    }
  } else if (dados.fraseBase) {
    inserirFraseNoCorpo(
      editor,
      aplicarFormatacao(converterQuebrasDeLinha(dados.fraseBase), editor),
      options.ancoraParagrafo,
    );
    alterou = true;
    conteudoAtual = editor.getHTML();
  }

  if (dados.substituicoesOutras?.length) {
    let html = editor.getHTML();
    dados.substituicoesOutras.forEach((substituicao) => {
      const substituirPor = aplicarFormatacao(
        converterQuebrasDeLinha(substituicao.substituirPor),
        editor
      );
      html = substituirPrimeiraOcorrenciaOutras(
        html,
        substituicao.procurarPor,
        substituirPor
      );
    });
    editor.commands.setContent(html);
    alterou = true;
  }

  if (dados.conclusao) {
    aplicarConclusao(editor, dados.conclusao, options.conclusaoDoModelo || '');
    alterou = true;
  }

  if (!alterou) {
    return {
      success: false,
      reason: `Não foi possível aplicar a frase "${frase.tituloFrase}" no laudo atual.`,
    };
  }

  return {
    success: true,
    titulo: frase.tituloFrase,
  };
}

/**
 * Aplica frase com textos já resolvidos pelo modal de variáveis (HTML pronto).
 */
export function applyFraseHtmlResolvidaToEditor(editor, frase, partesResolvidas, options = {}) {
  if (!editor || !frase?.frase || !partesResolvidas?.length) {
    return { success: false, reason: 'Editor, frase ou partes inválidos.' };
  }

  const nSub = frase.frase.substituicoesOutras?.length ?? 0;
  const temConc = !!frase.frase.conclusao;
  const base = partesResolvidas[0] ?? '';
  const subs = [];
  for (let i = 0; i < nSub; i += 1) {
    subs.push(partesResolvidas[1 + i] ?? '');
  }
  const conclusaoResolvida = temConc ? (partesResolvidas[1 + nSub] ?? '') : '';

  let conteudoAtual = editor.getHTML();
  let alterou = false;

  if (frase.frase.substituicaoFraseBase && base) {
    let novoConteudo = conteudoAtual;
    if (conteudoAtual.includes(frase.frase.substituicaoFraseBase)) {
      novoConteudo = conteudoAtual.replace(frase.frase.substituicaoFraseBase, base);
    } else {
      novoConteudo = substituirPrimeiraOcorrenciaOutras(
        conteudoAtual,
        frase.frase.substituicaoFraseBase,
        base
      );
    }
    if (novoConteudo !== conteudoAtual) {
      editor.commands.setContent(novoConteudo);
      alterou = true;
      conteudoAtual = editor.getHTML();
    } else {
      inserirFraseNoCorpo(editor, base, options.ancoraParagrafo);
      alterou = true;
      conteudoAtual = editor.getHTML();
    }
  } else if (base) {
    inserirFraseNoCorpo(editor, base, options.ancoraParagrafo);
    alterou = true;
    conteudoAtual = editor.getHTML();
  }

  if (frase.frase.substituicoesOutras?.length) {
    let html = editor.getHTML();
    frase.frase.substituicoesOutras.forEach((substituicao, idx) => {
      const substituirPor = subs[idx] !== undefined && subs[idx] !== ''
        ? subs[idx]
        : aplicarFormatacao(converterQuebrasDeLinha(substituicao.substituirPor), editor);
      html = substituirPrimeiraOcorrenciaOutras(html, substituicao.procurarPor, substituirPor);
    });
    editor.commands.setContent(html);
    alterou = true;
  }

  if (frase.frase.conclusao) {
    const conclusaoHtml = conclusaoResolvida
      || aplicarFormatacao(converterQuebrasDeLinha(frase.frase.conclusao), editor);
    inserirConclusaoNaImpressao(editor, conclusaoHtml, options.conclusaoDoModelo || '');
    alterou = true;
  }

  if (!alterou) {
    return {
      success: false,
      reason: `Não foi possível aplicar a frase "${frase.tituloFrase}" no laudo atual.`,
    };
  }

  return { success: true, titulo: frase.tituloFrase };
}

export function filterFrasesForModelo(todasFrases, modeloId, metodoId) {
  const idModelo = Number(modeloId);
  const idMetodo = Number(metodoId);

  const frasesDoModelo = todasFrases.filter(
    (f) => f.modelos_laudo && f.modelos_laudo.some((m) => Number(m) === idModelo)
  );

  const frasesGerais = todasFrases.filter((f) => {
    if (f.modelos_laudo && f.modelos_laudo.length > 0) return false;
    if (!f.metodos || f.metodos.length === 0) return true;
    return f.metodos.some((m) => Number(m) === idMetodo);
  });

  const byId = new Map();
  [...frasesDoModelo, ...frasesGerais].forEach((f) => byId.set(f.id, f));
  return Array.from(byId.values());
}
