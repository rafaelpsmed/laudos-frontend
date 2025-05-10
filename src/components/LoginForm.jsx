import React, { useState } from 'react';
import {
  TextInput,
  PasswordInput,
  Button,
  Title,
  Container,
  Paper,
  Notification,
  Stack,
  Text,
  Anchor,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconCheck, IconX } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const LoginForm = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const form = useForm({
    initialValues: {
      email: '',
      password: '',
    },
    validate: {
      email: (value) => (/^\S+@\S+$/.test(value) ? null : 'Email inválido'),
      password: (value) => (value.length < 6 ? 'Senha deve ter pelo menos 6 caracteres' : null),
    },
  });

  const handleSubmit = async (values) => {
    setLoading(true);
    setShowError(false);
    setShowSuccess(false);

    try {
      const result = await login(values.email, values.password);
      
      if (result.success) {
        setShowSuccess(true);
        setTimeout(() => {
          navigate('/');
        }, 1000);
      } else {
        setErrorMessage(result.error);
        setShowError(true);
      }
    } catch (error) {
      setErrorMessage('Erro ao processar a requisição');
      setShowError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size="sm" style={{ marginTop: '2rem' }}>
      <Paper withBorder shadow="md" p="xl" style={{ width: '100%', maxWidth: 600 }}>
        <Stack spacing="xl">
          <Title order={2} align="center" size="h1">Login</Title>

          {showSuccess && (
            <Notification
              icon={<IconCheck size="1.1rem" />}
              color="teal"
              title="Sucesso!"
              onClose={() => setShowSuccess(false)}
              styles={{ root: { marginBottom: '1rem' } }}
            >
              Login realizado com sucesso!
            </Notification>
          )}

          {showError && (
            <Notification
              icon={<IconX size="1.1rem" />}
              color="red"
              title="Erro"
              onClose={() => setShowError(false)}
              styles={{ root: { marginBottom: '1rem' } }}
            >
              {errorMessage}
            </Notification>
          )}

          <form onSubmit={form.onSubmit(handleSubmit)}>
            <Stack spacing="xl">
              <TextInput
                label="Email"
                placeholder="seu@email.com"
                size="md"
                {...form.getInputProps('email')}
              />

              <PasswordInput
                label="Senha"
                placeholder="Sua senha"
                size="md"
                {...form.getInputProps('password')}
              />

              <Button 
                type="submit" 
                loading={loading} 
                fullWidth 
                size="lg"
                mt="xl"
              >
                Entrar
              </Button>

              <Text align="center" size="md" mt="xl">
                Não tem uma conta? <Anchor onClick={() => navigate('/register')}>Registre-se</Anchor>
              </Text>
            </Stack>
          </form>
        </Stack>
      </Paper>
    </Container>
  );
};

export default LoginForm; 