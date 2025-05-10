// import Form from "../components/Form";
import React from 'react';
import { Center } from '@mantine/core';
import LoginForm from '../components/LoginForm';

const Login = () => {
  return (
    // <Container size="xs">
    // <Container size="xl" style={{ marginTop: '2rem' }}>
      <Center style={{ minHeight: '100vh' }}>
        <LoginForm />
      </Center>
    // </Container>
  );
};

export default Login;

{/* <Center style={{ minHeight: '100vh' }}></Center> */}