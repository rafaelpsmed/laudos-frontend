import { MultiSelect } from '@mantine/core';
import { useState, useEffect } from 'react';
import api from '../api';

function MetodosSelect({ value, onChange, required = true, label = "Método" }) {
  const [metodos, setMetodos] = useState([]);

  useEffect(() => {
    const fetchMetodos = async () => {
      try {
        const response = await api.get('/api/metodos/');
        const metodosFormatados = response.data.map(metodo => ({
          value: metodo.id.toString(),
          label: metodo.metodo
        }));
        setMetodos(metodosFormatados);
      } catch (error) {
        console.error('Erro ao buscar métodos:', error);
      }
    };

    fetchMetodos();
  }, []);

  return (
    <MultiSelect
      label={label}
      placeholder="Selecione os métodos"
      data={metodos}
      value={value}
      onChange={onChange}
      searchable
      required={required}
      clearable
    />
  );
}

export default MetodosSelect; 