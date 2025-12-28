import { Group, Stack, Grid, Combobox, Input, Textarea, useCombobox, Divider, TextInput, Button, Text, Modal, NavLink, Tooltip, Switch, Tabs, Paper, ActionIcon, Select } from '@mantine/core';
import { IconFileText, IconQuote, IconVariable, IconLogout, IconReport, IconDeviceFloppy, IconEdit, IconTrash, IconEraser, IconFolder, IconFile, IconMicrophone, IconMicrophoneOff, IconHelp, IconGripVertical } from '@tabler/icons-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { jwtDecode } from "jwt-decode";
import { ACCESS_TOKEN } from '../constants';
import api from '../api';
import { useAudioTranscription } from '../utils/useAudioTranscription';

// Componentes reutilizáveis
import MetodosSelect from '../components/MetodosSelect';
import TituloCombobox from '../components/TituloCombobox';
import TextEditor from '../components/TextEditor';
import Layout from '../components/Layout';
import VariaveisModal from '../components/VariaveisModal';

function Frases() {
  const [username, setUsername] = useState('');
  const [metodosModelo, setMetodosModelo] = useState([]); // Para filtrar modelos
  const [titulo, setTitulo] = useState('');
  const [texto, setTexto] = useState('');
  const [titulosDisponiveis, setTitulosDisponiveis] = useState([]);
  const [modeloId, setModeloId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [naoAssociarModelo, setNaoAssociarModelo] = useState(false);

  // Novos estados
  const [categoria, setCategoria] = useState('');
  const [tituloFrase, setTituloFrase] = useState('');
  const [fraseBase, setFraseBase] = useState('');
  const [substituicaoFraseBase, setSubstituicaoFraseBase] = useState('');
  const [procurarPor, setProcurarPor] = useState('');
  const [substituirPor, setSubstituirPor] = useState('');
  const [substituicoesOutras, setSubstituicoesOutras] = useState([]);
  const [conclusao, setConclusao] = useState('');
  const [titulosFrases, setTitulosFrases] = useState([]);
  const [userId, setUserId] = useState(null);
  const [fraseId, setFraseId] = useState(null);
  const [frases, setFrases] = useState([]);
  const [categoriasFiltradas, setCategoriasFiltradas] = useState([]);
  const [titulosFiltrados, setTitulosFiltrados] = useState([]);
  const [modalAberto, setModalAberto] = useState(false);
  const [modalVariavelLocalAberto, setModalVariavelLocalAberto] = useState(false);
  const [opcoesVariavelLocal, setOpcoesVariavelLocal] = useState(''); // Mantido para compatibilidade com formato antigo
  // Estados para variável local completa (novo formato)
  const [variavelLocalTipoControle, setVariavelLocalTipoControle] = useState('');
  const [variavelLocalTitulo, setVariavelLocalTitulo] = useState('');
  const [variavelLocalLabel, setVariavelLocalLabel] = useState('');
  const [variavelLocalDescricao, setVariavelLocalDescricao] = useState('');
  const [variavelLocalValor, setVariavelLocalValor] = useState('');
  const [variavelLocalValores, setVariavelLocalValores] = useState([]);
  const [variavelLocalDelimitador, setVariavelLocalDelimitador] = useState('');
  const [variavelLocalUltimoDelimitador, setVariavelLocalUltimoDelimitador] = useState('');
  const [treeData, setTreeData] = useState([]);
  const [treeDataSemMetodos, setTreeDataSemMetodos] = useState([]);
  const [treeDataModelo, setTreeDataModelo] = useState([]);
  
  // Estados para edição de variável local
  const [editandoVariavelLocal, setEditandoVariavelLocal] = useState(false);
  const [variavelLocalTextoOriginal, setVariavelLocalTextoOriginal] = useState(''); // Texto formatado que será substituído
  
  // Mapeamento simples: [LOCAL: Título] → {JSON}
  const mapeamentoVariaveisLocaisRef = useRef(new Map());

  // Função para formatar texto para exibição (substitui {JSON} por [LOCAL: Título])
  const formatarTextoParaExibicao = (texto) => {
    if (!texto) return texto;
    
    // Limpa o mapeamento antes de recriar
    mapeamentoVariaveisLocaisRef.current.clear();
    
    // Procura por JSONs que começam com {"tipo":"variavelLocal"
    // Usa uma abordagem mais robusta: procura por { seguido de "tipo":"variavelLocal"
    let textoFormatado = texto;
    let posicao = 0;
    
    while (posicao < textoFormatado.length) {
      // Procura pelo início de um JSON de variável local
      const inicioJson = textoFormatado.indexOf('{"tipo":"variavelLocal"', posicao);
      if (inicioJson === -1) {
        // Também tenta sem aspas no valor (caso o JSON tenha sido salvo sem aspas)
        const inicioJsonSemAspas = textoFormatado.indexOf('{"tipo":variavelLocal', posicao);
        if (inicioJsonSemAspas === -1) break;
        posicao = inicioJsonSemAspas;
      } else {
        posicao = inicioJson;
      }
      
      // Encontra o { correspondente
      const inicio = posicao;
      let profundidade = 0;
      let fim = inicio;
      let dentroString = false;
      let escape = false;
      
      // Percorre o texto para encontrar o } correspondente
      for (let i = inicio; i < textoFormatado.length; i++) {
        const char = textoFormatado[i];
        
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
        const jsonString = textoFormatado.substring(inicio, fim);
        
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
            // Extrai o título (prioriza label, depois titulo)
            const titulo = estruturaVariavel.label || estruturaVariavel.titulo || 'Variável Local';
            
            // Cria o texto formatado
            const textoFormatadoLocal = `[LOCAL: ${titulo}]`;
            
            // Salva o mapeamento: [LOCAL: Título] → {JSON}
            mapeamentoVariaveisLocaisRef.current.set(textoFormatadoLocal, jsonString);
            // console.log('📝 Mapeamento criado:', textoFormatadoLocal, '→', jsonString.substring(0, 100));
            
            // Substitui o JSON pelo texto formatado
            textoFormatado = textoFormatado.substring(0, inicio) + textoFormatadoLocal + textoFormatado.substring(fim);
            
            // Atualiza a posição para continuar procurando
            posicao = inicio + textoFormatadoLocal.length;
          } else {
            posicao = fim;
          }
        } catch (error) {
          // Se não conseguir parsear, não é JSON válido ou não é variável local
          // Continua procurando
          posicao = fim;
        }
      } else {
        break;
      }
    }
    
    return textoFormatado;
  };

  // Função para converter texto de volta ao formato completo ({JSON})
  // Faz search/replace de [LOCAL: Título] pelo JSON correspondente no mapeamento
  const converterTextoDeVolta = (textoFormatado) => {
    if (!textoFormatado) return textoFormatado;
    
    // Se o mapeamento estiver vazio, tenta recriá-lo do texto (caso tenha JSON)
    if (mapeamentoVariaveisLocaisRef.current.size === 0) {
      if (textoFormatado.includes('"tipo":"variavelLocal"') || textoFormatado.includes('"tipo":variavelLocal')) {
        // console.log('🔄 Mapeamento vazio, mas texto contém JSON. Recriando mapeamento...');
        formatarTextoParaExibicao(textoFormatado);
      } else if (textoFormatado.includes('[LOCAL:')) {
        // console.error('❌ ERRO: Mapeamento perdido! Texto contém [LOCAL: mas não há JSON correspondente.');
        return textoFormatado;
      }
    }
    
    let textoCompleto = textoFormatado;
    
    // Substitui cada [LOCAL: Título] pelo JSON correspondente usando o mapeamento
    // Ordena do mais longo para o mais curto para evitar substituições parciais
    const mapeamentoArray = Array.from(mapeamentoVariaveisLocaisRef.current.entries())
      .sort((a, b) => b[0].length - a[0].length);
    
    // console.log('🔄 Convertendo texto de volta:');
    // console.log('   Mapeamento size:', mapeamentoVariaveisLocaisRef.current.size);
    // console.log('   Texto formatado (primeiros 200 chars):', textoFormatado.substring(0, 200));
    
    mapeamentoArray.forEach(([textoFormatadoMapa, jsonString]) => {
      // Escapa caracteres especiais para regex
      const textoFormatadoEscapado = textoFormatadoMapa.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(textoFormatadoEscapado, 'g');
      const antes = textoCompleto;
      textoCompleto = textoCompleto.replace(regex, jsonString);
      // if (antes !== textoCompleto) {
      //   console.log('   ✅ Substituído:', textoFormatadoMapa, '→', jsonString.substring(0, 100));
      // }
    });
    
    // console.log('   Texto completo resultante (primeiros 200 chars):', textoCompleto.substring(0, 200));
    
    return textoCompleto;
  };

  // Novos estados para a aba Frases sem Modelo
  const [categoriaSemModelo, setCategoriaSemModelo] = useState('');
  const [tituloFraseSemModelo, setTituloFraseSemModelo] = useState('');
  const [fraseBaseSemModelo, setFraseBaseSemModelo] = useState('');
  const [substituicaoFraseBaseSemModelo, setSubstituicaoFraseBaseSemModelo] = useState('');
  const [procurarPorSemModelo, setProcurarPorSemModelo] = useState('');
  const [substituirPorSemModelo, setSubstituirPorSemModelo] = useState('');
  const [substituicoesOutrasSemModelo, setSubstituicoesOutrasSemModelo] = useState([]);
  const [conclusaoSemModelo, setConclusaoSemModelo] = useState('');
  const [fraseIdSemModelo, setFraseIdSemModelo] = useState(null);
  const [categoriasFiltradasSemModelo, setCategoriasFiltradasSemModelo] = useState([]);
  const [titulosFiltradosSemModelo, setTitulosFiltradosSemModelo] = useState([]);

  const navigate = useNavigate();
  const comboboxCategoria = useCombobox();
  const comboboxTituloFrase = useCombobox();
  const comboboxCategoriaSemModelo = useCombobox();
  const comboboxTituloFraseSemModelo = useCombobox();

  // ✅ Hooks de transcrição de áudio para os campos "Frase Base"
  // Hook para "Frases com Modelo"
  const {
    isRecording: isRecordingComModelo,
    previewText: previewTextComModelo,
    toggleRecording: toggleRecordingComModelo
  } = useAudioTranscription({
    textoState: fraseBase,
    setTextoState: setFraseBase,
    atalhoTeclado: 'Shift+A',
    pauseDelay: 2000
  });

  // Hook para "Frases sem Modelo"
  const {
    isRecording: isRecordingSemModelo,
    previewText: previewTextSemModelo,
    toggleRecording: toggleRecordingSemModelo
  } = useAudioTranscription({
    textoState: fraseBaseSemModelo,
    setTextoState: setFraseBaseSemModelo,
    atalhoTeclado: 'Shift+A',
    pauseDelay: 2000
  });



  useEffect(() => {
    const fetchUserData = async () => {
      const token = localStorage.getItem(ACCESS_TOKEN);
      if (token) {
        try {
          const decoded = jwtDecode(token);
          const response = await api.get('/api/auth/me/');
          setUserId(decoded.user_id);
          setUsername(response.data.email);
        } catch (error) {
          // console.error('Erro ao buscar dados do usuário:', error);
        }
      }
    };

    // Verifica se existe um modelo salvo no localStorage
    const modeloSalvo = localStorage.getItem('modeloLaudoAtual');
    if (modeloSalvo) {
      const { metodo, titulo } = JSON.parse(modeloSalvo);
      
      // Se houver um método salvo, seleciona ele
      if (metodo) {
        setMetodosModelo([metodo]);
      }
      
      // Se houver um título salvo, seleciona ele
      if (titulo) {
        setTitulo(titulo);
      }
    }

    // Carrega o modelo de laudo e o texto da frase base do localStorage
    const modeloLaudo = localStorage.getItem('modeloLaudoAtual');
    const textoFraseBase = localStorage.getItem('textoFraseBase');
    
    if (modeloLaudo) {
      const modelo = JSON.parse(modeloLaudo);
      setMetodosModelo([modelo.metodo]);
      setTitulo(modelo.titulo);
      setModeloId(modelo.id);
      
      // Busca o texto completo do modelo
      api.get(`/api/modelo_laudo/${modelo.id}/`)
        .then(response => {
          setTexto(response.data.texto || '');
        })
        .catch(error => {
          // console.error('Erro ao buscar texto do modelo:', error);
        });
    }

    if (textoFraseBase) {
      setFraseBase(textoFraseBase);
      // Limpa o texto da frase base do localStorage após usar
      localStorage.removeItem('textoFraseBase');
    }

    fetchUserData();
  }, []);

  // Modificar o useEffect para carregar as frases
  useEffect(() => {
    const fetchFrases = async () => {
      try {
        const response = await api.get('/api/frases/');
        setFrases(response.data);
      } catch (error) {
        // console.error('Erro ao buscar frases:', error);
      }
    };

    fetchFrases();
  }, []);

  // Comentado temporariamente - endpoint não implementado no backend
  // useEffect(() => {
  //   const fetchCategoriasSemMetodos = async () => {
  //     try {
  //       const token = localStorage.getItem(ACCESS_TOKEN);
  //       if (!token) {
  //         console.error('Token não encontrado');
  //         handleLogout();
  //         return;
  //       }

  //       const config = {
  //         headers: {
  //           'Authorization': `Bearer ${token}`
  //         }
  //       };
        
  //       const response = await api.get('/api/frases/categorias-sem-metodos/', config);
  //       // console.log('Resposta da API (categorias sem métodos):', response.data);
        
  //       if (response.data && Array.isArray(response.data.categorias)) {
  //         setCategoriasFiltradas(response.data.categorias);
  //       } else {
  //         console.error('Resposta inválida do servidor:', response.data);
  //       }
  //     } catch (error) {
  //       console.error('Erro ao buscar categorias sem métodos:', error);
  //     }
  //   };

  //   fetchCategoriasSemMetodos();
  // }, []);

  // useEffect para carregar categorias sem modelo
  useEffect(() => {
    const fetchCategoriasSemModelo = async () => {
      try {
        // Busca todas as frases para identificar quais categorias não têm modelo
        const frasesResponse = await api.get('/api/frases/');
        const frases = frasesResponse.data;
        
        // Filtra as frases que não têm modelo associado
        const frasesSemModelo = frases.filter(frase => !frase.modelos_laudo || frase.modelos_laudo.length === 0);
        
        // Obtém as categorias únicas das frases sem modelo
        const categoriasSemModelo = [...new Set(frasesSemModelo.map(frase => frase.categoriaFrase))];
        
        if (categoriasSemModelo.length > 0) {
          setCategoriasFiltradasSemModelo([{
            group: 'Categorias sem Método',
            items: categoriasSemModelo.map(cat => ({
              value: cat,
              label: cat
            }))
          }]);
        } else {
          setCategoriasFiltradasSemModelo([]);
        }
      } catch (error) {
        // console.error('Erro ao buscar categorias sem métodos:', error);
        setCategoriasFiltradasSemModelo([]);
      }
    };

    fetchCategoriasSemModelo();
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/logout');
  };

  const handleMetodosModeloChange = async (newValue) => {
        // console.log('handleMetodosModeloChange chamado com newValue:', newValue);
    setMetodosModelo(newValue);
    setTitulo('');
    setTexto('');
    setModeloId(null);

    try {
      if (!newValue || newValue.length === 0) {
        // console.log('Nenhum método selecionado');
        // Limpa as categorias quando não há método selecionado
        setCategoriasFiltradas([]);
        // Comentado - endpoint não implementado
        // const response = await api.get('/api/frases/categorias-sem-metodos/');
        // console.log('Resposta categorias sem métodos:', response.data);
        // if (response.data && Array.isArray(response.data.categorias)) {
        //   setCategoriasFiltradas([{
        //     group: 'Categorias sem Método',
        //     items: response.data.categorias.map(cat => ({
        //       value: cat,
        //       label: cat
        //     }))
        //   }]);
        // }
      } else {
        // Busca o modelo selecionado pelos títulos disponíveis
        const modeloSelecionado = titulosDisponiveis.find(item => item.metodo === newValue[0]);
        if (!modeloSelecionado) {
          // console.error('Modelo não encontrado para o método:', newValue[0]);
          return;
        }

        // console.log('Modelo selecionado:', modeloSelecionado);
        // Busca as categorias usando o ID do título do modelo
        const response = await api.get('/api/frases/categorias/', {
          params: { modelo_laudo_id: modeloSelecionado.id }
        });
        // console.log('Resposta categorias do modelo:', response.data);
        
        if (response.data && Array.isArray(response.data.categorias)) {
          setCategoriasFiltradas([{
            group: 'Categorias do Modelo',
            items: response.data.categorias.map(cat => ({
              value: cat,
              label: cat
            }))
          }]);
        }
      }
    } catch (error) {
      // console.error('Erro ao buscar categorias:', error);
      // console.error('Detalhes do erro:', error.response?.data);
      setCategoriasFiltradas([]);
    }
  };

  // Função auxiliar para atualizar categorias quando há modelo selecionado
  const atualizarCategoriasComModelo = async () => {
    if (!modeloId) return;
    
    try {
      const categoriasResponse = await api.get('/api/frases/categorias/', {
        params: { modelo_laudo_id: modeloId }
      });
      
      if (categoriasResponse.data && Array.isArray(categoriasResponse.data.categorias)) {
        const categoriasFormatadas = [{
          group: 'Categorias do Modelo',
          items: categoriasResponse.data.categorias.map(cat => ({
            value: cat,
            label: cat
          }))
        }];
        setCategoriasFiltradas(categoriasFormatadas);
      }
    } catch (error) {
      // console.error('Erro ao atualizar categorias do modelo:', error);
    }
  };

  // Função auxiliar para atualizar títulos de uma categoria
  const atualizarTitulosCategoria = async (categoriaValue) => {
    if (!categoriaValue) return;
    
    try {
      const response = await api.get('/api/frases/titulos_frases/', {
        params: { categoria: categoriaValue }
      });
      
      if (response.data && Array.isArray(response.data.titulos_frases)) {
        setTitulosFiltrados(response.data.titulos_frases);
      }
    } catch (error) {
      // console.error('Erro ao atualizar títulos da categoria:', error);
    }
  };

  // Função auxiliar para atualizar categorias sem modelo
  const atualizarCategoriasSemModelo = async () => {
    try {
      const frasesResponse = await api.get('/api/frases/');
      const frases = frasesResponse.data;
      
      const frasesSemModelo = frases.filter(frase => !frase.modelos_laudo || frase.modelos_laudo.length === 0);
      const categoriasSemModelo = [...new Set(frasesSemModelo.map(frase => frase.categoriaFrase))];
      
      if (categoriasSemModelo.length > 0) {
        setCategoriasFiltradasSemModelo([{
          group: 'Categorias sem Método',
          items: categoriasSemModelo.map(cat => ({
            value: cat,
            label: cat
          }))
        }]);
      } else {
        setCategoriasFiltradasSemModelo([]);
      }
    } catch (error) {
      // console.error('Erro ao atualizar categorias sem modelo:', error);
    }
  };

  // Função auxiliar para atualizar títulos sem modelo
  const atualizarTitulosSemModelo = async (categoriaValue) => {
    if (!categoriaValue) return;
    
    try {
      const response = await api.get('/api/frases/titulos_frases/', {
        params: { categoria: categoriaValue }
      });
      
      if (response.data && Array.isArray(response.data.titulos_frases)) {
        setTitulosFiltradosSemModelo(response.data.titulos_frases);
      }
    } catch (error) {
      // console.error('Erro ao atualizar títulos sem modelo:', error);
    }
  };

  const handleCategoriaChange = async (newValue) => {
    try {
      setCategoria(newValue);
      
      // Se não houver categoria selecionada, limpa os títulos
      if (!newValue) {
        setTitulosFiltrados([]);
        setTituloFrase('');
        return;
      }

      // Faz a requisição para buscar os títulos das frases
      const response = await api.get('/api/frases/titulos_frases/', {
        params: { categoria: newValue }
      });
      
      if (response.data && Array.isArray(response.data.titulos_frases)) {
        setTitulosFiltrados(response.data.titulos_frases);
        setTituloFrase('');
      } else {
        console.error('Resposta inválida do servidor:', response.data);
        setTitulosFiltrados([]);
      }
      
    } catch (error) {
      // console.error('Erro ao buscar títulos:', error);
      setTitulosFiltrados([]);
      setTituloFrase('');
    }
  };

  const handleTituloFraseSelect = async (selectedTitulo) => {
    try {
      setTituloFrase(selectedTitulo);
      
      // Busca a frase usando a rota correta
      const response = await api.get('/api/frases/frases/', {
        params: {
          titulo_frase: selectedTitulo,
          categoria: categoria
        }
      });

      if (response.data && response.data.frases && response.data.frases.length > 0) {
        const frase = response.data.frases[0];
        // console.log('Frase encontrada:', frase);
        
        // Preenche os campos com os dados da frase
        setFraseId(frase.id);
        // Formata o texto para exibição (converte variáveis locais)
        const fraseBaseFormatada = formatarTextoParaExibicao(frase.frase.fraseBase || '');
        setFraseBase(fraseBaseFormatada);
        setSubstituicaoFraseBase(frase.frase.substituicaoFraseBase || '');
        setSubstituicoesOutras(frase.frase.substituicoesOutras || []);
        setConclusao(frase.frase.conclusao || '');
        
        // Mantém o texto do modelo atual no editor
        if (modeloId) {
          try {
            const modeloResponse = await api.get(`/api/modelos-laudo/${modeloId}/`);
            setTexto(modeloResponse.data.texto || '');
          } catch (error) {
            // console.error('Erro ao buscar modelo:', error);
          }
        }
      } else {
        // console.log('Frase não encontrada');
        // Limpa os campos se a frase não for encontrada
        setFraseBase('');
        setSubstituicaoFraseBase('');
        setSubstituicoesOutras([]);
        setConclusao('');
        setFraseId(null);
      }
    } catch (error) {
      // console.error('Erro ao selecionar título:', error);
      // Limpa os campos em caso de erro
      setFraseBase('');
      setSubstituicaoFraseBase('');
      setSubstituicoesOutras([]);
      setConclusao('');
      setFraseId(null);
    }
  };

  const handleCriarSubstituicao = () => {
    if (!procurarPor.trim()) return;

    const novaSubstituicao = {
      procurarPor: procurarPor,
      substituirPor: substituirPor
    };

    setSubstituicoesOutras([...substituicoesOutras, novaSubstituicao]);
    
    // Limpa os campos após adicionar
    setProcurarPor('');
    setSubstituirPor('');
  };

  const handleTituloSelect = async (selectedTitulo) => {
    try {
      // console.log('Título selecionado:', selectedTitulo);
      // console.log('Títulos disponíveis:', titulosDisponiveis);
      
      const modeloSelecionado = titulosDisponiveis.find(item => item.titulo === selectedTitulo);
      if (!modeloSelecionado) {
        // console.error('Modelo não encontrado para o título:', selectedTitulo);
        return;
      }

      // console.log('Modelo encontrado:', modeloSelecionado);
      const response = await api.get(`/api/modelo_laudo/${modeloSelecionado.id}/`);
      // console.log('Resposta da API:', response.data);

      // Atualiza o editor com o texto do modelo
      const textoModelo = response.data.texto || '';
      // console.log('Texto do modelo a ser exibido:', textoModelo);
      
      // Garante que o texto é uma string válida
      const textoFormatado = typeof textoModelo === 'string' ? textoModelo : String(textoModelo);
      // console.log('Texto formatado:', textoFormatado);
      
      setTexto(textoFormatado);
      setModeloId(modeloSelecionado.id);
      
      // Busca as frases associadas ao modelo
      const frasesResponse = await api.get('/api/frases/');
      const frasesDoModelo = frasesResponse.data.filter(f => 
        f.modelos_laudo && f.modelos_laudo.includes(modeloSelecionado.id)
      );

      // console.log('Frases do modelo:', frasesDoModelo);
      
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

      setTreeDataModelo(treeItems);
      
      // Busca as categorias associadas ao modelo
      try {
        const categoriasResponse = await api.get('/api/frases/categorias/', {
          params: { modelo_laudo_id: modeloSelecionado.id }
        });
        
        if (categoriasResponse.data && Array.isArray(categoriasResponse.data.categorias)) {
          // Formata as categorias para o Select com grupos
          const categoriasFormatadas = [{
            group: 'Categorias do Modelo',
            items: categoriasResponse.data.categorias.map(cat => ({
              value: cat,
              label: cat
            }))
          }];
          
          setCategoriasFiltradas(categoriasFormatadas);
        } else {
          // console.error('Resposta inválida do servidor:', categoriasResponse.data);
          setCategoriasFiltradas([]);
        }
      } catch (error) {
        // console.error('Erro ao buscar categorias do modelo:', error);
        setCategoriasFiltradas([]);
      }
      
      // Limpar os campos da frase quando selecionar um novo modelo
      setCategoria('');
      setTituloFrase('');
      setFraseBase('');
      setSubstituicaoFraseBase('');
      setProcurarPor('');
      setSubstituirPor('');
      setSubstituicoesOutras([]);
      setConclusao('');
    } catch (error) {
      // console.error('Erro ao buscar modelo completo:', error);
      alert('Erro ao carregar o modelo. Por favor, tente novamente.');
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Verifica se o token está presente
      const token = localStorage.getItem(ACCESS_TOKEN);
      if (!token) {
        throw new Error('Usuário não autenticado');
      }

      // Decodifica o token para obter o ID do usuário
      const decoded = jwtDecode(token);
      if (!decoded || !decoded.user_id) {
        throw new Error('Token inválido');
      }

      // Converte o texto formatado de volta ao formato completo antes de salvar
      // console.log('💾 Preparando para salvar frase:');
      // console.log('   Mapeamento size antes de converter:', mapeamentoVariaveisLocaisRef.current.size);
      // console.log('   Frase base formatada (textarea):', fraseBase.substring(0, 200));
      
      // Se o mapeamento estiver vazio mas o texto contiver [LOCAL:, tenta buscar do backend
      if (mapeamentoVariaveisLocaisRef.current.size === 0 && fraseBase.includes('[LOCAL:') && fraseId) {
        // console.log('⚠️ Mapeamento vazio! Tentando buscar frase original do backend...');
        try {
          const fraseResponse = await api.get(`/api/frases/${fraseId}/`);
          const fraseBaseOriginal = fraseResponse.data.frase?.fraseBase || '';
          if (fraseBaseOriginal) {
            // Recria o mapeamento usando a frase original
            formatarTextoParaExibicao(fraseBaseOriginal);
            // console.log('   ✅ Mapeamento recriado do backend. Size:', mapeamentoVariaveisLocaisRef.current.size);
          }
        } catch (error) {
          // console.error('Erro ao buscar frase original:', error);
        }
      }
      
      const fraseBaseCompleta = converterTextoDeVolta(fraseBase.trim());
      
      // Log do que está sendo salvo
      // console.log('   Frase base completa (para salvar):', fraseBaseCompleta.substring(0, 200));
      // console.log('   Contém {JSON} de variável local?', fraseBaseCompleta.includes('"tipo":"variavelLocal"'));
      // console.log('   Contém [LOCAL:?', fraseBaseCompleta.includes('[LOCAL:'));
      
      const dadosFrase = {
        categoriaFrase: categoria.trim(),
        tituloFrase: tituloFrase.trim(),
        frase: {
          fraseBase: fraseBaseCompleta,
          substituicaoFraseBase: substituicaoFraseBase.trim(),
          substituicoesOutras: substituicoesOutras,
          conclusao: conclusao.trim()
        }
      };

      // Só inclui o modelo_laudo se o checkbox não estiver marcado e houver um modelo selecionado
      if (!naoAssociarModelo && modeloId) {
        dadosFrase.modelos_laudo = [parseInt(modeloId)];
      }

      let response;
      if (fraseId) {
        // Se tem fraseId, é uma edição
        response = await api.put(`/api/frases/${fraseId}/`, dadosFrase);
      } else {
        // Se não tem fraseId, é uma criação
        response = await api.post('/api/frases/', dadosFrase);
      }

      if (response.status === 200 || response.status === 201) {
        alert(fraseId ? 'Frase atualizada com sucesso!' : 'Frase salva com sucesso!');
        
        // Atualiza a lista de frases
        const frasesResponse = await api.get('/api/frases/');
        setFrases(frasesResponse.data);
        
        // Atualiza os controles (categorias e títulos)
        if (modeloId) {
          // Se há modelo selecionado, atualiza categorias do modelo
          await atualizarCategoriasComModelo();
          // Se há categoria selecionada, atualiza os títulos dessa categoria
          if (categoria) {
            await atualizarTitulosCategoria(categoria);
          }
        }
        
        // Limpa apenas os campos da frase, mantendo o modelo
        handleClear();
      }
    } catch (error) {
      // console.error('Erro ao salvar frase:', error);
      if (error.message === 'Usuário não autenticado') {
        alert('Sua sessão expirou. Por favor, faça login novamente.');
        handleLogout();
      } else if (error.response?.data) {
        alert(`Erro ao salvar frase: ${JSON.stringify(error.response.data)}`);
      } else {
        alert('Erro ao salvar frase. Por favor, tente novamente.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!fraseId) return;

    try {
      setSaving(true);
      // Converte o texto formatado de volta ao formato completo antes de salvar
      const fraseBaseCompleta = converterTextoDeVolta(fraseBase.trim());
      
      const dadosFrase = {
        metodos: metodosModelo.map(id => parseInt(id)),
        categoriaFrase: categoria.trim(),
        tituloFrase: tituloFrase.trim(),
        frase: {
          fraseBase: fraseBaseCompleta,
          substituicaoFraseBase: substituicaoFraseBase.trim(),
          substituicoesOutras: substituicoesOutras,
          conclusao: conclusao.trim()
        }
      };

      if (modeloId) {
        dadosFrase.modelos_laudo = [parseInt(modeloId)];
      }

      const response = await api.put(`/api/frases/${fraseId}/`, dadosFrase);

      if (response.status === 200) {
        // Atualiza a lista de frases
        const frasesResponse = await api.get('/api/frases/');
        setFrases(frasesResponse.data);
        
        // Atualiza os controles (categorias e títulos)
        if (modeloId) {
          // Se há modelo selecionado, atualiza categorias do modelo
          await atualizarCategoriasComModelo();
          // Se há categoria selecionada, atualiza os títulos dessa categoria
          if (categoria) {
            await atualizarTitulosCategoria(categoria);
          }
        }
        
        alert('Frase atualizada com sucesso!');
      }
    } catch (error) {
      // console.error('Erro ao atualizar frase:', error);
      if (error.response?.data) {
        alert(`Erro ao atualizar frase: ${JSON.stringify(error.response.data)}`);
      } else {
        alert('Erro ao atualizar frase. Por favor, tente novamente.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!fraseId) return;
    
    if (!window.confirm('Tem certeza que deseja excluir esta frase?')) {
      return;
    }

    try {
      setSaving(true);
      await api.delete(`/api/frases/${fraseId}/`);
      
      // Atualiza a lista de frases
      const response = await api.get('/api/frases/');
      setFrases(response.data);
      
      // Atualiza os controles (categorias e títulos)
      if (modeloId) {
        // Se há modelo selecionado, atualiza categorias do modelo
        await atualizarCategoriasComModelo();
      }
      
      // Limpa o formulário
      handleClear();
      
      alert('Frase excluída com sucesso!');
    } catch (error) {
      // console.error('Erro ao excluir frase:', error);
      alert('Erro ao excluir frase. Por favor, tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const handleClear = () => {
    // Limpa apenas estados das frases
    setCategoria('');
    setTituloFrase('');
    setFraseBase('');
    setSubstituicaoFraseBase('');
    setProcurarPor('');
    setSubstituirPor('');
    setSubstituicoesOutras([]);
    setConclusao('');
    setFraseId(null);
    setNaoAssociarModelo(false);
  };

  const handleEditarSubstituicao = (index) => {
    const substituicao = substituicoesOutras[index];
    setProcurarPor(substituicao.procurarPor);
    setSubstituirPor(substituicao.substituirPor);
    
    // Remove a substituição atual
    setSubstituicoesOutras(substituicoesOutras.filter((_, i) => i !== index));
  };

  const handleDeletarSubstituicao = (index) => {
    if (window.confirm('Tem certeza que deseja excluir esta substituição?')) {
      setSubstituicoesOutras(substituicoesOutras.filter((_, i) => i !== index));
    }
  };

  const handleVariavelSelect = (variavel) => {
    // Formata a variável para inserção
    const variavelFormatada = `{${variavel.tituloVariavel}}`;
    
    // Insere a variável na posição atual do cursor na frase base
    const textareaElement = document.querySelector('textarea[name="fraseBaseComModelo"]');
    if (textareaElement) {
      const start = textareaElement.selectionStart;
      const end = textareaElement.selectionEnd;
      const textoAtual = fraseBase;
      const novoTexto = textoAtual.substring(0, start) + variavelFormatada + textoAtual.substring(end);
      setFraseBase(novoTexto);
      
      // Foca no textarea e posiciona o cursor após a variável inserida
      setTimeout(() => {
        textareaElement.focus();
        textareaElement.setSelectionRange(start + variavelFormatada.length, start + variavelFormatada.length);
      }, 0);
    } else {
      // Se não encontrar o textarea, adiciona ao final
      setFraseBase(prev => prev + (prev ? ' ' : '') + variavelFormatada);
    }
    
    // Fecha o modal
    setModalAberto(false);
    localStorage.removeItem('variavelHandler');
  };

  // Função para atualizar o título da variável em todas as frases
  const atualizarTituloVariavelEmFrases = async (tituloAntigo, tituloNovo) => {
    try {
      // Busca todas as frases
      const response = await api.get('/api/frases/');
      const frases = response.data;

      // Para cada frase, verifica se contém a variável com o título antigo
      for (const frase of frases) {
        if (frase.frase.fraseBase.includes(`{${tituloAntigo}}`)) {
          // Atualiza a frase base com o novo título
          const novaFraseBase = frase.frase.fraseBase.replace(
            `{${tituloAntigo}}`,
            `{${tituloNovo}}`
          );

          // Atualiza a frase no servidor
          await api.put(`/api/frases/${frase.id}/`, {
            ...frase,
            frase: {
              ...frase.frase,
              fraseBase: novaFraseBase
            }
          });

          // console.log(`Frase ${frase.id} atualizada com sucesso`);
        }
      }

      // Atualiza a lista de frases local
      const frasesResponse = await api.get('/api/frases/');
      setFrases(frasesResponse.data);
    } catch (error) {
      // console.error('Erro ao atualizar títulos das variáveis:', error);
    }
  };

  const renderTreeItems = (items) => {
    return items.map((item) => {
      if (item.type === 'categoria') {
        return (
          <NavLink
            key={item.id}
            label={item.name}
            leftSection={<IconFolder size={16} />}
            childrenOffset={28}
          >
            {item.children && renderTreeItems(item.children)}
          </NavLink>
        );
      } else {
        // Encontra a frase correspondente
        const frase = frases.find(f => 
          f.categoria === item.id.split('-')[0] && 
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
          >
            <NavLink
              label={item.name}
              leftSection={<IconFile size={16} />}
              onClick={() => {
                const [categoria] = item.id.split('-');
                handleFraseClick(categoria, item.name);
              }}
            />
          </Tooltip>
        );
      }
    });
  };

  // Função para limpar campos sem modelo
  const handleClearSemModelo = () => {
    setCategoriaSemModelo('');
    setTituloFraseSemModelo('');
    setFraseBaseSemModelo('');
    setSubstituicaoFraseBaseSemModelo('');
    setProcurarPorSemModelo('');
    setSubstituirPorSemModelo('');
    setSubstituicoesOutrasSemModelo([]);
    setConclusaoSemModelo('');
    setFraseIdSemModelo(null);
  };

  // Função para salvar frase sem modelo
  const handleSaveSemModelo = async () => {
    try {
      setSaving(true);

      // Verifica se o token está presente
      const token = localStorage.getItem(ACCESS_TOKEN);
      if (!token) {
        throw new Error('Usuário não autenticado');
      }

      // Decodifica o token para obter o ID do usuário
      const decoded = jwtDecode(token);
      if (!decoded || !decoded.user_id) {
        throw new Error('Token inválido');
      }

      // Converte o texto formatado de volta ao formato completo antes de salvar
      // console.log('💾 Preparando para salvar frase (sem modelo):');
      // console.log('   Mapeamento size antes de converter:', mapeamentoVariaveisLocaisRef.current.size);
      // console.log('   Frase base formatada (textarea):', fraseBaseSemModelo.substring(0, 200));
      
      // Se o mapeamento estiver vazio mas o texto contiver [LOCAL:, tenta buscar do backend
      if (mapeamentoVariaveisLocaisRef.current.size === 0 && fraseBaseSemModelo.includes('[LOCAL:') && fraseIdSemModelo) {
        // console.log('⚠️ Mapeamento vazio! Tentando buscar frase original do backend...');
        try {
          const fraseResponse = await api.get(`/api/frases/${fraseIdSemModelo}/`);
          const fraseBaseOriginal = fraseResponse.data.frase?.fraseBase || '';
          if (fraseBaseOriginal) {
            // Recria o mapeamento usando a frase original
            formatarTextoParaExibicao(fraseBaseOriginal);
            // console.log('   ✅ Mapeamento recriado do backend. Size:', mapeamentoVariaveisLocaisRef.current.size);
          }
        } catch (error) {
          // console.error('Erro ao buscar frase original:', error);
        }
      }
      
      const fraseBaseCompleta = converterTextoDeVolta(fraseBaseSemModelo.trim());
      
      // Log do que está sendo salvo (sem modelo)
      // console.log('   Frase base completa (para salvar):', fraseBaseCompleta.substring(0, 200));
      // console.log('   Contém {JSON} de variável local?', fraseBaseCompleta.includes('"tipo":"variavelLocal"'));
      // console.log('   Contém [LOCAL:?', fraseBaseCompleta.includes('[LOCAL:'));
      
      const dadosFrase = {
        categoriaFrase: categoriaSemModelo.trim(),
        tituloFrase: tituloFraseSemModelo.trim(),
        frase: {
          fraseBase: fraseBaseCompleta,
          substituicaoFraseBase: substituicaoFraseBaseSemModelo.trim(),
          substituicoesOutras: substituicoesOutrasSemModelo,
          conclusao: conclusaoSemModelo.trim()
        }
      };

      let response;
      if (fraseIdSemModelo) {
        // Se tem fraseId, é uma edição
        response = await api.put(`/api/frases/${fraseIdSemModelo}/`, dadosFrase);
      } else {
        // Se não tem fraseId, é uma criação
        response = await api.post('/api/frases/', dadosFrase);
      }

      if (response.status === 200 || response.status === 201) {
        alert(fraseIdSemModelo ? 'Frase atualizada com sucesso!' : 'Frase salva com sucesso!');
        
        // Atualiza a lista de frases
        const frasesResponse = await api.get('/api/frases/');
        setFrases(frasesResponse.data);
        
        // Atualiza os controles (categorias e títulos sem modelo)
        await atualizarCategoriasSemModelo();
        // Se há categoria selecionada, atualiza os títulos dessa categoria
        if (categoriaSemModelo) {
          await atualizarTitulosSemModelo(categoriaSemModelo);
        }
        
        // Limpa os campos
        handleClearSemModelo();
      }
    } catch (error) {
      // console.error('Erro ao salvar frase:', error);
      if (error.message === 'Usuário não autenticado') {
        alert('Sua sessão expirou. Por favor, faça login novamente.');
        handleLogout();
      } else if (error.response?.data) {
        alert(`Erro ao salvar frase: ${JSON.stringify(error.response.data)}`);
      } else {
        alert('Erro ao salvar frase. Por favor, tente novamente.');
      }
    } finally {
      setSaving(false);
    }
  };

  // Função para editar frase sem modelo
  const handleEditSemModelo = async () => {
    if (!fraseIdSemModelo) return;

    try {
      setSaving(true);
      // Converte o texto formatado de volta ao formato completo antes de salvar
      const fraseBaseCompleta = converterTextoDeVolta(fraseBaseSemModelo.trim());
      
      const dadosFrase = {
        categoriaFrase: categoriaSemModelo.trim(),
        tituloFrase: tituloFraseSemModelo.trim(),
        frase: {
          fraseBase: fraseBaseCompleta,
          substituicaoFraseBase: substituicaoFraseBaseSemModelo.trim(),
          substituicoesOutras: substituicoesOutrasSemModelo,
          conclusao: conclusaoSemModelo.trim()
        }
      };

      const response = await api.put(`/api/frases/${fraseIdSemModelo}/`, dadosFrase);

      if (response.status === 200) {
        // Atualiza a lista de frases
        const frasesResponse = await api.get('/api/frases/');
        setFrases(frasesResponse.data);
        
        // Atualiza os controles (categorias e títulos sem modelo)
        await atualizarCategoriasSemModelo();
        // Se há categoria selecionada, atualiza os títulos dessa categoria
        if (categoriaSemModelo) {
          await atualizarTitulosSemModelo(categoriaSemModelo);
        }
        
        alert('Frase atualizada com sucesso!');
      }
    } catch (error) {
      // console.error('Erro ao atualizar frase:', error);
      if (error.response?.data) {
        alert(`Erro ao atualizar frase: ${JSON.stringify(error.response.data)}`);
      } else {
        alert('Erro ao atualizar frase. Por favor, tente novamente.');
      }
    } finally {
      setSaving(false);
    }
  };

  // Função para excluir frase sem modelo
  const handleDeleteSemModelo = async () => {
    if (!fraseIdSemModelo) return;
    
    if (!window.confirm('Tem certeza que deseja excluir esta frase?')) {
      return;
    }

    try {
      setSaving(true);
      await api.delete(`/api/frases/${fraseIdSemModelo}/`);
      
      // Atualiza a lista de frases
      const response = await api.get('/api/frases/');
      setFrases(response.data);
      
      // Atualiza os controles (categorias sem modelo)
      await atualizarCategoriasSemModelo();
      
      // Limpa o formulário
      handleClearSemModelo();
      
      alert('Frase excluída com sucesso!');
    } catch (error) {
      // console.error('Erro ao excluir frase:', error);
      alert('Erro ao excluir frase. Por favor, tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  // Função para manipular mudança de categoria sem modelo
  const handleCategoriaSemModeloChange = async (newValue) => {
    try {
      setCategoriaSemModelo(newValue);
      
      if (!newValue) {
        setTitulosFiltradosSemModelo([]);
        setTituloFraseSemModelo('');
        return;
      }

      const response = await api.get('/api/frases/titulos_frases/', {
        params: { categoria: newValue }
      });
      
      if (response.data && Array.isArray(response.data.titulos_frases)) {
        setTitulosFiltradosSemModelo(response.data.titulos_frases);
        setTituloFraseSemModelo('');
      } else {
        console.error('Resposta inválida do servidor:', response.data);
        setTitulosFiltradosSemModelo([]);
      }
      
    } catch (error) {
      // console.error('Erro ao buscar títulos:', error);
      setTitulosFiltradosSemModelo([]);
      setTituloFraseSemModelo('');
    }
  };

  // Funções para gerenciar substituições sem modelo
  const handleCriarSubstituicaoSemModelo = () => {
    if (!procurarPorSemModelo.trim()) return;

    const novaSubstituicao = {
      procurarPor: procurarPorSemModelo,
      substituirPor: substituirPorSemModelo
    };

    setSubstituicoesOutrasSemModelo([...substituicoesOutrasSemModelo, novaSubstituicao]);
    
    // Limpa os campos após adicionar
    setProcurarPorSemModelo('');
    setSubstituirPorSemModelo('');
  };

  const handleEditarSubstituicaoSemModelo = (index) => {
    const substituicao = substituicoesOutrasSemModelo[index];
    setProcurarPorSemModelo(substituicao.procurarPor);
    setSubstituirPorSemModelo(substituicao.substituirPor);
    
    // Remove a substituição atual
    setSubstituicoesOutrasSemModelo(substituicoesOutrasSemModelo.filter((_, i) => i !== index));
  };

  const handleDeletarSubstituicaoSemModelo = (index) => {
    if (window.confirm('Tem certeza que deseja excluir esta substituição?')) {
      setSubstituicoesOutrasSemModelo(substituicoesOutrasSemModelo.filter((_, i) => i !== index));
    }
  };

  // Função para manipular seleção de título da frase sem modelo
  const handleTituloFraseSemModeloSelect = async (selectedTitulo) => {
    try {
      setTituloFraseSemModelo(selectedTitulo);
      
      const response = await api.get('/api/frases/frases/', {
        params: {
          titulo_frase: selectedTitulo,
          categoria: categoriaSemModelo
        }
      });

      if (response.data && response.data.frases && response.data.frases.length > 0) {
        const frase = response.data.frases[0];
        // console.log('Frase encontrada:', frase);
        
        setFraseIdSemModelo(frase.id);
        // Formata o texto para exibição (converte variáveis locais)
        const fraseBaseFormatada = formatarTextoParaExibicao(frase.frase.fraseBase || '');
        setFraseBaseSemModelo(fraseBaseFormatada);
        setSubstituicaoFraseBaseSemModelo(frase.frase.substituicaoFraseBase || '');
        setSubstituicoesOutrasSemModelo(frase.frase.substituicoesOutras || []);
        setConclusaoSemModelo(frase.frase.conclusao || '');
      } else {
        // console.log('Frase não encontrada');
        setFraseBaseSemModelo('');
        setSubstituicaoFraseBaseSemModelo('');
        setSubstituicoesOutrasSemModelo([]);
        setConclusaoSemModelo('');
        setFraseIdSemModelo(null);
      }
    } catch (error) {
      // console.error('Erro ao selecionar título:', error);
      setFraseBaseSemModelo('');
      setSubstituicaoFraseBaseSemModelo('');
      setSubstituicoesOutrasSemModelo([]);
      setConclusaoSemModelo('');
      setFraseIdSemModelo(null);
    }
  };

  // Função para inserir variável na frase sem modelo
  const handleVariavelSelectSemModelo = (variavel) => {
    const variavelFormatada = `{${variavel.tituloVariavel}}`;
    
    const textareaElement = document.querySelector('textarea[name="fraseBaseSemModelo"]');
    if (textareaElement) {
      const start = textareaElement.selectionStart;
      const end = textareaElement.selectionEnd;
      const textoAtual = fraseBaseSemModelo;
      const novoTexto = textoAtual.substring(0, start) + variavelFormatada + textoAtual.substring(end);
      setFraseBaseSemModelo(novoTexto);
      
      // Foca no textarea e posiciona o cursor após a variável inserida
      setTimeout(() => {
        textareaElement.focus();
        textareaElement.setSelectionRange(start + variavelFormatada.length, start + variavelFormatada.length);
      }, 0);
    } else {
      // Se não encontrar o textarea, adiciona ao final
      setFraseBaseSemModelo(prev => prev + (prev ? ' ' : '') + variavelFormatada);
    }
    
    setModalAberto(false);
    localStorage.removeItem('variavelHandler');
  };

  // Funções para gerenciar variável local completa (novo formato)
  const handleAdicionarValorLocal = () => {
    if (!variavelLocalDescricao.trim() || !variavelLocalValor.trim()) return;

    const novoValor = {
      descricao: variavelLocalDescricao,
      valor: variavelLocalValor
    };

    setVariavelLocalValores([...variavelLocalValores, novoValor]);
    
    // Limpa os campos após adicionar
    setVariavelLocalDescricao('');
    setVariavelLocalValor('');
  };

  const handleEditarValorLocal = (index) => {
    const valor = variavelLocalValores[index];
    setVariavelLocalDescricao(valor.descricao);
    setVariavelLocalValor(valor.valor);
    
    // Remove o valor atual
    setVariavelLocalValores(variavelLocalValores.filter((_, i) => i !== index));
  };

  const handleDeletarValorLocal = (index) => {
    if (window.confirm('Tem certeza que deseja excluir este valor?')) {
      setVariavelLocalValores(variavelLocalValores.filter((_, i) => i !== index));
    }
  };

  const handleClearVariavelLocal = () => {
    setVariavelLocalTipoControle('');
    setVariavelLocalTitulo('');
    setVariavelLocalLabel('');
    setVariavelLocalDescricao('');
    setVariavelLocalValor('');
    setVariavelLocalValores([]);
    setVariavelLocalDelimitador('');
    setVariavelLocalUltimoDelimitador('');
    setEditandoVariavelLocal(false);
    setVariavelLocalTextoOriginal('');
    // Mantém opcoesVariavelLocal para compatibilidade com formato antigo
  };

  // Função para extrair dados de uma variável local formatada
  const extrairDadosVariavelLocal = (textoFormatado) => {
    // Regex para encontrar [LOCAL: Título]
    const regexFormatado = /\[LOCAL: ([^\]]+)\]/;
    const match = textoFormatado.match(regexFormatado);
    
    if (!match) return null;
    
    // Busca no mapeamento o texto completo correspondente (JSON)
    const textoCompleto = mapeamentoVariaveisLocaisRef.current.get(textoFormatado);
    
    if (!textoCompleto) {
      // Se não encontrar no mapeamento, tenta buscar no texto completo do textarea
      // Isso pode acontecer se o mapeamento foi perdido
      return null;
    }
    
    // O texto completo agora é diretamente o JSON {JSON}
    try {
      // Tenta parsear o JSON diretamente
      let jsonParaParsear = textoCompleto;
      // Se o JSON não tiver aspas no valor de tipo, adiciona
      if (textoCompleto.includes('"tipo":variavelLocal')) {
        jsonParaParsear = textoCompleto.replace(/"tipo":variavelLocal/g, '"tipo":"variavelLocal"');
      }
      
      const estruturaVariavel = JSON.parse(jsonParaParsear);
      
      return {
        tipo: estruturaVariavel.controle || estruturaVariavel.tipoControle,
        estruturaVariavel,
        textoCompleto,
        textoFormatado
      };
    } catch (error) {
      // console.error('Erro ao extrair dados da variável local:', error);
      return null;
    }
  };

  // Função para editar variável local selecionada
  const handleEditarVariavelLocalSelecionada = () => {
    const handler = localStorage.getItem('variavelHandler');
    let textareaElement;
    let textoAtual;
    
    if (handler === 'semModelo') {
      textareaElement = document.querySelector('textarea[name="fraseBaseSemModelo"]');
      textoAtual = fraseBaseSemModelo;
    } else {
      textareaElement = document.querySelector('textarea[name="fraseBaseComModelo"]');
      textoAtual = fraseBase;
    }
    
    if (!textareaElement) {
      alert('Não foi possível encontrar o campo de texto.');
      return;
    }
    
    const start = textareaElement.selectionStart;
    const end = textareaElement.selectionEnd;
    
    if (start === end) {
      alert('Por favor, selecione uma variável local para editar (texto no formato [LOCAL: Título]).');
      return;
    }
    
    // Obtém o texto selecionado
    const textoSelecionado = textoAtual.substring(start, end).trim();
    
    // Tenta extrair dados da variável local
    // Primeiro, precisamos garantir que o mapeamento está atualizado
    // Recriamos o mapeamento formatando o texto atual
    const textoAtualCompleto = converterTextoDeVolta(textoAtual);
    formatarTextoParaExibicao(textoAtualCompleto);
    
    // Agora tenta extrair novamente
    const dados = extrairDadosVariavelLocal(textoSelecionado);
    
    if (!dados) {
      alert('O texto selecionado não é uma variável local válida. Por favor, selecione uma variável local no formato [LOCAL: Título].');
      return;
    }
    
    // Preenche o modal com os dados extraídos
    setVariavelLocalTipoControle(dados.estruturaVariavel.controle || dados.tipo || '');
    setVariavelLocalTitulo(dados.estruturaVariavel.titulo || '');
    setVariavelLocalLabel(dados.estruturaVariavel.label || '');
    setVariavelLocalValores(dados.estruturaVariavel.valores || []);
    setVariavelLocalDelimitador(dados.estruturaVariavel.delimitador || '');
    setVariavelLocalUltimoDelimitador(dados.estruturaVariavel.ultimoDelimitador || '');
    
    // Marca que estamos editando
    setEditandoVariavelLocal(true);
    setVariavelLocalTextoOriginal(textoSelecionado);
    
    // Abre o modal
    setModalVariavelLocalAberto(true);
  };

  // Função para formatar e inserir variável local completa
  const handleAdicionarVariavelLocalCompleta = () => {
    if (!variavelLocalTitulo.trim() || !variavelLocalTipoControle || variavelLocalValores.length === 0) {
      alert('Por favor, preencha todos os campos obrigatórios (Título, Tipo de Controle e adicione pelo menos um valor).');
      return;
    }

    // Monta a estrutura da variável local
    const estruturaVariavel = {
      tipo: 'variavelLocal',
      controle: variavelLocalTipoControle, // "Combobox", "Grupo de Radio", etc.
      titulo: variavelLocalTitulo, // Título é obrigatório
      valores: variavelLocalValores,
      ...(variavelLocalLabel ? { label: variavelLocalLabel } : {}),
      ...(variavelLocalTipoControle === "Grupo de Checkbox" || variavelLocalTipoControle === "Combobox com múltiplas opções" ? {
        delimitador: variavelLocalDelimitador,
        ultimoDelimitador: variavelLocalUltimoDelimitador
      } : {})
    };

    // Log do JSON completo da variável local
    // console.log('📋 JSON completo da variável local:');
    // console.log('   Estrutura:', estruturaVariavel);
    const jsonString = JSON.stringify(estruturaVariavel);
    // console.log('   JSON stringificado:', jsonString);

    // Cria o texto formatado para exibição
    const tituloFormatado = estruturaVariavel.label || estruturaVariavel.titulo || 'Variável Local';
    const variavelFormatadaParaExibicao = `[LOCAL: ${tituloFormatado}]`;
    
    // Guarda o mapeamento: [LOCAL: Título] → {JSON}
    mapeamentoVariaveisLocaisRef.current.set(variavelFormatadaParaExibicao, jsonString);
    // console.log('📝 Mapeamento guardado:', variavelFormatadaParaExibicao, '→', jsonString.substring(0, 100));

    const handler = localStorage.getItem('variavelHandler');
    let textareaElement;
    
    // Se estamos editando, substitui a variável antiga
    if (editandoVariavelLocal && variavelLocalTextoOriginal) {
      if (handler === 'semModelo') {
        textareaElement = document.querySelector('textarea[name="fraseBaseSemModelo"]');
        if (textareaElement) {
          const textoAtual = fraseBaseSemModelo;
          // Remove o mapeamento antigo
          mapeamentoVariaveisLocaisRef.current.delete(variavelLocalTextoOriginal);
          // Substitui o texto formatado antigo pelo novo
          const novoTexto = textoAtual.replace(variavelLocalTextoOriginal, variavelFormatadaParaExibicao);
          setFraseBaseSemModelo(novoTexto);
        }
      } else {
        textareaElement = document.querySelector('textarea[name="fraseBaseComModelo"]');
        if (textareaElement) {
          const textoAtual = fraseBase;
          // Remove o mapeamento antigo
          mapeamentoVariaveisLocaisRef.current.delete(variavelLocalTextoOriginal);
          // Substitui o texto formatado antigo pelo novo
          const novoTexto = textoAtual.replace(variavelLocalTextoOriginal, variavelFormatadaParaExibicao);
          setFraseBase(novoTexto);
        }
      }
      
      // Reseta o estado de edição
      setEditandoVariavelLocal(false);
      setVariavelLocalTextoOriginal('');
      
      // Fecha o modal e limpa os campos
      setModalVariavelLocalAberto(false);
      handleClearVariavelLocal();
      localStorage.removeItem('variavelHandler');
      return;
    }
    
    // Se não está editando, insere nova variável
    if (handler === 'semModelo') {
      textareaElement = document.querySelector('textarea[name="fraseBaseSemModelo"]');
      if (textareaElement) {
        const start = textareaElement.selectionStart;
        const end = textareaElement.selectionEnd;
        const textoAtual = fraseBaseSemModelo;
        // Insere o texto formatado diretamente no textarea
        const novoTexto = textoAtual.substring(0, start) + variavelFormatadaParaExibicao + textoAtual.substring(end);
        setFraseBaseSemModelo(novoTexto);
        
        // Calcula a posição do cursor
        const novaPosicaoCursor = start + variavelFormatadaParaExibicao.length;
        
        setTimeout(() => {
          textareaElement.focus();
          textareaElement.setSelectionRange(novaPosicaoCursor, novaPosicaoCursor);
        }, 0);
      } else {
        // Se não encontrar o textarea, adiciona ao final
        setFraseBaseSemModelo(prev => prev + (prev ? ' ' : '') + variavelFormatadaParaExibicao);
      }
    } else {
      textareaElement = document.querySelector('textarea[name="fraseBaseComModelo"]');
      if (textareaElement) {
        const start = textareaElement.selectionStart;
        const end = textareaElement.selectionEnd;
        const textoAtual = fraseBase;
        // Insere o texto formatado diretamente no textarea
        const novoTexto = textoAtual.substring(0, start) + variavelFormatadaParaExibicao + textoAtual.substring(end);
        setFraseBase(novoTexto);
        
        // Calcula a posição do cursor
        const novaPosicaoCursor = start + variavelFormatadaParaExibicao.length;
        
        setTimeout(() => {
          textareaElement.focus();
          textareaElement.setSelectionRange(novaPosicaoCursor, novaPosicaoCursor);
        }, 0);
      } else {
        // Se não encontrar o textarea, adiciona ao final
        setFraseBase(prev => prev + (prev ? ' ' : '') + variavelFormatadaParaExibicao);
      }
    }
    
    // Fecha o modal e limpa os campos
    setModalVariavelLocalAberto(false);
    handleClearVariavelLocal();
    setOpcoesVariavelLocal(''); // Limpa também o campo antigo
    localStorage.removeItem('variavelHandler');
  };

  // Função para compatibilidade com formato antigo [opcao1//opcao2]
  const handleAdicionarVariavelLocal = () => {
    // Se tem valores completos no formato novo, usa o formato novo
    if (variavelLocalTipoControle && variavelLocalValores.length > 0 && variavelLocalTitulo.trim()) {
      handleAdicionarVariavelLocalCompleta();
      return;
    }

    // Caso contrário, usa formato antigo
    if (!opcoesVariavelLocal.trim()) {
      alert('Por favor, preencha o formato novo ou o formato antigo.');
      return;
    }

    // Divide as linhas e remove linhas vazias
    const opcoes = opcoesVariavelLocal
      .split('\n')
      .map(linha => linha.trim())
      .filter(linha => linha.length > 0);

    if (opcoes.length === 0) return;

    // Formata as opções no formato [opcao1//opcao2//opcao3]
    const variavelFormatada = `[${opcoes.join('//')}]`;

    const handler = localStorage.getItem('variavelHandler');
    let textareaElement;
    
    if (handler === 'semModelo') {
      textareaElement = document.querySelector('textarea[name="fraseBaseSemModelo"]');
      if (textareaElement) {
        const start = textareaElement.selectionStart;
        const end = textareaElement.selectionEnd;
        const textoAtual = fraseBaseSemModelo;
        const novoTexto = textoAtual.substring(0, start) + variavelFormatada + textoAtual.substring(end);
        setFraseBaseSemModelo(novoTexto);
        
        setTimeout(() => {
          textareaElement.focus();
          textareaElement.setSelectionRange(start + variavelFormatada.length, start + variavelFormatada.length);
        }, 0);
      } else {
        setFraseBaseSemModelo(prev => prev + (prev ? ' ' : '') + variavelFormatada);
      }
    } else {
      textareaElement = document.querySelector('textarea[name="fraseBaseComModelo"]');
      if (textareaElement) {
        const start = textareaElement.selectionStart;
        const end = textareaElement.selectionEnd;
        const textoAtual = fraseBase;
        const novoTexto = textoAtual.substring(0, start) + variavelFormatada + textoAtual.substring(end);
        setFraseBase(novoTexto);
        
        setTimeout(() => {
          textareaElement.focus();
          textareaElement.setSelectionRange(start + variavelFormatada.length, start + variavelFormatada.length);
        }, 0);
      } else {
        setFraseBase(prev => prev + (prev ? ' ' : '') + variavelFormatada);
      }
    }
    
    // Fecha o modal e limpa o campo
    setModalVariavelLocalAberto(false);
    setOpcoesVariavelLocal('');
    localStorage.removeItem('variavelHandler');
  };

  return (
    <Layout>
      <Grid gutter="md">
        {/* Coluna da Esquerda */}
        <Grid.Col span={6}>
          <Tabs defaultValue="frases-modelo">
            <Tabs.List>
              <Tabs.Tab value="frases-modelo">Frases Associadas a Modelo</Tabs.Tab>
              <Tabs.Tab value="frases-sem-modelo">Frases sem Modelo Associado</Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="frases-modelo" pt="xs">
              <Stack spacing="md">
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

                <Divider label="Configurações de Frases" labelPosition="center" my="md" />

                {/* Combobox Categoria */}
                <Combobox
                  store={comboboxCategoria}
                  onOptionSubmit={(val) => {
                    handleCategoriaChange(val);
                    comboboxCategoria.closeDropdown();
                  }}
                >
                  <Combobox.Target>
                    <Input.Wrapper label="Categoria" required>
                      <Input
                        placeholder="Selecione a categoria"
                        value={categoria}
                        onChange={(event) => handleCategoriaChange(event.currentTarget.value)}
                        onClick={() => comboboxCategoria.openDropdown()}
                        rightSection={<Combobox.Chevron />}
                      />
                    </Input.Wrapper>
                  </Combobox.Target>

                  <Combobox.Dropdown>
                    <Combobox.Options>
                      {Array.isArray(categoriasFiltradas) && categoriasFiltradas.map((group) => (
                        <Combobox.Group key={group.group} label={group.group}>
                          {group.items.map((item) => (
                            <Combobox.Option key={item.value} value={item.value}>
                              {item.label}
                            </Combobox.Option>
                          ))}
                        </Combobox.Group>
                      ))}
                    </Combobox.Options>
                  </Combobox.Dropdown>
                </Combobox>

                {/* Combobox Título da Frase */}
                <Combobox
                  store={comboboxTituloFrase}
                  onOptionSubmit={(val) => {
                    handleTituloFraseSelect(val);
                    comboboxTituloFrase.closeDropdown();
                  }}
                >
                  <Combobox.Target>
                    <Input.Wrapper label="Título da Frase" required>
                      <Input
                        placeholder="Digite o título da frase"
                        value={tituloFrase}
                        onChange={(event) => setTituloFrase(event.currentTarget.value)}
                        onClick={() => comboboxTituloFrase.openDropdown()}
                        rightSection={<Combobox.Chevron />}
                      />
                    </Input.Wrapper>
                  </Combobox.Target>

                  <Combobox.Dropdown>
                    <Combobox.Options>
                      {titulosFiltrados.map((titulo) => (
                        <Combobox.Option key={titulo} value={titulo}>
                          {titulo}
                        </Combobox.Option>
                      ))}
                    </Combobox.Options>
                  </Combobox.Dropdown>
                </Combobox>

                {/* Input Multilinha Frase Base com Gravação de Áudio */}
                <Stack gap="xs">
                  <Input.Label required>Frase Base</Input.Label>
                  <Text size="xs" c="dimmed">
                    Digite o texto a ser inserido no laudo. Use Enter para criar novas linhas.
                  </Text>
                  <div style={{ position: 'relative' }}>
                    <Textarea
                      name="fraseBaseComModelo"
                      placeholder="Digite a frase base"                
                      value={fraseBase}
                      onChange={(event) => {
                        const novoValor = event.currentTarget.value;
                        // Converte de volta ao formatar antes de atualizar o estado
                        // Mas na verdade, mantemos formatado no estado e só convertemos ao salvar
                        setFraseBase(novoValor);
                      }}
                      minRows={3}
                      autosize
                      maxRows={10}
                      styles={{
                        input: {
                          whiteSpace: 'pre-wrap'
                        }
                      }}
                    />
                    <ActionIcon
                      size="md"
                      variant={isRecordingComModelo ? "filled" : "subtle"}
                      color={isRecordingComModelo ? "red" : "blue"}
                      onClick={toggleRecordingComModelo}
                      title="Atalho: Shift+A | Inserção rápida: Enter"
                      style={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        zIndex: 10
                      }}
                    >
                      {isRecordingComModelo ? <IconMicrophoneOff size={18} /> : <IconMicrophone size={18} />}
                    </ActionIcon>
                  </div>
                  {/* Preview do texto sendo gravado */}
                  {previewTextComModelo && (
                    <Paper p="xs" bg="blue.0" withBorder>
                      <Text size="xs" c="blue.7" fw={500}>
                        Gravando: {previewTextComModelo}
                      </Text>
                    </Paper>
                  )}
                </Stack>

                <Group justify="flex-end" align="center" mt="md">
                  <Tooltip label="Adiciona uma variável que será utilizada nesta frase, mas que pode ser reutilizada em outras frases.">
                  <Button 
                    variant="light" 
                    color="blue"
                    leftSection={<IconVariable size={20} />}
                    onClick={() => {
                      setModalAberto(true);
                      localStorage.setItem('variavelHandler', 'comModelo');
                    }}
                  >
                    Inserir Variável
                  </Button>
                  </Tooltip>
                  <Tooltip label="Adiciona uma variável que será usada apenas nesta frase, não podendo ser reaproveitada em outras frases. Se quiser criar uma variável que possa ser reutilizável em outras frases, clique em Inserir Variável">
                    <Button 
                      variant="light" 
                      color="blue"
                      leftSection={<IconVariable size={20} />}
                      onClick={() => {
                        setModalVariavelLocalAberto(true);
                        localStorage.setItem('variavelHandler', 'comModelo');
                      }}
                    >
                      Inserir Variável Local
                    </Button>
                  </Tooltip>
                  <Tooltip label="Edita a variável local selecionada no campo de texto. Selecione o texto [LOCAL: Título] antes de clicar.">
                    <Button 
                      variant="light" 
                      color="orange"
                      leftSection={<IconEdit size={20} />}
                      onClick={() => {
                        localStorage.setItem('variavelHandler', 'comModelo');
                        handleEditarVariavelLocalSelecionada();
                      }}
                    >
                      Editar Variável Local Selecionada
                    </Button>
                  </Tooltip>
                </Group>

                <Input.Wrapper label="Substituição Frase Base" description="Digite o texto a ser substituído no laudo pela frase base">
                  <Input
                    placeholder="Digite o texto a ser substituído"                  
                    value={substituicaoFraseBase}
                    onChange={(event) => setSubstituicaoFraseBase(event.currentTarget.value)}                  
                  />
                </Input.Wrapper>

                <Divider label="Outras substituições a serem feitas no laudo (opcional)" labelPosition="center" my="md" />              

                {/* Input Procurar Por */}
                <Input.Wrapper label="Procurar Por">
                  <Input
                    placeholder="Digite o texto a ser procurado"
                    value={procurarPor}
                    onChange={(event) => setProcurarPor(event.currentTarget.value)}
                  />
                </Input.Wrapper>

                {/* Input Substituir Por */}
                <Input.Wrapper label="Substituir Por">
                  <Input
                    placeholder="Digite o texto para substituição"
                    value={substituirPor}
                    onChange={(event) => setSubstituirPor(event.currentTarget.value)}
                  />
                </Input.Wrapper>

                {/* Botão adicionar substituição */}
                <Group justify="flex-end" mt="md">
                  <Button 
                    color="blue" 
                    onClick={handleCriarSubstituicao}
                    loading={saving}
                    leftSection={<IconDeviceFloppy size={20} />}
                    disabled={!procurarPor.trim()}
                  >
                    Adicionar Substituição
                  </Button>         
                </Group>

                {/* Lista de substituições */}
                {substituicoesOutras.length > 0 && (
                  <Stack spacing="xs" mt="md">
                    <Text size="sm" fw={500}>Substituições adicionadas:</Text>
                    {substituicoesOutras.map((sub, index) => (
                      <div key={index} style={{ 
                        padding: '8px', 
                        backgroundColor: '#f8f9fa', 
                        borderRadius: '4px',
                        border: '1px solid #dee2e6'
                      }}>
                        <Group justify="space-between" align="flex-start">
                          <Stack spacing="xs" style={{ flex: 1 }}>
                            <Text size="sm">
                              <strong>Procurar por:</strong> {sub.procurarPor}
                            </Text>
                            <Text size="sm">
                              <strong>Substituir por:</strong> {sub.substituirPor}
                            </Text>
                          </Stack>
                          <Group gap="xs">
                            <Button
                              variant="subtle"
                              color="blue"
                              size="xs"
                              onClick={() => handleEditarSubstituicao(index)}
                              leftSection={<IconEdit size={14} />}
                            >
                              Editar
                            </Button>
                            <Button
                              variant="subtle"
                              color="red"
                              size="xs"
                              onClick={() => handleDeletarSubstituicao(index)}
                              leftSection={<IconTrash size={14} />}
                            >
                              Excluir
                            </Button>
                          </Group>
                        </Group>
                      </div>
                    ))}
                  </Stack>
                )}

                <Divider label="Conclusão (opcional)" labelPosition="center" my="md" />

                {/* Input Conclusão */}
                <Textarea
                  label="Conclusão"
                  placeholder="Digite a conclusão"
                  value={conclusao}
                  onChange={(event) => setConclusao(event.currentTarget.value)}
                  minRows={2}
                  autosize
                />

                {/* Botões */}
                <Group justify="flex-end" mt="md">
                  <Button 
                    color="blue" 
                    onClick={handleSave}
                    loading={saving}
                    leftSection={<IconDeviceFloppy size={20} />}
                    disabled={!categoria.trim() || !tituloFrase.trim() || !fraseBase.trim()}
                  >
                    {saving ? 'Salvando...' : 'Salvar'}
                  </Button>
                  <Button 
                    variant="outline" 
                    color="blue"
                    onClick={handleEdit}
                    leftSection={<IconEdit size={20} />}
                    disabled={!fraseId}
                  >
                    Editar
                  </Button>
                  <Button 
                    variant="outline" 
                    color="red"
                    onClick={handleDelete}
                    leftSection={<IconTrash size={20} />}
                    disabled={!fraseId}
                  >
                    Excluir
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={handleClear}
                    leftSection={<IconEraser size={20} />}
                  >
                    Limpar
                  </Button>
                </Group>
              </Stack>
            </Tabs.Panel>

            <Tabs.Panel value="frases-sem-modelo" pt="xs">
              <Stack spacing="md">
                <Divider label="Frases sem Modelo Associado" labelPosition="center" my="md" />

                {/* Combobox Categoria */}
                <Combobox
                  store={comboboxCategoriaSemModelo}
                  onOptionSubmit={(val) => {
                    handleCategoriaSemModeloChange(val);
                    comboboxCategoriaSemModelo.closeDropdown();
                  }}
                >
                  <Combobox.Target>
                    <Input.Wrapper label="Categoria" required>
                      <Input
                        placeholder="Selecione a categoria"
                        value={categoriaSemModelo}
                        onChange={(event) => handleCategoriaSemModeloChange(event.currentTarget.value)}
                        onClick={() => comboboxCategoriaSemModelo.openDropdown()}
                        rightSection={<Combobox.Chevron />}
                      />
                    </Input.Wrapper>
                  </Combobox.Target>

                  <Combobox.Dropdown>
                    <Combobox.Options>
                      {Array.isArray(categoriasFiltradasSemModelo) && categoriasFiltradasSemModelo.map((group) => (
                        <Combobox.Group key={group.group} label={group.group}>
                          {group.items.map((item) => (
                            <Combobox.Option key={item.value} value={item.value}>
                              {item.label}
                            </Combobox.Option>
                          ))}
                        </Combobox.Group>
                      ))}
                    </Combobox.Options>
                  </Combobox.Dropdown>
                </Combobox>

                {/* Combobox Título da Frase */}
                <Combobox
                  store={comboboxTituloFraseSemModelo}
                  onOptionSubmit={(val) => {
                    handleTituloFraseSemModeloSelect(val);
                    comboboxTituloFraseSemModelo.closeDropdown();
                  }}
                >
                  <Combobox.Target>
                    <Input.Wrapper label="Título da Frase" required>
                      <Input
                        placeholder="Digite o título da frase"
                        value={tituloFraseSemModelo}
                        onChange={(event) => setTituloFraseSemModelo(event.currentTarget.value)}
                        onClick={() => comboboxTituloFraseSemModelo.openDropdown()}
                        rightSection={<Combobox.Chevron />}
                      />
                    </Input.Wrapper>
                  </Combobox.Target>

                  <Combobox.Dropdown>
                    <Combobox.Options>
                      {titulosFiltradosSemModelo.map((titulo) => (
                        <Combobox.Option key={titulo} value={titulo}>
                          {titulo}
                        </Combobox.Option>
                      ))}
                    </Combobox.Options>
                  </Combobox.Dropdown>
                </Combobox>

                {/* Input Multilinha Frase Base com Gravação de Áudio */}
                <Stack gap="xs">
                  <Input.Label required>Frase Base</Input.Label>
                  <Text size="xs" c="dimmed">
                    Digite o texto a ser inserido no laudo. Use Enter para criar novas linhas.
                  </Text>
                  <div style={{ position: 'relative' }}>
                    <Textarea
                      name="fraseBaseSemModelo"
                      placeholder="Digite a frase base"                
                      value={fraseBaseSemModelo}
                      onChange={(event) => setFraseBaseSemModelo(event.currentTarget.value)}
                      minRows={3}
                      autosize
                      maxRows={10}
                      styles={{
                        input: {
                          whiteSpace: 'pre-wrap'
                        }
                      }}
                    />
                    <ActionIcon
                      size="md"
                      variant={isRecordingSemModelo ? "filled" : "subtle"}
                      color={isRecordingSemModelo ? "red" : "blue"}
                      onClick={toggleRecordingSemModelo}
                      title="Atalho: Shift+A | Inserção rápida: Enter"
                      style={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        zIndex: 10
                      }}
                    >
                      {isRecordingSemModelo ? <IconMicrophoneOff size={18} /> : <IconMicrophone size={18} />}
                    </ActionIcon>
                  </div>
                  {/* Preview do texto sendo gravado */}
                  {previewTextSemModelo && (
                    <Paper p="xs" bg="blue.0" withBorder>
                      <Text size="xs" c="blue.7" fw={500}>
                        Gravando: {previewTextSemModelo}
                      </Text>
                    </Paper>
                  )}
                </Stack>

                <Group justify="flex-end" align="center" mt="md">
                  <Button 
                    variant="light" 
                    color="blue"
                    leftSection={<IconVariable size={20} />}
                    onClick={() => {
                      setModalAberto(true);
                      localStorage.setItem('variavelHandler', 'semModelo');
                    }}
                  >
                    Inserir Variável
                  </Button>
                  <Tooltip label="Adiciona uma variável que será usada apenas nesta frase, não podendo ser reaproveitada em outras frases. Se quiser criar uma variável que possa ser reutilizável em outras frases, clique em Inserir Variável">
                    <Button 
                      variant="light" 
                      color="blue"
                      leftSection={<IconVariable size={20} />}
                      onClick={() => {
                        setModalVariavelLocalAberto(true);
                        localStorage.setItem('variavelHandler', 'semModelo');
                      }}
                    >
                      Inserir Variável Local
                    </Button>
                  </Tooltip>
                  <Tooltip label="Edita a variável local selecionada no campo de texto. Selecione o texto [LOCAL: Título] antes de clicar.">
                    <Button 
                      variant="light" 
                      color="orange"
                      leftSection={<IconEdit size={20} />}
                      onClick={() => {
                        localStorage.setItem('variavelHandler', 'semModelo');
                        handleEditarVariavelLocalSelecionada();
                      }}
                    >
                      Editar Variável Local Selecionada
                    </Button>
                  </Tooltip>
                </Group>

                <Input.Wrapper label="Substituição Frase Base" description="Digite o texto a ser substituído no laudo pela frase base">
                  <Input
                    placeholder="Digite o texto a ser substituído"                  
                    value={substituicaoFraseBaseSemModelo}
                    onChange={(event) => setSubstituicaoFraseBaseSemModelo(event.currentTarget.value)}                  
                  />
                </Input.Wrapper>

                <Divider label="Outras substituições a serem feitas no laudo (opcional)" labelPosition="center" my="md" />              

                {/* Input Procurar Por */}
                <Input.Wrapper label="Procurar Por">
                  <Input
                    placeholder="Digite o texto a ser procurado"
                    value={procurarPorSemModelo}
                    onChange={(event) => setProcurarPorSemModelo(event.currentTarget.value)}
                  />
                </Input.Wrapper>

                {/* Input Substituir Por */}
                <Input.Wrapper label="Substituir Por">
                  <Input
                    placeholder="Digite o texto para substituição"
                    value={substituirPorSemModelo}
                    onChange={(event) => setSubstituirPorSemModelo(event.currentTarget.value)}
                  />
                </Input.Wrapper>

                {/* Botão adicionar substituição */}
                <Group justify="flex-end" mt="md">
                  <Button 
                    color="blue" 
                    onClick={handleCriarSubstituicaoSemModelo}
                    loading={saving}
                    leftSection={<IconDeviceFloppy size={20} />}
                    disabled={!procurarPorSemModelo.trim()}
                  >
                    Adicionar Substituição
                  </Button>         
                </Group>

                {/* Lista de substituições */}
                {substituicoesOutrasSemModelo.length > 0 && (
                  <Stack spacing="xs" mt="md">
                    <Text size="sm" fw={500}>Substituições adicionadas:</Text>
                    {substituicoesOutrasSemModelo.map((sub, index) => (
                      <div key={index} style={{ 
                        padding: '8px', 
                        backgroundColor: '#f8f9fa', 
                        borderRadius: '4px',
                        border: '1px solid #dee2e6'
                      }}>
                        <Group justify="space-between" align="flex-start">
                          <Stack spacing="xs" style={{ flex: 1 }}>
                            <Text size="sm">
                              <strong>Procurar por:</strong> {sub.procurarPor}
                            </Text>
                            <Text size="sm">
                              <strong>Substituir por:</strong> {sub.substituirPor}
                            </Text>
                          </Stack>
                          <Group gap="xs">
                            <Button
                              variant="subtle"
                              color="blue"
                              size="xs"
                              onClick={() => handleEditarSubstituicaoSemModelo(index)}
                              leftSection={<IconEdit size={14} />}
                            >
                              Editar
                            </Button>
                            <Button
                              variant="subtle"
                              color="red"
                              size="xs"
                              onClick={() => handleDeletarSubstituicaoSemModelo(index)}
                              leftSection={<IconTrash size={14} />}
                            >
                              Excluir
                            </Button>
                          </Group>
                        </Group>
                      </div>
                    ))}
                  </Stack>
                )}

                <Divider label="Conclusão (opcional)" labelPosition="center" my="md" />

                {/* Input Conclusão */}
                <Textarea
                  label="Conclusão"
                  placeholder="Digite a conclusão"
                  value={conclusaoSemModelo}
                  onChange={(event) => setConclusaoSemModelo(event.currentTarget.value)}
                  minRows={2}
                  autosize
                />

                {/* Botões */}
                <Group justify="flex-end" mt="md">
                  <Button 
                    color="blue" 
                    onClick={handleSaveSemModelo}
                    loading={saving}
                    leftSection={<IconDeviceFloppy size={20} />}
                    disabled={!categoriaSemModelo.trim() || !tituloFraseSemModelo.trim() || !fraseBaseSemModelo.trim()}
                  >
                    {saving ? 'Salvando...' : 'Salvar'}
                  </Button>
                  <Button 
                    variant="outline" 
                    color="blue"
                    onClick={handleEditSemModelo}
                    leftSection={<IconEdit size={20} />}
                    disabled={!fraseIdSemModelo}
                  >
                    Editar
                  </Button>
                  <Button 
                    variant="outline" 
                    color="red"
                    onClick={handleDeleteSemModelo}
                    leftSection={<IconTrash size={20} />}
                    disabled={!fraseIdSemModelo}
                  >
                    Excluir
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={handleClearSemModelo}
                    leftSection={<IconEraser size={20} />}
                  >
                    Limpar
                  </Button>
                </Group>
              </Stack>
            </Tabs.Panel>
          </Tabs>
        </Grid.Col>

        {/* Coluna da Direita */}
        <Grid.Col span={6}>
          <TextEditor
            content={texto}
            onChange={setTexto}
            label="Editor de Texto"
          />
        </Grid.Col>
      </Grid>

      {/* Modal de Variáveis */}
      <Modal
        opened={modalAberto}
        onClose={() => {
          setModalAberto(false);
          localStorage.removeItem('variavelHandler');
        }}
        title="Selecionar Variável"
        size="xl"
        styles={{
          body: {
            maxHeight: 'calc(90vh - 100px)',
            overflowY: 'auto'
          }
        }}
      >
        <VariaveisModal 
          onVariavelSelect={(variavel) => {
            const handler = localStorage.getItem('variavelHandler');
            if (handler === 'semModelo') {
              handleVariavelSelectSemModelo(variavel);
            } else {
              handleVariavelSelect(variavel);
            }
          }} 
        />
      </Modal>

      {/* Modal de Variáveis Locais */}
      <Modal
        opened={modalVariavelLocalAberto}
        onClose={() => {
          setModalVariavelLocalAberto(false);
          handleClearVariavelLocal();
          setOpcoesVariavelLocal('');
          localStorage.removeItem('variavelHandler');
        }}
        title={editandoVariavelLocal ? "Editar Variável Local" : "Criar Variável Local"}
        size="lg"
        styles={{
          body: {
            maxHeight: 'calc(90vh - 100px)',
            overflowY: 'auto'
          }
        }}
      >
        <Stack spacing="md">
          <Divider label="Formato Novo (Recomendado)" labelPosition="center" my="md" />
          
          <Select
            label="Tipos de controle"
            placeholder="Selecione o tipo de controle"
            data={['Combobox', 'Grupo de Radio', 'Grupo de Checkbox', 'Combobox com múltiplas opções']}
            value={variavelLocalTipoControle}
            onChange={setVariavelLocalTipoControle}
            required
          />

          {variavelLocalTipoControle && (
            <>
              <TextInput
                label="Título"
                placeholder="Digite o título do controle"
                value={variavelLocalTitulo}
                onChange={(event) => setVariavelLocalTitulo(event.currentTarget.value)}
                required
              />

              <TextInput
                label="Label"
                placeholder="Digite o label que aparecerá no modal (opcional)"
                value={variavelLocalLabel}
                onChange={(event) => setVariavelLocalLabel(event.currentTarget.value)}
                description="Se não preenchido, será usado o título"
              />

              <Group grow>
                <TextInput
                  label="Descrição"
                  placeholder="Digite a descrição"
                  value={variavelLocalDescricao}
                  onChange={(event) => {
                    const novoValor = event.currentTarget.value;
                    setVariavelLocalDescricao(novoValor);
                    setVariavelLocalValor(novoValor);
                  }}
                />
                <TextInput
                  label="Valor"
                  placeholder="Digite o valor"
                  value={variavelLocalValor}
                  onChange={(event) => setVariavelLocalValor(event.currentTarget.value)}
                />
              </Group>

              <Group justify="flex-end" mt="md">
                <Button 
                  color="blue" 
                  onClick={handleAdicionarValorLocal}
                  leftSection={<IconDeviceFloppy size={20} />}
                  disabled={!variavelLocalDescricao.trim() || !variavelLocalValor.trim()}
                >
                  Adicionar Valores
                </Button>
              </Group>

              {(variavelLocalTipoControle === "Grupo de Checkbox" || variavelLocalTipoControle === "Combobox com múltiplas opções") && (
                <Group grow>
                  <TextInput
                    label={
                      <Group gap="xs">
                        <Text>Delimitador</Text>
                        <Tooltip
                          label="Digite um caractere que será usado para separar os valores selecionados. Por exemplo: usando ',' os valores serão separados por vírgula."
                          position="top"
                          withArrow
                          multiline
                          w={220}
                        >
                          <IconHelp size={16} style={{ cursor: 'help' }} />
                        </Tooltip>
                      </Group>
                    }
                    placeholder="Digite um delimitador para separar os valores, por exemplo: ',' ';' '/' '.', ou qualquer outro caractere."
                    value={variavelLocalDelimitador}
                    onChange={(event) => setVariavelLocalDelimitador(event.currentTarget.value)}
                  />
                  <TextInput
                    label={
                      <Group gap="xs">
                        <Text>Último delimitador</Text>
                        <Tooltip
                          label="Digite o caractere que será usado antes do último valor. Por exemplo: usando 'e' o resultado será 'valor1, valor2 e valor3'. Use 'ENTER' para adicionar uma quebra de linha."
                          position="top"
                          withArrow
                          multiline
                          w={220}
                        >
                          <IconHelp size={16} style={{ cursor: 'help' }} />
                        </Tooltip>
                      </Group>
                    }
                    placeholder="Digite o último delimitador, por exemplo: ',' ';' '/' '.', ou qualquer outro caractere. Digite 'ENTER' para acrescentar uma nova linha."
                    value={variavelLocalUltimoDelimitador}
                    onChange={(event) => setVariavelLocalUltimoDelimitador(event.currentTarget.value)}
                  />
                </Group>
              )}

              {/* Lista de valores */}
              {variavelLocalValores.length > 0 && (
                <Stack spacing="xs" mt="md">
                  <Text size="sm" fw={500}>Valores adicionados:</Text>
                  <DragDropContext onDragEnd={(result) => {
                    if (!result.destination) return;
                    
                    const items = Array.from(variavelLocalValores);
                    const [reorderedItem] = items.splice(result.source.index, 1);
                    items.splice(result.destination.index, 0, reorderedItem);
                    
                    setVariavelLocalValores(items);
                  }}>
                    <Droppable droppableId="valores-local">
                      {(provided) => (
                        <div
                          {...provided.droppableProps}
                          ref={provided.innerRef}
                          style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
                        >
                          {variavelLocalValores.map((valor, index) => (
                            <Draggable key={index} draggableId={`valor-local-${index}`} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  style={{
                                    ...provided.draggableProps.style,
                                    padding: '8px',
                                    backgroundColor: snapshot.isDragging ? '#e9ecef' : '#f8f9fa',
                                    borderRadius: '4px',
                                    border: '1px solid #dee2e6',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                  }}
                                >
                                  <div {...provided.dragHandleProps} style={{ cursor: 'grab' }}>
                                    <IconGripVertical size={16} color="#6c757d" />
                                  </div>
                                  <Stack spacing="xs" style={{ flex: 1 }}>
                                    <Text size="sm">
                                      <strong>Descrição:</strong> {valor.descricao}
                                    </Text>
                                    <Text size="sm">
                                      <strong>Valor:</strong> {valor.valor}
                                    </Text>
                                  </Stack>
                                  <Group gap="xs">
                                    <Button
                                      variant="subtle"
                                      color="blue"
                                      size="xs"
                                      onClick={() => handleEditarValorLocal(index)}
                                      leftSection={<IconEdit size={14} />}
                                    >
                                      Editar
                                    </Button>
                                    <Button
                                      variant="subtle"
                                      color="red"
                                      size="xs"
                                      onClick={() => handleDeletarValorLocal(index)}
                                      leftSection={<IconTrash size={14} />}
                                    >
                                      Excluir
                                    </Button>
                                  </Group>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </DragDropContext>
                </Stack>
              )}

              <Group justify="flex-end" mt="md">
                <Button 
                  variant="outline"
                  onClick={() => {
                    setModalVariavelLocalAberto(false);
                    handleClearVariavelLocal();
                    setOpcoesVariavelLocal('');
                    localStorage.removeItem('variavelHandler');
                  }}
                >
                  Cancelar
                </Button>
                <Button 
                  color="blue" 
                  onClick={handleAdicionarVariavelLocalCompleta}
                  leftSection={<IconDeviceFloppy size={20} />}
                  disabled={!variavelLocalTitulo.trim() || !variavelLocalTipoControle || variavelLocalValores.length === 0}
                >
                  {editandoVariavelLocal ? 'Salvar Alterações' : 'Adicionar Variável Local'}
                </Button>
              </Group>
            </>
          )}

          <Divider label="Formato Antigo (Compatibilidade)" labelPosition="center" my="md" />
          
          <Text size="sm" c="dimmed">
            Digite as opções da variável local, uma por linha. Elas serão inseridas no formato [opcao1//opcao2//opcao3].
          </Text>
          
          <Textarea
            label="Opções da Variável Local (Formato Antigo)"
            placeholder="Digite uma opção por linha&#10;Exemplo:&#10;Opção 1&#10;Opção 2&#10;Opção 3"
            value={opcoesVariavelLocal}
            onChange={(event) => setOpcoesVariavelLocal(event.currentTarget.value)}
            minRows={3}
            autosize
            maxRows={10}
          />
          
          <Group justify="flex-end">
            <Button 
              color="blue"
              onClick={handleAdicionarVariavelLocal}
              disabled={!opcoesVariavelLocal.trim() && (!variavelLocalTipoControle || variavelLocalValores.length === 0)}
            >
              {variavelLocalTipoControle && variavelLocalValores.length > 0 ? 'Adicionar (Novo Formato)' : 'Adicionar (Formato Antigo)'}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Layout>
  );
}

export default Frases;
