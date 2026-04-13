import { ActionIcon, Tooltip, useComputedColorScheme, useMantineColorScheme } from '@mantine/core';
import { IconMoon, IconSun } from '@tabler/icons-react';

export function ColorSchemeToggle() {
  const { setColorScheme } = useMantineColorScheme();
  const computedColorScheme = useComputedColorScheme('light');

  return (
    <Tooltip label={computedColorScheme === 'dark' ? 'Modo claro' : 'Modo escuro'}>
      <ActionIcon
        variant="default"
        size="lg"
        aria-label="Alternar tema claro ou escuro"
        onClick={() => setColorScheme(computedColorScheme === 'dark' ? 'light' : 'dark')}
      >
        {computedColorScheme === 'dark' ? <IconSun size={20} stroke={1.5} /> : <IconMoon size={20} stroke={1.5} />}
      </ActionIcon>
    </Tooltip>
  );
}
