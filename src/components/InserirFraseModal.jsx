import { Modal, Stack, Button, Text } from '@mantine/core';
import { useEffect } from 'react';

// Mapeamento das teclas para as opções (fora do componente para não recriar)
const OPCOES = [
  { tecla: '1', valor: 'final', label: 'Inserir no final do texto' },
  { tecla: '2', valor: 'cursor', label: 'Escolher onde a frase será inserida' },
  { tecla: '3', valor: 'posicaoAtual', label: 'Inserir na posição atual do cursor' },
  { tecla: '4', valor: 'selecao', label: 'Substituir texto selecionado' },
  { tecla: '5', valor: 'linha', label: 'Deletar linha e inserir frase' }
];

function InserirFraseModal({ 
  opened, 
  onClose, 
  onConfirm
}) {
  // Adiciona listener de teclado quando o modal está aberto
  useEffect(() => {
    if (!opened) return;

    const handleKeyPress = (event) => {
      // Verifica se a tecla pressionada é um número de 1 a 5
      const tecla = event.key;
      if (tecla >= '1' && tecla <= '5') {
        const opcao = OPCOES.find(o => o.tecla === tecla);
        if (opcao) {
          event.preventDefault();
          onConfirm(opcao.valor);
        }
      }
    };

    // Adiciona o listener
    window.addEventListener('keydown', handleKeyPress);

    // Remove o listener quando o componente desmonta ou o modal fecha
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [opened, onConfirm]);

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Como deseja inserir a frase?"
      size="md"
    >
      <Stack spacing="md">
        <Text size="sm" c="dimmed">
          Escolha como você deseja inserir esta frase no texto:
        </Text>
        <Text size="xs" c="dimmed" style={{ fontStyle: 'italic' }}>
          💡 Dica: Use as teclas 1-5 para selecionar rapidamente
        </Text>

        <Stack spacing="xs" w="100%">
          {OPCOES.map((opcao, index) => (
            <Button
              key={opcao.valor}
              variant="light"
              onClick={() => onConfirm(opcao.valor)}
              fullWidth
              color={index === 2 ? 'blue' : undefined} // Mantém a cor azul no botão 3
            >
              <strong>{opcao.tecla}</strong> - {opcao.label}
            </Button>
          ))}
        </Stack>
      </Stack>
    </Modal>
  );
}

export default InserirFraseModal; 