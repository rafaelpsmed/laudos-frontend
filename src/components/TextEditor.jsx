import { RichTextEditor, Link } from '@mantine/tiptap';
import debounce from 'lodash/debounce';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import FontFamily from '@tiptap/extension-font-family';
import FontSize from 'tiptap-fontsize-extension';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import { Select, Stack, Tooltip, Text, Paper, ActionIcon, Modal, NumberInput, Button, Group } from '@mantine/core';
import { useEffect, useCallback, forwardRef, useImperativeHandle, useState, useRef } from 'react';
import History from '@tiptap/extension-history';
import { IconArrowBackUp, IconArrowForwardUp, IconMicrophone, IconMicrophoneOff, IconCopy, IconCut, IconClipboardCopy, IconBold, IconItalic, IconUnderline, IconStrikethrough, IconExclamationMark, IconLetterCase, IconLetterCaseLower, IconDeviceFloppy, IconTable, IconTrash, IconArrowRight } from '@tabler/icons-react';

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
  },
  // Estilos para tabelas
  '.ProseMirror table': {
    borderCollapse: 'collapse',
    tableLayout: 'fixed',
    width: '100%',
    margin: '1em 0',
    overflow: 'hidden',
    border: '1px solid #000',
  },
  '.ProseMirror td, .ProseMirror th': {
    border: '1px solid #000',
    padding: '8px 12px',
    position: 'relative',
    minWidth: '1em',
    wordBreak: 'break-word',
    verticalAlign: 'top',
  },
  '.ProseMirror th': {
    fontWeight: 'bold',
    backgroundColor: '#f8f9fa',
    textAlign: 'center',
    border: '1px solid #000',
  },
  '.ProseMirror .selectedCell:after': {
    zIndex: 2,
    position: 'absolute',
    content: '""',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    background: 'rgba(200, 200, 255, 0.4)',
    pointerEvents: 'none',
  },
  '.ProseMirror .column-resize-handle': {
    backgroundColor: '#adf',
    bottom: '-2px',
    position: 'absolute',
    right: '-2px',
    pointerEvents: 'none',
    top: 0,
    width: '4px',
  },
  '.ProseMirror table p': {
    margin: 0,
  },
  '.ProseMirror .resize-cursor': {
    cursor: 'ew-resize',
    cursor: 'col-resize',
  },
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
  const [ultimoResultadoIndex, setUltimoResultadoIndex] = useState(0);
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0 });
  const [isProcessing, setIsProcessing] = useState(false);
  const processingRef = useRef(false); // flag para evitar loops
  const [modalTabelaAberto, setModalTabelaAberto] = useState(false);
  const [linhasTabela, setLinhasTabela] = useState(3);
  const [colunasTabela, setColunasTabela] = useState(3);
  const editorRef = useRef(null);
  const lastProcessedTextRef = useRef('');
  const debounceTimeoutRef = useRef(null);
  const lastSpaceTimeRef = useRef(0); // Para detectar 2 espaços consecutivos

  const processVolumeCalculation = useCallback((editor) => {
    // console.log('🔍 Iniciando processamento de regex:', new Date().toISOString());
    
    // Previne execução durante processamento
    if (processingRef.current) {
      // console.log('⏸️ Processamento bloqueado - já em andamento');
      return;
    }
    
    const text = editor.getText();
    // const regex = /(\d+(?:\.|,\d+)?)(?:\s+|\s*por\s+)(\d+(?:\.|,\d+)?)(?:\s+|\s*por\s+)(\d+(?:\.|,\d+)?)\s*-/g;
    const regex = /(\d+(?:\.|,\d+)?)(?:\s+|\s*por\s+)(\d+(?:\.|,\d+)?)(?:\s+|\s*por\s+)(\d+(?:\.|,\d+)?)\s/g;
    
    let match;
    let hasChanges = false;
    
    // Processa todos os matches
    while ((match = regex.exec(text)) !== null) {
      // console.log('✅ Match encontrado:', match[0]);
      
      processingRef.current = true; // Bloqueia novos processamentos
      
      const num1 = parseFloat(match[1].replace(',', '.')).toFixed(1);
      const num2 = parseFloat(match[2].replace(',', '.')).toFixed(1);
      const num3 = parseFloat(match[3].replace(',', '.')).toFixed(1);

      // console.log('📊 Números:', num1, num2, num3);

      // Ordena os números em ordem decrescente
      const numeros = [num1, num2, num3].sort((a, b) => b - a);
      const volume = (numeros[0] * numeros[1] * numeros[2] * 0.523).toFixed(2);
      const newText = `${numeros[0]} x ${numeros[1]} x ${numeros[2]} cm, com volume aproximado em ${volume} cm³`;

      // console.log('📏 Volume calculado:', volume);
      // console.log('🔄 Novo texto:', newText);

      // Substitui o texto
      const startIndex = match.index;
      const endIndex = startIndex + match[0].length;
      
      editor.chain()
        .focus()
        .deleteRange({ from: startIndex, to: endIndex })
        .insertContentAt(startIndex, newText)
        .run();
        
      hasChanges = true;
      break; // Processa um por vez para evitar problemas
    }
    
    if (hasChanges) {
      // console.log('✅ Mudanças aplicadas com sucesso');
      // Reseta o flag após um pequeno delay
      setTimeout(() => {
        processingRef.current = false;
      }, 300);
    } else {
      // console.log('❌ Nenhum match encontrado');
      processingRef.current = false;
      setIsProcessing(false);
    }
  }, [onChange]);

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
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: content || '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none',
      },
    },

    onUpdate: ({ editor }) => {
      // Chama onChange para manter o estado atualizado
      onChange(editor.getHTML());
    },
    onCreate: ({ editor }) => {
      if (!editor) return;
    },
    onDestroy: (props) => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    }
  });




    // Função para adicionar pontuação
  const adicionarPontuacao = (texto) => {
    let textoProcessado = texto.trim();
    
          // Substitui palavras por pontuação
      textoProcessado = textoProcessado.replace(/\b vírgula\b/gi, ',');
      textoProcessado = textoProcessado.replace(/\b virgula\b/gi, ',');
      textoProcessado = textoProcessado.replace(/\b ponto final\b/gi, '.');
      textoProcessado = textoProcessado.replace(/\b ponto e vírgula\b/gi, ';');
      textoProcessado = textoProcessado.replace(/\b ponto e virgula\b/gi, ';');
      textoProcessado = textoProcessado.replace(/\b hífen\b/gi, '-');
      textoProcessado = textoProcessado.replace(/\b hifen\b/gi, '-');
      textoProcessado = textoProcessado.replace(/\b nova linha\b/gi, '\n');
      textoProcessado = textoProcessado.replace(/\b próxima linha\b/gi, '\n');
      textoProcessado = textoProcessado.replace(/\b parágrafo\b/gi, '\n');
      
      // Capitaliza primeira letra após ponto final
      textoProcessado = textoProcessado.replace(/\.\s+([a-z])/g, (match, letter) => {
        return '. ' + letter.toUpperCase();
      });
      
      // Capitaliza primeira letra após hífen
      textoProcessado = textoProcessado.replace(/-\s+([a-z])/g, (match, letter) => {
        return '- ' + letter.toUpperCase();
      });
      
      return textoProcessado + ' ';
  };

  // Implementação básica do reconhecimento de voz
  useEffect(() => {
    if ('webkitSpeechRecognition' in window) {
      const recognition = new window.webkitSpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'pt-BR';

      recognition.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';

        // Processa apenas os resultados novos (não processados anteriormente)
        for (let i = ultimoResultadoIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const transcript = result[0].transcript;

          if (result.isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }

        // Atualiza o índice do último resultado processado
        setUltimoResultadoIndex(event.results.length);

        // Atualiza o preview com o texto atual
        const textoAtual = finalTranscript + interimTranscript;
        setPreviewText(textoAtual);

        // Se há resultado final, insere no editor
        if (finalTranscript.trim() && editor) {
          const { from } = editor.state.selection;
          const textoProcessado = adicionarPontuacao(finalTranscript.trim());
          
          editor.chain()
            .focus()
            .insertContentAt(from, textoProcessado)
            .run();
          
          // Limpa o preview e reinicia o reconhecimento
          setPreviewText('');
          setUltimoResultadoIndex(0);

          // Reinicia o reconhecimento para evitar duplicação
          setTimeout(() => {
            recognition.start();
          }, 200);         

        }
        
        
      };

      recognition.onerror = (event) => {
        console.error('Erro no reconhecimento de voz:', event.error);
        setIsRecording(false);
      };

      recognition.onend = () => {
        // Não reinicia automaticamente, pois estamos controlando manualmente
        console.log('Reconhecimento terminou');
      };

      setRecognition(recognition);
    }
  }, [editor]);

  const toggleRecording = () => {
    if (!recognition) {
      alert('Seu navegador não suporta reconhecimento de voz.');
      return;
    }

    if (isRecording) {
      recognition.stop();
      setIsRecording(false);
      setPreviewText('');
    } else {
      try {
        editor?.commands.focus();
        recognition.start();
        setIsRecording(true);
        setPreviewText('');
        setUltimoResultadoIndex(0);
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

      // Ctrl + Shift + C para copiar tabela
      if (event.ctrlKey && event.shiftKey && event.key === 'C') {
        event.preventDefault();
        copiarTabela();
      }

      // Ctrl + Shift + V para colar tabela
      if (event.ctrlKey && event.shiftKey && event.key === 'V') {
        event.preventDefault();
        colarTabela();
      }

      // Delete para deletar tabela
      if (event.key === 'Delete' && !event.ctrlKey && !event.shiftKey) {
        const { from } = editor.state.selection;
        const $pos = editor.state.doc.resolve(from);
        if ($pos.parent.type.name === 'table') {
          event.preventDefault();
          deletarTabela();
        }
      }

      // Tab para sair da tabela
      if (event.key === 'Tab' && !event.ctrlKey && !event.shiftKey) {
        const { from } = editor.state.selection;
        const $pos = editor.state.doc.resolve(from);
        if ($pos.parent.type.name === 'table') {
          // Se estiver na última célula da tabela, sai da tabela
          const tableEnd = $pos.end();
          const nextPos = editor.state.doc.resolve(tableEnd + 1);
          if (nextPos.parent.type.name !== 'table') {
            event.preventDefault();
            sairDaTabela();
          }
        }
      }

      // Tecla espaço para executar regex de volume (2 espaços consecutivos)
      if (event.key === ' ' && !event.ctrlKey && !event.shiftKey && !event.altKey) {
        const currentTime = Date.now();
        const timeSinceLastSpace = currentTime - lastSpaceTimeRef.current;
        
        // Se o último espaço foi pressionado há menos de 500ms, considera como duplo espaço
        if (timeSinceLastSpace < 500) {
          // console.log('🚀 Dois espaços consecutivos detectados - executando regex');
          if (editor) {
            // Pequeno delay para garantir que o segundo espaço foi inserido
            setTimeout(() => {
              processVolumeCalculation(editor);
            }, 10);
          }
          // Reseta o tempo para evitar múltiplas execuções
          lastSpaceTimeRef.current = 0;
        } else {
          // Primeiro espaço - apenas registra o tempo
          // console.log('📝 Primeiro espaço detectado');
          lastSpaceTimeRef.current = currentTime;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isRecording, editor, ultimaPosicaoDolar, processVolumeCalculation]); // Adiciona processVolumeCalculation como dependência

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

  const inserirTabela = () => {
    if (editor) {
      editor.commands.insertTable({
        rows: linhasTabela,
        cols: colunasTabela,
        withHeaderRow: true,
      });
      setModalTabelaAberto(false);
    }
  };

  const copiarTabela = () => {
    if (editor) {
      const { from, to } = editor.state.selection;
      
      // Verifica se há uma tabela selecionada
      const $from = editor.state.doc.resolve(from);
      const $to = editor.state.doc.resolve(to);
      
      // Encontra a tabela que contém a seleção
      let tableStart = from;
      let tableEnd = to;
      
      // Procura o início da tabela
      for (let i = from; i >= 0; i--) {
        const $pos = editor.state.doc.resolve(i);
        if ($pos.parent.type.name === 'table') {
          tableStart = $pos.start();
          break;
        }
      }
      
      // Procura o fim da tabela
      for (let i = to; i < editor.state.doc.content.size; i++) {
        const $pos = editor.state.doc.resolve(i);
        if ($pos.parent.type.name === 'table') {
          tableEnd = $pos.end();
          break;
        }
      }
      
      // Se encontrou uma tabela, copia em formato tabulado
      if (tableStart < tableEnd) {
        // Cria um elemento temporário para extrair o HTML da tabela
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = editor.getHTML();
        
        // Encontra a tabela no HTML
        const tableElement = tempDiv.querySelector('table');
        if (tableElement) {
          // Extrai dados da tabela para formato tabulado
          const rows = tableElement.querySelectorAll('tr');
          const tableData = [];
          
          rows.forEach(row => {
            const cells = row.querySelectorAll('td, th');
            const rowData = [];
            cells.forEach(cell => {
              // Remove quebras de linha e espaços extras
              const cellText = cell.textContent.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
              rowData.push(cellText);
            });
            tableData.push(rowData);
          });
          
          // Converte para formato tabulado (separado por tabs)
          const tabulatedText = tableData.map(row => row.join('\t')).join('\n');
          
          // Copia o texto tabulado (mais compatível com aplicativos desktop)
          navigator.clipboard.writeText(tabulatedText).then(() => {
            console.log('Tabela copiada em formato tabulado');
          }).catch(err => {
            console.error('Erro ao copiar tabela:', err);
            // Fallback para navegadores antigos
            const textArea = document.createElement('textarea');
            textArea.value = tabulatedText;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
          });
        }
      } else {
        // Se não há tabela selecionada, copia o texto normal
        const selectedText = editor.state.doc.textBetween(from, to);
        navigator.clipboard.writeText(selectedText).catch(err => {
          console.error('Erro ao copiar texto:', err);
          document.execCommand('copy');
        });
      }
    }
  };

  const colarTabela = async () => {
    if (editor) {
      try {
        const clipboardText = await navigator.clipboard.readText();
        
        // Verifica se o texto copiado contém uma tabela HTML
        if (clipboardText.includes('<table') && clipboardText.includes('</table>')) {
          // Insere o HTML da tabela na posição atual
          editor.commands.insertContent(clipboardText);
        } else {
          // Se não for uma tabela, insere como texto normal
          editor.commands.insertContent(clipboardText);
        }
      } catch (err) {
        console.error('Erro ao colar tabela:', err);
        // Fallback: usa o método antigo
        document.execCommand('paste');
      }
    }
  };

  const deletarTabela = () => {
    if (editor) {
      const { from, to } = editor.state.selection;
      
      // Verifica se há uma tabela selecionada
      const $from = editor.state.doc.resolve(from);
      const $to = editor.state.doc.resolve(to);
      
      // Encontra a tabela que contém a seleção
      let tableStart = from;
      let tableEnd = to;
      
      // Procura o início da tabela
      for (let i = from; i >= 0; i--) {
        const $pos = editor.state.doc.resolve(i);
        if ($pos.parent.type.name === 'table') {
          tableStart = $pos.start();
          break;
        }
      }
      
      // Procura o fim da tabela
      for (let i = to; i < editor.state.doc.content.size; i++) {
        const $pos = editor.state.doc.resolve(i);
        if ($pos.parent.type.name === 'table') {
          tableEnd = $pos.end();
          break;
        }
      }
      
      // Se encontrou uma tabela, deleta ela
      if (tableStart < tableEnd) {
        editor.commands.deleteRange({ from: tableStart, to: tableEnd });
        console.log('Tabela deletada');
      }
    }
  };

  const sairDaTabela = () => {
    if (editor) {
      const { from } = editor.state.selection;
      
      // Verifica se está dentro de uma tabela
      const $pos = editor.state.doc.resolve(from);
      if ($pos.parent.type.name === 'table') {
        // Encontra o fim da tabela
        let tableEnd = from;
        for (let i = from; i < editor.state.doc.content.size; i++) {
          const $pos = editor.state.doc.resolve(i);
          if ($pos.parent.type.name === 'table') {
            tableEnd = $pos.end();
          } else {
            break;
          }
        }
        
        // Move o cursor para depois da tabela
        editor.commands.setTextSelection(tableEnd + 1);
        
        // Insere uma quebra de linha se necessário
        const nextPos = editor.state.doc.resolve(tableEnd + 1);
        if (nextPos.parent.type.name !== 'paragraph') {
          editor.commands.insertContent('\n');
        }
        
        console.log('Saiu da tabela');
      }
    }
  };

  return (
    <Stack spacing="md" style={{ position: 'relative' }}>
      {/* Preview do texto sendo reconhecido */}
      {isRecording && previewText && (
        <Paper
          shadow="sm"
          p="md"
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            zIndex: 1000,
            maxWidth: '80%',
            minWidth: '400px',
            maxHeight: '60vh',
            overflowY: 'auto',
            border: '2px solid #dee2e6',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
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
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            zIndex: 1000,
            minWidth: '200px',
            border: '2px solid #dee2e6',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
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

            <RichTextEditor.ControlsGroup>
              <Tooltip label="Inserir Tabela">
                <RichTextEditor.Control
                  onClick={() => setModalTabelaAberto(true)}
                  aria-label="Inserir Tabela"
                >
                  <IconTable size={16} />
                </RichTextEditor.Control>
              </Tooltip>
              <Tooltip label="Copiar Tabela como Texto (Ctrl+Shift+C)">
                <RichTextEditor.Control
                  onClick={copiarTabela}
                  aria-label="Copiar Tabela"
                >
                  <IconCopy size={16} />
                </RichTextEditor.Control>
              </Tooltip>
              <Tooltip label="Colar Tabela (Ctrl+Shift+V)">
                <RichTextEditor.Control
                  onClick={colarTabela}
                  aria-label="Colar Tabela"
                >
                  <IconClipboardCopy size={16} />
                </RichTextEditor.Control>
              </Tooltip>
              <Tooltip label="Deletar Tabela (Delete)">
                <RichTextEditor.Control
                  onClick={deletarTabela}
                  aria-label="Deletar Tabela"
                >
                  <IconTrash size={16} />
                </RichTextEditor.Control>
              </Tooltip>
              <Tooltip label="Sair da Tabela (Tab)">
                <RichTextEditor.Control
                  onClick={sairDaTabela}
                  aria-label="Sair da Tabela"
                >
                  <IconArrowRight size={16} />
                </RichTextEditor.Control>
              </Tooltip>
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
                  window.open('/frases', '_blank');
                }
                setContextMenu({ visible: false, x: 0, y: 0 });
              }}
            >
              <IconDeviceFloppy size={16} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Copiar Tabela" zIndex={1001}>
            <ActionIcon
              variant="subtle"
              color="gray"
              onClick={() => {
                copiarTabela();
                setContextMenu({ visible: false, x: 0, y: 0 });
              }}
            >
              <IconTable size={16} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Deletar Tabela" zIndex={1001}>
            <ActionIcon
              variant="subtle"
              color="red"
              onClick={() => {
                deletarTabela();
                setContextMenu({ visible: false, x: 0, y: 0 });
              }}
            >
              <IconTrash size={16} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Sair da Tabela" zIndex={1001}>
            <ActionIcon
              variant="subtle"
              color="gray"
              onClick={() => {
                sairDaTabela();
                setContextMenu({ visible: false, x: 0, y: 0 });
              }}
            >
              <IconArrowRight size={16} />
            </ActionIcon>
          </Tooltip>
        </Paper>
      )}

      {/* Modal de Configuração da Tabela */}
      <Modal
        opened={modalTabelaAberto}
        onClose={() => setModalTabelaAberto(false)}
        title="Inserir Tabela"
        centered
        size="sm"
      >
        <Stack spacing="md">
          <Text size="sm" c="dimmed">
            Configure o tamanho da tabela que deseja inserir:
          </Text>
          
          <NumberInput
            label="Número de Linhas"
            placeholder="3"
            min={1}
            max={20}
            value={linhasTabela}
            onChange={setLinhasTabela}
            required
          />
          
          <NumberInput
            label="Número de Colunas"
            placeholder="3"
            min={1}
            max={10}
            value={colunasTabela}
            onChange={setColunasTabela}
            required
          />
          
          <Group justify="flex-end" mt="md">
            <Button variant="outline" onClick={() => setModalTabelaAberto(false)}>
              Cancelar
            </Button>
            <Button color="blue" onClick={inserirTabela}>
              Inserir Tabela
            </Button>
          </Group>
        </Stack>
      </Modal>

      <style>{`
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
        
        /* Estilos adicionais para tabelas */
        .ProseMirror table {
          border: 1px solid #000 !important;
          border-collapse: collapse !important;
        }
        
        .ProseMirror td,
        .ProseMirror th {
          border: 1px solid #000 !important;
          padding: 8px 12px !important;
        }
        
        .ProseMirror th {
          background-color: #f8f9fa !important;
          font-weight: bold !important;
          text-align: center !important;
        }
        
        .ProseMirror table p {
          margin: 0 !important;
        }
      `}</style>
    </Stack>
  );
});

export default TextEditor; 
