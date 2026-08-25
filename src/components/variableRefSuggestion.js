import { Extension } from '@tiptap/core';
import Suggestion from '@tiptap/suggestion';

function montarPopup() {
  const el = document.createElement('div');
  el.className = 'frase-var-ref-popup';
  Object.assign(el.style, {
    position: 'fixed',
    zIndex: '400',
    minWidth: '220px',
    maxWidth: '360px',
    maxHeight: 'min(240px, 50vh)',
    overflowY: 'scroll',
    overflowX: 'hidden',
    overscrollBehavior: 'contain',
    background: 'var(--mantine-color-body, #fff)',
    border: '1px solid var(--mantine-color-default-border, #dee2e6)',
    borderRadius: '6px',
    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
    padding: '4px',
    scrollbarGutter: 'stable',
  });
  el.addEventListener('wheel', (e) => {
    e.stopPropagation();
  }, { passive: true });
  el.addEventListener('touchmove', (e) => {
    e.stopPropagation();
  }, { passive: true });
  return el;
}

function renderLista(el, items, selectedIndex, command) {
  el.innerHTML = '';
  if (!items.length) {
    const vazio = document.createElement('div');
    vazio.textContent = 'Nenhuma variável nesta frase';
    Object.assign(vazio.style, {
      padding: '8px 10px',
      fontSize: '13px',
      color: 'var(--mantine-color-dimmed, #868e96)',
    });
    el.appendChild(vazio);
    return;
  }

  items.forEach((item, index) => {
    const row = document.createElement('button');
    row.type = 'button';
    const tipo = item.kind === 'local' ? 'local' : 'global';
    row.textContent = `${item.titulo} (${tipo})`;
    if (index === selectedIndex) {
      row.dataset.selected = '1';
    }
    Object.assign(row.style, {
      display: 'block',
      width: '100%',
      textAlign: 'left',
      border: 'none',
      background: index === selectedIndex ? 'var(--mantine-color-teal-1, #e6fcf5)' : 'transparent',
      padding: '6px 10px',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '13px',
      color: 'var(--mantine-color-dark-7, #212529)',
    });
    row.onmousedown = (e) => {
      e.preventDefault();
      command(item);
    };
    el.appendChild(row);
  });

  const selecionado = el.querySelector('[data-selected="1"]');
  selecionado?.scrollIntoView({ block: 'nearest' });
}

export function createVariableRefSuggestionExtension(catalogRef) {
  return Extension.create({
    name: 'variableRefSuggestion',

    addOptions() {
      return {
        suggestion: {
          char: '@',
          allowSpaces: true,
          allowedPrefixes: null,
          items: ({ query }) => {
            const list = catalogRef.current || [];
            const q = (query || '').toLowerCase().trim();
            if (!q) return list;
            return list.filter((item) =>
              item.titulo.toLowerCase().includes(q)
            );
          },
          command: ({ editor, range, props }) => {
            if (!props?.titulo) return;
            editor
              .chain()
              .focus()
              .deleteRange(range)
              .insertContent({
                type: 'phraseVariable',
                attrs: {
                  variant: 'ref',
                  refKind: props.kind === 'local' ? 'local' : 'global',
                  titulo: props.titulo,
                  label: props.titulo,
                },
              })
              .run();
          },
          render: () => {
            let popup;
            let selectedIndex = 0;
            let currentProps;

            const refresh = () => {
              if (!popup || !currentProps) return;
              const items = currentProps.items || [];
              selectedIndex = Math.max(0, Math.min(selectedIndex, Math.max(items.length - 1, 0)));
              renderLista(popup, items, selectedIndex, (item) => {
                currentProps.command(item);
              });
              const rect = currentProps.clientRect?.();
              if (rect) {
                popup.style.left = `${rect.left}px`;
                popup.style.top = `${rect.bottom + 6}px`;
              }
            };

            return {
              onStart: (props) => {
                currentProps = props;
                selectedIndex = 0;
                popup = montarPopup();
                document.body.appendChild(popup);
                refresh();
              },
              onUpdate: (props) => {
                currentProps = props;
                refresh();
              },
              onKeyDown: ({ event }) => {
                const items = currentProps?.items || [];
                if (event.key === 'ArrowDown') {
                  event.preventDefault();
                  selectedIndex = items.length ? (selectedIndex + 1) % items.length : 0;
                  refresh();
                  return true;
                }
                if (event.key === 'ArrowUp') {
                  event.preventDefault();
                  selectedIndex = items.length
                    ? (selectedIndex - 1 + items.length) % items.length
                    : 0;
                  refresh();
                  return true;
                }
                if (event.key === 'Enter') {
                  event.preventDefault();
                  const item = items[selectedIndex];
                  if (item) currentProps.command(item);
                  return true;
                }
                if (event.key === 'Escape') {
                  return true;
                }
                return false;
              },
              onExit: () => {
                popup?.remove();
                popup = null;
                currentProps = null;
              },
            };
          },
        },
      };
    },

    addProseMirrorPlugins() {
      return [
        Suggestion({
          editor: this.editor,
          ...this.options.suggestion,
        }),
      ];
    },
  });
}
