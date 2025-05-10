import Layout from '../components/Layout';
import { Divider, Stack, Select, TextInput, Button, Group, Text, Tooltip } from '@mantine/core';
import { useState } from 'react';
import VariaveisCombobox from '../components/VariaveisCombobox';
import { IconDeviceFloppy, IconEdit, IconTrash, IconEraser, IconHelp, IconArrowRight, IconGripVertical } from '@tabler/icons-react';
import api from '../api';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

function Variaveis() {
  const [variavelSelecionada, setVariavelSelecionada] = useState(null);
  const [tipoControle, setTipoControle] = useState('');
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [valores, setValores] = useState([]);
  const [saving, setSaving] = useState(false);
  const [variavelId, setVariavelId] = useState(null);
  const [delimitador, setDelimitador] = useState('');
  const [ultimoDelimitador, setUltimoDelimitador] = useState('');

  const handleVariavelSelect = (variavel) => {
    if (!variavel) {
      handleClear();
      return;
    }

    setVariavelSelecionada(variavel);
    setVariavelId(variavel.id);
    setTitulo(variavel.tituloVariavel);
    setTipoControle(variavel.variavel.tipo);
    setValores(variavel.variavel.valores || []);
    
    if (variavel.variavel.delimitador) {
      setDelimitador(variavel.variavel.delimitador);
    }
    
    if (variavel.variavel.ultimoDelimitador) {
      setUltimoDelimitador(variavel.variavel.ultimoDelimitador);
    }
  };

  const handleAdicionar = () => {
    if (!descricao.trim() || !valor.trim()) return;

    const novoValor = {
      descricao: descricao,
      valor: valor
    };

    setValores([...valores, novoValor]);
    
    // Limpa os campos após adicionar
    setDescricao('');
    setValor('');
  };

  const handleEditarValor = (index) => {
    const valor = valores[index];
    setDescricao(valor.descricao);
    setValor(valor.valor);
    
    // Remove o valor atual
    setValores(valores.filter((_, i) => i !== index));
  };

  const handleDeletarValor = (index) => {
    if (window.confirm('Tem certeza que deseja excluir este valor?')) {
      setValores(valores.filter((_, i) => i !== index));
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const dadosVariavel = {
        tituloVariavel: titulo,
        variavel: {
          tipo: tipoControle,
          valores: valores,
          ...(tipoControle === "Grupo de Checkbox" || tipoControle === "Combobox com múltiplas opções" ? {
            delimitador: delimitador,
            ultimoDelimitador: ultimoDelimitador
          } : {})
        }
      };

      let response;
      if (variavelId) {
        // Se tem variavelId, é uma edição
        // Busca a variável atual para comparar o título
        const variavelAtual = await api.get(`/api/variaveis/${variavelId}/`);
        const tituloAntigo = variavelAtual.data.tituloVariavel;
        
        // Se o título mudou, atualiza em todas as frases
        if (tituloAntigo !== titulo) {
          await atualizarTituloVariavelEmFrases(tituloAntigo, titulo);
        }
        
        response = await api.put(`/api/variaveis/${variavelId}/`, dadosVariavel);
      } else {
        // Se não tem variavelId, é uma criação
        response = await api.post('/api/variaveis/', dadosVariavel);
      }

      if (response.status === 200 || response.status === 201) {
        alert(variavelId ? 'Variável atualizada com sucesso!' : 'Variável salva com sucesso!');
        handleClear();
      }
    } catch (error) {
      console.error('Erro ao salvar variável:', error);
      if (error.response?.data) {
        alert(`Erro ao salvar variável: ${JSON.stringify(error.response.data)}`);
      } else {
        alert('Erro ao salvar variável. Por favor, tente novamente.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!variavelId) return;

    try {
      setSaving(true);
      const dadosVariavel = {
        tituloVariavel: titulo,
        variavel: {
          tipo: tipoControle,
          valores: valores,
          ...(tipoControle === "Grupo de Checkbox" || tipoControle === "Combobox com múltiplas opções" ? {
            delimitador: delimitador,
            ultimoDelimitador: ultimoDelimitador
          } : {})
        }
      };

      const response = await api.put(`/api/variaveis/${variavelId}/`, dadosVariavel);

      if (response.status === 200) {
        alert('Variável atualizada com sucesso!');
      }
    } catch (error) {
      console.error('Erro ao atualizar variável:', error);
      if (error.response?.data) {
        alert(`Erro ao atualizar variável: ${JSON.stringify(error.response.data)}`);
      } else {
        alert('Erro ao atualizar variável. Por favor, tente novamente.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!variavelId) return;
    
    if (!window.confirm('Tem certeza que deseja excluir esta variável?')) {
      return;
    }

    try {
      setSaving(true);
      await api.delete(`/api/variaveis/${variavelId}/`);
      handleClear();
      alert('Variável excluída com sucesso!');
    } catch (error) {
      console.error('Erro ao excluir variável:', error);
      alert('Erro ao excluir variável. Por favor, tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const handleClear = () => {
    setVariavelSelecionada(null);
    setTitulo('');
    setDescricao('');
    setValor('');
    setValores([]);
    setTipoControle('');
    setVariavelId(null);
    setDelimitador('');
    setUltimoDelimitador('');
  };

  return (
    <Layout>
      <Stack spacing="md">
        <Divider label="Escolha uma variável" labelPosition="center" my="md" />
        
        <VariaveisCombobox
          value={variavelSelecionada}
          onChange={handleVariavelSelect}
          label="Variável"          
        />

        <Divider label="Escolha o tipo de controle que a variável terá" labelPosition="center" my="md" />

        <Select
          label="Tipos de controle"
          placeholder="Selecione o tipo de controle"
          data={['Combobox', 'Grupo de Radio', 'Grupo de Checkbox', 'Combobox com múltiplas opções']}
          value={tipoControle}
          onChange={setTipoControle}
          required
        />

        {tipoControle && (
          <>
            <TextInput
              label="Título"
              placeholder="Digite o título do controle"
              value={titulo}
              onChange={(event) => setTitulo(event.currentTarget.value)}
              required
            />

            <Group grow>
              <TextInput
                label="Descrição"
                placeholder="Digite a descrição"
                value={descricao}
                onChange={(event) => setDescricao(event.currentTarget.value)}
              />
              <Tooltip label="Copiar Descrição para o campo Valor">
                <Button 
                  variant="light" 
                  color="blue"
                  onClick={() => setValor(descricao)}
                  disabled={!descricao.trim()}
                  style={{ alignSelf: 'flex-end', marginBottom: '4px', padding: '0 8px', width: '16px', minWidth: '4px' }}
                >
                  <IconArrowRight size={16} />
                </Button>
              </Tooltip>
              <TextInput
                label="Valor"
                placeholder="Digite o valor"
                value={valor}
                onChange={(event) => setValor(event.currentTarget.value)}
              />
            </Group>

            <Group justify="flex-end" mt="md">
              <Button 
                color="blue" 
                onClick={handleAdicionar}
                leftSection={<IconDeviceFloppy size={20} />}
                disabled={!descricao.trim() || !valor.trim()}
              >
                Adicionar Valores
              </Button>         
            </Group>

            {(tipoControle === "Grupo de Checkbox" || tipoControle === "Combobox com múltiplas opções") && (
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
                  value={delimitador}
                  onChange={(event) => setDelimitador(event.currentTarget.value)}
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
                  value={ultimoDelimitador}
                  onChange={(event) => setUltimoDelimitador(event.currentTarget.value)}
                />
              </Group>
            )}

            {/* Lista de valores */}
            {valores.length > 0 && (
              <Stack spacing="xs" mt="md">
                <Text size="sm" fw={500}>Valores adicionados:</Text>
                <DragDropContext onDragEnd={(result) => {
                  if (!result.destination) return;
                  
                  const items = Array.from(valores);
                  const [reorderedItem] = items.splice(result.source.index, 1);
                  items.splice(result.destination.index, 0, reorderedItem);
                  
                  setValores(items);
                }}>
                  <Droppable droppableId="valores">
                    {(provided) => (
                      <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
                      >
                        {valores.map((valor, index) => (
                          <Draggable key={index} draggableId={`valor-${index}`} index={index}>
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
                                    onClick={() => handleEditarValor(index)}
                                    leftSection={<IconEdit size={14} />}
                                  >
                                    Editar
                                  </Button>
                                  <Button
                                    variant="subtle"
                                    color="red"
                                    size="xs"
                                    onClick={() => handleDeletarValor(index)}
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

            {/* Botões de ação */}
            <Group justify="flex-end" mt="md">
              <Button 
                color="blue" 
                onClick={handleSave}
                loading={saving}
                leftSection={<IconDeviceFloppy size={20} />}
                disabled={!titulo.trim() || !tipoControle || valores.length === 0}
              >
                {saving ? 'Salvando...' : 'Salvar'}
              </Button>
              <Button 
                variant="outline" 
                color="blue"
                onClick={handleEdit}
                leftSection={<IconEdit size={20} />}
                disabled={!variavelId}
              >
                Editar
              </Button>
              <Button 
                variant="outline" 
                color="red"
                onClick={handleDelete}
                leftSection={<IconTrash size={20} />}
                disabled={!variavelId}
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
          </>
        )}
      </Stack>
    </Layout>
  );
}   

export default Variaveis; 