import Layout from '../components/Layout';
import { Divider, Stack, Grid, Text, NavLink, Tooltip, Group, Button, TextInput } from '@mantine/core';
import { useState, useRef, useEffect, useCallback } from 'react';
import TextEditor from '../components/TextEditor';
import MetodosSelect from '../components/MetodosSelect';
import TituloCombobox from '../components/TituloCombobox';
import MetodosSelectFrases from '../components/MetodosSelectFrases';
import SelecionarVariaveisModal from '../components/SelecionarVariaveisModal';
import InserirFraseModal from '../components/InserirFraseModal';
import api from '../api';
import { IconFolder, IconFile } from '@tabler/icons-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

// Função para pluralizar palavras e frases
import pluralize from '../utils/pluralizar';
import {
  converterQuebrasDeLinha,
  substituirPrimeiraOcorrenciaOutras,
} from '../utils/fraseEngine';
import {
  montarTextoCompostoParaVariaveisDaFrase,
  aplicarValoresSelecionadosAoTexto,
  splitPartesResolvidas,
  unpackPartesNaFrase,
  capitalizarInicioDaFrase,
} from '../utils/variaveisFrase';

function escapeHtmlForInlineText(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function stripInlineFontSizeAndFamily(root) {
  root.querySelectorAll('*').forEach((el) => {
    if (!el.hasAttribute('style')) return;
    el.style.removeProperty('font-family');
    el.style.removeProperty('font-size');
    if (!el.style.cssText.trim()) {
      el.removeAttribute('style');
    }
  });
}

/**
 * Junta o HTML do editor em um único <p>, preservando negrito/itálico etc. Blocos são separados por <br>.
 * @param {string} html
 * @param {{ fontFamily?: string | null, fontSize?: string | null }} [typography] — se informado, aplica no <p> e remove font-family/font-size inline dos descendentes (força global).
 */
function mergeEditorHtmlToSingleParagraph(html, typography = {}) {
  const fontFamily = typography.fontFamily?.trim?.() ? typography.fontFamily.trim() : null;
  const fontSize = typography.fontSize?.trim?.() ? typography.fontSize.trim() : null;
  const forceGlobal = Boolean(fontFamily || fontSize);

  const raw = (html || '').trim();
  const chunks = [];

  if (raw) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(raw, 'text/html');
    const body = doc.body;

    const walkTopLevel = (nodes) => {
      for (const node of nodes) {
        if (node.nodeType === Node.TEXT_NODE) {
          const t = node.textContent;
          if (t && t.trim()) {
            chunks.push(escapeHtmlForInlineText(t));
          }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          const el = node;
          const tag = el.tagName.toLowerCase();
          if (tag === 'p') {
            chunks.push(el.innerHTML);
          } else if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tag)) {
            chunks.push(el.innerHTML);
          } else if (tag === 'blockquote') {
            chunks.push(el.innerHTML);
          } else if (tag === 'ul' || tag === 'ol') {
            el.querySelectorAll(':scope > li').forEach((li) => {
              chunks.push(li.innerHTML);
            });
          } else if (tag === 'table') {
            el.querySelectorAll('tr').forEach((tr) => {
              const cells = [];
              tr.querySelectorAll('th, td').forEach((td) => {
                cells.push(td.innerHTML);
              });
              if (cells.length) chunks.push(cells.join(' '));
            });
          } else if (tag === 'div') {
            walkTopLevel(el.childNodes);
          } else if (tag === 'pre') {
            chunks.push(el.innerHTML);
          } else {
            chunks.push(el.innerHTML);
          }
        }
      }
    };

    walkTopLevel(body.childNodes);
  }

  let inner = chunks.join('<br>');

  if (forceGlobal) {
    const tmp = new DOMParser().parseFromString(
      '<!DOCTYPE html><html><body><div id="typo-root"></div></body></html>',
      'text/html'
    );
    const root = tmp.getElementById('typo-root');
    root.innerHTML = inner;
    stripInlineFontSizeAndFamily(root);
    inner = root.innerHTML;
  }

  const p = document.createElement('p');
  p.className = 'editor-paragraph';
  if (fontFamily) p.style.setProperty('font-family', fontFamily);
  if (fontSize) p.style.setProperty('font-size', fontSize);
  p.innerHTML = inner;
  return p.outerHTML;
}

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
  const [textoPuroParaModal, setTextoPuroParaModal] = useState('');
  const [aguardandoClique, setAguardandoClique] = useState(false);
  const [aguardandoSelecao, setAguardandoSelecao] = useState(false);
  const [aguardandoLinha, setAguardandoLinha] = useState(false);
  const [aguardandoPosicaoAtual, setAguardandoPosicaoAtual] = useState(false);
  const [posicaoAtualCursor, setPosicaoAtualCursor] = useState(null);
  const editorRef = useRef(null);
  const [todasFrases, setTodasFrases] = useState([]);
  const [tituloOutroModelo, setTituloOutroModelo] = useState('');
  const [treeDataOutroModelo, setTreeDataOutroModelo] = useState([]);
  const [metodosOutroModelo, setMetodosOutroModelo] = useState([]);
  const [titulosOutroModelo, setTitulosOutroModelo] = useState([]);
  const [searchModeloFrases, setSearchModeloFrases] = useState('');
  const [searchOutroModeloFrases, setSearchOutroModeloFrases] = useState('');
  const [cursorPosicao, setCursorPosicao] = useState(null);
  const [fraseBaseTamanho, setFraseBaseTamanho] = useState(null);
  // Novo fluxo: posição onde a frase deve ser inserida após processamento das variáveis
  const [posicaoInsercaoFrase, setPosicaoInsercaoFrase] = useState(null);
  // Frase com variáveis (ainda não processada) esperando pelo modal
  const [frasePendenteComVariaveis, setFrasePendenteComVariaveis] = useState(null);
  const posicaoInsercaoFraseRef = useRef(null);
  const frasePendenteComVariaveisRef = useRef(null);

  const aplicarFormatacao = useCallback((conteudo, editor = editorRef.current?.editor) => {
    if (!editor) return conteudo;

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

    return `<span style="font-family: ${fonteAtual}; font-size: ${tamanhoAtual}">${conteudo}</span>`;
  }, []);

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
      const { variaveis, gruposOpcoes, variaveisLocais, elementosOrdenados, textoPuro } = await buscarVariaveisNoTexto(textoFormatado);
      
      // Se encontrou variáveis, grupos de opções, variáveis locais ou tem '$', guarda o texto temporariamente e abre o modal
      if (variaveis.length > 0 || gruposOpcoes.length > 0 || variaveisLocais.length > 0 || textoFormatado.includes('$')) {
        setTextoTemporario(textoFormatado);
        setVariaveisEncontradas(variaveis);
        setGruposOpcoesEncontrados(gruposOpcoes);
        setElementosOrdenados(elementosOrdenados);
        setTextoPuroParaModal(textoPuro);
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

      // Busca as frases gerais (sem modelo específico, filtradas por método quando aplicável)
      const metodoModeloId = Number(modeloSelecionado.metodo);
      const frasesGerais = frasesResponse.data.filter((f) => {
        if (f.modelos_laudo && f.modelos_laudo.length > 0) return false;
        if (!f.metodos || f.metodos.length === 0) return true;
        return f.metodos.some((metodoId) => Number(metodoId) === metodoModeloId);
      });

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

  // Adiciona a função de conversão — ver utils/fraseEngine.js

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

  /**
   * Une frase base, cada substituição "outra" e a conclusão num único texto para detectar
   * e resolver variáveis de uma vez; após o modal o texto é repartido pelo mesmo separador.
   * @see utils/variaveisFrase.js montarTextoCompostoParaVariaveisDaFrase
   */

  const processarFrase = async (frase, tipoInsercao = null, elementoLinha = null, posicaoCursor = null) => {
    let novoTexto = texto;
    const editor = editorRef.current?.editor;
    // Posição onde queremos deixar o cursor ao final do processo (fim do trecho inserido/substituído)
    let cursorDesejado = null;
    const temConclusao = !!frase?.frase?.conclusao;
    
    // Atualiza o título da frase atual
    setTituloFraseAtual(frase.tituloFrase);
    setFraseBaseTamanho(frase.frase.fraseBase.length);
    if (tipoInsercao) {
      // Se não tem substituição, insere baseado na escolha do usuário
      let fraseBase = converterQuebrasDeLinha(frase.frase.fraseBase || '');

      try {
        // Aplica a formatação à frase base
        fraseBase = aplicarFormatacao(fraseBase);

        // Variáveis em toda a frase (base, substituições outras, conclusão) num único passo
        const {
          textoComposto,
          resultado,
          temVariaveis: temVariaveisComposto,
          nSegmentos,
          sep: sepSegmentos,
        } = await montarTextoCompostoParaVariaveisDaFrase(frase);
        const { variaveis, gruposOpcoes, variaveisLocais, elementosOrdenados, textoPuro } =
          resultado;
        const temVariaveis = temVariaveisComposto;

        if (temVariaveis && editor) {
          // NOVO FLUXO: Salva a frase com variáveis e a posição de inserção, mas NÃO insere ainda
          // Usa posicaoAtualCursor que é mantido atualizado pelo onCursorPositionChange
          const posicaoCursor = (typeof posicaoAtualCursor === 'number') ? posicaoAtualCursor : editor.state.selection.from;
          const pendente = {
            frase: frase,
            fraseBaseFormatada: fraseBase,
            tipoInsercao: tipoInsercao,
            elementoLinha: elementoLinha,
            posicaoCursor: posicaoCursor,
            segmentacaoVariaveis: { sep: sepSegmentos, n: nSegmentos },
          };
          setPosicaoInsercaoFrase(posicaoCursor);
          posicaoInsercaoFraseRef.current = posicaoCursor;
          setFrasePendenteComVariaveis(pendente);
          frasePendenteComVariaveisRef.current = pendente;
          setTextoTemporario(textoComposto);
          setVariaveisEncontradas(variaveis);
          setGruposOpcoesEncontrados(gruposOpcoes);
          setElementosOrdenados(elementosOrdenados);
          setTextoPuroParaModal(textoPuro);
          setFraseTemporaria(frase);
          setModalVariaveisAberto(true);
          return; // Sai sem inserir - a inserção acontecerá após o modal
        }

        // Se não tem variáveis, insere normalmente (fluxo antigo)
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
              editor.commands.insertContentAt(from, fraseBase);
              //editor.commands.insertContent(fraseBase);
              console.log("texto que veio do modal de variáveis: " + fraseBase);
              deltaInserido = editor.state.selection.from - posicaoInicialInsercao;
              editor.commands.focus(deltaInserido);

              
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
            const substituirPor = aplicarFormatacao(converterQuebrasDeLinha(substituicao.substituirPor));
            conteudoAtual = substituirPrimeiraOcorrenciaOutras(
              conteudoAtual,
              substituicao.procurarPor,
              substituirPor
            );
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
      // Fluxo normal para frases com substituição (substituicaoFraseBase no laudo)
      if (editor) {
        try {
          let fraseBase = converterQuebrasDeLinha(frase.frase.fraseBase || '');
          fraseBase = aplicarFormatacao(fraseBase);

          const {
            textoComposto,
            resultado,
            temVariaveis: temVariaveisComposto,
            nSegmentos,
            sep: sepSegmentos,
          } = await montarTextoCompostoParaVariaveisDaFrase(frase);
          const { variaveis, gruposOpcoes, variaveisLocais, elementosOrdenados, textoPuro } =
            resultado;
          const temVariaveis = temVariaveisComposto;

          if (temVariaveis) {
            setTextoTemporario(textoComposto);
            setVariaveisEncontradas(variaveis);
            setGruposOpcoesEncontrados(gruposOpcoes);
            setElementosOrdenados(elementosOrdenados);
            setTextoPuroParaModal(textoPuro);
            setFraseTemporaria(frase);
            setTituloFraseAtual(frase.tituloFrase);
            setFraseBaseTamanho(frase.frase.fraseBase.length);
            setFrasePendenteComVariaveis({
              frase,
              fraseBaseFormatada: fraseBase,
              modoSubstituicao: true,
              segmentacaoVariaveis: { sep: sepSegmentos, n: nSegmentos },
            });
            frasePendenteComVariaveisRef.current = {
              frase,
              fraseBaseFormatada: fraseBase,
              modoSubstituicao: true,
              segmentacaoVariaveis: { sep: sepSegmentos, n: nSegmentos },
            };
            setPosicaoInsercaoFrase(null);
            posicaoInsercaoFraseRef.current = null;
            setModalVariaveisAberto(true);
            return;
          }

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
              const substituirPor = aplicarFormatacao(converterQuebrasDeLinha(substituicao.substituirPor));
              novoConteudo = substituirPrimeiraOcorrenciaOutras(
                novoConteudo,
                substituicao.procurarPor,
                substituirPor
              );
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
        editor.commands.focus(safePos);
      } else if (temConclusao) {
        editor.commands.setTextSelection(editor.state.doc.content.size);
      }
    }

    // Atualiza o texto no estado (para frases sem variáveis ou fluxo antigo)
    if (!frasePendenteComVariaveis) {
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


    const handleVariaveisSelecionadas = (valoresSelecionados) => {
    let textoFinal = aplicarValoresSelecionadosAoTexto(textoTemporario, valoresSelecionados);

    const pendenteVar =
      frasePendenteComVariaveisRef.current || frasePendenteComVariaveis;
    const segInfo = pendenteVar?.segmentacaoVariaveis;

    const splitResult = splitPartesResolvidas(textoFinal, segInfo);
    let partesResolvidas = splitResult.partesResolvidas;
    if (splitResult.textoFinal) {
      textoFinal = splitResult.textoFinal;
    }

    // console.log('📝 Texto final:', textoFinal);

    const fraseTemConclusao = !!fraseTemporaria?.frase?.conclusao;
    const isFrase = !!fraseTemporaria;

    // O novo fluxo precisa vir antes do teste "!fraseTemporaria":
    // alguns caminhos limpam fraseTemporaria antes da confirmação do modal.
    if (frasePendenteComVariaveisRef.current || frasePendenteComVariaveis) {
      const pendente =
        frasePendenteComVariaveisRef.current || frasePendenteComVariaveis;
      const editor = editorRef.current?.editor;
      const fraseAtual = pendente?.frase;

      if (pendente?.modoSubstituicao && editor && fraseAtual?.frase) {
        const cursorDesejado = editor.state.selection.from;
        const temConclusao = !!fraseAtual.frase.conclusao;

        const segResolvido = partesResolvidas
          ? unpackPartesNaFrase(fraseAtual, partesResolvidas)
          : {
              base: textoFinal,
              subs: null,
              conclusaoResolvida: null,
              temConc: !!fraseAtual.frase.conclusao,
            };
        const { base: textoBaseSubst, subs: subsRes, conclusaoResolvida } = segResolvido;

        let conteudoAtual = editor.getHTML();
        let novoConteudo = conteudoAtual;

        if (fraseAtual.frase.substituicaoFraseBase && fraseAtual.frase.fraseBase) {
          novoConteudo = conteudoAtual.replace(
            fraseAtual.frase.substituicaoFraseBase,
            textoBaseSubst
          );
        }

        if (
          fraseAtual.frase.substituicoesOutras &&
          fraseAtual.frase.substituicoesOutras.length > 0
        ) {
          fraseAtual.frase.substituicoesOutras.forEach((substituicao, idx) => {
            const substituirPor =
              subsRes && subsRes[idx] !== undefined
                ? subsRes[idx]
                : aplicarFormatacao(
                    converterQuebrasDeLinha(substituicao.substituirPor)
                  );
            novoConteudo = substituirPrimeiraOcorrenciaOutras(
              novoConteudo,
              substituicao.procurarPor,
              substituirPor
            );
          });
        }

        if (novoConteudo !== conteudoAtual) {
          editor.commands.setContent(novoConteudo);
        }

        let novoTexto = editor.getHTML();

        if (fraseAtual.frase.conclusao) {
          try {
            const conclusaoFormatada =
              partesResolvidas != null &&
              conclusaoResolvida != null &&
              conclusaoResolvida !== ''
                ? conclusaoResolvida
                : aplicarFormatacao(fraseAtual.frase.conclusao);

            if (conclusaoDoModelo) {
              const htmlAtual = editor.getHTML();
              const comConclusao = htmlAtual.replace(
                conclusaoDoModelo,
                '<br>' + conclusaoFormatada
              );
              editor.commands.setContent(comConclusao);
              setConclusaoDoModelo('');
            } else {
              const textoAtualPlain = novoTexto.replace(/<[^>]*>/g, '');
              const textoConclusao = conclusaoFormatada.replace(/<[^>]*>/g, '');
              const conclusaoPluralizada = pluralize(textoConclusao);
              const conclusaoExisteSingular = textoAtualPlain.includes(textoConclusao);
              const conclusaoExistePlural = textoAtualPlain.includes(conclusaoPluralizada);

              if (!conclusaoExisteSingular && !conclusaoExistePlural) {
                const posFinalDoc = editor.state.doc.content.size;
                editor.commands.insertContentAt(
                  posFinalDoc,
                  '<br>' + conclusaoFormatada
                );
              } else if (conclusaoExisteSingular && !conclusaoExistePlural) {
                const conclusaoPluralizadaFormatada = aplicarFormatacao(
                  conclusaoPluralizada
                );
                const comPlural = novoTexto.replace(
                  textoConclusao,
                  conclusaoPluralizadaFormatada
                );
                editor.commands.setContent(comPlural);
              }
            }

            novoTexto = editor.getHTML();
          } catch {
            /* noop */
          }
        }

        if (!temConclusao && typeof cursorDesejado === 'number') {
          const maxPos = editor.state.doc.content.size;
          const safePos = Math.max(0, Math.min(cursorDesejado, maxPos));
          editor.chain().focus().setTextSelection(safePos).run();
          editor.commands.focus(safePos);
        } else if (temConclusao) {
          editor.commands.setTextSelection(editor.state.doc.content.size);
        }

        setTexto(novoTexto);
      } else {
        const posicaoInsercao =
          typeof posicaoInsercaoFraseRef.current === 'number'
            ? posicaoInsercaoFraseRef.current
            : posicaoInsercaoFrase;

        if (editor && typeof posicaoInsercao === 'number') {
          const segResolvido = partesResolvidas
            ? unpackPartesNaFrase(fraseAtual, partesResolvidas)
            : {
                base: textoFinal,
                subs: null,
                conclusaoResolvida: null,
                temConc: !!fraseAtual?.frase?.conclusao,
              };
          const { base: blocoBase, subs: subsRes, conclusaoResolvida } = segResolvido;

          editor.commands.setTextSelection(posicaoInsercao);
          editor.commands.insertContent(blocoBase);

          if (
            fraseAtual?.frase?.substituicoesOutras &&
            fraseAtual.frase.substituicoesOutras.length > 0
          ) {
            let htmlAtual = editor.getHTML();
            fraseAtual.frase.substituicoesOutras.forEach((substituicao, idx) => {
              const substituirPor =
                subsRes && subsRes[idx] !== undefined
                  ? subsRes[idx]
                  : aplicarFormatacao(
                      converterQuebrasDeLinha(substituicao.substituirPor)
                    );
              htmlAtual = substituirPrimeiraOcorrenciaOutras(
                htmlAtual,
                substituicao.procurarPor,
                substituirPor
              );
            });
            editor.commands.setContent(htmlAtual);
          }

          let novoTextoIns = editor.getHTML();
          const temConclusaoIns = !!fraseAtual?.frase?.conclusao;

          if (fraseAtual?.frase?.conclusao) {
            try {
              const conclusaoFormatada =
                partesResolvidas != null &&
                conclusaoResolvida != null &&
                conclusaoResolvida !== ''
                  ? conclusaoResolvida
                  : aplicarFormatacao(fraseAtual.frase.conclusao);

              if (conclusaoDoModelo) {
                const htmlAtual = editor.getHTML();
                const comConclusao = htmlAtual.replace(
                  conclusaoDoModelo,
                  '<br>' + conclusaoFormatada
                );
                editor.commands.setContent(comConclusao);
                setConclusaoDoModelo('');
              } else {
                const textoAtualPlain = novoTextoIns.replace(/<[^>]*>/g, '');
                const textoConclusao = conclusaoFormatada.replace(/<[^>]*>/g, '');
                const conclusaoPluralizada = pluralize(textoConclusao);
                const conclusaoExisteSingular = textoAtualPlain.includes(textoConclusao);
                const conclusaoExistePlural = textoAtualPlain.includes(conclusaoPluralizada);

                if (!conclusaoExisteSingular && !conclusaoExistePlural) {
                  const posFinalDoc = editor.state.doc.content.size;
                  editor.commands.insertContentAt(
                    posFinalDoc,
                    '<br>' + conclusaoFormatada
                  );
                } else if (conclusaoExisteSingular && !conclusaoExistePlural) {
                  const conclusaoPluralizadaFormatada = aplicarFormatacao(
                    conclusaoPluralizada
                  );
                  const comPlural = novoTextoIns.replace(
                    textoConclusao,
                    conclusaoPluralizadaFormatada
                  );
                  editor.commands.setContent(comPlural);
                }
              }

              novoTextoIns = editor.getHTML();
            } catch {
              /* noop */
            }
          }

          if (!temConclusaoIns) {
            const posicaoFinal = editor.state.selection.from;
            const maxPos = editor.state.doc.content.size;
            const safePos = Math.max(0, Math.min(posicaoFinal, maxPos));
            editor.chain().focus().setTextSelection(safePos).run();
          } else {
            editor.commands.setTextSelection(editor.state.doc.content.size);
          }

          setTexto(novoTextoIns);
        }
      }

      // Limpa os estados do novo fluxo
      setFrasePendenteComVariaveis(null);
      frasePendenteComVariaveisRef.current = null;
      setPosicaoInsercaoFrase(null);
      posicaoInsercaoFraseRef.current = null;
    } else if (!fraseTemporaria) {
      // Se é um modelo (fraseTemporaria é null), processa como modelo
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
      // FLUXO ANTIGO: Se é uma frase, processa normalmente
      setTexto(textoFinal);
    }

    setModalVariaveisAberto(false);
    // Limpa a posição do cursor após usar (para não interferir em futuras atualizações)
    setCursorPosicao(null);
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

  const TREE_ROW_ESTIMATE_PX = 40;
  const TREE_VERTICAL_PADDING_PX = 24;
  const TREE_MAX_VIEW_PX = 560;
  const TREE_MIN_VIEW_PX = 72;

  const countVisibleTreeRows = (items) => {
    if (!items?.length) return 0;
    let n = 0;
    for (const item of items) {
      if (item.type === 'categoria') {
        n += 1;
        if (item.children?.length) n += countVisibleTreeRows(item.children);
      } else {
        n += 1;
      }
    }
    return n;
  };

  const getTreeBoxStyle = (items, searchTerm) => {
    const filtered = filterTreeItems(items, searchTerm);
    const rows = countVisibleTreeRows(filtered);
    const contentHeight =
      rows === 0
        ? TREE_MIN_VIEW_PX
        : rows * TREE_ROW_ESTIMATE_PX + TREE_VERTICAL_PADDING_PX;
    const maxHeight = Math.min(TREE_MAX_VIEW_PX, Math.max(TREE_MIN_VIEW_PX, contentHeight));
    return {
      border: '1px solid #dee2e6',
      borderRadius: '4px',
      padding: '10px',
      backgroundColor: '#f8f9fa',
      maxHeight,
      overflowY: contentHeight > TREE_MAX_VIEW_PX ? 'auto' : 'visible',
    };
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

  const gerarNomeArquivoPdf = () => {
    const agora = new Date();
    const data = agora.toLocaleDateString('pt-BR').replace(/\//g, '-');
    const hora = agora.toLocaleTimeString('pt-BR').replace(/:/g, '-');
    return `laudo_${data}_${hora}.pdf`;
  };

  const baixarLaudoPdf = async (editor) => {
    const html = editor.getHTML();
    const pdfHost = document.createElement('div');
    pdfHost.style.position = 'fixed';
    pdfHost.style.left = '-9999px';
    pdfHost.style.top = '0';
    pdfHost.style.width = '794px';
    pdfHost.style.padding = '40px';
    pdfHost.style.background = '#ffffff';
    pdfHost.style.color = '#000000';
    pdfHost.style.fontFamily = 'Arial, sans-serif';
    pdfHost.style.fontSize = '11pt';
    pdfHost.style.lineHeight = '1.5';
    pdfHost.innerHTML = html;
    document.body.appendChild(pdfHost);

    try {
      const canvas = await html2canvas(pdfHost, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      });

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const imgData = canvas.toDataURL('image/png');

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(gerarNomeArquivoPdf());
    } finally {
      document.body.removeChild(pdfHost);
    }
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
        const htmlComCharset = `<meta charset="utf-8">${textoComFormato}`;

        const textoParaClipboardFormatado = new ClipboardItem({
          'text/html': new Blob([htmlComCharset], { type: 'text/html' }),
          'text/plain': new Blob([editor.getText()], { type: 'text/plain' }),
        });

        await navigator.clipboard.write([textoParaClipboardFormatado]);
      }

      await copiarTextoComFormato();

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

  const handleBaixarLaudoPdf = async () => {
    try {
      const editor = editorRef.current?.editor;
      if (!editor) return;

      await baixarLaudoPdf(editor);
      alert('Laudo baixado em PDF com sucesso!');
    } catch (error) {
      console.error('[Laudos] Erro ao baixar PDF:', error);
      alert('Erro ao baixar o laudo em PDF. Por favor, tente novamente.');
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

  const handleReiniciarModelo = async () => {
    let tituloRecarregar = titulo;
    if ((!tituloRecarregar || !String(tituloRecarregar).trim()) && modeloId != null) {
      const m = titulosDisponiveis.find((item) => item.id === modeloId);
      tituloRecarregar = m?.titulo;
    }
    if (!tituloRecarregar || !String(tituloRecarregar).trim()) {
      alert('Selecione um modelo (título) antes de reiniciar.');
      return;
    }
    const modeloExiste = titulosDisponiveis.some((item) => item.titulo === tituloRecarregar);
    if (!modeloExiste) {
      alert('Não foi possível encontrar o modelo na lista. Verifique o título ou os métodos selecionados.');
      return;
    }
    if (
      !window.confirm(
        'Reiniciar o laudo com o texto original do modelo? As alterações atuais serão perdidas.'
      )
    ) {
      return;
    }

    setModalVariaveisAberto(false);
    localStorage.removeItem('variaveisSelecionadas');
    setConclusaoDoModelo('');
    setTexto('');

    await handleTituloSelect(tituloRecarregar);
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
  const handleCopiarHTMLdoLaudo= () => {
    const editor = editorRef.current?.editor;
    if (!editor) return;
    const html = editor.getHTML();
    navigator.clipboard.writeText(html);
    alert('HTML do laudo copiado com sucesso!');
  };

  const handleCopiarHTMLLaudoUmParagrafo = async () => {
    try {
      const editor = editorRef.current?.editor;
      if (!editor) return;

      const textStyle = editor.getAttributes('textStyle') || {};
      // Padrões alinhados ao TextEditor (TextStyle + FontSize): força global mesmo sem marca na seleção
      const merged = mergeEditorHtmlToSingleParagraph(editor.getHTML(), {
        fontFamily: textStyle.fontFamily || 'Arial',
        fontSize: textStyle.fontSize || '11pt',
      });
      const htmlComCharset = `<meta charset="utf-8">${merged}`;
      const plainDiv = document.createElement('div');
      plainDiv.innerHTML = merged;
      const plain = plainDiv.innerText || plainDiv.textContent || '';

      let copiou = false;
      if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
        try {
          await navigator.clipboard.write([
            new ClipboardItem({
              'text/html': new Blob([htmlComCharset], { type: 'text/html' }),
              'text/plain': new Blob([plain], { type: 'text/plain' }),
            }),
          ]);
          copiou = true;
        } catch (e) {
          console.warn('[Laudos] clipboard.write (HTML rico) falhou, usando writeText:', e);
        }
      }
      if (!copiou && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(merged);
        copiou = true;
      }
      if (!copiou) {
        throw new Error('API de área de transferência indisponível (HTTPS ou permissão necessária).');
      }
      alert('HTML do laudo (um único parágrafo) copiado com sucesso!');
    } catch (error) {
      console.error('[Laudos] Erro ao copiar HTML (Copiar Laudo*):', error);
      alert('Erro ao copiar o HTML. Por favor, tente novamente.');
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
                <div style={getTreeBoxStyle(treeDataModelo, searchModeloFrases)}>
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
                <div style={getTreeBoxStyle(treeDataOutroModelo, searchOutroModeloFrases)}>
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
              cursorPosition={cursorPosicao}
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
                title="Copia o laudo com formatação para a área de transferência"
                onClick={handleCopiarLaudo}
              >
                Copia Laudo
              </Button>
              <Tooltip label="Outra abordagem de Copiar o texto do Laudo para melhor Compatibilidade">
                <Button onClick={handleCopiarHTMLLaudoUmParagrafo}>
                  Copiar Laudo*
                </Button>
              </Tooltip>

              <Button
                title="Copia o laudo sem formatação (texto puro, sem Negrito, tamanho de fonte, etc) para a área de transferência"
                onClick={handleCopiarLaudoSemFormatacao}
              >
                Copia Laudo sem formatação
              </Button>

              <Tooltip label="Baixa o laudo formatado em arquivo PDF">
                <Button variant="outline" color="blue" onClick={handleBaixarLaudoPdf}>
                  Baixar Laudo em PDF
                </Button>
              </Tooltip>

              <Button
                variant="outline"
                color="blue"
                title="Apaga o texto do editor e recarrega o conteúdo original do modelo selecionado"
                onClick={handleReiniciarModelo}
              >
                Reiniciar modelo
              </Button>

              <Button
                color="red"
                title="Deleta o laudo atual"
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
              {/* <Button
                color="orange"
                onClick={handleCopiarHTMLdoLaudo}
              >
                Copiar HTML
              </Button>
              <Button
                color="orange"
                variant="outline"
                onClick={handleCopiarHTMLLaudoUmParagrafo}
              >
                Copiar HTML (1 parágrafo)
              </Button> */}
            </Group>
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
        textoPuro={textoPuroParaModal}
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
