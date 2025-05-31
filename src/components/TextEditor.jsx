import { RichTextEditor, Link } from '@mantine/tiptap';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import FontFamily from '@tiptap/extension-font-family';
import FontSize from 'tiptap-fontsize-extension';
import { Select, Stack, Tooltip, Text, Paper, ActionIcon } from '@mantine/core';
import { useEffect, forwardRef, useImperativeHandle, useState, useRef } from 'react';
import History from '@tiptap/extension-history';
import { IconArrowBackUp, IconArrowForwardUp, IconMicrophone, IconMicrophoneOff, IconCopy, IconCut, IconClipboardCopy, IconBold, IconItalic, IconUnderline, IconStrikethrough, IconExclamationMark, IconLetterCase, IconLetterCaseLower, IconDeviceFloppy } from '@tabler/icons-react';

// Função para pluralizar palavras
import pluralize from '../utils/pluralizar';

const editorStyles = {
  '.ProseMirror': {
    '& p': {
      margin: '0.5em 0',
    },
  },
  '.editor-paragraph': {
    fontSize: 'inherit',
  },
  '.ProseMirror [style*="font-size"]': {
    fontSize: 'inherit !important',
  },
  '.ProseMirror span[style*="font-size"]': {
    fontSize: 'inherit !important',
  },
  '.ProseMirror p span[style*="font-size"]': {
    fontSize: 'inherit !important',
  }
};

const TextEditor = forwardRef(({ 
  content, 
  onChange, 
  label = "Editor de Texto",
  onSelectionUpdate,
  onClick,
  aguardandoClique,
  aguardandoSelecao,
  aguardandoLinha
}, ref) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recognition, setRecognition] = useState(null);
  const [previewText, setPreviewText] = useState('');
  const [ultimaPosicaoDolar, setUltimaPosicaoDolar] = useState(-1);
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0 });
  const editorRef = useRef(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        history: false,
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
          HTMLAttributes: {
            class: 'custom-bullet-list',
          },
        },
        paragraph: {
          HTMLAttributes: {
            class: 'editor-paragraph',
          },
        },
      }),
      History.configure({
        depth: 50,
        newGroupDelay: 500,
      }),
      Link,
      TextStyle.configure({
        types: ['textStyle'],
        defaultStyle: {
          fontFamily: 'Arial'
        }
      }),
      FontFamily.configure({
        types: ['textStyle']
      }),
      FontSize.configure({
        defaultSize: '12pt',
        step: 1
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph']
      }),
    ],
    content: content || '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none',
      },
    },
    onUpdate: ({ editor }) => {
      const text = editor.getText();
      
      // Regex para encontrar 3 números consecutivos em qualquer lugar do texto
      const regex = /(\d+(?:\.|,\d+)?)(?:\s+|\s*por\s+)(\d+(?:\.|,\d+)?)(?:\s+|\s*por\s+)(\d+(?:\.|,\d+)?)\s{2}/g;

      // Verifica se há 3 números consecutivos no texto
      const match = regex.exec(text);

      // Verifica se após o último número tem um espaço vazio
      if (match) {
        // Extrai os números dos grupos capturados
        const num1 = parseFloat(match[1].replace(',', '.')).toFixed(1);
        const num2 = parseFloat(match[2].replace(',', '.')).toFixed(1);
        const num3 = parseFloat(match[3].replace(',', '.')).toFixed(1);

        // Ordena os números em ordem decrescente
        const numeros = [num1, num2, num3].sort((a, b) => b - a);
        
        // Calcula o volume
        const volume = (numeros[0] * numeros[1] * numeros[2] * 0.523).toFixed(2);

        // Frase que substituirá os 3 números
        const newText = `${numeros[0]} x ${numeros[1]} x ${numeros[2]} cm, com volume aproximado em ${volume} cm³`;

        // Encontra a posição dos números no texto
        const startIndex = text.indexOf(match[0]);
        const endIndex = startIndex + match[0].length;

        // Substitui os números pela nova frase
        editor.commands.deleteRange({ from: startIndex, to: endIndex });
        editor.commands.insertContentAt(startIndex, newText);
      }

      onChange(editor.getHTML());
    },
    onCreate: ({ editor }) => {
      if (!editor) return;
    },
    onDestroy: (props) => {
    }
  });

  // Função para adicionar pontuação
  const adicionarPontuacao = (texto) => {
    // Remove pontuação no final, se houver
    let textoProcessado = texto.trim().replace(/[.,;:]$/, '');

    // Palavras que indicam final de frase
    const finalizadores = [
      'ponto', 'virgula', 'dois pontos', 'ponto e vírgula',
      'ponto final', 'nova linha', 'próxima linha', 'parágrafo'
    ];

    // Procura por palavras finalizadoras no final do texto
    const match = textoProcessado.match(new RegExp(`(.*?)(${finalizadores.join('|')})$`, 'i'));

    if (match) {
      const [, conteudo, finalizador] = match;
      textoProcessado = conteudo.trim();

      // Adiciona a pontuação apropriada
      switch (finalizador.toLowerCase()) {
        case 'ponto':
        case 'ponto final':
          return textoProcessado + '. ';
        case 'vírgula':
        case 'virgula': // Adiciona variação sem acento
          return textoProcessado + ', ';
        case 'dois pontos':
          return textoProcessado + ': ';
        case 'ponto e vírgula':
        case 'ponto e virgula': // Adiciona variação sem acento
          return textoProcessado + '; ';
        case 'nova linha':
        case 'próxima linha':
        case 'parágrafo':
          return textoProcessado + '.\n';
        default:
          return textoProcessado + ' ';
      }
    }

    // Se não encontrou palavra finalizadora, verifica outras regras
    const palavrasInterrogativas = ['que', 'qual', 'quando', 'onde', 'por que', 'quem', 'como'];
    if (palavrasInterrogativas.some(palavra => 
      textoProcessado.toLowerCase().startsWith(palavra + ' ')
    )) {
      return textoProcessado + '? ';
    }

    // Se termina com entonação de pergunta (detectada pelo ?), adiciona ?
    if (textoProcessado.endsWith('?')) {
      return textoProcessado + ' ';
    }

    // Caso padrão: adiciona ponto final
    // return textoProcessado + '. '; // tava adicionando ponto final em todos os casos
    // para garantir que a palavra "vírgula" seja adicionada com vírgula, coloca um replace vírgula por ,
    // textoProcessado = textoProcessado.replace('vírgula', ',');
    return textoProcessado;
  };

  // Modifica o useEffect do reconhecimento de voz
  useEffect(() => {
    if ('webkitSpeechRecognition' in window) {
      const recognition = new window.webkitSpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'pt-BR';

      recognition.onresult = (event) => {
        const result = event.results[event.results.length - 1];
        const transcript = result[0].transcript;

        // Atualiza o preview com o texto sendo reconhecido
        setPreviewText(transcript);

        // Se o resultado é final, processa e insere no editor
        if (result.isFinal) {
          if (editor) {
            const { from } = editor.state.selection;
            const textoProcessado = adicionarPontuacao(transcript);
            
            editor.chain()
              .focus()
              .insertContentAt(from, textoProcessado)
              .run();
            
            // Limpa o preview após inserir
            setPreviewText('');
          }
        }
      };

      recognition.onerror = (event) => {
        console.error('Erro no reconhecimento de voz:', event.error);
        setIsRecording(false);
      };

      recognition.onend = () => {
        if (isRecording) {
          try {
            recognition.start();
          } catch (error) {
            console.error('Erro ao reiniciar gravação:', error);
            setIsRecording(false);
          }
        }
      };

      setRecognition(recognition);
    }
  }, []);

  const toggleRecording = () => {
    if (!recognition) {
      alert('Seu navegador não suporta reconhecimento de voz.');
      return;
    }

    if (isRecording) {
      recognition.stop();
      setIsRecording(false);
    } else {
      try {
        // Garante que o editor está focado antes de começar a gravação
        editor?.commands.focus();
        recognition.start();
        setIsRecording(true);
      } catch (error) {
        if (error.name === 'NotAllowedError') {
          alert('Por favor, permita o acesso ao microfone para usar esta função.');
        } else {
          console.error('Erro ao iniciar gravação:', error);
          alert('Erro ao iniciar a gravação. Por favor, tente novamente.');
        }
        setIsRecording(false);
      }
    }
  };

  // Adiciona o event listener para o atalho de teclado
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Alt + R para gravação
      if (event.altKey && event.key === 'r') {
        event.preventDefault();
        toggleRecording();
      }

      // Alt + F para buscar #
      if (event.altKey && event.key === 'f') {
        event.preventDefault();
        if (editor) {
          const text = editor.getText();
          // Procura a próxima ocorrência após a última posição encontrada
          const posicaoDolar = text.indexOf('#', ultimaPosicaoDolar + 2);
          
          if (posicaoDolar !== -1) {
            // Move o cursor para a posição do $
            editor.commands.setTextSelection({from: posicaoDolar+1, to: posicaoDolar+3});
            // seleciona o texto encontrado
            
            editor.commands.focus();
            // Atualiza a última posição encontrada
            setUltimaPosicaoDolar(posicaoDolar);
          } else {
            // Se não encontrou mais ocorrências, reinicia a busca do início
            setUltimaPosicaoDolar(-1);
          }
        }
      }

      // Ctrl + + para duplicar linha
      if (event.ctrlKey && event.key === '+') {
        event.preventDefault();
        if (editor) {
          // Pega a posição atual do cursor
          const { from } = editor.state.selection;
          
          // Encontra o início e fim da linha atual
          const $pos = editor.state.doc.resolve(from);
          const start = $pos.start();
          const end = $pos.end();
          
          // Pega o conteúdo da linha atual com a formatação HTML
          const conteudoHTML = editor.view.domAtPos(start).node.innerHTML;
          
          // Insere uma quebra de linha e o conteúdo duplicado com a formatação
          editor.chain()
            .focus()
            .insertContentAt(end + 1, conteudoHTML)
            .run();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isRecording, editor, ultimaPosicaoDolar]); // Adiciona ultimaPosicaoDolar como dependência

  // Expõe o editor através da ref
  useImperativeHandle(ref, () => ({
    editor
  }));

  // Atualiza o conteúdo do editor quando a prop content mudar
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content || '');
    }
  }, [content, editor]);

  const fonts = [
    { value: 'Arial', label: 'Arial' },
    { value: 'Times New Roman', label: 'Times New Roman' },
    { value: 'Calibri', label: 'Calibri' },
    { value: 'Georgia', label: 'Georgia' },
    { value: 'Verdana', label: 'Verdana' },
    { value: 'Helvetica', label: 'Helvetica' },
  ];

  const fontSizes = [
    { value: '8pt', label: '8pt' },
    { value: '9pt', label: '9pt' },
    { value: '10pt', label: '10pt' },
    { value: '11pt', label: '11pt' },
    { value: '12pt', label: '12pt' },
    { value: '14pt', label: '14pt' },
    { value: '16pt', label: '16pt' },
    { value: '18pt', label: '18pt' },
    { value: '20pt', label: '20pt' },
    { value: '24pt', label: '24pt' },
    { value: '28pt', label: '28pt' },
    { value: '32pt', label: '32pt' },
    { value: '36pt', label: '36pt' },
    { value: '40pt', label: '40pt' },
    { value: '48pt', label: '48pt' },
  ];

  const handleEditorClick = (event) => {
    if (aguardandoClique && onClick) {
      onClick();
    } else if (aguardandoLinha && onClick) {
      // Encontra o elemento de parágrafo mais próximo
      const paragraph = event.target.closest('p');
      if (paragraph) {
        onClick({ type: 'linha', element: paragraph });
      }
    }
  };

  const handleMouseUp = () => {
    if (aguardandoSelecao && editor) {
      const { from, to } = editor.state.selection;
      if (from !== to) {
        onSelectionUpdate(editor);
      }
    }
  };

  const handleContextMenu = (event) => {
    event.preventDefault();
    const { clientX, clientY } = event;
    setContextMenu({ visible: true, x: clientX, y: clientY });
  };

  useEffect(() => {
    const handleClickOutside = () => {
      setContextMenu({ visible: false, x: 0, y: 0 });
    };
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  const handleFontSizeChange = (value) => {
    if (editor) {
      editor.commands.setFontSize(value);
    }
  };

  return (
    <Stack spacing="md" style={{ position: 'relative' }}>
      {/* Preview flutuante */}
      {isRecording && previewText && (
        <Paper
          shadow="sm"
          p="md"
          style={{
            position: 'absolute',
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginBottom: '20px',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            zIndex: 1000,
            maxWidth: '90%',
            minWidth: '400px',
            border: '2px solid #dee2e6',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
          }}
        >
          <Text 
            size="lg"
            style={{ 
              color: '#495057',
              fontStyle: 'italic',
              lineHeight: 1.5,
              padding: '8px',
              whiteSpace: 'pre-wrap'
            }}
          >
            {previewText}
          </Text>
        </Paper>
      )}

      {/* Indicador de gravação ativa */}
      {isRecording && !previewText && (
        <Paper
          shadow="sm"
          p="md"
          style={{
            position: 'absolute',
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginBottom: '20px',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            zIndex: 1000,
            minWidth: '200px',
            border: '2px solid #dee2e6',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
          }}
        >
          <Text 
            size="lg"
            style={{ 
              color: '#495057',
              textAlign: 'center',
              animation: 'pulse 1.5s infinite'
            }}
          >
            Ouvindo...
          </Text>
        </Paper>
      )}

      <div 
        onClick={handleEditorClick}
        onMouseUp={handleMouseUp}
        onContextMenu={handleContextMenu}
        style={{ 
          cursor: aguardandoClique || aguardandoLinha ? 'pointer' : 'text',
          position: 'relative',
          opacity: (aguardandoClique || aguardandoSelecao || aguardandoLinha) ? 0.8 : 1
        }}
      >
        <RichTextEditor 
          editor={editor} 
          style={{ 
            minHeight: 300,
            opacity: aguardandoClique || aguardandoLinha ? 0.8 : 1
          }}
          styles={editorStyles}
        >
          <RichTextEditor.Toolbar sticky stickyOffset={60}>
            <RichTextEditor.ControlsGroup>
              <Tooltip label="Desfazer (Ctrl+Z)">
                <RichTextEditor.Control
                  onClick={() => editor?.commands.undo()}
                  disabled={!editor?.can().undo()}
                  aria-label="Desfazer"
                >
                  <IconArrowBackUp size={16} />
                </RichTextEditor.Control>
              </Tooltip>
              <Tooltip label="Refazer (Ctrl+Y)">
                <RichTextEditor.Control
                  onClick={() => editor?.commands.redo()}
                  disabled={!editor?.can().redo()}
                  aria-label="Refazer"
                >
                  <IconArrowForwardUp size={16} />
                </RichTextEditor.Control>
              </Tooltip>
            </RichTextEditor.ControlsGroup>

            <RichTextEditor.ControlsGroup>
              <Tooltip 
                label={`${isRecording ? "Parar" : "Iniciar"} Gravação (Alt+R)`}
                position="bottom"
                withArrow
              >
                <RichTextEditor.Control
                  onClick={toggleRecording}
                  className={isRecording ? 'recording' : ''}
                  style={{
                    color: isRecording ? 'red' : undefined,
                    animation: isRecording ? 'pulse 1.5s infinite' : undefined
                  }}
                >
                  {isRecording ? <IconMicrophoneOff size={16} /> : <IconMicrophone size={16} />}
                </RichTextEditor.Control>
              </Tooltip>
            </RichTextEditor.ControlsGroup>

            <RichTextEditor.ControlsGroup>
              <Select
                size="xs"
                placeholder="Fonte"
                data={fonts}
                value={editor?.getAttributes('textStyle').fontFamily}
                onChange={(value) => {
                  editor?.chain().focus().setFontFamily(value).run();
                }}
                style={{ width: 150 }}
              />
              <Select
                size="xs"
                placeholder="Tamanho"
                data={fontSizes}
                value={editor?.getAttributes('textStyle').fontSize}
                onChange={handleFontSizeChange}
                style={{ width: 100 }}
              />
            </RichTextEditor.ControlsGroup>

            <RichTextEditor.ControlsGroup>
              <RichTextEditor.Bold />
              <RichTextEditor.Italic />
              <RichTextEditor.Underline />
              <RichTextEditor.Strikethrough />
              <RichTextEditor.ClearFormatting />
              <RichTextEditor.Code />
            </RichTextEditor.ControlsGroup>

            <RichTextEditor.ControlsGroup>
              <RichTextEditor.H1 />
              <RichTextEditor.H2 />
              <RichTextEditor.H3 />
              <RichTextEditor.H4 />
            </RichTextEditor.ControlsGroup>

            <RichTextEditor.ControlsGroup>
              <RichTextEditor.AlignLeft />
              <RichTextEditor.AlignCenter />
              <RichTextEditor.AlignRight />
              <RichTextEditor.AlignJustify />
            </RichTextEditor.ControlsGroup>

            <RichTextEditor.ControlsGroup>
              <RichTextEditor.Blockquote />
              <RichTextEditor.Hr />
              <RichTextEditor.BulletList />
              <RichTextEditor.OrderedList />
            </RichTextEditor.ControlsGroup>
          </RichTextEditor.Toolbar>

          <RichTextEditor.Content />
        </RichTextEditor>
      </div>

      {/* Context Menu */}
      {contextMenu.visible && (
        <Paper
          shadow="md"
          p="xs"
          style={{
            position: 'fixed',
            top: contextMenu.y,
            left: contextMenu.x,
            zIndex: 1000,
            backgroundColor: 'white',
            border: '1px solid #dee2e6',
            borderRadius: '4px',
            display: 'flex',
            flexDirection: 'row',
            gap: '4px'
          }}
        >
          <Tooltip label="Copiar o texto selecionado" zIndex={1001}>
            <ActionIcon
              variant="subtle"
              color="gray"
              onClick={() => {
                document.execCommand('copy');
                setContextMenu({ visible: false, x: 0, y: 0 });
              }}
            >
              <IconCopy size={16} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Recortar o texto selecionado" zIndex={1001}>
            <ActionIcon
              variant="subtle"
              color="gray"
              onClick={() => {
                document.execCommand('cut');
                setContextMenu({ visible: false, x: 0, y: 0 });
              }}
            >
              <IconCut size={16} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Colar o conteúdo da área de transferência" zIndex={1001}>
            <ActionIcon
              variant="subtle"
              color="gray"
              onClick={() => {
                document.execCommand('paste');
                setContextMenu({ visible: false, x: 0, y: 0 });
              }}
            >
              <IconClipboardCopy size={16} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Aplicar negrito ao texto selecionado" zIndex={1001}>
            <ActionIcon
              variant="subtle"
              color="gray"
              onClick={() => {
                editor?.chain().focus().toggleBold().run();
                setContextMenu({ visible: false, x: 0, y: 0 });
              }}
            >
              <IconBold size={16} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Aplicar itálico ao texto selecionado" zIndex={1001}>
            <ActionIcon
              variant="subtle"
              color="gray"
              onClick={() => {
                editor?.chain().focus().toggleItalic().run();
                setContextMenu({ visible: false, x: 0, y: 0 });
              }}
            >
              <IconItalic size={16} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Aplicar sublinhado ao texto selecionado" zIndex={1001}>
            <ActionIcon
              variant="subtle"
              color="gray"
              onClick={() => {
                editor?.chain().focus().toggleUnderline().run();
                setContextMenu({ visible: false, x: 0, y: 0 });
              }}
            >
              <IconUnderline size={16} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Aplicar tachado ao texto selecionado" zIndex={1001}>
            <ActionIcon
              variant="subtle"
              color="gray"
              onClick={() => {
                editor?.chain().focus().toggleStrike().run();
                setContextMenu({ visible: false, x: 0, y: 0 });
              }}
            >
              <IconStrikethrough size={16} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Transformar texto em maiúsculas" zIndex={1001}>
            <ActionIcon
              variant="subtle"
              color="gray"
              onClick={() => {
                if (editor) {
                  const { from, to } = editor.state.selection;
                  const text = editor.state.doc.textBetween(from, to);
                  editor.chain().focus().deleteRange({ from, to }).insertContent(text.toUpperCase()).run();
                }
                setContextMenu({ visible: false, x: 0, y: 0 });
              }}
            >
              <IconLetterCase size={16} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Transformar texto em minúsculas" zIndex={1001}>
            <ActionIcon
              variant="subtle"
              color="gray"
              onClick={() => {
                if (editor) {
                  const { from, to } = editor.state.selection;
                  const text = editor.state.doc.textBetween(from, to);
                  editor.chain().focus().deleteRange({ from, to }).insertContent(text.toLowerCase()).run();
                }
                setContextMenu({ visible: false, x: 0, y: 0 });
              }}
            >
              <IconLetterCaseLower size={16} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Pluralizar texto selecionado" zIndex={1001}>
            <ActionIcon
              variant="subtle"
              color="gray"
              onClick={() => {
                if (editor) {
                  const { from, to } = editor.state.selection;
                  const text = editor.state.doc.textBetween(from, to);
                  const textoPluralizado = pluralize(text);
                  editor.chain().focus().deleteRange({ from, to }).insertContent(textoPluralizado).run();
                }
                setContextMenu({ visible: false, x: 0, y: 0 });
              }}
            >
              <IconExclamationMark size={16} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Salvar Frase" zIndex={1001}>
            <ActionIcon
              variant="subtle"
              color="gray"
              onClick={() => {
                if (editor) {
                  const { from, to } = editor.state.selection;
                  let textoSelecionado;
                  
                  // Se não houver seleção, pega a frase completa onde está o cursor
                  if (from === to) {
                    const $pos = editor.state.doc.resolve(from);
                    const start = $pos.start();
                    const end = $pos.end();
                    textoSelecionado = editor.state.doc.textBetween(start, end);
                  } else {
                    textoSelecionado = editor.state.doc.textBetween(from, to);
                  }

                  // Salva o texto selecionado no localStorage
                  localStorage.setItem('textoFraseBase', textoSelecionado);
                  
                  // Abre nova aba na página Frases
                  window.open('https://laudos-frontend-orpin.vercel.app/frases', '_blank');
                }
                setContextMenu({ visible: false, x: 0, y: 0 });
              }}
            >
              <IconDeviceFloppy size={16} />
            </ActionIcon>
          </Tooltip>
        </Paper>
      )}

      <style>{`
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
      `}</style>
    </Stack>
  );
});

export default TextEditor; 
