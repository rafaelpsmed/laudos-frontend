import {
  useEditor,
  EditorContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
} from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Node, mergeAttributes } from '@tiptap/core';
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';
import { Box } from '@mantine/core';

const LOCAL_TOKEN_RE = /^\[LOCAL: [^\]]+\]$/;
const VAR_TOKEN_RE = /(\[LOCAL: [^\]]+\]|\{[^}]+\})/g;

function extractLocalLabel(fullToken) {
  return fullToken.slice(8, -1).trim();
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
    if (LOCAL_TOKEN_RE.test(token)) {
      const label = extractLocalLabel(token);
      const displayKey = `[LOCAL: ${label}]`;
      const payload = map?.get(displayKey) || '';
      content.push({
        type: 'phraseVariable',
        attrs: { variant: 'local', label, payload },
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
        if (v === 'global') {
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
    const label = variant === 'local' ? node.attrs.label : node.attrs.titulo;
    /** Exibição só com o nome (storage e formato canônico seguem `{x}` / `[LOCAL: x]`) */
    const displayLabel = label;
    const isLocal = variant === 'local';

    const fire = () => {
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
            borderColor: isLocal
              ? 'var(--mantine-color-yellow-8)'
              : 'var(--mantine-color-blue-7)',
            backgroundColor: isLocal
              ? 'var(--mantine-color-yellow-1)'
              : 'var(--mantine-color-blue-0)',
            color: 'var(--mantine-color-dark-7)',
            fontSize: '0.92em',
            fontWeight: 500,
            cursor: 'pointer',
            userSelect: 'none',
          }}
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
        titulo: { default: '' },
        label: { default: '' },
        payload: { default: '' },
      };
    },

    parseHTML() {
      return [{ tag: 'span[data-phrase-variable="1"]' }];
    },

    renderHTML({ HTMLAttributes, node }) {
      const v = node.attrs.variant;
      const label = v === 'local' ? node.attrs.label : node.attrs.titulo;
      const text = v === 'local' ? `[LOCAL: ${label}]` : `{${label}}`;
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
    minHeight = 88,
  },
  ref,
) {
  const onVariableActivateRef = useRef(onVariableActivate);
  onVariableActivateRef.current = onVariableActivate;


  const activateBridgeRef = useRef(null);

  const phraseVariableExt = useMemo(
    () => createPhraseVariableExtension(activateBridgeRef),
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
