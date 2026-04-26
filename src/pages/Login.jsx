// import Form from "../components/Form";
import React from 'react';
import { Box, Center } from '@mantine/core';
import LoginForm from '../components/LoginForm';
import { ColorSchemeToggle } from '../components/ColorSchemeToggle';

const Login = () => {
  return (
      <Center style={{ minHeight: '100vh', position: 'relative' }}>
        <Box pos="absolute" top={16} right={16} style={{ zIndex: 1 }}>
          <ColorSchemeToggle />
        </Box>
        <LoginForm />
      </Center>
    // </Container>
  );
};

export default Login;

{/* <Center style={{ minHeight: '100vh' }}></Center> */}