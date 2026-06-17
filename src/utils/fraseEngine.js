import pluralize from './pluralizar';

export function converterQuebrasDeLinha(texto) {
  if (!texto) return '';
  const textoComQuebraReal = texto.replace(/\\n/g, '\n');
  return textoComQuebraReal.replace(/\n/g, '<br>');
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

export function prepararFraseComMedida(frase, medida) {
  const clone = {
    ...frase,
    frase: { ...(frase.frase || {}) },
  };
  if (medida && clone.frase.fraseBase?.includes('$')) {
    clone.frase.fraseBase = clone.frase.fraseBase.replace(/\$/g, medida);
  }
  if (medida && clone.frase.conclusao?.includes('$')) {
    clone.frase.conclusao = clone.frase.conclusao.replace(/\$/g, medida);
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

/**
 * Insere complemento do chat (modo catálogo) preservando HTML/formatação existente no editor.
 */
export function inserirComplementoFormatadoNoEditor(editor, textoPlain) {
  if (!editor || !textoPlain?.trim()) return false;

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
    const novoConteudo = conteudoAtual.replace(conclusaoDoModelo, `<br>${conclusaoFormatada}`);
    editor.commands.setContent(novoConteudo);
    return;
  }

  const textoAtual = editor.getHTML().replace(/<[^>]*>/g, '');
  const textoConclusao = conclusaoFormatada.replace(/<[^>]*>/g, '');
  const conclusaoPluralizada = pluralize(textoConclusao);

  if (!textoAtual.includes(textoConclusao) && !textoAtual.includes(conclusaoPluralizada)) {
    const posFinalDoc = editor.state.doc.content.size;
    editor.commands.insertContentAt(posFinalDoc, `<br>${conclusaoFormatada}`);
  }
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
      appendNaSecaoLaudo(
        editor,
        aplicarFormatacao(converterQuebrasDeLinha(dados.fraseBase), editor)
      );
      alterou = true;
      conteudoAtual = editor.getHTML();
    }
  } else if (dados.fraseBase) {
    appendNaSecaoLaudo(
      editor,
      aplicarFormatacao(converterQuebrasDeLinha(dados.fraseBase), editor)
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
      appendNaSecaoLaudo(editor, base);
      alterou = true;
      conteudoAtual = editor.getHTML();
    }
  } else if (base) {
    appendNaSecaoLaudo(editor, base);
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
    if (conclusaoResolvida) {
      if (options.conclusaoDoModelo) {
        const htmlAtual = editor.getHTML();
        editor.commands.setContent(
          htmlAtual.replace(options.conclusaoDoModelo, `<br>${conclusaoResolvida}`)
        );
      } else {
        const posFinalDoc = editor.state.doc.content.size;
        editor.commands.insertContentAt(posFinalDoc, `<br>${conclusaoResolvida}`);
      }
    } else {
      aplicarConclusao(editor, frase.frase.conclusao, options.conclusaoDoModelo || '');
    }
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
