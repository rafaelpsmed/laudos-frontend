import Layout from '../components/Layout';
import { Divider, Stack, Grid, Text, NavLink, Tooltip, Group, Button, Checkbox, TextInput } from '@mantine/core';
import { useState, useRef, useEffect } from 'react';
import TextEditor from '../components/TextEditor';
import MetodosSelect from '../components/MetodosSelect';
import TituloCombobox from '../components/TituloCombobox';
import MetodosSelectFrases from '../components/MetodosSelectFrases';
import SelecionarVariaveisModal from '../components/SelecionarVariaveisModal';
import InserirFraseModal from '../components/InserirFraseModal';
import api from '../api';
import { IconFolder, IconFile } from '@tabler/icons-react';
import { Document, Packer, Paragraph, TextRun } from 'docx';

// Função para pluralizar palavras e frases
import pluralize from '../utils/pluralizar';

function Laudos() {
  const [texto, setTexto] = useState('');
  const [metodosModelo, setMetodosModelo] = useState([]);
  const [titulo, setTitulo] = useState('');
  const [titulosDisponiveis, setTitulosDisponiveis] = useState([]);
  const [modeloId, setModeloId] = useState(null);
  const [metodosFrase, setMetodosFrase] = useState([]);
  const [categoriasFiltradas, setCategoriasFiltradas] = useState([]);
  const [treeData, setTreeData] = useState([]);
  const [treeDataSemMetodos, setTreeDataSemMetodos] = useState([]);
  const [treeDataModelo, setTreeDataModelo] = useState([]);
  const [modalVariaveisAberto, setModalVariaveisAberto] = useState(false);
  const [modalInserirFraseAberto, setModalInserirFraseAberto] = useState(false);
  const [variaveisEncontradas, setVariaveisEncontradas] = useState([]);
  const [gruposOpcoesEncontrados, setGruposOpcoesEncontrados] = useState([]);
  const [elementosOrdenados, setElementosOrdenados] = useState([]);
  const [textoTemporario, setTextoTemporario] = useState('');
  const [fraseTemporaria, setFraseTemporaria] = useState(null);
  const [temTextoSelecionado, setTemTextoSelecionado] = useState(false);
  const [conclusaoDoModelo, setConclusaoDoModelo] = useState('');
  const [tituloFraseAtual, setTituloFraseAtual] = useState('');
  const [aguardandoClique, setAguardandoClique] = useState(false);
  const [aguardandoSelecao, setAguardandoSelecao] = useState(false);
  const [aguardandoLinha, setAguardandoLinha] = useState(false);
  const [aguardandoPosicaoAtual, setAguardandoPosicaoAtual] = useState(false);
  const [posicaoAtualCursor, setPosicaoAtualCursor] = useState(null);
  // Marcador invisível para ancorar o cursor após substituir variáveis (frase sem conclusão)
  const cursorAnchorTokenRef = useRef(null);
  const cursorAnchorArmedRef = useRef(false);
  const cursorAnchorRetriesRef = useRef(0);
  const editorRef = useRef(null);
  const [todasFrases, setTodasFrases] = useState([]);
  const [baixarDocx, setBaixarDocx] = useState(false);
  const [tituloOutroModelo, setTituloOutroModelo] = useState('');
  const [treeDataOutroModelo, setTreeDataOutroModelo] = useState([]);
  const [metodosOutroModelo, setMetodosOutroModelo] = useState([]);
  const [titulosOutroModelo, setTitulosOutroModelo] = useState([]);
  const [searchModeloFrases, setSearchModeloFrases] = useState('');
  const [searchOutroModeloFrases, setSearchOutroModeloFrases] = useState('');
  const [cursorPosicao, setCursorPosicao] = useState(null);
  const [fraseBaseTamanho, setFraseBaseTamanho] = useState(null);

  const handleMetodosModeloChange = (newValue) => {
    setMetodosModelo(newValue);
    setTitulo('');
    setTexto('');
    setModeloId(null);
  };

  const handleMetodosFraseChange = async (newValue) => {
    try {
      setMetodosFrase(newValue);
      
      // Se não houver valor selecionado, limpa os campos e retorna
      if (!newValue || !Array.isArray(newValue) || newValue.length === 0) {
        // console.log('Nenhum método selecionado');
        setCategoriasFiltradas([]);
        setTreeData([]);
        return;
      }
      
      // Garante que newValue é um array válido e converte para números
      const metodosIds = newValue
        .filter(id => id !== null && id !== undefined)
        .map(id => parseInt(id, 10))
        .filter(id => !isNaN(id));
      
      // Se não houver IDs válidos após o processamento, retorna
      if (metodosIds.length === 0) {
        // console.log('Nenhum ID válido após processamento');
        setCategoriasFiltradas([]);
        setTreeData([]);
        return;
      }
      
      // Monta a string de IDs
      const metodosParam = metodosIds.join(',');
      
      // Faz a requisição
      const response = await api.get('/api/frases/categorias/', {
        params: { metodos: metodosParam }
      });
      
      // Verifica se a resposta tem o formato esperado
      if (response.data && Array.isArray(response.data.categorias)) {
        setCategoriasFiltradas(response.data.categorias);
        
        // Transforma as categorias em dados para o TreeView
        const treeItems = await Promise.all(response.data.categorias.map(async (categoria) => {
          // Busca os títulos das frases para esta categoria
          const titulosResponse = await api.get('/api/frases/titulos_frases/', {
            params: { categoria }
          });

          // Cria os nós filhos (títulos das frases)
          const children = titulosResponse.data.titulos_frases.map((titulo) => ({
            id: `${categoria}-${titulo}`,
            name: titulo,
            type: 'titulo'
          }));

          // Retorna o nó da categoria com seus filhos
          return {
            id: categoria,
            name: categoria,
            type: 'categoria',
            children
          };
        }));

        setTreeData(treeItems);
      } else {
        // console.error('Resposta inválida do servidor:', response.data);
        throw new Error('Formato de resposta inválido');
      }
      
    } catch (error) {
      // console.error('Erro ao buscar categorias:', error);
      setCategoriasFiltradas([]);
      setTreeData([]);
    }
  };

  const handleTituloSelect = async (selectedTitulo) => {
    try {
      const modeloSelecionado = titulosDisponiveis.find(item => item.titulo === selectedTitulo);
      if (!modeloSelecionado) {
        // console.error('Modelo não encontrado para o título:', selectedTitulo);
        return;
      }

      // Salva o modelo atual no localStorage
      localStorage.setItem('modeloLaudoAtual', JSON.stringify({
        id: modeloSelecionado.id,
        titulo: selectedTitulo,
        metodo: metodosModelo[0] // Pega o primeiro método selecionado
      }));

      const response = await api.get(`/api/modelo_laudo/${modeloSelecionado.id}/`);
      
      // Atualiza o editor com o texto do modelo
      let textoModelo = response.data.texto || '';
      const textoFormatado = typeof textoModelo === 'string' ? textoModelo : String(textoModelo);
      
      // Procura por variáveis e grupos de opções no texto do modelo
      const { variaveis, gruposOpcoes, variaveisLocais, elementosOrdenados } = await buscarVariaveisNoTexto(textoFormatado);
      
      // Se encontrou variáveis, grupos de opções, variáveis locais ou tem '$', guarda o texto temporariamente e abre o modal
      if (variaveis.length > 0 || gruposOpcoes.length > 0 || variaveisLocais.length > 0 || textoFormatado.includes('$')) {
        setTextoTemporario(textoFormatado);
        setVariaveisEncontradas(variaveis);
        setGruposOpcoesEncontrados(gruposOpcoes);
        setElementosOrdenados(elementosOrdenados);
        setFraseTemporaria(null); // Não é uma frase, é um modelo
        setModalVariaveisAberto(true);
      } else {
        // Se não encontrou variáveis, processa normalmente
        // Procura por "impressão:" ou "conclusão:" no texto
        const regex = /(?:impressão:|conclusão:)([^]*?)(?=\n|$)/i;
        const match = textoFormatado.match(regex);
        
        if (match) {
          // Se encontrou, extrai a conclusão
          const conclusao = match[1].trim();
          setConclusaoDoModelo(conclusao);
          setTexto(textoFormatado);
        } else {
          // Se não encontrou, mantém o texto original e limpa a conclusão
          setTexto(textoFormatado);
          setConclusaoDoModelo('');
        }
      }
      
      setModeloId(modeloSelecionado.id);

      // Busca as frases associadas ao modelo
      const frasesResponse = await api.get('/api/frases/');
      const frasesDoModelo = frasesResponse.data.filter(f => 
        f.modelos_laudo && f.modelos_laudo.includes(modeloSelecionado.id)
      );

      // Busca as frases gerais (não associadas a nenhum modelo)
      const frasesGerais = frasesResponse.data.filter(f => 
        !f.modelos_laudo || f.modelos_laudo.length === 0
      );

      // console.log('Categorias recebidas:', frasesDoModelo.map(frase => frase.categoriaFrase));
      
      // Organiza as frases por categoria
      const categorias = [...new Set(frasesDoModelo.map(frase => frase.categoriaFrase))];
      
      const treeItems = categorias.map(categoria => {
        const frasesCategoria = frasesDoModelo.filter(frase => frase.categoriaFrase === categoria);
        
        const children = frasesCategoria.map(frase => ({
          id: `${categoria}-${frase.tituloFrase}`,
          name: frase.tituloFrase,
          type: 'titulo',
          isModelo: true // Marca como frase do modelo
        }));

        return {
          id: categoria,
          name: categoria,
          type: 'categoria',
          children
        };
      });

      // Adiciona as frases gerais em suas próprias categorias
      const categoriasGerais = [...new Set(frasesGerais.map(frase => frase.categoriaFrase))];
      
      categoriasGerais.forEach(categoria => {
        const frasesCategoria = frasesGerais.filter(frase => frase.categoriaFrase === categoria);
        
        const children = frasesCategoria.map(frase => ({
          id: `${categoria}-${frase.tituloFrase}`,
          name: frase.tituloFrase,
          type: 'titulo',
          isModelo: false // Marca como frase geral
        }));

        treeItems.push({
          id: categoria,
          name: categoria,
          type: 'categoria',
          children
        });
      });

      setTreeDataModelo(treeItems);
      
    } catch (error) {
      // console.error('Erro ao buscar modelo completo:', error);
      alert('Erro ao carregar o modelo. Por favor, tente novamente.');
    }
  };

  const handleFraseClick = async (categoria, tituloFrase) => {
    try {
      // Busca todas as frases
      const response = await api.get('/api/frases/');
      const frases = response.data;

      // Encontra a frase específica
      const frase = frases.find(f => 
        f.categoriaFrase === categoria && 
        f.tituloFrase === tituloFrase
      );

      if (!frase) {
        // console.error('Frase não encontrada');
        return;
      }

      // Verifica se a frase tem substituição definida
      if (frase.frase.substituicaoFraseBase) {
        // Verifica se o texto atual contém a string de substituição
        const editor = editorRef.current?.editor;
        if (editor) {
          const textoAtual = editor.getHTML();
          if (textoAtual.includes(frase.frase.substituicaoFraseBase)) {
            // Se encontrar, faz a substituição normalmente
            await processarFrase(frase);
          } else {
            // Se não encontrar, abre o modal de inserção
            // Guarda a posição atual do cursor ANTES de abrir o modal (o modal tira o foco do editor)
            setPosicaoAtualCursor(editor.state.selection.from);
            setFraseTemporaria(frase);
            setModalInserirFraseAberto(true);
          }
        } else {
          // Se não tiver editor, abre o modal de inserção
          setFraseTemporaria(frase);
          setModalInserirFraseAberto(true);
        }
      } else {
        // Se não tem substituição definida, abre o modal de inserção
        // Guarda a posição atual do cursor ANTES de abrir o modal (o modal tira o foco do editor)
        const editor = editorRef.current?.editor;
        if (editor) {
          setPosicaoAtualCursor(editor.state.selection.from);
        }
        setFraseTemporaria(frase);
        setModalInserirFraseAberto(true);
      }

    } catch (error) {
      // console.error('Erro ao processar frase:', error);
      alert('Erro ao processar a frase. Por favor, tente novamente.');
    }
  };

  // Adiciona a função de conversão
  const converterQuebrasDeLinha = (texto) => {
    if (!texto) return '';
    // Primeiro converte \n para uma quebra de linha real
    const textoComQuebraReal = texto.replace(/\\n/g, '\n');
    // Depois converte as quebras de linha reais para <br>
    return textoComQuebraReal.replace(/\n/g, '<br>');
  };

  const cursorNoFinalDaFraseBase = (posicaoInicial, deltaInserido) => {
    const editor = editorRef.current?.editor;
    if (!editor) return;
    if (typeof posicaoInicial !== 'number' || typeof deltaInserido !== 'number') return;

    const novaPosicaoCursor = posicaoInicial + deltaInserido;
    editor.chain().focus().setTextSelection(novaPosicaoCursor).run();
  };

  // Encontra a posição (ProseMirror) de um texto dentro do documento
  const encontrarPosicaoTextoNoDoc = (doc, token) => {
    let posEncontrada = null;
    doc.descendants((node, pos) => {
      if (posEncontrada !== null) return false;
      if (!node.isText || typeof node.text !== 'string') return;
      const idx = node.text.indexOf(token);
      if (idx !== -1) {
        posEncontrada = pos + idx;
        return false;
      }
    });
    return posEncontrada;
  };

  // Quando o conteúdo do editor for atualizado após o modal de variáveis,
  // remove o token-âncora e posiciona o cursor ali (apenas para frases sem conclusão).
  useEffect(() => {
    const token = cursorAnchorTokenRef.current;
    if (!token) return;
    if (!cursorAnchorArmedRef.current) return;

    const editor = editorRef.current?.editor;
    if (!editor) return;

    const tryApply = () => {
      const tokenAtual = cursorAnchorTokenRef.current;
      if (!tokenAtual || !cursorAnchorArmedRef.current) return;
      const ed = editorRef.current?.editor;
      if (!ed) return;

      const pos = encontrarPosicaoTextoNoDoc(ed.state.doc, tokenAtual);
      if (typeof pos === 'number') {
        ed.commands.setTextSelection(pos);
        ed.commands.deleteRange({ from: pos, to: pos + tokenAtual.length });
        ed.commands.focus();
        cursorAnchorTokenRef.current = null;
        cursorAnchorArmedRef.current = false;
        cursorAnchorRetriesRef.current = 0;
        return;
      }

      if (cursorAnchorRetriesRef.current < 30) {
        cursorAnchorRetriesRef.current += 1;
        setTimeout(tryApply, 0);
      } else {
        cursorAnchorTokenRef.current = null;
        cursorAnchorArmedRef.current = false;
        cursorAnchorRetriesRef.current = 0;
      }
    };

    // dispara a tentativa (e retries) sempre que `texto` mudar
    tryApply();
  }, [texto]);

  const processarFrase = async (frase, tipoInsercao = null, elementoLinha = null, posicaoCursor = null) => {
    let novoTexto = texto;
    const editor = editorRef.current?.editor;
    // Posição onde queremos deixar o cursor ao final do processo (fim do trecho inserido/substituído)
    let cursorDesejado = null;
    const temConclusao = !!frase?.frase?.conclusao;
    
    // Atualiza o título da frase atual
    setTituloFraseAtual(frase.tituloFrase);
    setFraseBaseTamanho(frase.frase.fraseBase.length);
    // Função auxiliar para aplicar formatação ao texto
    const aplicarFormatacao = (texto) => {
      if (!editor) return texto;
      
      // Obtém a formatação atual do editor
      const formataçãoAtual = editor.getAttributes('textStyle');
      // const fonteAtual = formataçãoAtual.fontFamily || 'Arial';
      // const tamanhoAtual = formataçãoAtual.fontSize || '12pt';
      const fonteAtual = formataçãoAtual.fontFamily;
      const tamanhoAtual = formataçãoAtual.fontSize;
      
      // Aplica a formatação ao texto usando o TextStyle
      editor.chain().focus().setMark('textStyle', { 
        fontFamily: fonteAtual,
        fontSize: tamanhoAtual
      }).run();
      
      return `<span style="font-family: ${fonteAtual}; font-size: ${tamanhoAtual}">${texto}</span>`;
    };

    if (tipoInsercao) {
      // Se não tem substituição, insere baseado na escolha do usuário
      let fraseBase = converterQuebrasDeLinha(frase.frase.fraseBase || '');
      
      // Debug: verifica o formato da frase base que vem do backend
      // console.log('🔍 Frase base do backend (primeiros 200 chars):', fraseBase.substring(0, 200));
      // console.log('🔍 Contém {JSON} de variável local?', fraseBase.includes('"tipo":"variavelLocal"') || fraseBase.includes('"tipo":variavelLocal'));
      // console.log('🔍 Contém [LOCAL:?', fraseBase.includes('[LOCAL:'));
      
      try {
        // Aplica a formatação à frase base
        const fraseBaseAntesFormatacao = fraseBase;
        fraseBase = aplicarFormatacao(fraseBase);
        
        // Debug: verifica o formato após formatação
        // console.log('🔍 Frase base após formatação (primeiros 200 chars):', fraseBase.substring(0, 200));
        // console.log('🔍 Contém [[LOCAL: após formatação?', fraseBase.includes('[[LOCAL:'));
        // console.log('🔍 Contém [LOCAL: após formatação?', fraseBase.includes('[LOCAL:'));

        // Guardamos onde começou a inserção e quanto o cursor andou no documento
        // (isso é mais confiável do que usar fraseBase.length, que é string/HTML)
        let posicaoInicialInsercao = null;
        let deltaInserido = null;

        switch (tipoInsercao) {
          case 'final':
            // Move o cursor para o final e adiciona a frase
            posicaoInicialInsercao = editor.state.doc.content.size;
            editor.commands.setTextSelection(posicaoInicialInsercao);
            editor.commands.insertContent((novoTexto ? '\n' : '') + fraseBase);
            deltaInserido = editor.state.selection.from - posicaoInicialInsercao;
            break;

          case 'cursor':
            if (editor) {
              // Insere o conteúdo na posição atual do cursor
              const { from } = editor.state.selection;
              editor.commands.setTextSelection(from);
              posicaoInicialInsercao = editor.state.selection.from;
              editor.commands.insertContent(fraseBase);
              deltaInserido = editor.state.selection.from - posicaoInicialInsercao;

              
            }
            break;

          case 'posicaoAtual':
            if (editor && posicaoCursor !== null) {
              // console.log('🔍 Inserindo na posição atual:', posicaoCursor);
              // console.log('🔍 Frase base:', fraseBase);
              // Insere o conteúdo na posição passada como parâmetro
              editor.commands.setTextSelection(posicaoCursor);
              posicaoInicialInsercao = editor.state.selection.from;
              editor.commands.insertContent(fraseBase);
              deltaInserido = editor.state.selection.from - posicaoInicialInsercao;
              // console.log('✅ Frase inserida com sucesso');
              // Atualiza o texto após a inserção
              novoTexto = editor.getHTML();
              // editor.commands.focus(10);
              // editor.chain().focus().setTextSelection(10).run()
            } else {
              // console.error('❌ Erro: editor ou posicaoCursor não disponível');
              // console.error('❌ Editor:', !!editor);
              // console.error('❌ Posição cursor:', posicaoCursor);
            }
            break;

          case 'selecao':
            if (editor) {
              // Mantém a posição inicial da seleção (inserção acontecerá em `from`)
              posicaoInicialInsercao = editor.state.selection.from;
              editor.commands.deleteSelection();
              // Após deletar, a seleção normalmente colapsa em `from`
              posicaoInicialInsercao = editor.state.selection.from;
              editor.commands.insertContent(fraseBase);
              deltaInserido = editor.state.selection.from - posicaoInicialInsercao;
            }
            break;

          case 'linha':
            if (editor && elementoLinha) {
              // Encontra a posição do parágrafo no documento
              const pos = editor.view.posAtDOM(elementoLinha, 0);
              // Seleciona todo o parágrafo
              const resolvedPos = editor.state.doc.resolve(pos);
              const paragraphNode = resolvedPos.node(1); // 1 é o nível do parágrafo
              if (paragraphNode) {
                const start = pos;
                const end = pos + paragraphNode.nodeSize;
                editor.commands.setTextSelection({ from: start, to: end });
                // Substitui o conteúdo
                editor.commands.deleteSelection();
                posicaoInicialInsercao = editor.state.selection.from;
                editor.commands.insertContent(fraseBase+'\n');
                deltaInserido = editor.state.selection.from - posicaoInicialInsercao;
              }
            }
            break;
        }

        // Processa as outras substituições após inserir a frase base
        if (frase.frase.substituicoesOutras && frase.frase.substituicoesOutras.length > 0) {
          let conteudoAtual = editor.getHTML();
          frase.frase.substituicoesOutras.forEach(substituicao => {
            const procurarPor = converterQuebrasDeLinha(substituicao.procurarPor);
            const substituirPor = aplicarFormatacao(converterQuebrasDeLinha(substituicao.substituirPor));
            conteudoAtual = conteudoAtual.replace(procurarPor, substituirPor);
          });
          editor.commands.setContent(conteudoAtual);
        }

        // Atualiza o texto após a manipulação
        novoTexto = editor.getHTML();

        // Se `setContent(...)` resetou a seleção, reposiciona no fim do trecho inserido
        if (posicaoInicialInsercao !== null && deltaInserido !== null) {
          cursorDesejado = posicaoInicialInsercao + deltaInserido;
        }

        // editor.commands.focus(10);
        // editor.chain().focus().setTextSelection(10).run()
      } catch (error) {
        // console.error('Erro ao inserir texto:', error);
      }
    } else {
      // Fluxo normal para frases com substituição
      if (editor) {
        try {
          let conteudoAtual = editor.getHTML();
          let novoConteudo = conteudoAtual;
          // Mantém o cursor onde estava antes de substituir conteúdo
          cursorDesejado = editor.state.selection.from;

          // Processa a substituição principal da frase base
          if (frase.frase.substituicaoFraseBase && frase.frase.fraseBase) {
            const fraseBaseFormatada = aplicarFormatacao(converterQuebrasDeLinha(frase.frase.fraseBase));
            novoConteudo = conteudoAtual.replace(
              frase.frase.substituicaoFraseBase,
              fraseBaseFormatada
            );
          }

          // Processa as outras substituições
          if (frase.frase.substituicoesOutras && frase.frase.substituicoesOutras.length > 0) {
            frase.frase.substituicoesOutras.forEach(substituicao => {
              const procurarPor = converterQuebrasDeLinha(substituicao.procurarPor);
              const substituirPor = aplicarFormatacao(converterQuebrasDeLinha(substituicao.substituirPor));
              novoConteudo = novoConteudo.replace(procurarPor, substituirPor);
            });
          }

          // Só atualiza o editor se houve alguma mudança
          if (novoConteudo !== conteudoAtual) {
            editor.commands.setContent(novoConteudo);
            novoTexto = editor.getHTML();
          }
        } catch (error) {
          // console.error('Erro ao substituir texto:', error);
        }
      }
    }

    // Se a frase tem conclusão, adiciona ela após a frase base
    if (frase.frase.conclusao) {
      if (editor) {
        try {
          // Aplica a formatação à conclusão
          const conclusaoFormatada = aplicarFormatacao(frase.frase.conclusao);
          
          // Se existe uma conclusão do modelo, substitui ela
          if (conclusaoDoModelo) {
            const conteudoAtual = editor.getHTML();
            // const novoConteudo = conteudoAtual.replace(conclusaoDoModelo, conclusaoFormatada);
            const novoConteudo = conteudoAtual.replace(conclusaoDoModelo,'<br>' + conclusaoFormatada);
            editor.commands.setContent(novoConteudo);
            // Limpa a conclusão do modelo após substituir
            setConclusaoDoModelo('');
          } else {
            // Verifica se o texto da conclusão já existe no texto atual
            const textoAtual = novoTexto.replace(/<[^>]*>/g, '');
            const textoConclusao = conclusaoFormatada.replace(/<[^>]*>/g, '');
            const conclusaoPluralizada = pluralize(textoConclusao);
            
            // Verifica se a conclusão (singular OU plural) já existe
            const conclusaoExisteSingular = textoAtual.includes(textoConclusao);
            const conclusaoExistePlural = textoAtual.includes(conclusaoPluralizada);
            
            if (!conclusaoExisteSingular && !conclusaoExistePlural) {
              // Se não existe (nem singular nem plural), adiciona a nova conclusão no final
              // sem "roubar" o cursor: inserimos no final e depois restauramos.
              const posFinalDoc = editor.state.doc.content.size;
              editor.commands.insertContentAt(posFinalDoc, '<br>' + conclusaoFormatada);
            } else if (conclusaoExisteSingular && !conclusaoExistePlural) {
              // Se existe apenas a versão singular, pluraliza
              const conclusaoPluralizadaFormatada = aplicarFormatacao(conclusaoPluralizada);
              
              // Substitui a conclusão existente pela versão pluralizada
              const novoConteudo = novoTexto.replace(textoConclusao, conclusaoPluralizadaFormatada);
              editor.commands.setContent(novoConteudo);

              
            }
            // Se já existe a versão plural (conclusaoExistePlural === true), não faz nada
          }

          // Atualiza o texto após a manipulação
          novoTexto = editor.getHTML();


        } catch (error) {
          // console.error('Erro ao adicionar conclusão:', error);
        }
      }

    }

    // Por fim, restaura o cursor para o local desejado (fim do trecho inserido/substituído)
    // apenas quando a frase NÃO tem conclusão.
    // Para frases com conclusão, por enquanto o comportamento desejado é o cursor ir para o final do texto.
    if (editor) {
      if (!temConclusao && typeof cursorDesejado === 'number') {
        const maxPos = editor.state.doc.content.size;
        const safePos = Math.max(0, Math.min(cursorDesejado, maxPos));
        editor.chain().focus().setTextSelection(safePos).run();
      } else if (temConclusao) {
        editor.commands.setTextSelection(editor.state.doc.content.size);
      }
    }

    // Procura por variáveis e grupos de opções no texto
    const { variaveis, gruposOpcoes, variaveisLocais, elementosOrdenados } = await buscarVariaveisNoTexto(novoTexto, frase);
    
    // console.log('📊 Resultado da busca:');
    // console.log('   Variáveis:', variaveis.length);
    // console.log('   Grupos de opções:', gruposOpcoes.length);
    // console.log('   Variáveis locais:', variaveisLocais.length);
    // console.log('   Elementos ordenados:', elementosOrdenados.length);
    
    if (variaveisLocais.length > 0) {
      // console.log('   📋 Detalhes das variáveis locais encontradas:');
      variaveisLocais.forEach((vl, index) => {
        // console.log(`      ${index + 1}. Título: ${vl.tituloVariavel}, Tipo: ${vl.variavel?.tipo}, Texto Original: ${vl.textoOriginal?.substring(0, 100)}`);
      });
    }
    
    // Se encontrou variáveis, grupos de opções, variáveis locais ou tem '$', guarda o texto temporariamente e abre o modal
    if (variaveis.length > 0 || gruposOpcoes.length > 0 || variaveisLocais.length > 0 || novoTexto.includes('$')) {
      // console.log('✅ Abrindo modal de variáveis');
      if (variaveisLocais.length > 0) {
        // console.log('   ✅ Variáveis locais detectadas - modal será aberto com opções para seleção');
      }
      // Caso desejado: frase com variáveis e SEM conclusão -> manter cursor no fim da frase inserida.
      // Inserimos um marcador INVISÍVEL diretamente no documento do editor, no ponto do cursorDesejado.
      // Ele viaja pelo texto temporário/modal e depois é removido e usado para posicionar o cursor.
      const isFrase = !!fraseTemporaria;
      if (isFrase && !temConclusao) {
        const marker = '\u2063\u2060\u200B\u200C\u200D\u2063\u2060\u200B\u200C\u200D';
        cursorAnchorTokenRef.current = marker;
        cursorAnchorArmedRef.current = false; // arma só no confirm (handleVariaveisSelecionadas)
        cursorAnchorRetriesRef.current = 0;

        if (editor && typeof cursorDesejado === 'number') {
          const maxPos = editor.state.doc.content.size;
          const safePos = Math.max(0, Math.min(cursorDesejado, maxPos));
          editor.commands.insertContentAt(safePos, marker);
          novoTexto = editor.getHTML(); // inclui o marcador invisível no texto temporário
        }
      } else {
        cursorAnchorTokenRef.current = null;
        cursorAnchorArmedRef.current = false;
        cursorAnchorRetriesRef.current = 0;
      }

      setTextoTemporario(novoTexto);
      setVariaveisEncontradas(variaveis);
      setGruposOpcoesEncontrados(gruposOpcoes);
      setElementosOrdenados(elementosOrdenados);
      setFraseTemporaria(frase);
      setModalVariaveisAberto(true);

      
    } else {
      // Se não encontrou variáveis nem grupos de opções, atualiza o texto diretamente
      setTexto(novoTexto);
    }
  };

  const handleInserirFraseConfirm = async (tipoInsercao, medida) => {
    setModalInserirFraseAberto(false);
    
    if (tipoInsercao === 'cursor') {
      setAguardandoClique(true);
      return;
    }

    if (tipoInsercao === 'selecao') {
      setAguardandoSelecao(true);
      return;
    }

    if (tipoInsercao === 'linha') {
      setAguardandoLinha(true);
      return;
    }

    if (tipoInsercao === 'posicaoAtual') {
      // console.log('🚀 Iniciando inserção na posição atual');
      // Captura a posição atual do cursor
      const editor = editorRef.current?.editor;
      if (editor) {
        // Usa a posição salva antes de abrir o modal (mais confiável do que a seleção após fechar modal)
        const from = (typeof posicaoAtualCursor === 'number') ? posicaoAtualCursor : editor.state.selection.from;
        // console.log('📍 Posição do cursor (salva):', from);

        // Processa a frase imediatamente na posição capturada
        setCursorPosicao(from);
        if (fraseTemporaria) {
          // console.log('📝 Frase temporária encontrada:', fraseTemporaria.tituloFrase);
          // Se tem medida, substitui o '$' na frase base antes de processar
          if (medida) {
            fraseTemporaria.frase.fraseBase = fraseTemporaria.frase.fraseBase.replace('$', medida);
            // console.log('📏 Medida aplicada:', medida);
          }
          // console.log('⚙️ Chamando processarFrase...');
          // Passa a posição diretamente como parâmetro
          await processarFrase(fraseTemporaria, 'posicaoAtual', null, from);
          setFraseTemporaria(null);

          // editor.chain().focus().setTextSelection(10).run(); // ate agora a que chegou mais proximo de funcionar
          
          // console.log('✅ Processamento concluído');
        } else {
          // console.error('❌ Frase temporária não encontrada');
        }
        
      } else {
        // console.error('❌ Editor não disponível');
      }

      return;
    }
    
    if (fraseTemporaria) {
      // Se tem medida, substitui o '$' na frase base antes de processar
      if (medida) {
        fraseTemporaria.frase.fraseBase = fraseTemporaria.frase.fraseBase.replace('$', medida);
      }
      await processarFrase(fraseTemporaria, tipoInsercao);

      setFraseTemporaria(null);
    }

  };


  const handleEditorSelectionUpdate = (editor) => {
    const { from, to } = editor.state.selection;
    const temSelecao = from !== to;

    if (aguardandoSelecao && temSelecao) {
      processarFrase(fraseTemporaria, 'selecao').then(() => {
        setFraseTemporaria(null);
        setAguardandoSelecao(false);
      });
    }
  };

  const handleEditorClick = async (info) => {
    if (aguardandoClique && fraseTemporaria) {
      await processarFrase(fraseTemporaria, 'cursor');
      setFraseTemporaria(null);
      setAguardandoClique(false);
    } else if (aguardandoLinha && fraseTemporaria && info?.type === 'linha') {
      await processarFrase(fraseTemporaria, 'linha', info.element);
      setFraseTemporaria(null);
      setAguardandoLinha(false);
    }
  };

  const buscarVariaveisNoTexto = async (texto, frase = null) => {
    try {
      // Busca todas as variáveis
      const response = await api.get('/api/variaveis/');
      const todasVariaveis = response.data;
      
      // Extrai o texto puro do HTML removendo tags, mas mantendo o conteúdo
      // Isso é necessário porque o editor retorna HTML, mas as variáveis locais estão no texto
      // IMPORTANTE: Processa as entidades HTML ANTES de remover as tags para evitar problemas
      let textoPuro = texto
        .replace(/&nbsp;/g, ' ') // Converte &nbsp; para espaço
        .replace(/&amp;/g, '&') // Converte &amp; para & (deve vir antes de &lt; e &gt;)
        .replace(/&lt;/g, '<') // Converte &lt; para <
        .replace(/&gt;/g, '>') // Converte &gt; para >
        .replace(/&quot;/g, '"') // Converte &quot; para "
        .replace(/&#39;/g, "'") // Converte &#39; para '
        .replace(/&#91;/g, '[') // Converte &#91; para [
        .replace(/&#93;/g, ']') // Converte &#93; para ]
        .replace(/&#x5B;/g, '[') // Converte &#x5B; para [
        .replace(/&#x5D;/g, ']') // Converte &#x5D; para ]
        .replace(/<br\s*\/?>/gi, '\n') // Converte <br> para quebra de linha
        .replace(/<[^>]+>/g, ''); // Remove todas as tags HTML (deve vir por último)
      
      // Debug: verifica se o texto contém variáveis locais
      // console.log('🔍 Texto original (primeiros 500 chars):', texto.substring(0, 500));
      // console.log('🔍 Texto puro (primeiros 500 chars):', textoPuro.substring(0, 500));
      // console.log('🔍 Contém {JSON} de variável local?', textoPuro.includes('"tipo":"variavelLocal"') || textoPuro.includes('"tipo":variavelLocal'));
      // console.log('🔍 Contém [LOCAL:?', textoPuro.includes('[LOCAL:'));
      
      // Se temos a frase passada como parâmetro, também verifica a frase base original
      if (frase && frase.frase && frase.frase.fraseBase) {
        // console.log('🔍 Frase base original do backend (primeiros 200 chars):', frase.frase.fraseBase.substring(0, 200));
        // console.log('🔍 Frase base contém [[LOCAL:?', frase.frase.fraseBase.includes('[[LOCAL:'));
        // console.log('🔍 Frase base contém [LOCAL:?', frase.frase.fraseBase.includes('[LOCAL:'));
      }
      
      // Array para armazenar todos os elementos na ordem que aparecem
      const elementosOrdenados = [];
      
      // Encontra todas as ocorrências de {variavel}
      const regexVariaveis = /{([^}]+)}/g;
      let match;
      
      while ((match = regexVariaveis.exec(textoPuro)) !== null) {
        const tituloVariavel = match[1];
        // Procura a variável pelo título exato
        const variavel = todasVariaveis.find(v => v.tituloVariavel === tituloVariavel);
        
        if (variavel) {
          elementosOrdenados.push({
            tipo: 'variavel',
            dados: variavel,
            posicao: match.index,
            textoOriginal: match[0]
          });
        }
      }

      // Encontra todas as ocorrências de variáveis locais no formato {JSON} (formato completo salvo no backend)
      // Procura por JSONs que começam com {"tipo":"variavelLocal"
      let encontrouVariavelLocal = false;
      let posicaoBusca = 0;
      
      // Busca por JSONs de variáveis locais no texto puro
      while (posicaoBusca < textoPuro.length) {
        // Procura pelo início de um JSON de variável local
        const inicioJson = textoPuro.indexOf('{"tipo":"variavelLocal"', posicaoBusca);
        if (inicioJson === -1) {
          // Também tenta sem aspas no valor (caso o JSON tenha sido salvo sem aspas)
          const inicioJsonSemAspas = textoPuro.indexOf('{"tipo":variavelLocal', posicaoBusca);
          if (inicioJsonSemAspas === -1) break;
          posicaoBusca = inicioJsonSemAspas;
        } else {
          posicaoBusca = inicioJson;
        }
        
        // Encontra o { correspondente
        const inicio = posicaoBusca;
        let profundidade = 0;
        let fim = inicio;
        let dentroString = false;
        let escape = false;
        
        // Percorre o texto para encontrar o } correspondente
        for (let i = inicio; i < textoPuro.length; i++) {
          const char = textoPuro[i];
          
          if (escape) {
            escape = false;
            continue;
          }
          
          if (char === '\\') {
            escape = true;
            continue;
          }
          
          if (char === '"' && !escape) {
            dentroString = !dentroString;
            continue;
          }
          
          if (dentroString) continue;
          
          if (char === '{') {
            profundidade++;
          } else if (char === '}') {
            profundidade--;
            if (profundidade === 0) {
              fim = i + 1;
              break;
            }
          }
        }
        
        if (fim > inicio) {
          // Extrai o JSON completo
          const jsonString = textoPuro.substring(inicio, fim);
          
          try {
            // Tenta parsear o JSON (pode precisar corrigir aspas se necessário)
            let jsonParaParsear = jsonString;
            // Se o JSON não tiver aspas no valor de tipo, adiciona
            if (jsonString.includes('"tipo":variavelLocal')) {
              jsonParaParsear = jsonString.replace(/"tipo":variavelLocal/g, '"tipo":"variavelLocal"');
            }
            
            const estruturaVariavel = JSON.parse(jsonParaParsear);
            
            // Verifica se é uma variável local
            if (estruturaVariavel.tipo === 'variavelLocal') {
              encontrouVariavelLocal = true;
              const tituloVariavel = estruturaVariavel.label || estruturaVariavel.titulo || 'Variável Local';
              
              // console.log('✅ Variável local encontrada (formato JSON):', jsonString.substring(0, 100));
              
              // Cria uma estrutura similar às variáveis globais para processamento
              const variavelLocalFormatada = {
                tituloVariavel: tituloVariavel,
                variavel: estruturaVariavel,
                isLocal: true,
                textoOriginal: jsonString, // Usado como chave para identificação única
                id: `local_${inicio}_${elementosOrdenados.length}` // ID único baseado na posição
              };
              
              elementosOrdenados.push({
                tipo: 'variavelLocal',
                dados: variavelLocalFormatada,
                posicao: inicio
              });
              
              posicaoBusca = fim;
            } else {
              posicaoBusca = fim;
            }
          } catch (error) {
            // console.error('❌ Erro ao processar variável local:', error);
            // console.error('   JSON string:', jsonString);
            posicaoBusca = fim;
          }
        } else {
          break;
        }
      }
      
      // Se não encontrou no formato completo, tenta detectar o formato formatado [LOCAL: Título]
      // OU tenta buscar diretamente na frase original do backend se temos acesso a ela
      if (!encontrouVariavelLocal) {
        // PRIMEIRO: Se temos a frase passada como parâmetro, busca diretamente na frase base original
        // Isso é mais confiável do que tentar extrair do HTML
        if (frase && frase.frase && frase.frase.fraseBase) {
          // console.log('🔍 Buscando variáveis locais diretamente na frase base original do backend...');
          const fraseBaseOriginal = frase.frase.fraseBase;
          
          // Busca variáveis locais no formato {JSON} na frase original
          let posicaoBuscaOriginal = 0;
          
          while (posicaoBuscaOriginal < fraseBaseOriginal.length) {
            // Procura pelo início de um JSON de variável local
            const inicioJson = fraseBaseOriginal.indexOf('{"tipo":"variavelLocal"', posicaoBuscaOriginal);
            if (inicioJson === -1) {
              // Também tenta sem aspas no valor
              const inicioJsonSemAspas = fraseBaseOriginal.indexOf('{"tipo":variavelLocal', posicaoBuscaOriginal);
              if (inicioJsonSemAspas === -1) break;
              posicaoBuscaOriginal = inicioJsonSemAspas;
            } else {
              posicaoBuscaOriginal = inicioJson;
            }
            
            // Encontra o { correspondente
            const inicio = posicaoBuscaOriginal;
            let profundidade = 0;
            let fim = inicio;
            let dentroString = false;
            let escape = false;
            
            // Percorre o texto para encontrar o } correspondente
            for (let i = inicio; i < fraseBaseOriginal.length; i++) {
              const char = fraseBaseOriginal[i];
              
              if (escape) {
                escape = false;
                continue;
              }
              
              if (char === '\\') {
                escape = true;
                continue;
              }
              
              if (char === '"' && !escape) {
                dentroString = !dentroString;
                continue;
              }
              
              if (dentroString) continue;
              
              if (char === '{') {
                profundidade++;
              } else if (char === '}') {
                profundidade--;
                if (profundidade === 0) {
                  fim = i + 1;
                  break;
                }
              }
            }
            
            if (fim > inicio) {
              // Extrai o JSON completo
              const jsonString = fraseBaseOriginal.substring(inicio, fim);
              
              try {
                // Tenta parsear o JSON
                let jsonParaParsear = jsonString;
                if (jsonString.includes('"tipo":variavelLocal')) {
                  jsonParaParsear = jsonString.replace(/"tipo":variavelLocal/g, '"tipo":"variavelLocal"');
                }
                
                const estruturaVariavel = JSON.parse(jsonParaParsear);
                const tituloVariavel = estruturaVariavel.label || estruturaVariavel.titulo || 'Variável Local';
                
                // console.log('✅ Variável local encontrada na frase base original:', jsonString.substring(0, 100));
                
                // Encontra a posição aproximada no texto puro procurando pelo título formatado
                const textoFormatado = `[LOCAL: ${tituloVariavel}]`;
                const posicaoAproximada = textoPuro.indexOf(textoFormatado);
                const posicao = posicaoAproximada !== -1 ? posicaoAproximada : textoPuro.length;
                
                // Cria a estrutura para processamento
                const variavelLocalFormatada = {
                  tituloVariavel: tituloVariavel,
                  variavel: estruturaVariavel,
                  isLocal: true,
                  textoOriginal: jsonString, // Usa o JSON completo como chave
                  id: `local_${posicao}_${elementosOrdenados.length}`
                };
                
                elementosOrdenados.push({
                  tipo: 'variavelLocal',
                  dados: variavelLocalFormatada,
                  posicao: posicao
                });
                
                encontrouVariavelLocal = true;
                posicaoBuscaOriginal = fim;
              } catch (error) {
                // console.error('❌ Erro ao processar variável local da frase base:', error);
                // console.error('   JSON string:', jsonString);
                posicaoBuscaOriginal = fim;
              }
            } else {
              break;
            }
          }
        }
        
        // SEGUNDO: Se ainda não encontrou, tenta detectar padrões [LOCAL: Título] no texto puro
        // e buscar a frase original do backend
        if (!encontrouVariavelLocal) {
          // Detecta padrões [LOCAL: Título] (formato formatado sem JSON)
          const regexVariavelLocalFormatada = /\[LOCAL:\s*([^\]]+)\]/g;
          let matchFormatado;
          const variaveisFormatadasEncontradas = [];
          
          while ((matchFormatado = regexVariavelLocalFormatada.exec(textoPuro)) !== null) {
            const tituloFormatado = matchFormatado[1].trim();
            // console.log('⚠️ Variável local formatada encontrada (sem JSON):', `[LOCAL: ${tituloFormatado}]`);
            variaveisFormatadasEncontradas.push({
              textoFormatado: matchFormatado[0],
              titulo: tituloFormatado,
              posicao: matchFormatado.index
            });
          }
          
          // Se encontrou variáveis no formato formatado, tenta buscar a frase original do backend
          if (variaveisFormatadasEncontradas.length > 0) {
            // console.log('🔍 Tentando buscar formato completo da frase do backend...');
            
            try {
              let fraseBaseOriginal = '';
              
              // Se temos a frase passada como parâmetro, busca diretamente
              if (frase && frase.id) {
                const fraseResponse = await api.get(`/api/frases/${frase.id}/`);
                fraseBaseOriginal = fraseResponse.data.frase?.fraseBase || '';
              } else {
                // Se não temos frase, busca todas as frases e tenta encontrar
                const todasFrasesResponse = await api.get('/api/frases/');
                for (const fraseItem of todasFrasesResponse.data) {
                  if (fraseItem.frase?.fraseBase?.includes('"tipo":"variavelLocal"') || fraseItem.frase?.fraseBase?.includes('"tipo":variavelLocal')) {
                    fraseBaseOriginal = fraseItem.frase.fraseBase;
                    break;
                  }
                }
              }
              
              if (fraseBaseOriginal) {
              // console.log('🔍 Frase base original do backend (primeiros 200 chars):', fraseBaseOriginal.substring(0, 200));
              // console.log('🔍 Contém {JSON} de variável local?', fraseBaseOriginal.includes('"tipo":"variavelLocal"') || fraseBaseOriginal.includes('"tipo":variavelLocal'));
                
              // Busca variáveis locais no formato {JSON} na frase original
              let posicaoBuscaBackend = 0;
              
              while (posicaoBuscaBackend < fraseBaseOriginal.length) {
                // Procura pelo início de um JSON de variável local
                const inicioJson = fraseBaseOriginal.indexOf('{"tipo":"variavelLocal"', posicaoBuscaBackend);
                if (inicioJson === -1) {
                  const inicioJsonSemAspas = fraseBaseOriginal.indexOf('{"tipo":variavelLocal', posicaoBuscaBackend);
                  if (inicioJsonSemAspas === -1) break;
                  posicaoBuscaBackend = inicioJsonSemAspas;
                } else {
                  posicaoBuscaBackend = inicioJson;
                }
                
                // Encontra o { correspondente
                const inicio = posicaoBuscaBackend;
                let profundidade = 0;
                let fim = inicio;
                let dentroString = false;
                let escape = false;
                
                for (let i = inicio; i < fraseBaseOriginal.length; i++) {
                  const char = fraseBaseOriginal[i];
                  
                  if (escape) {
                    escape = false;
                    continue;
                  }
                  
                  if (char === '\\') {
                    escape = true;
                    continue;
                  }
                  
                  if (char === '"' && !escape) {
                    dentroString = !dentroString;
                    continue;
                  }
                  
                  if (dentroString) continue;
                  
                  if (char === '{') {
                    profundidade++;
                  } else if (char === '}') {
                    profundidade--;
                    if (profundidade === 0) {
                      fim = i + 1;
                      break;
                    }
                  }
                }
                
                if (fim > inicio) {
                  const jsonString = fraseBaseOriginal.substring(inicio, fim);
                  
                  try {
                    let jsonParaParsear = jsonString;
                    if (jsonString.includes('"tipo":variavelLocal')) {
                      jsonParaParsear = jsonString.replace(/"tipo":variavelLocal/g, '"tipo":"variavelLocal"');
                    }
                    
                    const estruturaVariavel = JSON.parse(jsonParaParsear);
                    const tituloVariavel = estruturaVariavel.label || estruturaVariavel.titulo || 'Variável Local';
                    
                    // Verifica se esta variável corresponde a alguma das variáveis formatadas encontradas
                    const variavelCorrespondente = variaveisFormatadasEncontradas.find(
                      v => v.titulo === tituloVariavel
                    );
                    
                    if (variavelCorrespondente) {
                      // console.log('✅ Variável local encontrada no backend:', jsonString.substring(0, 100));
                      
                      // Cria a estrutura para processamento
                      const variavelLocalFormatada = {
                        tituloVariavel: tituloVariavel,
                        variavel: estruturaVariavel,
                        isLocal: true,
                        textoOriginal: jsonString, // Usa o JSON completo como chave
                        id: `local_${variavelCorrespondente.posicao}_${elementosOrdenados.length}`
                      };
                      
                      elementosOrdenados.push({
                        tipo: 'variavelLocal',
                        dados: variavelLocalFormatada,
                        posicao: variavelCorrespondente.posicao
                      });
                      
                      encontrouVariavelLocal = true;
                    }
                    
                    posicaoBuscaBackend = fim;
                  } catch (error) {
                    // console.error('❌ Erro ao processar variável local do backend:', error);
                    posicaoBuscaBackend = fim;
                  }
                } else {
                  break;
                }
              }
              }
            } catch (error) {
              // console.error('❌ Erro ao buscar frase do backend:', error);
            }
            
            if (!encontrouVariavelLocal) {
              // console.error('❌ ERRO: Não foi possível recuperar o formato completo das variáveis locais.');
              // console.error('   Variáveis encontradas no formato formatado:', variaveisFormatadasEncontradas);
            }
          }
        }
      }
      
      if (!encontrouVariavelLocal) {
        // console.log('⚠️ Nenhuma variável local encontrada no texto');
      }

      // Encontra todas as ocorrências de grupos de opções [op1//op2//op3] (formato antigo)
      // IMPORTANTE: Esta regex deve vir DEPOIS da regex de variáveis locais para evitar conflitos
      const regexOpcoes = /\[(([^\]]+)\/\/([^\]]+)(?:\/\/[^\]]+)*)\](?!\])/g; // Adicionado negative lookahead para não pegar [[LOCAL...]]
      let matchOpcoes;
      
      while ((matchOpcoes = regexOpcoes.exec(textoPuro)) !== null) {
        const grupoCompleto = matchOpcoes[0]; // Inclui os [ ]
        const conteudoGrupo = matchOpcoes[1]; // Conteúdo entre [ ]
        const opcoes = conteudoGrupo.split('//').map(op => op.trim());
        
        elementosOrdenados.push({
          tipo: 'grupo',
          dados: {
            textoOriginal: grupoCompleto,
            opcoes: opcoes
          },
          posicao: matchOpcoes.index
        });
      }

      // Verifica se tem medida ($) - adiciona UMA entrada para CADA ocorrência
      const regexMedidas = /\$/g;
      let matchMedida;
      let indiceMedida = 0;
      while ((matchMedida = regexMedidas.exec(textoPuro)) !== null) {
        elementosOrdenados.push({
          tipo: 'medida',
          dados: { textoOriginal: '$', indice: indiceMedida },
          posicao: matchMedida.index
        });
        indiceMedida++;
      }
      
      // Ordena os elementos pela posição no texto
      elementosOrdenados.sort((a, b) => a.posicao - b.posicao);
      
      // Separa os elementos por tipo para manter compatibilidade
      const variaveisEncontradas = elementosOrdenados
        .filter(el => el.tipo === 'variavel')
        .map(el => el.dados);
        
      const gruposOpcoes = elementosOrdenados
        .filter(el => el.tipo === 'grupo')
        .map(el => el.dados);
      
      const variaveisLocaisEncontradas = elementosOrdenados
        .filter(el => el.tipo === 'variavelLocal')
        .map(el => el.dados);
      
      // console.log('📦 Variáveis locais encontradas:', variaveisLocaisEncontradas.length);
      if (variaveisLocaisEncontradas.length > 0) {
        // console.log('   Primeira variável local:', variaveisLocaisEncontradas[0]);
      }
      
      return {
        variaveis: variaveisEncontradas,
        gruposOpcoes: gruposOpcoes,
        variaveisLocais: variaveisLocaisEncontradas,
        elementosOrdenados: elementosOrdenados
      };
    } catch (error) {
      // console.error('Erro ao buscar variáveis:', error);
      return {
        variaveis: [],
        gruposOpcoes: [],
        variaveisLocais: [],
        elementosOrdenados: []
      };
    }
  };

    const handleVariaveisSelecionadas = (valoresSelecionados) => {
    // console.log('🔄 handleVariaveisSelecionadas chamado com:', valoresSelecionados);
    let textoFinal = textoTemporario;
    // console.log('📝 Texto original:', textoFinal);

    // Função para escapar caracteres especiais em regex
    const escapeRegExp = (string) => {
      return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    };

    // Primeiro, agrupa as variáveis por instância
    const variaveisPorTitulo = {};
    const variaveisNormais = {};

    Object.entries(valoresSelecionados).forEach(([chave, valor]) => {
      if (chave === '$') {
        // Substitui o caractere '$' respeitando múltiplas ocorrências
        if (Array.isArray(valor)) {
          let i = 0;
          textoFinal = textoFinal.replace(/\$/g, () => {
            const v = valor[i++];
            return v !== undefined && String(v).trim() !== '' ? String(v) : '$';
          });
        } else {
          textoFinal = textoFinal.replace(/\$/g, valor);
        }
      } else if (chave.includes('//')) {
        // Se a chave contém //, é um grupo de opções (formato antigo)
        const regex = new RegExp(escapeRegExp(chave), 'g');
        textoFinal = textoFinal.replace(regex, valor);
      } else if (chave.startsWith('{') && (chave.includes('"tipo":"variavelLocal"') || chave.includes('"tipo":variavelLocal'))) {
        // Se a chave começa com { e contém "tipo":"variavelLocal", é uma variável local (formato JSON)
        // Escapa a chave para usar em regex
        const regex = new RegExp(escapeRegExp(chave), 'g');
        textoFinal = textoFinal.replace(regex, valor);
      } else if (chave.includes('_') && /^.+_\d+$/.test(chave)) {
        // É uma variável por instância (aceita títulos com espaços)
        const partes = chave.split('_');
        const instanciaIndex = parseInt(partes[partes.length - 1]);
        const tituloBase = partes.slice(0, -1).join('_');

        // console.log(`🔢 Variável por instância: ${chave} -> ${tituloBase}[${instanciaIndex}] = ${valor}`);

        if (!variaveisPorTitulo[tituloBase]) {
          variaveisPorTitulo[tituloBase] = [];
        }
        variaveisPorTitulo[tituloBase][instanciaIndex] = valor;
      } else {
        // Variável normal
        variaveisNormais[chave] = valor;
      }
    });

    // console.log('📊 Variáveis normais:', variaveisNormais);
    // console.log('📊 Variáveis por título:', variaveisPorTitulo);

    // Processa variáveis normais primeiro
    Object.entries(variaveisNormais).forEach(([chave, valor]) => {
      const regex = new RegExp(`{${escapeRegExp(chave)}}`, 'g');
      textoFinal = textoFinal.replace(regex, valor);
      // console.log(`✅ Substituição normal: {${chave}} -> ${valor}`);
    });

    // Processa variáveis por instância
    Object.entries(variaveisPorTitulo).forEach(([tituloBase, instancias]) => {
      const regex = new RegExp(`{${escapeRegExp(tituloBase)}}`, 'g');
      let ocorrenciasEncontradas = 0;

      // console.log(`🔄 Processando instâncias de ${tituloBase}:`, instancias);

      textoFinal = textoFinal.replace(regex, (match) => {
        const valor = instancias[ocorrenciasEncontradas];
        // console.log(`🔄 Substituindo ocorrência ${ocorrenciasEncontradas} de {${tituloBase}}: ${match} -> ${valor}`);
        ocorrenciasEncontradas++;
        return valor !== undefined ? valor : match;
      });
    });

    // console.log('📝 Texto final:', textoFinal);

    const fraseTemConclusao = !!fraseTemporaria?.frase?.conclusao;
    const isFrase = !!fraseTemporaria;

    // Se é um modelo (fraseTemporaria é null), processa como modelo
    if (!fraseTemporaria) {
      // Procura por "impressão:" ou "conclusão:" no texto processado
      const regex = /(?:impressão:|conclusão:)([^]*?)(?=\n|$)/i;
      const match = textoFinal.match(regex);

      if (match) {
        // Se encontrou, extrai a conclusão
        const conclusao = match[1].trim();
        setConclusaoDoModelo(conclusao);
        setTexto(textoFinal);
      } else {
        // Se não encontrou, mantém o texto original e limpa a conclusão
        setTexto(textoFinal);
        setConclusaoDoModelo('');
      }
    } else {
      // Se é uma frase, processa normalmente
      // Caso desejado: frase com variáveis e SEM conclusão -> armar âncora para reposicionar cursor após setContent
      if (isFrase && !fraseTemConclusao && cursorAnchorTokenRef.current) {
        cursorAnchorArmedRef.current = true;
      } else {
        cursorAnchorArmedRef.current = false;
      }
      setTexto(textoFinal);
    }

    setModalVariaveisAberto(false);
  };
  

  const filterTreeItems = (items, searchTerm) => {
    if (!searchTerm) return items;

    return items.map(item => {
      if (item.type === 'categoria') {
        // Filtra os filhos da categoria
        const filteredChildren = item.children?.filter(child =>
          child.name.toLowerCase().includes(searchTerm.toLowerCase())
        );

        // Se a categoria tem filhos filtrados ou o próprio nome da categoria corresponde à busca
        if ((filteredChildren && filteredChildren.length > 0) || 
            item.name.toLowerCase().includes(searchTerm.toLowerCase())) {
          return {
            ...item,
            children: filteredChildren
          };
        }
        return null;
      } else {
        // Para itens que não são categorias, filtra pelo nome
        if (item.name.toLowerCase().includes(searchTerm.toLowerCase())) {
          return item;
        }
        return null;
      }
    }).filter(Boolean); // Remove os itens null
  };

  const renderTreeItems = (items, searchTerm) => {
    const filteredItems = filterTreeItems(items, searchTerm);
    
    return filteredItems.map((item) => {
      if (item.type === 'categoria') {
        // Determina a cor da categoria baseada nas frases que ela contém
        const temFrasesModelo = item.children?.some(child => child.isModelo);
        const temFrasesGerais = item.children?.some(child => !child.isModelo);
        
        let categoriaColor = '#000'; // Cor padrão
        let categoriaWeight = 'bold';
        
        if (temFrasesModelo && temFrasesGerais) {
          // Categoria mista - usa cor neutra
          categoriaColor = '#666';
          categoriaWeight = 'bold';
        } else if (temFrasesModelo) {
          // Apenas frases do modelo
          categoriaColor = '#228be6';
          categoriaWeight = 'bold';
        } else if (temFrasesGerais) {
          // Apenas frases gerais
          categoriaColor = '#fa5252';
          categoriaWeight = 'bold';
        }
        
        return (
          <NavLink
            key={item.id}
            label={item.name}
            leftSection={<IconFolder size={16} />}
            childrenOffset={28}
            style={{
              color: categoriaColor,
              fontWeight: categoriaWeight
            }}
          >
            {item.children && renderTreeItems(item.children, searchTerm)}
          </NavLink>
        );
      } else {
        // Encontra a frase correspondente
        const frase = todasFrases.find(f => 
          f.categoriaFrase === item.id.split('-')[0] && 
          f.tituloFrase === item.name
        );

        // Prepara o conteúdo do tooltip
        const tooltipContent = frase ? (
          <Stack spacing={5}>
            {frase.frase.fraseBase && (
              <div>
                <Text span c="red" fw={500}>Frase base:</Text>
                <div dangerouslySetInnerHTML={{ __html: converterQuebrasDeLinha(frase.frase.fraseBase) }} />
              </div>
            )}
            {frase.frase.substituicaoFraseBase && (
              <div>
                <Text span c="red" fw={500}>Substituirá:</Text>
                <div dangerouslySetInnerHTML={{ __html: converterQuebrasDeLinha(frase.frase.substituicaoFraseBase) }} />
              </div>
            )}
            {frase.frase.substituicoesOutras?.length > 0 && (
              <>
                <Text c="red" fw={500}>Outras substituições:</Text>
                {frase.frase.substituicoesOutras.map((sub, index) => (
                  <div key={index}>
                    "<span dangerouslySetInnerHTML={{ __html: converterQuebrasDeLinha(sub.procurarPor) }} />" → 
                    "<span dangerouslySetInnerHTML={{ __html: converterQuebrasDeLinha(sub.substituirPor) }} />"
                  </div>
                ))}
              </>
            )}
            {frase.frase.conclusao && (
              <div>
                <Text span c="red" fw={500}>Conclusão:</Text>
                <div dangerouslySetInnerHTML={{ __html: converterQuebrasDeLinha(frase.frase.conclusao) }} />
              </div>
            )}
          </Stack>
        ) : 'Detalhes da frase não disponíveis';

        return (
          <Tooltip
            key={item.id}
            label={tooltipContent}
            multiline
            width={400}
            position="right"
            withArrow
            events={{ hover: true, focus: true, touch: true }}
          >
            <div>
              <NavLink
                label={item.name}
                leftSection={<IconFile size={16} />}
                onClick={() => {
                  const [categoria] = item.id.split('-');
                  handleFraseClick(categoria, item.name);
                }}
                style={{
                  color: item.isModelo ? '#228be6' : '#fa5252', // Azul para modelo, vermelho para geral
                  fontWeight: item.isModelo ? 'bold' : 'bold' // Negrito para ambos
                }}
              />
            </div>
          </Tooltip>
        );
      }
    });
  };



  useEffect(() => {
    const buscarTodasFrases = async () => {
      try {
        const response = await api.get('/api/frases/');
        // console.log('Frases recebidas:', response.data);
        setTodasFrases(response.data);
      } catch (error) {
        // console.error('Erro ao buscar frases:', error);
      }
    };

    buscarTodasFrases();
  }, []);

  const gerarNomeArquivo = () => {
    const agora = new Date();
    const data = agora.toLocaleDateString('pt-BR').replace(/\//g, '-');
    const hora = agora.toLocaleTimeString('pt-BR').replace(/:/g, '-');
    return `laudo_${data}_${hora}.docx`;
  };

  const handleCopiarLaudo = async () => {
    try {
      const editor = editorRef.current?.editor;
      if (!editor) return;

      // Seleciona todo o texto
      editor.commands.setTextSelection({ from: 0, to: editor.state.doc.content.size });
      
      // Copia o texto usando o comando execCommand
      // document.execCommand('copy');

      async function copiarTextoComFormato() {
        const textoComFormato = editor.getHTML();

        const textoParaClipboardFormatado = new ClipboardItem({
          'text/html': new Blob([textoComFormato], { type: 'text/html' }),
          
        });

        await navigator.clipboard.write([textoParaClipboardFormatado]);
      }

      copiarTextoComFormato();

      
      // Limpa a seleção
      editor.commands.setTextSelection(editor.state.selection.from);
      
      alert('Laudo copiado com sucesso!');
      // Limpa o localStorage
      localStorage.removeItem('variaveisSelecionadas');
    } catch (error) {
      // console.error('Erro ao copiar laudo:', error);
      alert('Erro ao copiar o laudo. Por favor, tente novamente.');
    }
  };

  const handleCopiarLaudoSemFormatacao = () => {
    try {
      const editor = editorRef.current?.editor;
      if (!editor) return;
      
      // Copia apenas o texto puro, sem formatação
      const textoPuro = editor.getText();
      navigator.clipboard.writeText(textoPuro);
      alert('Laudo copiado sem formatação com sucesso!');
      // Limpa o localStorage
      localStorage.removeItem('variaveisSelecionadas');
    } catch (error) {
      // console.error('Erro ao copiar laudo sem formatação:', error);
      alert('Erro ao copiar o laudo sem formatação. Por favor, tente novamente.');
    }
  };

  const handleDeleteLaudo = () => {
    if (window.confirm('Tem certeza que deseja excluir este laudo?')) {
      editorRef.current?.editor?.commands.setContent('');
      // Limpa o localStorage
      localStorage.removeItem('variaveisSelecionadas');
    }
  };

  const handleLimparTudo = () => {
    if (window.confirm('Tem certeza que deseja limpar todos os campos?')) {
      setMetodosModelo([]);
      setTitulo('');
      editorRef.current?.editor?.commands.setContent('');
      setConclusaoDoModelo('');
      // Limpa o localStorage
      localStorage.removeItem('variaveisSelecionadas');
    }
  };

  const handleMetodosOutroModeloChange = (newValue) => {
    setMetodosOutroModelo(newValue);
    setTituloOutroModelo('');
    setTreeDataOutroModelo([]);
  };

  const handleTituloOutroModeloSelect = async (selectedTitulo) => {
    try {
      const modeloSelecionado = titulosOutroModelo.find(item => item.titulo === selectedTitulo);
      if (!modeloSelecionado) {
        // console.error('Modelo não encontrado para o título:', selectedTitulo);
        return;
      }

      // Busca as frases associadas ao modelo
      const frasesResponse = await api.get('/api/frases/');
      const frasesDoModelo = frasesResponse.data.filter(f => 
        f.modelos_laudo && f.modelos_laudo.includes(modeloSelecionado.id)
      );

      // console.log('Categorias recebidas:', frasesDoModelo.map(frase => frase.categoriaFrase));
      
      // Organiza as frases por categoria
      const categorias = [...new Set(frasesDoModelo.map(frase => frase.categoriaFrase))];
      
      const treeItems = categorias.map(categoria => {
        const frasesCategoria = frasesDoModelo.filter(frase => frase.categoriaFrase === categoria);
        
        const children = frasesCategoria.map(frase => ({
          id: `${categoria}-${frase.tituloFrase}`,
          name: frase.tituloFrase,
          type: 'titulo'
        }));

        return {
          id: categoria,
          name: categoria,
          type: 'categoria',
          children
        };
      });

      setTreeDataOutroModelo(treeItems);
      
    } catch (error) {
      // console.error('Erro ao buscar frases do modelo:', error);
      alert('Erro ao carregar as frases do modelo. Por favor, tente novamente.');
    }
  };

  return (
    <Layout>
      <Grid gutter="md">
        {/* Coluna da Esquerda */}
        <Grid.Col span={6}>
          <Stack spacing="md">
            <Divider label="Configurações do Laudo" labelPosition="center" my="md" />
            
            <Divider label="Selecione o Método para Filtrar Modelos" labelPosition="center" my="md" />
            <MetodosSelect
              value={metodosModelo}
              onChange={handleMetodosModeloChange}
              label="Método do Modelo"
            />

            <TituloCombobox
              value={titulo}
              onChange={setTitulo}
              metodosSelected={metodosModelo}
              onTituloSelect={handleTituloSelect}
              titulosDisponiveis={titulosDisponiveis}
              setTitulosDisponiveis={setTitulosDisponiveis}
            />

            {treeDataModelo.length > 0 && (
              <>
                <Divider label="Frases do Modelo" labelPosition="center" my="md" />
                <TextInput
                  placeholder="Buscar frases do modelo..."
                  value={searchModeloFrases}
                  onChange={(event) => setSearchModeloFrases(event.currentTarget.value)}
                  mb="sm"
                />
                <div style={{ 
                  border: '1px solid #dee2e6', 
                  borderRadius: '4px', 
                  padding: '10px',
                  backgroundColor: '#f8f9fa',
                  maxHeight: '300px',
                  overflowY: 'auto'
                }}>
                  {renderTreeItems(treeDataModelo, searchModeloFrases)}
                </div>
                <Text size="xs" lineClamp={2} c="dimmed" ta="left">
                  🔵 Categorias/Frases associadas ao Modelo
                </Text>
                <Text size="xs" c="dimmed" ta="left"> 
                  🔴 Categorias/Frases Gerais, não associadas a nenhum modelo específico
                </Text>
              </>
            )}


            <Divider label="Selecionar Frases de Outros Modelos" labelPosition="center" my="md" />

            <MetodosSelect
              value={metodosOutroModelo}
              onChange={handleMetodosOutroModeloChange}
              label="Método do Modelo"
            />

            <TituloCombobox
              value={tituloOutroModelo}
              onChange={setTituloOutroModelo}
              metodosSelected={metodosOutroModelo}
              onTituloSelect={handleTituloOutroModeloSelect}
              titulosDisponiveis={titulosOutroModelo}
              setTitulosDisponiveis={setTitulosOutroModelo}
            />

            {treeDataOutroModelo.length > 0 && (
              <>
                <TextInput
                  placeholder="Buscar frases de outros modelos..."
                  value={searchOutroModeloFrases}
                  onChange={(event) => setSearchOutroModeloFrases(event.currentTarget.value)}
                  mb="sm"
                />
                <div style={{ 
                  border: '1px solid #dee2e6', 
                  borderRadius: '4px', 
                  padding: '10px',
                  backgroundColor: '#f8f9fa',
                  maxHeight: '300px',
                  overflowY: 'auto'
                }}>
                  {renderTreeItems(treeDataOutroModelo, searchOutroModeloFrases)}
                </div>
              </>
            )}



          </Stack>
        </Grid.Col>

        {/* Coluna da Direita */}
        <Grid.Col span={6}>
          <Stack spacing="md">
            <Divider label="Visualização do Laudo" labelPosition="center" my="md" />
            
            <TextEditor
              content={texto}
              onChange={setTexto}
              label="Editor de Texto"
              ref={editorRef}
              onSelectionUpdate={handleEditorSelectionUpdate}
              onClick={handleEditorClick}
              onCursorPositionChange={(pos) => {
                setPosicaoAtualCursor((prev) => (prev !== pos ? pos : prev));
              }}
              aguardandoClique={aguardandoClique}
              aguardandoSelecao={aguardandoSelecao}
              aguardandoLinha={aguardandoLinha}
              aguardandoPosicaoAtual={aguardandoPosicaoAtual}
              enableAutoSave={true}
              autoSaveKey="laudos_editor_autoSave"
              autoSaveInterval={5000}
              showLoadButton={true}
            />

            {/* Botões de ação do laudo */}
            <Group position="center" spacing="md">
              <Button
                onClick={handleCopiarLaudo}
              >
                Copia Laudo
              </Button>

              <Button
                onClick={handleCopiarLaudoSemFormatacao}
              >
                Copia Laudo sem formatação
              </Button>

              <Button
                color="red"
                onClick={handleDeleteLaudo}
              >
                Deleta Laudo
              </Button>

              <Button
                color="orange"
                onClick={handleLimparTudo}
              >
                Limpa todos os campos
              </Button>
            </Group>

            <Tooltip label="Quando marcado, além de copiar o laudo, também será baixado um arquivo DOCX com o conteúdo formatado">
              <Checkbox
                label="Baixar Laudo em Docx"
                checked={baixarDocx}
                onChange={(event) => setBaixarDocx(event.currentTarget.checked)}
                style={{ marginTop: '10px' }}
              />
            </Tooltip>
          </Stack>
        </Grid.Col>
      </Grid>

      <SelecionarVariaveisModal
        opened={modalVariaveisAberto}
        onClose={() => setModalVariaveisAberto(false)}
        variaveis={variaveisEncontradas}
        gruposOpcoes={gruposOpcoesEncontrados}
        elementosOrdenados={elementosOrdenados}
        onConfirm={handleVariaveisSelecionadas}
        tituloFrase={tituloFraseAtual}
        temMedida={fraseTemporaria?.frase?.fraseBase?.includes('$') || textoTemporario?.includes('$')}
      />

      <InserirFraseModal
        opened={modalInserirFraseAberto}
        onClose={() => {
          setModalInserirFraseAberto(false);
          setFraseTemporaria(null);
        }}
        onConfirm={handleInserirFraseConfirm}
        temMedida={fraseTemporaria?.frase?.fraseBase?.includes('$')}
      />
    </Layout>
  );
}   

export default Laudos; 