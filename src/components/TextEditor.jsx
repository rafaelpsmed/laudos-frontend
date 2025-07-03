import { RichTextEditor, Link } from '@mantine/tiptap';
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
import { useEffect, forwardRef, useImperativeHandle, useState, useRef } from 'react';
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
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0 });
  const [isProcessing, setIsProcessing] = useState(false);
  const [modalTabelaAberto, setModalTabelaAberto] = useState(false);
  const [linhasTabela, setLinhasTabela] = useState(3);
  const [colunasTabela, setColunasTabela] = useState(3);
  const editorRef = useRef(null);
  const lastProcessedTextRef = useRef('');
  const debounceTimeoutRef = useRef(null);

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
      const text = editor.getText();
      
      // Limpa o timeout anterior
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      
      // Se o texto já foi processado, não processa novamente
      if (text === lastProcessedTextRef.current) {
        onChange(editor.getHTML());
        return;
      }
      
      // Se está processando, não faz nada
      if (isProcessing) {
        onChange(editor.getHTML());
        return;
      }
      
      // Debounce de 500ms para evitar processamento excessivo
      debounceTimeoutRef.current = setTimeout(() => {
        // Primeira etapa: Formatação automática (espaço → hífen)
        const formatRegex = /(\d+(?:[.,]\d+)?)\s+(\d+(?:[.,]\d+)?)\s+(\d+(?:[.,]\d+)?)\s{2}/g;
        let formattedText = text;
        let hasFormatting = false;
        
        // Aplica formatação se encontrar padrão
        if (formatRegex.test(text)) {
          formattedText = text.replace(formatRegex, '$1-$2-$3-');
          hasFormatting = true;
        }
        
        // Segunda etapa: Cálculo baseado no formato com hífens
        const calcRegex = /(\d+(?:[.,]\d+)?)-(\d+(?:[.,]\d+)?)-(\d+(?:[.,]\d+)?)-/g;
        const calcMatch = calcRegex.exec(formattedText);
        
        // Se encontrou formato para cálculo
        if (calcMatch) {
          // Extrai os números dos grupos capturados
          const num1 = parseFloat(calcMatch[1].replace(',', '.'));
          const num2 = parseFloat(calcMatch[2].replace(',', '.'));
          const num3 = parseFloat(calcMatch[3].replace(',', '.'));

          // Verifica se todos os números são válidos e maiores que zero
          if (num1 > 0 && num2 > 0 && num3 > 0 && 
              !isNaN(num1) && !isNaN(num2) && !isNaN(num3)) {
            
            // Marca como processando para evitar loops
            setIsProcessing(true);
            
            // Ordena os números em ordem decrescente
            const numeros = [num1, num2, num3].sort((a, b) => b - a);
            
            // Calcula o volume
            const volume = (numeros[0] * numeros[1] * numeros[2] * 0.523).toFixed(2);

            // Frase que substituirá os 3 números
            const newText = `${numeros[0].toFixed(1)} x ${numeros[1].toFixed(1)} x ${numeros[2].toFixed(1)} cm, com volume aproximado em ${volume} cm³`;

            // Encontra a posição dos números no texto
            const startIndex = formattedText.indexOf(calcMatch[0]);
            const endIndex = startIndex + calcMatch[0].length;

            // Verifica se a posição é válida
            if (startIndex !== -1 && endIndex <= formattedText.length) {
              // Substitui os números pela nova frase
              editor.commands.deleteRange({ from: startIndex, to: endIndex });
              editor.commands.insertContentAt(startIndex, newText);
              
              // Marca o texto como processado
              lastProcessedTextRef.current = newText;
            }
            
            // Reseta o flag após um pequeno delay
            setTimeout(() => setIsProcessing(false), 200);
          }
        } else if (hasFormatting) {
          // Se só houve formatação (sem cálculo), aplica a formatação
          const { from } = editor.state.selection;
          editor.commands.setContent(formattedText);
          editor.commands.setTextSelection(from);
        }
      }, 500);

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
    // Remove pontuação no final, se houver
    let textoProcessado = texto.trim();
    
    console.log('Texto original:', texto);
    console.log('Texto processado:', textoProcessado);

    // Palavras que indicam final de frase
    const finalizadores = [
      'ponto', 'vírgula', 'virgula', 'dois pontos', 'ponto e vírgula',
      'ponto final', 'nova linha', 'próxima linha', 'parágrafo', 'hífen', 'hifen'
    ];

    // Procura por palavras finalizadoras em qualquer lugar do texto
    for (const finalizador of finalizadores) {
      const regex = new RegExp(`\\b${finalizador}\\b`, 'i');
      const match = textoProcessado.match(regex);
      
      if (match) {
        console.log('Finalizador encontrado:', finalizador);
        
        // Remove a palavra finalizadora do texto
        const textoLimpo = textoProcessado.replace(regex, '').trim();
        console.log('Texto limpo:', textoLimpo);

        // Adiciona a pontuação apropriada
        switch (finalizador.toLowerCase()) {
          case 'ponto':
          case 'ponto final':
            return textoLimpo + '. ';
          case 'vírgula':
          case 'virgula':
            return textoLimpo + ', ';
          case 'dois pontos':
            return textoLimpo + ': ';
          case 'ponto e vírgula':
          case 'ponto e virgula':
            return textoLimpo + '; ';
          case 'hífen':
          case 'hifen':
            return textoLimpo + '-';
          case 'nova linha':
          case 'próxima linha':
          case 'parágrafo':
            return textoLimpo + '.\n';
          default:
            return textoLimpo + ' ';
        }
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

    // Caso padrão: retorna o texto sem pontuação adicional
    return textoProcessado + ' ';
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
