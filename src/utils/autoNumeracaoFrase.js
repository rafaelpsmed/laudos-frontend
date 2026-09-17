import { Node, mergeAttributes, Extension } from '@tiptap/core';
import { Plugin, PluginKey } from 'prosemirror-state';

export const AUTO_NUM_TOKEN_RE = /\{#([A-Za-zÀ-ÿ]{1,12})\}/g;

export function normalizarPrefixoAutoNum(prefix) {
  return String(prefix || '').toLocaleUpperCase('pt-BR');
}

export function temTokenAutoNum(texto) {
  return /\{#[A-Za-zÀ-ÿ]{1,12}\}/.test(texto || '');
}

export function criarMetaNumeracao(frase) {
  const groupKey = String(frase?.id ?? `titulo:${frase?.tituloFrase || 'frase'}`);
  const instanceKey =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return { groupKey, instanceKey };
}

function escapeHtmlAttr(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function materializarTokensAutoNum(htmlOuTexto, meta) {
  if (!htmlOuTexto || !meta) return htmlOuTexto;
  return String(htmlOuTexto).replace(AUTO_NUM_TOKEN_RE, (_, prefix) => {
    const p = escapeHtmlAttr(normalizarPrefixoAutoNum(prefix));
    return (
      `<span data-auto-number="1" data-prefix="${p}" data-group="${escapeHtmlAttr(meta.groupKey)}" ` +
      `data-instance="${escapeHtmlAttr(meta.instanceKey)}" data-index="0">${p}</span>`
    );
  });
}

export function buildRenumberTransaction(state) {
  const order = [];
  const seen = new Set();
  const positions = [];

  state.doc.descendants((node, pos) => {
    if (node.type.name !== 'autoNumber') return;
    positions.push({ pos, node });
    const key = `${node.attrs.groupKey}::${node.attrs.instanceKey}`;
    if (!seen.has(key)) {
      seen.add(key);
      order.push({
        groupKey: node.attrs.groupKey,
        instanceKey: node.attrs.instanceKey,
      });
    }
  });

  if (!positions.length) return null;

  const indexByInstance = new Map();
  const counters = new Map();
  for (const item of order) {
    const next = (counters.get(item.groupKey) || 0) + 1;
    counters.set(item.groupKey, next);
    indexByInstance.set(`${item.groupKey}::${item.instanceKey}`, next);
  }

  let tr = state.tr;
  let changed = false;
  for (let i = positions.length - 1; i >= 0; i -= 1) {
    const { pos, node } = positions[i];
    const idx =
      indexByInstance.get(`${node.attrs.groupKey}::${node.attrs.instanceKey}`) || 0;
    if (Number(node.attrs.index) !== idx) {
      tr = tr.setNodeMarkup(pos, undefined, { ...node.attrs, index: idx });
      changed = true;
    }
  }

  return changed ? tr : null;
}

export function renumerarAutoNumeros(editor) {
  if (!editor || editor.isDestroyed) return;
  const tr = buildRenumberTransaction(editor.state);
  if (tr) {
    editor.view.dispatch(tr.setMeta('autoNumberRenumber', true));
  }
}

export const AutoNumber = Node.create({
  name: 'autoNumber',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,
  draggable: false,

  addAttributes() {
    return {
      prefix: { default: 'N' },
      groupKey: { default: '' },
      instanceKey: { default: '' },
      index: { default: 0 },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-auto-number="1"]',
        getAttrs: (el) => ({
          prefix: normalizarPrefixoAutoNum(el.getAttribute('data-prefix') || 'N'),
          groupKey: el.getAttribute('data-group') || '',
          instanceKey: el.getAttribute('data-instance') || '',
          index: parseInt(el.getAttribute('data-index') || '0', 10) || 0,
        }),
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const prefix = normalizarPrefixoAutoNum(node.attrs.prefix);
    const label = `${prefix}${node.attrs.index || ''}`;
    return [
      'span',
      mergeAttributes(
        {
          'data-auto-number': '1',
          'data-prefix': prefix,
          'data-group': node.attrs.groupKey,
          'data-instance': node.attrs.instanceKey,
          'data-index': String(node.attrs.index || 0),
          class: 'laudo-auto-number',
        },
        HTMLAttributes,
      ),
      label,
    ];
  },
});

export const AutoNumberRenumber = Extension.create({
  name: 'autoNumberRenumber',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('autoNumberRenumber'),
        appendTransaction(transactions, _oldState, newState) {
          if (transactions.some((tr) => tr.getMeta('autoNumberRenumber'))) {
            return null;
          }
          if (!transactions.some((tr) => tr.docChanged)) {
            return null;
          }
          const tr = buildRenumberTransaction(newState);
          if (!tr) return null;
          return tr.setMeta('autoNumberRenumber', true);
        },
      }),
    ];
  },
});
