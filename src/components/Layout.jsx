import { AppShell, Burger, Group, NavLink, Button, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconFileText, IconQuote, IconVariable, IconLogout, IconReport } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { jwtDecode } from "jwt-decode";
import { ACCESS_TOKEN } from '../constants';
import api from '../api';

function Layout({ children }) {
  const [opened, { toggle }] = useDisclosure();
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
        width: 300,
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

      <AppShell.Navbar p="md">
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
      </AppShell.Navbar>

      <AppShell.Main>
        {children}
      </AppShell.Main>
    </AppShell>
  );
}

export default Layout; 