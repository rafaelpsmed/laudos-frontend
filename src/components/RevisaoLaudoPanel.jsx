import { Paper, Group, Text, Badge, Button, ActionIcon, Stack, ScrollArea, Loader, Tooltip } from '@mantine/core';
import { IconCheck, IconX, IconRefresh, IconChevronDown, IconChevronUp } from '@tabler/icons-react';
import { useState } from 'react';
import { ROTULO_TIPO_PENDENCIA, COR_TIPO_PENDENCIA } from '../utils/revisaoLaudo';

function ItemPendencia({ pendencia, onAplicar, onIgnorar }) {
    const cor = COR_TIPO_PENDENCIA[pendencia.tipo] || 'gray';
    const rotulo = ROTULO_TIPO_PENDENCIA[pendencia.tipo] || pendencia.tipo;
    return (
        <Paper withBorder p="xs" radius="sm">
            <Group justify="space-between" align="flex-start" wrap="nowrap" gap="xs">
                <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
                    <Group gap="xs">
                        <Badge size="xs" color={cor} variant="light">{rotulo}</Badge>
                        {pendencia.linha >= 0 && (
                            <Text size="xs" c="dimmed">linha {pendencia.linha + 1}</Text>
                        )}
                        {pendencia.origem === 'ia' && (
                            <Text size="xs" c="dimmed">IA</Text>
                        )}
                    </Group>
                    {pendencia.trecho && (
                        <Text size="sm" style={{ wordBreak: 'break-word' }}>
                            <Text span td="line-through" c="red.7">{pendencia.trecho}</Text>
                            {pendencia.sugestao && (
                                <>
                                    {' → '}
                                    <Text span fw={600} c="green.8">{pendencia.sugestao}</Text>
                                </>
                            )}
                        </Text>
                    )}
                    {pendencia.motivo && (
                        <Text size="xs" c="dimmed">{pendencia.motivo}</Text>
                    )}
                </Stack>
                <Group gap={4} wrap="nowrap">
                    {pendencia.aplicavel && (
                        <Tooltip label="Aplicar sugestão">
                            <ActionIcon size="sm" color="green" variant="light" onClick={() => onAplicar(pendencia)}>
                                <IconCheck size={14} />
                            </ActionIcon>
                        </Tooltip>
                    )}
                    <Tooltip label="Ignorar">
                        <ActionIcon size="sm" color="gray" variant="subtle" onClick={() => onIgnorar(pendencia)}>
                            <IconX size={14} />
                        </ActionIcon>
                    </Tooltip>
                </Group>
            </Group>
        </Paper>
    );
}

export default function RevisaoLaudoPanel({
    pendencias = [],
    revisando = false,
    erro = '',
    onRevisar,
    onAplicar,
    onIgnorar,
    onAplicarTodas,
}) {
    const [aberto, setAberto] = useState(true);
    const aplicaveis = pendencias.filter((p) => p.aplicavel);

    return (
        <Paper withBorder radius="md" p="xs" mt="xs">
            <Group justify="space-between" wrap="nowrap">
                <Group gap="xs">
                    <Text fw={600} size="sm">Revisão</Text>
                    {revisando ? (
                        <Loader size="xs" />
                    ) : (
                        <Badge size="sm" color={pendencias.length ? 'orange' : 'green'} variant="light">
                            {pendencias.length ? `${pendencias.length} pendência(s)` : 'sem pendências'}
                        </Badge>
                    )}
                </Group>
                <Group gap={4} wrap="nowrap">
                    {aplicaveis.length > 1 && (
                        <Button size="compact-xs" variant="light" color="green" onClick={onAplicarTodas}>
                            Aplicar {aplicaveis.length}
                        </Button>
                    )}
                    <Tooltip label="Revisar laudo agora">
                        <ActionIcon size="sm" variant="light" onClick={onRevisar} loading={revisando}>
                            <IconRefresh size={14} />
                        </ActionIcon>
                    </Tooltip>
                    <ActionIcon size="sm" variant="subtle" onClick={() => setAberto((v) => !v)}>
                        {aberto ? <IconChevronDown size={14} /> : <IconChevronUp size={14} />}
                    </ActionIcon>
                </Group>
            </Group>
            {erro && (
                <Text size="xs" c="red" mt={4}>{erro}</Text>
            )}
            {aberto && pendencias.length > 0 && (
                <ScrollArea.Autosize mah={220} mt="xs" type="auto" offsetScrollbars>
                    <Stack gap={6}>
                        {pendencias.map((p) => (
                            <ItemPendencia
                                key={p.id}
                                pendencia={p}
                                onAplicar={onAplicar}
                                onIgnorar={onIgnorar}
                            />
                        ))}
                    </Stack>
                </ScrollArea.Autosize>
            )}
        </Paper>
    );
}
