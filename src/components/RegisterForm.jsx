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

const RegisterForm = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const form = useForm({
    initialValues: {
      email: '',
      password: '',
      confirm_password: '',
      nome_completo: '',
      telefone: '',
    },
    validate: {
      email: (value) => (/^\S+@\S+$/.test(value) ? null : 'Email inválido'),
      password: (value) => (value.length < 6 ? 'Senha deve ter pelo menos 6 caracteres' : null),
      confirm_password: (value, values) => 
        value !== values.password ? 'As senhas não coincidem' : null,
      nome_completo: (value) => (value.length < 3 ? 'Nome deve ter pelo menos 3 caracteres' : null),
      telefone: (value) => (value.length < 10 ? 'Telefone inválido' : null),
    },
  });

  const handleSubmit = async (values) => {
    setLoading(true);
    setShowError(false);
    setShowSuccess(false);

    try {
      const result = await register(values);
      
      if (result.success) {
        setShowSuccess(true);
        setTimeout(() => {
          navigate('/login');
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
          <Title order={2} align="center" size="h1">Registro</Title>

          {showSuccess && (
            <Notification
              icon={<IconCheck size="1.1rem" />}
              color="teal"
              title="Sucesso!"
              onClose={() => setShowSuccess(false)}
              styles={{ root: { marginBottom: '1rem' } }}
            >
              Registro realizado com sucesso!
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

              <TextInput
                label="Nome Completo"
                placeholder="Seu nome completo"
                size="md"
                {...form.getInputProps('nome_completo')}
              />

              <TextInput
                label="Telefone"
                placeholder="(00) 00000-0000"
                size="md"
                {...form.getInputProps('telefone')}
              />

              <PasswordInput
                label="Senha"
                placeholder="Sua senha"
                size="md"
                {...form.getInputProps('password')}
              />

              <PasswordInput
                label="Confirmar Senha"
                placeholder="Confirme sua senha"
                size="md"
                {...form.getInputProps('confirm_password')}
              />

              <Button 
                type="submit" 
                loading={loading} 
                fullWidth 
                size="lg"
                mt="xl"
              >
                Registrar
              </Button>

              <Text align="center" size="md" mt="xl">
                Já tem uma conta? <Anchor onClick={() => navigate('/login')}>Faça login</Anchor>
              </Text>
            </Stack>
          </form>
        </Stack>
      </Paper>
    </Container>
  );
};

export default RegisterForm; 