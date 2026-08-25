/**
 * Lista definições de variáveis já presentes nos textos da frase
 * (chips globais `{Titulo}` e locais `[LOCAL: Titulo]`). Refs não entram.
 */
export function extrairCatalogoVariaveisDefinicao(...textos) {
  const seen = new Set();
  const items = [];

  const add = (kind, titulo) => {
    const nome = String(titulo || '').trim();
    if (!nome) return;
    const key = `${kind}:${nome}`;
    if (seen.has(key)) return;
    seen.add(key);
    items.push({ kind, titulo: nome });
  };

  for (const texto of textos) {
    const t = texto || '';

    const localRe = /\[LOCAL: ([^\]]+)\]/g;
    let match;
    while ((match = localRe.exec(t)) !== null) {
      add('local', match[1]);
    }

    const globRe = /\{([^{}]+)\}/g;
    while ((match = globRe.exec(t)) !== null) {
      const inner = match[1];
      if (inner.startsWith('@')) continue;
      if (inner.includes('"tipo"')) continue;
      add('global', inner);
    }
  }

  return items;
}
