import { Combobox, Input, useCombobox } from '@mantine/core';
import { useEffect } from 'react';
import api from '../api';

function TituloCombobox({ 
  value, 
  onChange, 
  metodosSelected, 
  onTituloSelect,
  titulosDisponiveis,
  setTitulosDisponiveis,
  required = true 
}) {
  const combobox = useCombobox();

  useEffect(() => {
    const fetchTitulos = async () => {
      try {
        // console.log('Buscando títulos com métodos:', metodosSelected);
        const response = await api.get('/api/modelo_laudo/');
        // console.log('Resposta da API:', response.data);
        
        if (metodosSelected && metodosSelected.length > 0) {
          // Filtra os títulos pelos métodos selecionados
          const modelosFiltrados = response.data.filter(modelo => 
            metodosSelected.includes(modelo.metodo.toString())
          );
          // console.log('Modelos filtrados:', modelosFiltrados);
          setTitulosDisponiveis(modelosFiltrados);
        } else {
          // Se não há método selecionado, mostra todos os modelos
          setTitulosDisponiveis(response.data);
        }
      } catch (error) {
        console.error('Erro ao buscar títulos:', error);
        console.error('Detalhes do erro:', error.response?.data);
      }
    };

    fetchTitulos();
  }, [metodosSelected, setTitulosDisponiveis]);

  const handleTituloSelect = (selectedTitulo) => {
    // console.log('Título selecionado:', selectedTitulo);
    onChange(selectedTitulo);
    onTituloSelect(selectedTitulo);
    combobox.closeDropdown();
  };

  return (
    <Combobox
      store={combobox}
      onOptionSubmit={handleTituloSelect}
    >
      <Combobox.Target>
        <Input.Wrapper label="Título do Modelo" required={required}>
          <Input
            placeholder="Digite o título do modelo"
            value={value}
            onChange={(event) => onChange(event.currentTarget.value)}
            onClick={() => combobox.openDropdown()}
            rightSection={<Combobox.Chevron />}
          />
        </Input.Wrapper>
      </Combobox.Target>

      <Combobox.Dropdown>
        <Combobox.Options>
          {titulosDisponiveis.map((item) => (
            <Combobox.Option key={item.id} value={item.titulo}>
              {item.titulo}
            </Combobox.Option>
          ))}
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
}

export default TituloCombobox; 