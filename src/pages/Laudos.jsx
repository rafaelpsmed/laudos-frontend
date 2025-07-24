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
  const editorRef = useRef(null);
  const [todasFrases, setTodasFrases] = useState([]);
  const [baixarDocx, setBaixarDocx] = useState(false);
  const [tituloOutroModelo, setTituloOutroModelo] = useState('');
  const [treeDataOutroModelo, setTreeDataOutroModelo] = useState([]);
  const [metodosOutroModelo, setMetodosOutroModelo] = useState([]);
  const [titulosOutroModelo, setTitulosOutroModelo] = useState([]);
  const [searchModeloFrases, setSearchModeloFrases] = useState('');
  const [searchOutroModeloFrases, setSearchOutroModeloFrases] = useState('');

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
        console.log('Nenhum método selecionado');
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
        console.log('Nenhum ID válido após processamento');
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
        console.error('Resposta inválida do servidor:', response.data);
        throw new Error('Formato de resposta inválido');
      }
      
    } catch (error) {
      console.error('Erro ao buscar categorias:', error);
      setCategoriasFiltradas([]);
      setTreeData([]);
    }
  };

  const handleTituloSelect = async (selectedTitulo) => {
    try {
      const modeloSelecionado = titulosDisponiveis.find(item => item.titulo === selectedTitulo);
      if (!modeloSelecionado) {
        console.error('Modelo não encontrado para o título:', selectedTitulo);
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
      const { variaveis, gruposOpcoes, elementosOrdenados } = await buscarVariaveisNoTexto(textoFormatado);
      
      // Se encontrou variáveis, grupos de opções ou tem '$', guarda o texto temporariamente e abre o modal
      if (variaveis.length > 0 || gruposOpcoes.length > 0 || textoFormatado.includes('$')) {
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

      console.log('Categorias recebidas:', frasesDoModelo.map(frase => frase.categoriaFrase));
      
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
      console.error('Erro ao buscar modelo completo:', error);
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
        console.error('Frase não encontrada');
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
        setFraseTemporaria(frase);
        setModalInserirFraseAberto(true);
      }

    } catch (error) {
      console.error('Erro ao processar frase:', error);
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

  const processarFrase = async (frase, tipoInsercao = null, elementoLinha = null) => {
    let novoTexto = texto;
    const editor = editorRef.current?.editor;
    
    // Atualiza o título da frase atual
    setTituloFraseAtual(frase.tituloFrase);

    // Função auxiliar para aplicar formatação ao texto
    const aplicarFormatacao = (texto) => {
      if (!editor) return texto;
      
      // Obtém a formatação atual do editor
      const formataçãoAtual = editor.getAttributes('textStyle');
      const fonteAtual = formataçãoAtual.fontFamily || 'Arial';
      const tamanhoAtual = formataçãoAtual.fontSize || '12pt';
      
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
      
      try {
        // Aplica a formatação à frase base
        fraseBase = aplicarFormatacao(fraseBase);

        switch (tipoInsercao) {
          case 'final':
            // Move o cursor para o final e adiciona a frase
            editor.commands.setTextSelection(editor.state.doc.content.size);
            editor.commands.insertContent((novoTexto ? '\n' : '') + fraseBase);
            break;

          case 'cursor':
            if (editor) {
              // Insere o conteúdo na posição atual do cursor
              const { from } = editor.state.selection;
              editor.commands.setTextSelection(from);
              editor.commands.insertContent(fraseBase);
            }
            break;

          case 'selecao':
            if (editor) {
              editor.commands.deleteSelection();
              editor.commands.insertContent(fraseBase);
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
                editor.commands.insertContent(fraseBase+'\n');
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
      } catch (error) {
        console.error('Erro ao inserir texto:', error);
      }
    } else {
      // Fluxo normal para frases com substituição
      if (editor) {
        try {
          let conteudoAtual = editor.getHTML();
          let novoConteudo = conteudoAtual;

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
          console.error('Erro ao substituir texto:', error);
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
            const novoConteudo = conteudoAtual.replace(conclusaoDoModelo, conclusaoFormatada);
            editor.commands.setContent(novoConteudo);
            // Limpa a conclusão do modelo após substituir
            setConclusaoDoModelo('');
          } else {
            // Verifica se o texto da conclusão já existe no texto atual
            const textoAtual = novoTexto.replace(/<[^>]*>/g, '');
            const textoConclusao = conclusaoFormatada.replace(/<[^>]*>/g, '');
            
            if (!textoAtual.includes(textoConclusao)) {
              // Se não existe, adiciona a nova conclusão no final
              editor.commands.setTextSelection(editor.state.doc.content.size);
              editor.commands.insertContent('<br>' + conclusaoFormatada);
            } else {
              // Se já existe, pluraliza a conclusão existente no texto
              const posicaoConclusao = textoAtual.indexOf(textoConclusao);
              const conclusaoPluralizada = pluralize(textoConclusao);
              const conclusaoPluralizadaFormatada = aplicarFormatacao(conclusaoPluralizada);
              
              // Substitui a conclusão existente pela versão pluralizada
              const novoConteudo = novoTexto.replace(textoConclusao, conclusaoPluralizadaFormatada);
              editor.commands.setContent(novoConteudo);
            }
          }
          
          // Atualiza o texto após a manipulação
          novoTexto = editor.getHTML();
        } catch (error) {
          console.error('Erro ao adicionar conclusão:', error);
        }
      }
    }

    // Procura por variáveis e grupos de opções no texto
    const { variaveis, gruposOpcoes, elementosOrdenados } = await buscarVariaveisNoTexto(novoTexto);
    
    // Se encontrou variáveis, grupos de opções ou tem '$', guarda o texto temporariamente e abre o modal
    if (variaveis.length > 0 || gruposOpcoes.length > 0 || novoTexto.includes('$')) {
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

  const buscarVariaveisNoTexto = async (texto) => {
    try {
      // Busca todas as variáveis
      const response = await api.get('/api/variaveis/');
      const todasVariaveis = response.data;
      
      // Array para armazenar todos os elementos na ordem que aparecem
      const elementosOrdenados = [];
      
      // Encontra todas as ocorrências de {variavel}
      const regexVariaveis = /{([^}]+)}/g;
      let match;
      
      while ((match = regexVariaveis.exec(texto)) !== null) {
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

      // Encontra todas as ocorrências de grupos de opções [op1//op2//op3]
      const regexOpcoes = /\[(([^\]]+)\/\/([^\]]+)(?:\/\/[^\]]+)*)\]/g;
      let matchOpcoes;
      
      while ((matchOpcoes = regexOpcoes.exec(texto)) !== null) {
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

      // Verifica se tem medida ($)
      if (texto.includes('$')) {
        elementosOrdenados.push({
          tipo: 'medida',
          dados: { textoOriginal: '$' },
          posicao: texto.indexOf('$')
        });
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
      
      return {
        variaveis: variaveisEncontradas,
        gruposOpcoes: gruposOpcoes,
        elementosOrdenados: elementosOrdenados
      };
    } catch (error) {
      console.error('Erro ao buscar variáveis:', error);
      return {
        variaveis: [],
        gruposOpcoes: [],
        elementosOrdenados: []
      };
    }
  };

  const handleVariaveisSelecionadas = (valoresSelecionados) => {
    let textoFinal = textoTemporario;
  
    // Função para escapar caracteres especiais em regex
    const escapeRegExp = (string) => {
      return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    };
  
    // Substitui cada variável pelo valor selecionado
    Object.entries(valoresSelecionados).forEach(([chave, valor]) => {
      if (chave === '$') {
        // Substitui o caractere '$' diretamente
        textoFinal = textoFinal.replace('$', valor);
      } else if (chave.includes('//')) {
        // Se a chave contém //, é um grupo de opções
        const regex = new RegExp(escapeRegExp(chave), 'g');
        textoFinal = textoFinal.replace(regex, valor);
      } else {
        // Para variáveis normais
        const regex = new RegExp(`{${escapeRegExp(chave)}}`, 'g');
        textoFinal = textoFinal.replace(regex, valor);
      }
    });
  
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
        console.log('Frases recebidas:', response.data);
        setTodasFrases(response.data);
      } catch (error) {
        console.error('Erro ao buscar frases:', error);
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
      console.error('Erro ao copiar laudo:', error);
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
      console.error('Erro ao copiar laudo sem formatação:', error);
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
        console.error('Modelo não encontrado para o título:', selectedTitulo);
        return;
      }

      // Busca as frases associadas ao modelo
      const frasesResponse = await api.get('/api/frases/');
      const frasesDoModelo = frasesResponse.data.filter(f => 
        f.modelos_laudo && f.modelos_laudo.includes(modeloSelecionado.id)
      );

      console.log('Categorias recebidas:', frasesDoModelo.map(frase => frase.categoriaFrase));
      
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
      console.error('Erro ao buscar frases do modelo:', error);
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
              aguardandoClique={aguardandoClique}
              aguardandoSelecao={aguardandoSelecao}
              aguardandoLinha={aguardandoLinha}
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