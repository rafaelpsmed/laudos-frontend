import React from 'react';
import { Box, Center } from '@mantine/core';
import RegisterForm from '../components/RegisterForm';
import { ColorSchemeToggle } from '../components/ColorSchemeToggle';

const Register = () => {
  return (
    <Center style={{ minHeight: '100vh', position: 'relative' }}>
      <Box pos="absolute" top={16} right={16} style={{ zIndex: 1 }}>
        <ColorSchemeToggle />
      </Box>
      <RegisterForm />
    </Center>
  );
};

export default Register;