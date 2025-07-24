import { Group, Stack, Grid, Combobox, Input, Textarea, useCombobox, Divider, TextInput, Button, Text, Modal, NavLink, Tooltip, Switch, Tabs } from '@mantine/core';
import { IconFileText, IconQuote, IconVariable, IconLogout, IconReport, IconDeviceFloppy, IconEdit, IconTrash, IconEraser, IconFolder, IconFile } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { jwtDecode } from "jwt-decode";
import { ACCESS_TOKEN } from '../constants';
import api from '../api';

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
  const [opcoesVariavelLocal, setOpcoesVariavelLocal] = useState('');
  const [treeData, setTreeData] = useState([]);
  const [treeDataSemMetodos, setTreeDataSemMetodos] = useState([]);
  const [treeDataModelo, setTreeDataModelo] = useState([]);

  // Novos estados para a aba Frases sem Modelo
  const [categoriaSemModelo, setCategoriaSemModelo] = useState('');
  const [tituloFraseSemModelo, setTituloFraseSemModelo] = useState('');
  const [fraseBaseSemModelo, setFraseBaseSemModelo] = useState('');
  const [fraseIdSemModelo, setFraseIdSemModelo] = useState(null);
  const [categoriasFiltradasSemModelo, setCategoriasFiltradasSemModelo] = useState([]);
  const [titulosFiltradosSemModelo, setTitulosFiltradosSemModelo] = useState([]);

  const navigate = useNavigate();
  const comboboxCategoria = useCombobox();
  const comboboxTituloFrase = useCombobox();
  const comboboxCategoriaSemModelo = useCombobox();
  const comboboxTituloFraseSemModelo = useCombobox();



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
          console.error('Erro ao buscar dados do usuário:', error);
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
      api.get(`/api/modelos-laudo/${modelo.id}/`)
        .then(response => {
          setTexto(response.data.texto || '');
        })
        .catch(error => {
          console.error('Erro ao buscar texto do modelo:', error);
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
        console.error('Erro ao buscar frases:', error);
      }
    };

    fetchFrases();
  }, []);

  // Novo useEffect para buscar categorias sem métodos ao carregar a página
  useEffect(() => {
    const fetchCategoriasSemMetodos = async () => {
      try {
        const token = localStorage.getItem(ACCESS_TOKEN);
        if (!token) {
          console.error('Token não encontrado');
          handleLogout();
          return;
        }

        const config = {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        };
        
        const response = await api.get('/api/frases/categorias-sem-metodos/', config);
        console.log('Resposta da API (categorias sem métodos):', response.data);
        
        if (response.data && Array.isArray(response.data.categorias)) {
          setCategoriasFiltradas(response.data.categorias);
        } else {
          console.error('Resposta inválida do servidor:', response.data);
        }
      } catch (error) {
        console.error('Erro ao buscar categorias sem métodos:', error);
      }
    };

    fetchCategoriasSemMetodos();
  }, []);

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
        console.error('Erro ao buscar categorias sem métodos:', error);
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
    console.log('handleMetodosModeloChange chamado com newValue:', newValue);
    setMetodosModelo(newValue);
    setTitulo('');
    setTexto('');
    setModeloId(null);

    try {
      if (!newValue || newValue.length === 0) {
        console.log('Nenhum método selecionado, buscando categorias sem métodos');
        // Se não houver método selecionado, busca categorias sem métodos
        const response = await api.get('/api/frases/categorias-sem-metodos/');
        console.log('Resposta categorias sem métodos:', response.data);
        if (response.data && Array.isArray(response.data.categorias)) {
          setCategoriasFiltradas([{
            group: 'Categorias sem Método',
            items: response.data.categorias.map(cat => ({
              value: cat,
              label: cat
            }))
          }]);
        }
      } else {
        // Busca o modelo selecionado pelos títulos disponíveis
        const modeloSelecionado = titulosDisponiveis.find(item => item.metodo === newValue[0]);
        if (!modeloSelecionado) {
          console.error('Modelo não encontrado para o método:', newValue[0]);
          return;
        }

        console.log('Modelo selecionado:', modeloSelecionado);
        // Busca as categorias usando o ID do título do modelo
        const response = await api.get('/api/frases/categorias/', {
          params: { modelo_laudo_id: modeloSelecionado.id }
        });
        console.log('Resposta categorias do modelo:', response.data);
        
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
      console.error('Erro ao buscar categorias:', error);
      console.error('Detalhes do erro:', error.response?.data);
      setCategoriasFiltradas([]);
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
      console.error('Erro ao buscar títulos:', error);
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
        console.log('Frase encontrada:', frase);
        
        // Preenche os campos com os dados da frase
        setFraseId(frase.id);
        setFraseBase(frase.frase.fraseBase || '');
        setSubstituicaoFraseBase(frase.frase.substituicaoFraseBase || '');
        setSubstituicoesOutras(frase.frase.substituicoesOutras || []);
        setConclusao(frase.frase.conclusao || '');
        
        // Mantém o texto do modelo atual no editor
        if (modeloId) {
          try {
            const modeloResponse = await api.get(`/api/modelos-laudo/${modeloId}/`);
            setTexto(modeloResponse.data.texto || '');
          } catch (error) {
            console.error('Erro ao buscar modelo:', error);
          }
        }
      } else {
        console.log('Frase não encontrada');
        // Limpa os campos se a frase não for encontrada
        setFraseBase('');
        setSubstituicaoFraseBase('');
        setSubstituicoesOutras([]);
        setConclusao('');
        setFraseId(null);
      }
    } catch (error) {
      console.error('Erro ao selecionar título:', error);
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
      console.log('Título selecionado:', selectedTitulo);
      console.log('Títulos disponíveis:', titulosDisponiveis);
      
      const modeloSelecionado = titulosDisponiveis.find(item => item.titulo === selectedTitulo);
      if (!modeloSelecionado) {
        console.error('Modelo não encontrado para o título:', selectedTitulo);
        return;
      }

      console.log('Modelo encontrado:', modeloSelecionado);
      const response = await api.get(`/api/modelo_laudo/${modeloSelecionado.id}/`);
      console.log('Resposta da API:', response.data);

      // Atualiza o editor com o texto do modelo
      const textoModelo = response.data.texto || '';
      console.log('Texto do modelo a ser exibido:', textoModelo);
      
      // Garante que o texto é uma string válida
      const textoFormatado = typeof textoModelo === 'string' ? textoModelo : String(textoModelo);
      console.log('Texto formatado:', textoFormatado);
      
      setTexto(textoFormatado);
      setModeloId(modeloSelecionado.id);
      
      // Busca as frases associadas ao modelo
      const frasesResponse = await api.get('/api/frases/');
      const frasesDoModelo = frasesResponse.data.filter(f => 
        f.modelos_laudo && f.modelos_laudo.includes(modeloSelecionado.id)
      );

      console.log('Frases do modelo:', frasesDoModelo);
      
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
          console.error('Resposta inválida do servidor:', categoriasResponse.data);
          setCategoriasFiltradas([]);
        }
      } catch (error) {
        console.error('Erro ao buscar categorias do modelo:', error);
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
      console.error('Erro ao buscar modelo completo:', error);
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

      const dadosFrase = {
        categoriaFrase: categoria.trim(),
        tituloFrase: tituloFrase.trim(),
        frase: {
          fraseBase: fraseBase.trim(),
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
        
        // Limpa apenas os campos da frase, mantendo o modelo
        handleClear();
      }
    } catch (error) {
      console.error('Erro ao salvar frase:', error);
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
      const dadosFrase = {
        metodos: metodosModelo.map(id => parseInt(id)),
        categoriaFrase: categoria.trim(),
        tituloFrase: tituloFrase.trim(),
        frase: {
          fraseBase: fraseBase.trim(),
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
        
        alert('Frase atualizada com sucesso!');
      }
    } catch (error) {
      console.error('Erro ao atualizar frase:', error);
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
      
      // Limpa o formulário
      handleClear();
      
      alert('Frase excluída com sucesso!');
    } catch (error) {
      console.error('Erro ao excluir frase:', error);
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

          console.log(`Frase ${frase.id} atualizada com sucesso`);
        }
      }

      // Atualiza a lista de frases local
      const frasesResponse = await api.get('/api/frases/');
      setFrases(frasesResponse.data);
    } catch (error) {
      console.error('Erro ao atualizar títulos das variáveis:', error);
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
    setFraseIdSemModelo(null);
    setCategoriasFiltradasSemModelo([]);
    setTitulosFiltradosSemModelo([]);
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

      const dadosFrase = {
        categoriaFrase: categoriaSemModelo.trim(),
        tituloFrase: tituloFraseSemModelo.trim(),
        frase: {
          fraseBase: fraseBaseSemModelo.trim()
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
        
        // Limpa os campos
        handleClearSemModelo();
      }
    } catch (error) {
      console.error('Erro ao salvar frase:', error);
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
      const dadosFrase = {
        categoriaFrase: categoriaSemModelo.trim(),
        tituloFrase: tituloFraseSemModelo.trim(),
        frase: {
          fraseBase: fraseBaseSemModelo.trim()
        }
      };

      const response = await api.put(`/api/frases/${fraseIdSemModelo}/`, dadosFrase);

      if (response.status === 200) {
        // Atualiza a lista de frases
        const frasesResponse = await api.get('/api/frases/');
        setFrases(frasesResponse.data);
        
        alert('Frase atualizada com sucesso!');
      }
    } catch (error) {
      console.error('Erro ao atualizar frase:', error);
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
      
      // Limpa o formulário
      handleClearSemModelo();
      
      alert('Frase excluída com sucesso!');
    } catch (error) {
      console.error('Erro ao excluir frase:', error);
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
      console.error('Erro ao buscar títulos:', error);
      setTitulosFiltradosSemModelo([]);
      setTituloFraseSemModelo('');
    }
  };

  // Função para manipular seleção de título da frase sem modelo
  const handleTituloFraseSemModeloSelect = async (selectedTitulo) => {
    try {
      setTituloFraseSemModelo(selectedTitulo);
      
      const response = await api.get('/api/frases/', {
        params: {
          titulo_frase: selectedTitulo,
          categoria: categoriaSemModelo
        }
      });

      if (response.data && response.data.frases && response.data.frases.length > 0) {
        const frase = response.data.frases[0];
        console.log('Frase encontrada:', frase);
        
        setFraseIdSemModelo(frase.id);
        setFraseBaseSemModelo(frase.frase.fraseBase || '');
      } else {
        console.log('Frase não encontrada');
        setFraseBaseSemModelo('');
        setFraseIdSemModelo(null);
      }
    } catch (error) {
      console.error('Erro ao selecionar título:', error);
      setFraseBaseSemModelo('');
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

  const handleAdicionarVariavelLocal = () => {
    if (!opcoesVariavelLocal.trim()) return;

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
        
        // Foca no textarea e posiciona o cursor após a variável inserida
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
        
        // Foca no textarea e posiciona o cursor após a variável inserida
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

                {/* Input Multilinha Frase Base */}
                <Input.Wrapper 
                  label="Frase Base" 
                  description="Digite o texto a ser inserido no laudo. Use Enter para criar novas linhas." 
                  required
                >
                  <Textarea
                    name="fraseBaseComModelo"
                    placeholder="Digite a frase base"                
                    value={fraseBase}
                    onChange={(event) => setFraseBase(event.currentTarget.value)}
                    minRows={3}
                    autosize
                    maxRows={10}
                    styles={{
                      input: {
                        whiteSpace: 'pre-wrap'
                      }
                    }}
                  />
                </Input.Wrapper>

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

                {/* Input Multilinha Frase Base */}
                <Input.Wrapper 
                  label="Frase Base" 
                  description="Digite o texto a ser inserido no laudo. Use Enter para criar novas linhas." 
                  required
                >
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
                </Input.Wrapper>

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
                </Group>

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
          setOpcoesVariavelLocal('');
          localStorage.removeItem('variavelHandler');
        }}
        title="Criar Variável Local"
        size="md"
      >
        <Stack spacing="md">
          <Text size="sm" c="dimmed">
            Digite as opções da variável local, uma por linha. Elas serão inseridas no formato [opcao1//opcao2//opcao3].
          </Text>
          
          <Textarea
            label="Opções da Variável Local"
            placeholder="Digite uma opção por linha&#10;Exemplo:&#10;Opção 1&#10;Opção 2&#10;Opção 3"
            value={opcoesVariavelLocal}
            onChange={(event) => setOpcoesVariavelLocal(event.currentTarget.value)}
            minRows={5}
            autosize
            maxRows={10}
          />
          
          <Group justify="flex-end">
            <Button 
              variant="outline" 
              onClick={() => {
                setModalVariavelLocalAberto(false);
                setOpcoesVariavelLocal('');
                localStorage.removeItem('variavelHandler');
              }}
            >
              Cancelar
            </Button>
            <Button 
              color="blue"
              onClick={handleAdicionarVariavelLocal}
              disabled={!opcoesVariavelLocal.trim()}
            >
              Adicionar
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Layout>
  );
}

export default Frases;
