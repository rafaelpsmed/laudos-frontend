import { Combobox, Input, useCombobox } from '@mantine/core';
import { useState, useEffect } from 'react';
import api from '../api';

function VariaveisCombobox({ value, onChange, label = "Variáveis" }) {
  const [variaveis, setVariaveis] = useState([]);
  const [search, setSearch] = useState('');
  const combobox = useCombobox();

  useEffect(() => {
    const fetchVariaveis = async () => {
      try {
        const response = await api.get('/api/variaveis/');
        const variaveisFormatadas = response.data.map(variavel => ({
          value: variavel.id.toString(),
          label: variavel.tituloVariavel,
          dados: variavel
        }));
        setVariaveis(variaveisFormatadas);
      } catch (error) {
        console.error('Erro ao buscar variáveis:', error);
      }
    };

    fetchVariaveis();
  }, []);

  const handleSelect = (val) => {
    const variavelSelecionada = variaveis.find(v => v.value === val);
    if (variavelSelecionada) {
      onChange(variavelSelecionada.dados);
      setSearch(variavelSelecionada.label);
    }
    combobox.closeDropdown();
  };

  const selectedVariavel = variaveis.find(v => v.dados?.id?.toString() === value?.id?.toString());

  const handleInputChange = (value) => {
    setSearch(value);
    const searchTerm = value.toLowerCase();
    const found = variaveis.find(v => v.label.toLowerCase() === searchTerm);
    
    if (found) {
      onChange(found.dados);
    } else {
      // Se não encontrou, cria um novo objeto com o título digitado
      onChange({
        tituloVariavel: value,
        id: null,
        variavel: {
          tipo: '',
          valores: []
        }
      });
    }
  };

  return (
    <Combobox
      store={combobox}
      onOptionSubmit={handleSelect}
    >
      <Combobox.Target>
        <Input.Wrapper label={label}>
          <Input
            placeholder="Digite ou selecione uma variável"
            value={search || selectedVariavel?.label || ''}
            onChange={(event) => handleInputChange(event.currentTarget.value)}
            onClick={() => combobox.openDropdown()}
            rightSection={<Combobox.Chevron />}
          />
        </Input.Wrapper>
      </Combobox.Target>

      <Combobox.Dropdown>
        <Combobox.Options>
          {variaveis
            .filter(variavel => 
              variavel.label.toLowerCase().includes(search.toLowerCase())
            )
            .map((variavel) => (
              <Combobox.Option key={variavel.value} value={variavel.value}>
                {variavel.label}
              </Combobox.Option>
            ))}
          {search && !variaveis.find(v => v.label.toLowerCase() === search.toLowerCase()) && (
            <Combobox.Option value={search}>
              + Criar nova variável "{search}"
            </Combobox.Option>
          )}
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
}

export default VariaveisCombobox; 