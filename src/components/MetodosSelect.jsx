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

  // Garante que value seja sempre um array de strings válidas
  const safeValue = Array.isArray(value) 
    ? value.filter(v => v !== null && v !== undefined && v !== '')
    : [];

  return (
    <MultiSelect
      label={label}
      placeholder="Selecione os métodos"
      data={metodos}
      value={safeValue}
      onChange={onChange}
      searchable
      required={required}
      clearable
    />
  );
}

export default MetodosSelect; 