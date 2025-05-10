import React from 'react';
import { Center } from '@mantine/core';
import RegisterForm from '../components/RegisterForm';

const Register = () => {
  return (
    <Center style={{ minHeight: '100vh' }}>
      <RegisterForm />
    </Center>
  );
};

export default Register;