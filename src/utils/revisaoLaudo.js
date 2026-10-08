import {
  listarLinhasDoLaudo,
  htmlParaTextoPuro,
  substituirPrimeiraOcorrenciaOutras,
} from './fraseEngine';

export const ROTULO_TIPO_PENDENCIA = {
  ortografia: 'Ortografia',
  concordancia: 'Concordância',
  lateralidade: 'Lateralidade',
  medida: 'Medida',
  duplicidade: 'Duplicidade',
  inconsistencia: 'Inconsistência',
  placeholder: 'Campo não preenchido',
  formatacao: 'Formatação',
  outro: 'Outro',
};

export const COR_TIPO_PENDENCIA = {
  ortografia: 'blue',
  concordancia: 'blue',
  lateralidade: 'red',
  medida: 'orange',
  duplicidade: 'yellow',
  inconsistencia: 'red',
  placeholder: 'orange',
  formatacao: 'gray',
  outro: 'gray',
};

let seqPendencia = 0;
function novaPendencia(base) {
  seqPendencia += 1;
  return {
    id: `pend-${Date.now()}-${seqPendencia}`,
    linha: -1,
    tipo: 'outro',
    trecho: '',
    sugestao: '',
    motivo: '',
    aplicavel: false,
    origem: 'local',
    ...base,
  };
}

const RE_PLACEHOLDER = /(\{[^}]*\}|\[\[?LOCAL:[^\]]*\]\]?|\[REF:[^\]]*\]|\$|(?:^|[\s:])#(?=[\s.,;]|$))/u;
const RE_UNIDADE_DUPLA = /\b(\d+(?:[.,]\d+)?)\s*(cm|mm)\s+\2\b/iu;
const RE_SEM_UNIDADE = /(?<![\d.,])(\d+(?:[.,]\d+)?\s*x\s*\d+(?:[.,]\d+)?(?:\s*x\s*\d+(?:[.,]\d+)?)?)(?![.,]?\d)(?!\s*(?:cm|mm|%|g\b|ml\b))/iu;
const RE_MAIUSCULA_NO_MEIO = /(?<![\p{L}])(\p{Ll}[\p{L}]*)([ ,]+)(\p{Lu}\p{Ll}{2,})/gu;
const RE_CRASE_SOLTA = /(?<![\p{L}])([àÀ])\s+(no|na|nos|nas|em|de|do|da)(?![\p{L}])/u;
const PALAVRAS_PROPRIAS = new Set(['Doppler', 'Bosniak', 'Gleason', 'Couinaud', 'Morrison', 'Douglas', 'Hoffa', 'Baker']);

const RE_LADO = /(?<![\p{L}])(direit[oa]s?|esquerd[oa]s?|bilateral(?:mente)?|ambos)(?![\p{L}])/giu;
const RE_LADO_TESTE = new RegExp(RE_LADO.source, 'iu');

function avisosDeLinha(texto, indice) {
  const pend = [];
  const linha = String(texto || '');

  const mPlace = linha.match(RE_PLACEHOLDER);
  if (mPlace) {
    const trecho = mPlace[1].trim();
    pend.push(novaPendencia({
      linha: indice,
      tipo: 'placeholder',
      trecho,
      sugestao: '',
      motivo: 'Campo do modelo ou variável ainda não preenchido.',
      aplicavel: false,
    }));
  }

  const mDupla = linha.match(RE_UNIDADE_DUPLA);
  if (mDupla) {
    pend.push(novaPendencia({
      linha: indice,
      tipo: 'medida',
      trecho: mDupla[0],
      sugestao: `${mDupla[1]} ${mDupla[2]}`,
      motivo: 'Unidade repetida.',
      aplicavel: true,
    }));
  }

  const mSemUnidade = linha.match(RE_SEM_UNIDADE);
  if (mSemUnidade && !mDupla) {
    pend.push(novaPendencia({
      linha: indice,
      tipo: 'medida',
      trecho: mSemUnidade[1],
      sugestao: `${mSemUnidade[1]} cm`,
      motivo: 'Medida sem unidade.',
      aplicavel: true,
    }));
  }

  const mCrase = linha.match(RE_CRASE_SOLTA);
  if (mCrase) {
    pend.push(novaPendencia({
      linha: indice,
      tipo: 'concordancia',
      trecho: mCrase[0],
      sugestao: mCrase[2],
      motivo: 'Crase sem função antes de preposição.',
      aplicavel: true,
    }));
  }

  for (const m of linha.matchAll(RE_MAIUSCULA_NO_MEIO)) {
    const palavra = m[3];
    if (PALAVRAS_PROPRIAS.has(palavra)) continue;
    // "Rim Direito mede" (título de linha) não entra: só casos após vírgula/palavra minúscula comum.
    const anterior = m[1].toLowerCase();
    if (['rim', 'lobo', 'segmento'].includes(anterior)) continue;
    pend.push(novaPendencia({
      linha: indice,
      tipo: 'formatacao',
      trecho: `${m[1]}${m[2]}${palavra}`,
      sugestao: `${m[1]}${m[2]}${palavra.charAt(0).toLowerCase()}${palavra.slice(1)}`,
      motivo: 'Maiúscula no meio da frase (texto de frase colado após substituição).',
      aplicavel: true,
    }));
  }

  return pend;
}

function indiceConclusao(linhas) {
  return linhas.findIndex((l) => /^(impress[aã]o\s*(?:diagn[oó]stica)?|conclus[aã]o)\s*:/iu.test(l.trim()));
}

function avisosDeConjunto(linhas) {
  const pend = [];
  const iConc = indiceConclusao(linhas);
  const corpo = iConc >= 0 ? linhas.slice(0, iConc) : linhas;
  const conclusao = iConc >= 0 ? linhas.slice(iConc + 1) : [];

  // Duplicidade: linhas iguais (ignorando pontuação/caixa) no corpo ou na conclusão.
  const chave = (l) => l.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  const vistas = new Map();
  linhas.forEach((l, i) => {
    const k = chave(l);
    if (k.length < 25) return;
    if (vistas.has(k)) {
      pend.push(novaPendencia({
        linha: i,
        tipo: 'duplicidade',
        trecho: l.trim(),
        sugestao: '',
        motivo: `Linha repetida (igual à linha ${vistas.get(k) + 1}).`,
        aplicavel: false,
      }));
    } else {
      vistas.set(k, i);
    }
  });

  // Lateralidade: corpo e conclusão com lados disjuntos (um só cita direito, outro só esquerdo).
  const lados = (texto) => {
    const s = new Set();
    for (const m of texto.matchAll(RE_LADO)) {
      const t = m[1].toLowerCase();
      if (t.startsWith('direit')) s.add('direito');
      else if (t.startsWith('esquerd')) s.add('esquerdo');
      else s.add('bilateral');
    }
    return s;
  };
  if (conclusao.length) {
    const ladosCorpo = lados(corpo.join('\n'));
    const ladosConc = lados(conclusao.join('\n'));
    const soDireitoCorpo = ladosCorpo.has('direito') && !ladosCorpo.has('esquerdo');
    const soEsquerdoCorpo = ladosCorpo.has('esquerdo') && !ladosCorpo.has('direito');
    const soDireitoConc = ladosConc.has('direito') && !ladosConc.has('esquerdo');
    const soEsquerdoConc = ladosConc.has('esquerdo') && !ladosConc.has('direito');
    if ((soDireitoCorpo && soEsquerdoConc) || (soEsquerdoCorpo && soDireitoConc)) {
      const iLinhaConc = iConc + 1 + conclusao.findIndex((l) => RE_LADO_TESTE.test(l));
      pend.push(novaPendencia({
        linha: iLinhaConc,
        tipo: 'lateralidade',
        trecho: '',
        sugestao: '',
        motivo: 'Corpo e conclusão citam lados diferentes.',
        aplicavel: false,
      }));
    }
  }

  return pend;
}

/** Revisão instantânea, sem IA. */
export function revisarLaudoLocal(html) {
  const linhas = listarLinhasDoLaudo(html);
  const pendencias = [];
  linhas.forEach((l, i) => pendencias.push(...avisosDeLinha(l, i)));
  pendencias.push(...avisosDeConjunto(linhas));
  // Linhas em branco em excesso (3+ <br> seguidos ou <p></p> duplos).
  if (/(<br\s*\/?>\s*){3,}|(<p>\s*<\/p>\s*){2,}/iu.test(html)) {
    pendencias.push(novaPendencia({
      tipo: 'formatacao',
      trecho: '',
      sugestao: '',
      motivo: 'Há linhas em branco a mais no laudo.',
      aplicavel: true,
      acao: 'compactar-brancos',
    }));
  }
  return { linhas, pendencias };
}

/** Normaliza itens vindos da IA para o mesmo formato local, filtrando repetições. */
export function normalizarPendenciasIA(itens, pendenciasLocais = []) {
  const jaTem = new Set(pendenciasLocais.map((p) => `${p.linha}|${p.trecho}`));
  return (itens || [])
    .filter((p) => p && (p.trecho || p.motivo))
    .filter((p) => !jaTem.has(`${p.linha}|${p.trecho}`))
    .map((p) => novaPendencia({ ...p, origem: 'ia', aplicavel: !!p.aplicavel }));
}

export function compactarLinhasEmBranco(editor) {
  if (!editor) return false;
  const html = editor.getHTML();
  const novo = html
    .replace(/(<br\s*\/?>\s*){3,}/giu, '<br><br>')
    .replace(/(<p>\s*<\/p>\s*){2,}/giu, '<p></p>');
  if (novo === html) return false;
  editor.commands.setContent(novo);
  return true;
}

/** Aplica uma pendência (troca o trecho pela sugestão). Retorna true se alterou. */
export function aplicarPendenciaNoEditor(editor, pendencia) {
  if (!editor || !pendencia?.aplicavel) return false;
  if (pendencia.acao === 'compactar-brancos') return compactarLinhasEmBranco(editor);
  if (!pendencia.trecho || !pendencia.sugestao) return false;

  const html = editor.getHTML();
  const sugestaoHtml = String(pendencia.sugestao)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  const novo = substituirPrimeiraOcorrenciaOutras(html, pendencia.trecho, sugestaoHtml);
  if (novo === html) return false;
  editor.commands.setContent(novo);
  return true;
}

/** Pendências cujo trecho já não existe no laudo (resolvidas por fora) são descartadas. */
export function filtrarPendenciasVigentes(editor, pendencias) {
  if (!editor) return pendencias;
  const puro = htmlParaTextoPuro(editor.getHTML()).replace(/\s+/g, ' ');
  return pendencias.filter((p) => !p.trecho || puro.includes(String(p.trecho).replace(/\s+/g, ' ')));
}
