import { Divider, Stack, Select, TextInput, Button, Group, Text, Tooltip } from '@mantine/core';
import { useState } from 'react';
import VariaveisCombobox from './VariaveisCombobox';
import { IconDeviceFloppy, IconEdit, IconTrash, IconEraser, IconHelp } from '@tabler/icons-react';
import api from '../api';

function VariaveisModal({ onVariavelSelect }) {
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
  const [modo, setModo] = useState('selecionar'); // 'selecionar' ou 'criar'

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

    // Chama a função de callback com a variável selecionada
    if (onVariavelSelect) {
      onVariavelSelect(variavel);
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
        response = await api.put(`/api/variaveis/${variavelId}/`, dadosVariavel);
      } else {
        response = await api.post('/api/variaveis/', dadosVariavel);
      }

      if (response.status === 200 || response.status === 201) {
        alert(variavelId ? 'Variável atualizada com sucesso!' : 'Variável salva com sucesso!');
        
        // Se for uma nova variável, seleciona ela automaticamente
        if (!variavelId && onVariavelSelect) {
          onVariavelSelect(response.data);
        }
        
        handleClear();
        setModo('selecionar');
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
    <Stack spacing="md">
      {/* Botões para alternar entre modos */}
      <Group justify="center">
        <Button
          variant={modo === 'selecionar' ? 'filled' : 'light'}
          onClick={() => {
            setModo('selecionar');
            handleClear();
          }}
        >
          Selecionar Variável
        </Button>
        <Button
          variant={modo === 'criar' ? 'filled' : 'light'}
          onClick={() => {
            setModo('criar');
            handleClear();
          }}
        >
          Criar Nova Variável
        </Button>
      </Group>

      {modo === 'selecionar' ? (
        <>
          <Divider label="Escolha uma variável" labelPosition="center" my="md" />
          
          <VariaveisCombobox
            value={variavelSelecionada}
            onChange={handleVariavelSelect}
            label="Variável"          
          />

          {variavelSelecionada && (
            <div style={{ 
              padding: '10px',
              backgroundColor: '#f8f9fa',
              borderRadius: '4px',
              border: '1px solid #dee2e6'
            }}>
              <Text size="sm" fw={500}>Detalhes da Variável:</Text>
              <Text size="sm"><strong>Título:</strong> {titulo}</Text>
              <Text size="sm"><strong>Tipo:</strong> {tipoControle}</Text>
              {valores.length > 0 && (
                <>
                  <Text size="sm" mt="xs"><strong>Valores:</strong></Text>
                  {valores.map((valor, index) => (
                    <Text key={index} size="sm" ml="md">
                      • {valor.descricao}: {valor.valor}
                    </Text>
                  ))}
                </>
              )}
              {(tipoControle === "Grupo de Checkbox" || tipoControle === "Combobox com múltiplas opções") && (
                <>
                  <Text size="sm"><strong>Delimitador:</strong> {delimitador || "Nenhum"}</Text>
                  <Text size="sm"><strong>Último Delimitador:</strong> {ultimoDelimitador || "Nenhum"}</Text>
                </>
              )}
            </div>
          )}
        </>
      ) : (
        <>
          <Divider label="Nova Variável" labelPosition="center" my="md" />

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
                    placeholder="Digite um delimitador para separar os valores"
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
                    placeholder="Digite o último delimitador"
                    value={ultimoDelimitador}
                    onChange={(event) => setUltimoDelimitador(event.currentTarget.value)}
                  />
                </Group>
              )}

              {/* Lista de valores */}
              {valores.length > 0 && (
                <Stack spacing="xs" mt="md">
                  <Text size="sm" fw={500}>Valores adicionados:</Text>
                  {valores.map((valor, index) => (
                    <div key={index} style={{ 
                      padding: '8px', 
                      backgroundColor: '#f8f9fa', 
                      borderRadius: '4px',
                      border: '1px solid #dee2e6'
                    }}>
                      <Group justify="space-between" align="flex-start">
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
                      </Group>
                    </div>
                  ))}
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
                  onClick={handleClear}
                  leftSection={<IconEraser size={20} />}
                >
                  Limpar
                </Button>
              </Group>
            </>
          )}
        </>
      )}
    </Stack>
  );
}

export default VariaveisModal; 