import { Modal, Stack, Button, Text } from '@mantine/core';

function InserirFraseModal({ 
  opened, 
  onClose, 
  onConfirm
}) {
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

        <Stack spacing="xs" w="100%">
          <Button
            variant="light"
            onClick={() => onConfirm('final')}
            fullWidth
          >
            Inserir no final do texto
          </Button>

          <Button
            variant="light"
            onClick={() => onConfirm('cursor')}
            fullWidth
          >
            Inserir na posição do cursor
          </Button>

          <Button
            variant="light"
            onClick={() => onConfirm('selecao')}
            fullWidth
          >
            Substituir texto selecionado
          </Button>

          <Button
            variant="light"
            onClick={() => onConfirm('linha')}
            fullWidth
          >
            Deletar linha e inserir frase
          </Button>
        </Stack>
      </Stack>
    </Modal>
  );
}

export default InserirFraseModal; 