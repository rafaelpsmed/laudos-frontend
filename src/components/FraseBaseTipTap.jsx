import {
  useEditor,
  EditorContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
} from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Node, mergeAttributes, InputRule } from '@tiptap/core';
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';
import { Box } from '@mantine/core';
import { createVariableRefSuggestionExtension } from './variableRefSuggestion';
import { normalizarPrefixoAutoNum } from '../utils/autoNumeracaoFrase';
import { normalizarNomeScore } from '../utils/numeroOpcaoVariavel';

const LOCAL_TOKEN_RE = /^\[LOCAL: [^\]]+\]$/;
const REF_LOCAL_TOKEN_RE = /^\[REF: [^\]]+\]$/;
const AUTO_NUM_TOKEN_RE = /^\{#([A-Za-zÀ-ÿ]{1,12})\}$/;
const SCORE_TOKEN_RE = /^\{(soma|classifica[cç][aã]o)\}$/i;
const VAR_TOKEN_RE = /(\[REF: [^\]]+\]|\[LOCAL: [^\]]+\]|\{@[^{}]+\}|\{#[A-Za-zÀ-ÿ]{1,12}\}|\{soma\}|\{classifica[cç][aã]o\}|\{[^{}]+\})/gi;

function extractLocalLabel(fullToken) {
  return fullToken.slice(8, -1).trim();
}

function extractRefLocalLabel(fullToken) {
  return fullToken.slice(6, -1).trim();
}

function tokenizeLine(line, payloadByDisplayRef) {
  const map =
    payloadByDisplayRef?.current instanceof Map ? payloadByDisplayRef.current : null;
  const content = [];
  let last = 0;
  let match;
  const re = new RegExp(VAR_TOKEN_RE.source, 'g');
  while ((match = re.exec(line)) !== null) {
    if (match.index > last) {
      content.push({ type: 'text', text: line.slice(last, match.index) });
    }
    const token = match[1];
    if (REF_LOCAL_TOKEN_RE.test(token)) {
      const label = extractRefLocalLabel(token);
      content.push({
        type: 'phraseVariable',
        attrs: { variant: 'ref', refKind: 'local', titulo: label, label },
      });
    } else if (LOCAL_TOKEN_RE.test(token)) {
      const label = extractLocalLabel(token);
      const displayKey = `[LOCAL: ${label}]`;
      const payload = map?.get(displayKey) || '';
      content.push({
        type: 'phraseVariable',
        attrs: { variant: 'local', label, payload },
      });
    } else if (token.startsWith('{@') && token.endsWith('}')) {
      const titulo = token.slice(2, -1);
      content.push({
        type: 'phraseVariable',
        attrs: { variant: 'ref', refKind: 'global', titulo, label: titulo },
      });
    } else if (AUTO_NUM_TOKEN_RE.test(token)) {
      const prefix = normalizarPrefixoAutoNum(token.slice(2, -1));
      content.push({
        type: 'phraseVariable',
        attrs: { variant: 'autonum', prefix, titulo: prefix, label: prefix },
      });
    } else if (SCORE_TOKEN_RE.test(token)) {
      const titulo = normalizarNomeScore(token.slice(1, -1)) || 'soma';
      content.push({
        type: 'phraseVariable',
        attrs: { variant: 'score', titulo, label: titulo },
      });
    } else if (token.startsWith('{') && token.endsWith('}')) {
      const titulo = token.slice(1, -1);
      content.push({
        type: 'phraseVariable',
        attrs: { variant: 'global', titulo, label: titulo },
      });
    }
    last = match.index + token.length;
  }
  if (last < line.length) {
    content.push({ type: 'text', text: line.slice(last) });
  }
  if (content.length === 0) {
    content.push({ type: 'text', text: '' });
  }
  return content;
}

export function parseDisplayToTipTapDoc(displayText, payloadByDisplayRef) {
  const raw = displayText ?? '';
  const lines = raw.split('\n');
  const content = lines.map((line) => ({
    type: 'paragraph',
    content: tokenizeLine(line, payloadByDisplayRef),
  }));
  return {
    type: 'doc',
    content: content.length
      ? content
      : [{ type: 'paragraph', content: [{ type: 'text', text: '' }] }],
  };
}

export function serializeTipTapToDisplay(doc, payloadByDisplayRef) {
  const map =
    payloadByDisplayRef?.current instanceof Map ? payloadByDisplayRef.current : null;
  const parts = [];
  doc.forEach((block, idx) => {
    if (idx > 0) parts.push('\n');
    if (block.type?.name !== 'paragraph') return;
    block.content.forEach((node) => {
      if (!node.type) return;
      if (node.isText) {
        parts.push(node.text);
        return;
      }
      if (node.type.name === 'phraseVariable') {
        const v = node.attrs.variant;
        if (v === 'ref') {
          if (node.attrs.refKind === 'local') {
            parts.push(`[REF: ${node.attrs.label || node.attrs.titulo}]`);
          } else {
            parts.push(`{@${node.attrs.titulo || node.attrs.label}}`);
          }
        } else if (v === 'autonum') {
          parts.push(`{#${normalizarPrefixoAutoNum(node.attrs.prefix || node.attrs.titulo)}}`);
        } else if (v === 'score') {
          const token = normalizarNomeScore(node.attrs.titulo || node.attrs.label) || 'soma';
          parts.push(`{${token}}`);
        } else if (v === 'global') {
          parts.push(`{${node.attrs.titulo}}`);
        } else if (map) {
          const display = `[LOCAL: ${node.attrs.label}]`;
          if (node.attrs.payload) map.set(display, node.attrs.payload);
          parts.push(display);
        }
      }
    });
  });
  return parts.join('');
}

function createPhraseVariableExtension(activateRef) {
  const ChipView = (props) => {
    const { node } = props;
    const variant = node.attrs.variant;
    const isRef = variant === 'ref';
    const isAutonum = variant === 'autonum';
    const isScore = variant === 'score';
    const label = variant === 'local' || (isRef && node.attrs.refKind === 'local')
      ? node.attrs.label
      : (isAutonum ? normalizarPrefixoAutoNum(node.attrs.prefix || node.attrs.titulo) : node.attrs.titulo);
    const displayLabel = isAutonum
      ? `{#${label}}`
      : isScore
        ? `{${String(label || '').toLowerCase()}}`
        : isRef
          ? `@${label}`
          : label;
    const isLocal = variant === 'local';

    const fire = () => {
      if (isRef || isAutonum || isScore) return;
      activateRef.current?.({
        variant,
        label: node.attrs.label,
        titulo: node.attrs.titulo,
        payload: node.attrs.payload,
        getPos: props.getPos,
      });
    };

    return (
      <NodeViewWrapper
        as="span"
        style={{
          display: 'inline',
          verticalAlign: 'baseline',
        }}
      >
        <span
          role="button"
          tabIndex={0}
          onMouseDown={(e) => {
            e.preventDefault();
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            fire();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              fire();
            }
          }}
          style={{
            display: 'inline-block',
            maxWidth: '100%',
            boxSizing: 'border-box',
            margin: '0 2px',
            padding: '2px 8px',
            borderRadius: '4px',
            border: '1px solid',
            borderColor: isScore
              ? 'var(--mantine-color-orange-7)'
              : isAutonum
                ? 'var(--mantine-color-violet-7)'
                : isRef
                  ? 'var(--mantine-color-teal-8)'
                  : isLocal
                    ? 'var(--mantine-color-yellow-8)'
                    : 'var(--mantine-color-blue-7)',
            backgroundColor: isScore
              ? 'var(--mantine-color-orange-1)'
              : isAutonum
                ? 'var(--mantine-color-violet-1)'
                : isRef
                  ? 'var(--mantine-color-teal-1)'
                  : isLocal
                    ? 'var(--mantine-color-yellow-1)'
                    : 'var(--mantine-color-blue-0)',
            color: 'var(--mantine-color-dark-7)',
            fontSize: '0.92em',
            fontWeight: 500,
            cursor: isRef || isAutonum || isScore ? 'default' : 'pointer',
            userSelect: 'none',
          }}
          title={
            isScore
              ? (String(label).toLowerCase() === 'soma' ? 'Soma dos pontos das opções' : 'Classificação pela faixa da soma')
              : isAutonum
                ? `Numeração automática ${label}1, ${label}2…`
                : isRef
                  ? `Referência de ${label}`
                  : undefined
          }
        >
          {displayLabel}
        </span>
      </NodeViewWrapper>
    );
  };

  return Node.create({
    name: 'phraseVariable',
    group: 'inline',
    atom: true,
    inline: true,
    draggable: false,
    selectable: true,

    addAttributes() {
      return {
        variant: { default: 'global' },
        refKind: { default: '' },
        titulo: { default: '' },
        label: { default: '' },
        payload: { default: '' },
        prefix: { default: '' },
      };
    },

    addInputRules() {
      return [
        new InputRule({
          find: /\{#([A-Za-zÀ-ÿ]{1,12})\}$/,
          handler: ({ chain, range, match }) => {
            const prefix = normalizarPrefixoAutoNum(match[1]);
            chain()
              .deleteRange(range)
              .insertContent({
                type: this.name,
                attrs: {
                  variant: 'autonum',
                  prefix,
                  titulo: prefix,
                  label: prefix,
                },
              })
              .run();
          },
        }),
        new InputRule({
          find: /\{(soma|classifica[cç][aã]o)\}$/i,
          handler: ({ chain, range, match }) => {
            const titulo = normalizarNomeScore(match[1]) || 'soma';
            chain()
              .deleteRange(range)
              .insertContent({
                type: this.name,
                attrs: {
                  variant: 'score',
                  titulo,
                  label: titulo,
                },
              })
              .run();
          },
        }),
      ];
    },

    parseHTML() {
      return [{ tag: 'span[data-phrase-variable="1"]' }];
    },

    renderHTML({ HTMLAttributes, node }) {
      const v = node.attrs.variant;
      const label = v === 'local' || node.attrs.refKind === 'local'
        ? node.attrs.label
        : node.attrs.titulo;
      let text = `{${label}}`;
      if (v === 'ref') {
        text = node.attrs.refKind === 'local' ? `[REF: ${label}]` : `{@${label}}`;
      } else if (v === 'local') {
        text = `[LOCAL: ${label}]`;
      } else if (v === 'autonum') {
        text = `{#${normalizarPrefixoAutoNum(node.attrs.prefix || label)}}`;
      } else if (v === 'score') {
        const token = normalizarNomeScore(node.attrs.titulo || label) || 'soma';
        text = `{${token}}`;
      }
      return [
        'span',
        mergeAttributes(
          { 'data-phrase-variable': '1', 'data-variant': v },
          HTMLAttributes,
        ),
        text,
      ];
    },

    addNodeView() {
      return ReactNodeViewRenderer(ChipView);
    },
  });
}

const FraseBaseTipTap = forwardRef(function FraseBaseTipTap(
  {
    value,
    onChange,
    localMapRef,
    placeholder,
    onEditorReady,
    onVariableActivate,
    variableCatalog = [],
    minHeight = 88,
  },
  ref,
) {
  const onVariableActivateRef = useRef(onVariableActivate);
  onVariableActivateRef.current = onVariableActivate;

  const catalogRef = useRef(variableCatalog);
  catalogRef.current = variableCatalog;

  const activateBridgeRef = useRef(null);

  const phraseVariableExt = useMemo(
    () => createPhraseVariableExtension(activateBridgeRef),
    [],
  );

  const suggestionExt = useMemo(
    () => createVariableRefSuggestionExtension(catalogRef),
    [],
  );

  const lastEmitted = useRef(value);

  activateBridgeRef.current = (ctx) => onVariableActivateRef.current?.(ctx);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        blockquote: false,
        codeBlock: false,
        horizontalRule: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
        hardBreak: true,
      }),
      phraseVariableExt,
      suggestionExt,
    ],
    content: parseDisplayToTipTapDoc(value, localMapRef),
    editorProps: {
      attributes: {
        class: 'frase-base-tiptap-editor',
        'data-placeholder': placeholder || '',
      },
    },
    onUpdate: ({ editor: ed }) => {
      const next = serializeTipTapToDisplay(ed.state.doc, localMapRef);
      lastEmitted.current = next;
      onChange?.(next);
    },
  });

  useEffect(() => {
    onEditorReady?.(editor ?? null);
    return () => onEditorReady?.(null);
  }, [editor, onEditorReady]);

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    const current = serializeTipTapToDisplay(editor.state.doc, localMapRef);
    if (current === value) return;
    editor.commands.setContent(
      parseDisplayToTipTapDoc(value, localMapRef),
      false,
    );
    lastEmitted.current = value;
  }, [value, editor, localMapRef]);

  const replaceLocalAtPos = useCallback(
    (pos, label, payload) => {
      if (!editor || editor.isDestroyed) return false;
      return editor
        .chain()
        .focus()
        .command(({ tr, state }) => {
          const node = state.doc.nodeAt(pos);
          if (!node || node.type.name !== 'phraseVariable') return false;
          tr.setNodeMarkup(pos, undefined, {
            ...node.attrs,
            variant: 'local',
            label,
            payload,
          });
          return true;
        })
        .run();
    },
    [editor],
  );

  useImperativeHandle(
    ref,
    () => ({
      getEditor: () => editor,
      insertGlobalVariavel: (titulo) => {
        if (!editor || editor.isDestroyed) return;
        editor
          .chain()
          .focus()
          .insertContent({
            type: 'phraseVariable',
            attrs: { variant: 'global', titulo, label: titulo },
          })
          .run();
      },
      insertLocalVariavel: (label, payload) => {
        if (!editor || editor.isDestroyed) return;
        editor
          .chain()
          .focus()
          .insertContent({
            type: 'phraseVariable',
            attrs: { variant: 'local', label, payload },
          })
          .run();
      },
      insertScoreToken: (kind) => {
        if (!editor || editor.isDestroyed) return;
        const titulo = normalizarNomeScore(kind) || 'soma';
        editor
          .chain()
          .focus()
          .insertContent({
            type: 'phraseVariable',
            attrs: { variant: 'score', titulo, label: titulo },
          })
          .run();
      },
      insertPlainText: (text) => {
        if (!editor || editor.isDestroyed) return;
        editor.chain().focus().insertContent(text).run();
      },
      replaceLocalAtPos,
      tryEditSelectedLocalVariavel: () => {
        if (!editor || editor.isDestroyed) return null;
        const sel = editor.state.selection;
        if (
          sel.node &&
          sel.node.type.name === 'phraseVariable' &&
          sel.node.attrs.variant === 'local'
        ) {
          return {
            pos: sel.from,
            label: sel.node.attrs.label,
            payload: sel.node.attrs.payload,
          };
        }
        const { $from } = sel;
        const node = $from.nodeAfter;
        if (
          node &&
          node.type.name === 'phraseVariable' &&
          node.attrs.variant === 'local'
        ) {
          return {
            pos: $from.pos,
            label: node.attrs.label,
            payload: node.attrs.payload,
          };
        }
        return null;
      },
    }),
    [editor, replaceLocalAtPos],
  );

  if (!editor) {
    return null;
  }

  return (
    <Box
      style={{
        minHeight,
        border: '1px solid var(--mantine-color-default-border)',
        borderRadius: 'var(--mantine-radius-sm)',
        background: 'var(--mantine-color-body)',
      }}
    >
      <style>{`
        .frase-base-tiptap-editor.ProseMirror {
          min-height: ${minHeight}px;
          padding: 8px 40px 8px 10px;
          outline: none;
          font-size: var(--mantine-font-size-sm);
          white-space: pre-wrap;
        }
        .frase-base-tiptap-editor.ProseMirror p {
          margin: 0;
        }
        .frase-base-tiptap-editor.ProseMirror:focus {
          outline: none;
        }
      `}</style>
      <EditorContent editor={editor} />
    </Box>
  );
});

export default FraseBaseTipTap;
