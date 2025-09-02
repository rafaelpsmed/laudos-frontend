import { AppShell, Burger, Group, NavLink, Button, Text, ActionIcon, Tooltip } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconFileText, IconQuote, IconVariable, IconLogout, IconReport, IconTransfer, IconSettings, IconChevronLeft, IconChevronRight, IconBrain } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { jwtDecode } from "jwt-decode";
import { ACCESS_TOKEN } from '../constants';
import api from '../api';

function Layout({ children }) {
  const [opened, { toggle }] = useDisclosure();
  const [collapsed, { toggle: toggleCollapsed }] = useDisclosure(false);
  const [username, setUsername] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserData = async () => {
      const token = localStorage.getItem(ACCESS_TOKEN);
      console.log('Token:', token); // Debug

      if (token) {
        try {
          const decoded = jwtDecode(token);
          console.log('Token decodificado:', decoded); // Debug

          // Verifica se o token contém o user_id
          if (decoded.user_id) {
            const response = await api.get(`/api/auth/me/`);
            console.log('Resposta da API:', response.data); // Debug
            setUsername(response.data.email);
          } else {
            console.error('Token não contém user_id');
          }
        } catch (error) {
          console.error('Erro ao buscar dados do usuário:', error);
          // Limpa o token inválido
          localStorage.removeItem(ACCESS_TOKEN);
          navigate('/login');
        }
      }
    };

    fetchUserData();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: collapsed ? 80 : 300,
        breakpoint: 'sm',
        collapsed: { mobile: !opened }
      }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Text size="lg" fw={700}>Sistema de Laudos</Text>
            <Tooltip label={collapsed ? "Expandir sidebar" : "Recolher sidebar"}>
              <ActionIcon
                variant="subtle"
                onClick={toggleCollapsed}
                visibleFrom="sm"
                size="lg"
              >
                {collapsed ? <IconChevronRight size={20} /> : <IconChevronLeft size={20} />}
              </ActionIcon>
            </Tooltip>
          </Group>

          <Group>
            <Text><strong>Bem-vindo(a)</strong>, {username || 'Usuário'}</Text>
            <Button
              variant="subtle"
              onClick={handleLogout}
              leftSection={<IconLogout size={20} />}
            >
              Sair
            </Button>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p={collapsed ? "xs" : "md"}>
        {collapsed ? (
          // Versão recolhida - apenas ícones
          <Group direction="column" gap="xs" align="center">
            <Tooltip label="Modelos de Laudos" position="right">
              <ActionIcon
                variant="subtle"
                size="lg"
                onClick={() => navigate('/modelos')}
              >
                <IconFileText size={20} />
              </ActionIcon>
            </Tooltip>

            <Tooltip label="Frases" position="right">
              <ActionIcon
                variant="subtle"
                size="lg"
                onClick={() => navigate('/frases')}
              >
                <IconQuote size={20} />
              </ActionIcon>
            </Tooltip>

            <Tooltip label="Variáveis" position="right">
              <ActionIcon
                variant="subtle"
                size="lg"
                onClick={() => navigate('/variaveis')}
              >
                <IconVariable size={20} />
              </ActionIcon>
            </Tooltip>

            <Tooltip label="Laudos" position="right">
              <ActionIcon
                variant="subtle"
                size="lg"
                onClick={() => navigate('/laudos')}
              >
                <IconReport size={20} />
              </ActionIcon>
            </Tooltip>

            <Tooltip label="Transferir Frases entre Modelos" position="right">
              <ActionIcon
                variant="subtle"
                size="lg"
                onClick={() => navigate('/transferir-frases')}
              >
                <IconTransfer size={20} />
              </ActionIcon>
            </Tooltip>

            <Tooltip label="IA" position="right">
              <ActionIcon
                variant="subtle"
                size="lg"
                onClick={() => navigate('/ia')}
              >
                <IconBrain size={20} />
              </ActionIcon>
            </Tooltip>

            <Tooltip label="Configurações" position="right">
              <ActionIcon
                variant="subtle"
                size="lg"
                onClick={() => navigate('/configuracoes')}
              >
                <IconSettings size={20} />
              </ActionIcon>
            </Tooltip>
          </Group>
        ) : (
          // Versão expandida - com labels
          <>
            <NavLink
              label="Modelos de Laudos"
              leftSection={<IconFileText size={20} />}
              onClick={() => navigate('/modelos')}
            />
            <NavLink
              label="Frases"
              leftSection={<IconQuote size={20} />}
              onClick={() => navigate('/frases')}
            />
            <NavLink
              label="Variáveis"
              leftSection={<IconVariable size={20} />}
              onClick={() => navigate('/variaveis')}
            />
            <NavLink
              label="Laudos"
              leftSection={<IconReport size={20} />}
              onClick={() => navigate('/laudos')}
            />
            <NavLink
              label="Transferir Frases entre Modelos"
              leftSection={<IconTransfer size={20} />}
              onClick={() => navigate('/transferir-frases')}
            />
            <NavLink
              label="IA"
              leftSection={<IconBrain size={20} />}
              onClick={() => navigate('/ia')}
            />
            <NavLink
              label="Configurações"
              leftSection={<IconSettings size={20} />}
              onClick={() => navigate('/configuracoes')}
            />
          </>
        )}
      </AppShell.Navbar>

      <AppShell.Main>
        {children}
      </AppShell.Main>
    </AppShell>
  );
}

export default Layout; 