import { Button, Group, Stack, Text, TextInput } from '@mantine/core';
import { IconPlus, IconTrash } from '@tabler/icons-react';

function FaixasClassificacaoEditor({ value, onChange }) {
  const faixas = Array.isArray(value) ? value : [];

  const atualizar = (index, campo, novoValor) => {
    onChange(
      faixas.map((faixa, i) => (i === index ? { ...faixa, [campo]: novoValor } : faixa)),
    );
  };

  return (
    <Stack gap="xs">
      <Text size="sm" fw={500}>Faixas de classificação (opcional)</Text>
      <Text size="xs" c="dimmed">
        Use {'{soma}'} e {'{classificacao}'} no texto da frase. Cada faixa: de / até / rótulo.
        Deixe &quot;até&quot; vazio para &quot;ou mais&quot; (ex.: 7+ = TR5).
      </Text>
      {faixas.map((faixa, index) => (
        <Group key={index} grow align="flex-end">
          <TextInput
            label="De"
            placeholder="0"
            value={faixa.min}
            onChange={(event) => atualizar(index, 'min', event.currentTarget.value)}
          />
          <TextInput
            label="Até"
            placeholder="vazio = ou mais"
            value={faixa.max}
            onChange={(event) => atualizar(index, 'max', event.currentTarget.value)}
          />
          <TextInput
            label="Rótulo"
            placeholder="TR4"
            value={faixa.rotulo}
            onChange={(event) => atualizar(index, 'rotulo', event.currentTarget.value)}
          />
          <Button
            variant="subtle"
            color="red"
            onClick={() => onChange(faixas.filter((_, i) => i !== index))}
            leftSection={<IconTrash size={16} />}
          >
            Excluir
          </Button>
        </Group>
      ))}
      <Button
        variant="light"
        onClick={() => onChange([...faixas, { min: '', max: '', rotulo: '' }])}
        leftSection={<IconPlus size={16} />}
      >
        Adicionar faixa
      </Button>
    </Stack>
  );
}

export default FaixasClassificacaoEditor;
