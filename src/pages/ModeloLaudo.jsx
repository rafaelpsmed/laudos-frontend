import { Group, Stack, MultiSelect, Combobox, Input, Select, useCombobox, Text, Button, Modal } from '@mantine/core';
import { IconFileText, IconQuote, IconVariable, IconLogout, IconReport, IconDeviceFloppy, IconEdit, IconTrash, IconEraser } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { jwtDecode } from "jwt-decode";
import { ACCESS_TOKEN } from '../constants';
import TextEditor from '../components/TextEditor';
import VariaveisModal from '../components/VariaveisModal';
import api from '../api';
import Layout from '../components/Layout';

function ModeloLaudo() {
  const [username, setUsername] = useState('');
  const [metodos, setMetodos] = useState([]);
  const [metodosSelected, setMetodosSelected] = useState([]);
  const [modeloId, setModeloId] = useState(null);
  const [titulosDisponiveis, setTitulosDisponiveis] = useState([]);
  const [titulo, setTitulo] = useState('');
  const [texto, setTexto] = useState('');
  const [saving, setSaving] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [frasesVinculadas, setFrasesVinculadas] = useState([]);
  const [showDeleteWarning, setShowDeleteWarning] = useState(false);
  const [modalVariaveisAberto, setModalVariaveisAberto] = useState(false);
  const navigate = useNavigate();
  const combobox = useCombobox();
  const editorRef = useRef(null);

  useEffect(() => {
    const fetchMetodos = async () => {
      try {
        const response = await api.get('/api/metodos/');
        const metodosFormatados = response.data.map(metodo => ({
          value: metodo.id.toString(),
          label: metodo.metodo
        }));
        setMetodos(metodosFormatados);
      } catch (error) {
        console.error('Erro ao buscar métodos:', error);
      }
    };

    fetchMetodos();
  }, []);

  // Busca inicial dos títulos
  useEffect(() => {
    const fetchTitulosInicial = async () => {
      try {
        // console.log('Buscando títulos iniciais...');
        const response = await api.get('/api/modelo_laudo/');
        // console.log('Resposta da API (títulos iniciais):', response.data);
        if (response.data && Array.isArray(response.data)) {
          setTitulosDisponiveis(response.data);
        } else {
          console.error('Resposta da API não é um array:', response.data);
        }
      } catch (error) {
        console.error('Erro ao buscar títulos iniciais:', error);
        console.error('Detalhes do erro:', error.response?.data);
      }
    };

    fetchTitulosInicial();
  }, []);

  // Busca títulos quando o método muda
  useEffect(() => {
    const fetchTitulos = async () => {
      try {
        // console.log('Métodos selecionados:', metodosSelected);
        const response = await api.get('/api/modelo_laudo/');
        // console.log('Resposta da API (todos os títulos):', response.data);
        
        if (metodosSelected.length > 0) {
          // Filtra os títulos disponíveis pelos métodos selecionados
          const modelosFiltrados = response.data.filter(modelo => 
            metodosSelected.includes(modelo.metodo.toString())
          );
          // console.log('Modelos filtrados:', modelosFiltrados);
          setTitulosDisponiveis(modelosFiltrados);
        } else {
          // Se não há método selecionado, mostra todos os modelos
          setTitulosDisponiveis(response.data);
        }
      } catch (error) {
        console.error('Erro ao buscar títulos:', error);
        console.error('Detalhes do erro:', error.response?.data);
      }
    };

    fetchTitulos();
  }, [metodosSelected]);

  // Modifique o MultiSelect para limpar o título quando mudar a seleção
  const handleMetodosChange = (newValue) => {
    // console.log('Novos métodos selecionados:', newValue);
    setMetodosSelected(newValue);
    setTitulo(''); // Limpa o título quando mudar os métodos
    setModeloId(null); // Limpa o modeloId quando os métodos são alterados
    setTexto(''); // Limpa o texto quando os métodos são alterados
  };

  // Adicione esta função para buscar o modelo completo
  const fetchModeloCompleto = async (titulo) => {
    try {
      // Encontrar o modelo correspondente ao título selecionado
      const modeloSelecionado = titulosDisponiveis.find(item => item.titulo === titulo);
      if (modeloSelecionado) {
        const response = await api.get(`/api/modelo_laudo/${modeloSelecionado.id}/`);
        // console.log('Resposta da API:', response.data);
        
        // Atualiza o estado com os dados do modelo
        setTexto(response.data.texto || '');
        
        // Verifica se o método existe e converte para string
        const metodoId = response.data.metodo;
        if (metodoId) {
          setMetodosSelected([metodoId.toString()]);
        }
        
        setModeloId(modeloSelecionado.id);
        
        // Log para debug
        // console.log('ModeloId após atualização:', modeloSelecionado.id);
        // console.log('Método selecionado:', metodoId);
      }
    } catch (error) {
      console.error('Erro ao buscar modelo completo:', error);
      alert('Erro ao carregar o modelo. Por favor, tente novamente.');
    }
  };

  // Modifique handleSave para usar o novo editor
  const handleSave = async () => {
    if (!titulo.trim()) {
      alert('Por favor, insira um título');
      return;
    }
    if (metodosSelected.length === 0) {
      alert('Por favor, selecione um método');
      return;
    }
    if (metodosSelected.length > 1) {
      alert('Por favor, selecione apenas um método');
      return;
    }
          if (!texto || texto === '<p></p>' || texto === '') {
        alert('Por favor, insira o conteúdo do modelo');
        return;
      }

    try {
      setSaving(true);

      const token = localStorage.getItem(ACCESS_TOKEN);
      const decoded = jwtDecode(token);
      const userId = decoded.user_id;
      const metodoId = Number(metodosSelected[0]);
      
      const modeloData = {
        titulo: titulo.trim(),
        texto: texto,
        metodo: metodoId,
        usuario: userId
      };

      const response = await api.post('/api/modelo_laudo/', modeloData);
      // console.log('Resposta da API:', response.data);
      
      setTitulo('');
      setMetodosSelected([]);
      setTexto('');
      
      alert('Modelo salvo com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar modelo:', error);
      const errorMessage = error.response?.data?.error || 'Erro ao salvar o modelo. Por favor, tente novamente.';
      alert(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  // Modifique handleEdit para usar o modal
  const handleEdit = async () => {
    if (!modeloId) {
      alert('Por favor, selecione um modelo para editar');
      return;
    }

    try {
      if (!titulo.trim()) {
        alert('Por favor, insira um título');
        return;
      }
      if (metodosSelected.length === 0) {
        alert('Por favor, selecione um método');
        return;
      }
      if (metodosSelected.length > 1) {
        alert('Por favor, selecione apenas um método');
        return;
      }
      if (!texto || texto === '<p></p>' || texto === '') {
        alert('Por favor, insira o conteúdo do modelo');
        return;
      }

      const modeloData = {
        titulo: titulo.trim(),
        texto: texto,
        metodo: Number(metodosSelected[0])
      };

      const response = await api.put(`/api/modelo_laudo/${modeloId}/`, modeloData);
      // console.log('Modelo atualizado:', response.data);
      
      // Atualiza a lista de títulos
      const responseTitulos = await api.get('/api/modelo_laudo/');
      if (metodosSelected.length > 0) {
        const modelosFiltrados = responseTitulos.data.filter(modelo => 
          metodosSelected.includes(modelo.metodo.toString())
        );
        setTitulosDisponiveis(modelosFiltrados);
      } else {
        setTitulosDisponiveis(responseTitulos.data);
      }

      // Limpa os campos
      setTitulo('');
      setMetodosSelected([]);
      setModeloId(null);
      setTexto('');
      setEditModalOpen(false);

      alert('Modelo atualizado com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar modelo:', error);
      console.error('Detalhes do erro:', error.response?.data);
      alert('Erro ao atualizar o modelo. Por favor, tente novamente.');
    }
  };

  const handleOpenDeleteModal = async () => {
    if (!modeloId) {
      alert('Por favor, selecione um modelo para excluir');
      return;
    }

    try {
      // Verifica se existem frases vinculadas
      const frasesResponse = await api.get('/api/frases/');
      const frasesDoModelo = frasesResponse.data.filter(frase => frase.modelo_laudo === modeloId);
      setFrasesVinculadas(frasesDoModelo);
      
      // Abre o modal com o aviso apropriado
      setShowDeleteWarning(frasesDoModelo.length > 0);
      setDeleteModalOpen(true);
    } catch (error) {
      console.error('Erro ao verificar frases vinculadas:', error);
      alert('Erro ao verificar frases vinculadas. Por favor, tente novamente.');
    }
  };

  const handleDelete = async () => {
    if (!modeloId) {
      alert('Por favor, selecione um modelo para excluir');
      return;
    }

    try {
      // Se houver frases vinculadas, exclui cada uma delas primeiro
      if (frasesVinculadas.length > 0) {
        // console.log(`Excluindo ${frasesVinculadas.length} frases vinculadas`);
        for (const frase of frasesVinculadas) {
          await api.delete(`/api/frases/${frase.id}/`);
        }
      }

      // Depois exclui o modelo
      // console.log('Excluindo modelo com ID:', modeloId);
      await api.delete(`/api/modelo_laudo/${modeloId}/`);
      
      // Atualiza a lista de títulos
      const responseTitulos = await api.get('/api/modelo_laudo/');
      if (metodosSelected.length > 0) {
        const modelosFiltrados = responseTitulos.data.filter(modelo => 
          metodosSelected.includes(modelo.metodo.toString())
        );
        setTitulosDisponiveis(modelosFiltrados);
      } else {
        setTitulosDisponiveis(responseTitulos.data);
      }

      // Limpa os campos
      setTitulo('');
      setMetodosSelected([]);
      setModeloId(null);
      setTexto('');
      setDeleteModalOpen(false);
      setFrasesVinculadas([]);
      setShowDeleteWarning(false);

      alert('Modelo excluído com sucesso!');
    } catch (error) {
      console.error('Erro ao excluir modelo:', error);
      console.error('Detalhes do erro:', error.response?.data);
      
      let mensagemErro = 'Erro ao excluir o modelo. ';
      if (error.response?.data?.detail) {
        mensagemErro += error.response.data.detail;
      } else if (error.response?.data?.error) {
        mensagemErro += error.response.data.error;
      } else {
        mensagemErro += 'Por favor, tente novamente.';
      }
      
      alert(mensagemErro);
    }
  };

  const handleClear = () => {
    setTexto('');
    setTitulo('');
    setModeloId(null);
    setMetodosSelected([]);
  };

  const handleVariavelSelect = (variavel) => {
    // Formata a variável para inserção
    const variavelFormatada = `{${variavel.tituloVariavel}}`;
    
    // Insere a variável no editor de texto
    if (editorRef.current && editorRef.current.editor) {
      const { from } = editorRef.current.editor.state.selection;
      editorRef.current.editor.chain()
        .focus()
        .insertContentAt(from, variavelFormatada)
        .run();
    }
    
    // Fecha o modal
    setModalVariaveisAberto(false);
  };

  useEffect(() => {
    const fetchUserData = async () => {
      const token = localStorage.getItem(ACCESS_TOKEN);
      if (token) {
        try {
          const response = await api.get('/api/auth/me/');
          setUsername(response.data.email);
        } catch (error) {
          console.error('Erro ao buscar dados do usuário:', error);
        }
      }
    };

    fetchUserData();
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/logout');
  };

  return (
    <Layout>
      <Stack spacing="md" p="md">
        <MultiSelect
          label="Método"
          placeholder="Selecione os métodos"
          data={metodos}
          value={metodosSelected}
          onChange={handleMetodosChange}
          searchable
          required
          clearable
        />

        <Combobox
          store={combobox}
          onOptionSubmit={async (val) => {
            setTitulo(val);
            await fetchModeloCompleto(val);
            combobox.closeDropdown();
          }}
        >
          <Combobox.Target>
            <Input.Wrapper label="Título do Modelo" required>
              <Input
                placeholder="Digite o título do modelo"
                value={titulo}              
                onChange={(event) => {
                  setTitulo(event.currentTarget.value);
                  setModeloId(null); // Limpa o modeloId quando o título é alterado manualmente
                }}
                onClick={() => combobox.openDropdown()}
                rightSection={<Combobox.Chevron />}
              />
            </Input.Wrapper>
          </Combobox.Target>

          <Combobox.Dropdown>
            <Combobox.Options>
              {titulosDisponiveis.map((item) => (
                <Combobox.Option key={item.id} value={item.titulo}>
                  {item.titulo}
                </Combobox.Option>
              ))}
            </Combobox.Options>
          </Combobox.Dropdown>
        </Combobox>

        <Text fw={500} size="sm" required>Modelo de Laudo</Text>
        <Stack spacing="md">
          <Group justify="flex-end" align="center">
            <Button 
              variant="light" 
              color="blue"
              leftSection={<IconVariable size={20} />}
              onClick={() => setModalVariaveisAberto(true)}
            >
              Inserir Variável
            </Button>
          </Group>
          
          <TextEditor
            content={texto}
            onChange={setTexto}
            label="Editor de Texto"
            ref={editorRef}
          />

          <Group justify="flex-end" mt="md">
            <Button 
              color="blue" 
              onClick={handleSave}
              loading={saving}
              leftSection={<IconDeviceFloppy size={20} />}
              disabled={!titulo.trim() || metodosSelected.length === 0 || !texto || texto === '<p></p>' || texto === ''}
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
            <Button 
              color="yellow" 
              onClick={() => setEditModalOpen(true)}
              leftSection={<IconEdit size={20} />}
              disabled={!modeloId}
            >
              Editar
            </Button>
            <Button 
              color="red" 
              onClick={handleOpenDeleteModal}
              leftSection={<IconTrash size={20} />}
              disabled={!modeloId}
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

        {/* Modal de Confirmação de Edição */}
        <Modal
          opened={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          title="Confirmar Edição"
          centered
        >
          <Stack>
            <Text>Tem certeza que deseja editar este modelo?</Text>
            <Text size="sm" c="dimmed">
              Esta ação irá substituir o modelo existente com o conteúdo atual.
            </Text>
            <Group justify="flex-end" mt="md">
              <Button variant="outline" onClick={() => setEditModalOpen(false)}>
                Cancelar
              </Button>
              <Button color="yellow" onClick={handleEdit}>
                Confirmar Edição
              </Button>
            </Group>
          </Stack>
        </Modal>

        {/* Modal de Confirmação de Exclusão */}
        <Modal
          opened={deleteModalOpen}
          onClose={() => {
            setDeleteModalOpen(false);
            setShowDeleteWarning(false);
            setFrasesVinculadas([]);
          }}
          title="Confirmar Exclusão"
          centered
        >
          <Stack>
            <Text>Tem certeza que deseja excluir este modelo?</Text>
            {showDeleteWarning && (
              <Text c="red" fw={500}>
                Atenção: Este modelo possui {frasesVinculadas.length} frase(s) vinculada(s).
                Ao excluir o modelo, todas as frases vinculadas também serão excluídas.
              </Text>
            )}
            <Text size="sm" c="dimmed">
              Esta ação não poderá ser desfeita.
            </Text>
            <Group justify="flex-end" mt="md">
              <Button 
                variant="outline" 
                onClick={() => {
                  setDeleteModalOpen(false);
                  setShowDeleteWarning(false);
                  setFrasesVinculadas([]);
                }}
              >
                Cancelar
              </Button>
              <Button color="red" onClick={handleDelete}>
                Confirmar Exclusão
              </Button>
            </Group>
          </Stack>
        </Modal>

        {/* Modal de Variáveis */}
        <Modal
          opened={modalVariaveisAberto}
          onClose={() => setModalVariaveisAberto(false)}
          title="Selecionar Variável"
          size="xl"
          styles={{
            body: {
              maxHeight: 'calc(90vh - 100px)',
              overflowY: 'auto'
            }
          }}
        >
          <VariaveisModal onVariavelSelect={handleVariavelSelect} />
        </Modal>
      </Stack>
    </Layout>
  );
}

export default ModeloLaudo;