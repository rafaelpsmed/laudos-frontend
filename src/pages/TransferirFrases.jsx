import { useState, useEffect } from 'react';
import { 
  Stack, 
  Group, 
  Select, 
  Radio, 
  Button, 
  Text, 
  Checkbox, 
  Paper, 
  Title, 
  Divider,
  Badge,
  ScrollArea,
  Alert,
  LoadingOverlay,
  Card
} from '@mantine/core';
import { 
  IconArrowRight, 
  IconCopy, 
  IconArrowsExchange, 
  IconCopyPlus,
  IconAlertCircle,
  IconCheck,
  IconX
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { notifications } from '@mantine/notifications';
import api from '../api';
import Layout from '../components/Layout';

function TransferirFrases() {
  const navigate = useNavigate();
  
  // Estados principais
  const [modelos, setModelos] = useState([]);
  const [modeloOrigemId, setModeloOrigemId] = useState(null);
  const [modeloDestinoId, setModeloDestinoId] = useState(null);
  const [modoOperacao, setModoOperacao] = useState('copiar');
  const [frasesOrigem, setFrasesOrigem] = useState([]);
  const [frasesDestino, setFrasesDestino] = useState([]);
  const [frasesSelecionadas, setFrasesSelecionadas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processando, setProcessando] = useState(false);

  // Carrega os modelos de laudo do usuário
  useEffect(() => {
    carregarModelos();
  }, []);

  // Carrega frases quando o modelo origem muda
  useEffect(() => {
    if (modeloOrigemId) {
      carregarFrasesModelo(modeloOrigemId, 'origem');
    } else {
      setFrasesOrigem([]);
      setFrasesSelecionadas([]);
    }
  }, [modeloOrigemId]);

  // Carrega frases do modelo destino quando muda
  useEffect(() => {
    if (modeloDestinoId) {
      carregarFrasesModelo(modeloDestinoId, 'destino');
    } else {
      setFrasesDestino([]);
    }
  }, [modeloDestinoId]);

  const carregarModelos = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/modelo_laudo/');
      const modelosData = response.data.map(m => ({
        value: m.id.toString(),
        label: m.titulo
      }));
      setModelos(modelosData);
    } catch (error) {
      console.error('Erro ao carregar modelos:', error);
      notifications.show({
        title: 'Erro',
        message: 'Não foi possível carregar os modelos de laudo',
        color: 'red',
        icon: <IconX />
      });
    } finally {
      setLoading(false);
    }
  };

  const carregarFrasesModelo = async (modeloId, tipo) => {
    setLoading(true);
    try {
      // Busca todas as frases e filtra as que pertencem ao modelo
      const response = await api.get('/api/frases/');
      const frasesDoModelo = response.data.filter(f => 
        f.modelos_laudo && f.modelos_laudo.includes(parseInt(modeloId))
      );
      
      if (tipo === 'origem') {
        setFrasesOrigem(frasesDoModelo);
      } else {
        setFrasesDestino(frasesDoModelo);
      }
    } catch (error) {
      console.error(`Erro ao carregar frases do modelo ${tipo}:`, error);
      notifications.show({
        title: 'Erro',
        message: `Não foi possível carregar as frases do modelo de ${tipo}`,
        color: 'red',
        icon: <IconX />
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleFraseSelecionada = (fraseId) => {
    setFrasesSelecionadas(prev => {
      if (prev.includes(fraseId)) {
        return prev.filter(id => id !== fraseId);
      } else {
        return [...prev, fraseId];
      }
    });
  };

  const selecionarTodas = () => {
    if (frasesSelecionadas.length === frasesOrigem.length) {
      setFrasesSelecionadas([]);
    } else {
      setFrasesSelecionadas(frasesOrigem.map(f => f.id));
    }
  };

  const fraseJaExisteNoDestino = (fraseId) => {
    return frasesDestino.some(f => f.id === fraseId);
  };

  const executarOperacao = async () => {
    if (!modeloOrigemId || !modeloDestinoId) {
      notifications.show({
        title: 'Atenção',
        message: 'Selecione os modelos de origem e destino',
        color: 'yellow',
        icon: <IconAlertCircle />
      });
      return;
    }

    if (frasesSelecionadas.length === 0) {
      notifications.show({
        title: 'Atenção',
        message: 'Selecione pelo menos uma frase',
        color: 'yellow',
        icon: <IconAlertCircle />
      });
      return;
    }

    // Confirmar operação de "mover"
    if (modoOperacao === 'mover') {
      const confirmar = window.confirm(
        `Você está prestes a MOVER ${frasesSelecionadas.length} frase(s). ` +
        `Elas serão REMOVIDAS do modelo de origem. Deseja continuar?`
      );
      if (!confirmar) return;
    }

    setProcessando(true);
    try {
      const response = await api.post('/api/frases/gerenciar-entre-modelos/', {
        modelo_origem_id: parseInt(modeloOrigemId),
        modelo_destino_id: parseInt(modeloDestinoId),
        frases_ids: frasesSelecionadas,
        modo_operacao: modoOperacao
      });

      notifications.show({
        title: 'Sucesso!',
        message: response.data.mensagem,
        color: 'green',
        icon: <IconCheck />
      });

      // Recarrega as frases dos modelos
      await carregarFrasesModelo(modeloOrigemId, 'origem');
      await carregarFrasesModelo(modeloDestinoId, 'destino');
      
      // Limpa a seleção
      setFrasesSelecionadas([]);

    } catch (error) {
      console.error('Erro ao executar operação:', error);
      const mensagemErro = error.response?.data?.error || 'Erro ao processar a operação';
      notifications.show({
        title: 'Erro',
        message: mensagemErro,
        color: 'red',
        icon: <IconX />
      });
    } finally {
      setProcessando(false);
    }
  };

  const getModoDescricao = () => {
    switch (modoOperacao) {
      case 'copiar':
        return 'As frases permanecerão no modelo de origem e serão adicionadas ao modelo de destino';
      case 'mover':
        return 'As frases serão removidas do modelo de origem e movidas para o modelo de destino';
      case 'duplicar':
        return 'Novas cópias independentes das frases serão criadas e vinculadas ao modelo de destino';
      default:
        return '';
    }
  };

  const getModoIcon = () => {
    switch (modoOperacao) {
      case 'copiar':
        return <IconCopy size={20} />;
      case 'mover':
        return <IconArrowsExchange size={20} />;
      case 'duplicar':
        return <IconCopyPlus size={20} />;
      default:
        return null;
    }
  };

  return (
    <Layout>
      <Stack spacing="md">
        <Title order={2}>Gerenciar Frases Entre Modelos</Title>
        
        <Paper shadow="sm" p="md" withBorder>
          <LoadingOverlay visible={loading} />
          
          {/* Seleção de Modelos */}
          <Stack spacing="md">
            <Group grow>
              <Select
                label="Modelo de Origem"
                placeholder="Selecione o modelo de origem"
                data={modelos}
                value={modeloOrigemId}
                onChange={setModeloOrigemId}
                searchable
                clearable
              />
              
              <Select
                label="Modelo de Destino"
                placeholder="Selecione o modelo de destino"
                data={modelos.filter(m => m.value !== modeloOrigemId)}
                value={modeloDestinoId}
                onChange={setModeloDestinoId}
                searchable
                clearable
                disabled={!modeloOrigemId}
              />
            </Group>

            <Divider label="Modo de Operação" labelPosition="center" />

            {/* Modo de Operação */}
            <Radio.Group
              value={modoOperacao}
              onChange={setModoOperacao}
              name="modoOperacao"
            >
              <Stack spacing="sm">
                <Radio
                  value="copiar"
                  label={
                    <Group spacing="xs">
                      <IconCopy size={18} />
                      <Text>Copiar (manter em ambos)</Text>
                    </Group>
                  }
                  description="As frases permanecerão no modelo original e serão adicionadas ao novo modelo"
                />
                <Radio
                  value="mover"
                  label={
                    <Group spacing="xs">
                      <IconArrowsExchange size={18} />
                      <Text>Mover (transferir para destino)</Text>
                    </Group>
                  }
                  description="As frases serão removidas do modelo original e transferidas para o novo modelo"
                />
                <Radio
                  value="duplicar"
                  label={
                    <Group spacing="xs">
                      <IconCopyPlus size={18} />
                      <Text>Duplicar (criar cópia independente)</Text>
                    </Group>
                  }
                  description="Novas cópias das frases serão criadas e vinculadas apenas ao modelo de destino"
                />
              </Stack>
            </Radio.Group>

            {modoOperacao && (
              <Alert icon={getModoIcon()} color="blue">
                <Text size="sm">{getModoDescricao()}</Text>
              </Alert>
            )}
          </Stack>
        </Paper>

        {/* Lista de Frases do Modelo Origem */}
        {modeloOrigemId && (
          <Paper shadow="sm" p="md" withBorder>
            <Stack spacing="md">
              <Group position="apart">
                <Title order={4}>
                  Frases do Modelo de Origem ({frasesOrigem.length})
                </Title>
                {frasesOrigem.length > 0 && (
                  <Button
                    variant="subtle"
                    size="xs"
                    onClick={selecionarTodas}
                  >
                    {frasesSelecionadas.length === frasesOrigem.length 
                      ? 'Desmarcar Todas' 
                      : 'Selecionar Todas'}
                  </Button>
                )}
              </Group>

              {frasesOrigem.length === 0 ? (
                <Alert icon={<IconAlertCircle />} color="yellow">
                  Nenhuma frase encontrada neste modelo de laudo
                </Alert>
              ) : (
                <ScrollArea style={{ maxHeight: 400 }}>
                  <Stack spacing="xs">
                    {frasesOrigem.map((frase) => {
                      const jaExiste = fraseJaExisteNoDestino(frase.id);
                      return (
                        <Card
                          key={frase.id}
                          shadow="xs"
                          padding="sm"
                          withBorder
                          style={{
                            cursor: 'pointer',
                            backgroundColor: frasesSelecionadas.includes(frase.id) 
                              ? '#f0f7ff' 
                              : 'white'
                          }}
                          onClick={() => toggleFraseSelecionada(frase.id)}
                        >
                          <Group position="apart" noWrap>
                            <Group spacing="sm" style={{ flex: 1 }}>
                              <Checkbox
                                checked={frasesSelecionadas.includes(frase.id)}
                                onChange={() => toggleFraseSelecionada(frase.id)}
                                onClick={(e) => e.stopPropagation()}
                              />
                              <Stack spacing={2} style={{ flex: 1 }}>
                                <Group spacing="xs">
                                  <Badge size="sm" variant="light">
                                    {frase.categoriaFrase}
                                  </Badge>
                                  <Text weight={500} size="sm">
                                    {frase.tituloFrase}
                                  </Text>
                                </Group>
                              </Stack>
                            </Group>
                            {jaExiste && modeloDestinoId && (
                              <Badge color="yellow" size="sm">
                                Já existe no destino
                              </Badge>
                            )}
                          </Group>
                        </Card>
                      );
                    })}
                  </Stack>
                </ScrollArea>
              )}

              {frasesSelecionadas.length > 0 && (
                <Group position="apart">
                  <Text size="sm" color="dimmed">
                    {frasesSelecionadas.length} frase(s) selecionada(s)
                  </Text>
                  <Button
                    leftIcon={<IconArrowRight />}
                    onClick={executarOperacao}
                    disabled={!modeloDestinoId || processando}
                    loading={processando}
                  >
                    Executar Operação
                  </Button>
                </Group>
              )}
            </Stack>
          </Paper>
        )}
      </Stack>
    </Layout>
  );
}

export default TransferirFrases;

