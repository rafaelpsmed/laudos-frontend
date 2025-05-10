import React, { useState } from 'react';
import {
  TextInput,
  PasswordInput,
  Button,
  Title,
  Container,
  Paper,
  Notification,
  Loader,
  Text,
  Anchor,
  Stack,
  Group,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconCheck, IconX } from '@tabler/icons-react';
import { useNavigate } from "react-router-dom";
import { useAuth } from '../contexts/AuthContext';
import { notifications } from '@mantine/notifications';

// Componente de formulário de login e registro

const LoginForm = ({ title, method }) => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState('');

  const form = useForm({
    initialValues: {
      email: '',
      password: '',
    },
    validate: {
      email: (value) => (/^\S+@\S+$/.test(value) ? null : 'Email inválido'),
      password: (value) => (value.length < 6 ? 'A senha deve ter pelo menos 6 caracteres' : null),
    },
  });

  const handleSubmit = async (values) => {
    setLoading(true);
    setShowError('');

    try {
      const result = await login(values.email, values.password);
      if (result.success) {
        notifications.show({
          title: 'Sucesso',
          message: 'Login realizado com sucesso!',
          color: 'green',
        });
        navigate('/');
      } else {
        setShowError(result.error || 'Erro ao fazer login');
      }
    } catch (err) {
      setShowError('Erro ao fazer login. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size="sm" style={{ marginTop: '2rem' }}>
      <Paper withBorder shadow="md" p="xl" style={{ width: '100%', maxWidth: 600 }}>
        <Stack spacing="xl">
          <Title order={2} align="center" size="h1">{title}</Title>

          {showError && (
            <Notification
              icon={<IconX size="1.1rem" />}
              color="red"
              title="Erro"
              onClose={() => setShowError('')}
              styles={{ root: { marginBottom: '1rem' } }}
            >
              {showError}
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

              <Group position="apart" mt="xl">
                <Anchor component="button" type="button" color="dimmed" size="xs">
                  Esqueceu a senha?
                </Anchor>
                <Button 
                  type="submit" 
                  loading={loading} 
                  fullWidth 
                  size="lg"
                  mt="xl"
                >
                  Entrar
                </Button>
              </Group>
            </Stack>
          </form>
        </Stack>
      </Paper>
    </Container>
  );
};

export default LoginForm;


// function Form({ route, method }) {
//     const [username, setUsername] = useState("");
//     const [password, setPassword] = useState("");
//     const [loading, setLoading] = useState(false);
//     const navigate = useNavigate();

//     const name = method === "login" ? "Login" : "Register";

//     const handleSubmit = async (e) => {
//         setLoading(true);
//         e.preventDefault();

//         try {
//             const res = await api.post(route, { username, password })
//             if (method === "login") {
//                 localStorage.setItem(ACCESS_TOKEN, res.data.access);
//                 localStorage.setItem(REFRESH_TOKEN, res.data.refresh);
//                 navigate("/")
//             } else {
//                 navigate("/login")
//             }
//         } catch (error) {
//             alert(error)
//         } finally {
//             setLoading(false)
//         }
//     };




// const LoginForm = () => {
//   // Estado para feedback de sucesso/erro
//   const [showSuccess, setShowSuccess] = useState(false);
//   const [showError, setShowError] = useState(false);

//   // Configuração do formulário com validação
//   const form = useForm({
//     initialValues: {
//       username: '',
//       email: '',
//       password: '',
//     },

//     validate: {
//       username: (value) =>
//         value.trim().length < 3 ? 'O nome de usuário deve ter pelo menos 3 caracteres' : null,
//       email: (value) => (/^\S+@\S+$/.test(value) ? null : 'Email inválido'),
//       password: (value) =>
//         value.length < 6 ? 'A senha deve ter pelo menos 6 caracteres' : null,
//     },
//   });

//   // Função para lidar com o envio do formulário
//   const handleSubmit = (values) => {
//     console.log('Dados do formulário:', values);

//     // Simulação de sucesso/erro no login
//     if (values.username === 'admin' && values.password === 'password') {
//       setShowSuccess(true);
//       setShowError(false);
//     } else {
//       setShowError(true);
//       setShowSuccess(false);
//     }
//   };

//   return (
//     <Container size="xs" style={{ marginTop: '2rem' }}>
//       <Title align="center" mb="md">
//         Login
//       </Title>

//       <Paper withBorder shadow="md" p="md">
//         <form onSubmit={form.onSubmit(handleSubmit)}>
//           {/* Campo de usuário */}
//           <TextInput
//             label="Usuário"
//             placeholder="Digite seu nome de usuário"
//             required
//             {...form.getInputProps('username')}
//           />

//           {/* Campo de email */}
//           <TextInput
//             label="Email"
//             placeholder="Digite seu email"
//             required
//             mt="md"
//             {...form.getInputProps('email')}
//           />

//           {/* Campo de senha */}
//           <PasswordInput
//             label="Senha"
//             placeholder="Digite sua senha"
//             required
//             mt="md"
//             {...form.getInputProps('password')}
//           />

//           {/* Botão de envio */}
//           <Button fullWidth mt="xl" type="submit">
//             Entrar
//           </Button>
//         </form>
//       </Paper>

//       {/* Notificação de sucesso */}
//       {showSuccess && (
//         <Notification
//           icon={<IconCheck size="1.1rem" />}
//           color="teal"
//           title="Sucesso!"
//           mt="md"
//           onClose={() => setShowSuccess(false)}
//         >
//           Login realizado com sucesso!
//         </Notification>
//       )}

//       {/* Notificação de erro */}
//       {showError && (
//         <Notification
//           icon={<IconX size="1.1rem" />}
//           color="red"
//           title="Erro"
//           mt="md"
//           onClose={() => setShowError(false)}
//         >
//           Usuário ou senha incorretos.
//         </Notification>
//       )}
//     </Container>
//   );
// };

// export default LoginForm;


// import React, { useState } from 'react';
// import {
//   TextInput,
//   PasswordInput,
//   Button,
//   Title,
//   Container,
//   Paper,
//   Notification,
//   Loader,
// } from '@mantine/core';
// import { useForm } from '@mantine/form';
// import { IconCheck, IconX } from '@tabler/icons-react';
// import { useNavigate } from 'react-router-dom';
// import api from './api'; // Importe sua instância do axios (api)
// import { ACCESS_TOKEN, REFRESH_TOKEN } from './constants'; // Constantes para os tokens

