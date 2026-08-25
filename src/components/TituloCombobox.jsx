import { Combobox, Input, useCombobox } from '@mantine/core';
import { useEffect } from 'react';
import api from '../api';

function normalizarTexto(valor) {
  return String(valor || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function TituloCombobox({ 
  value, 
  onChange, 
  metodosSelected, 
  onTituloSelect,
  titulosDisponiveis,
  setTitulosDisponiveis,
  required = true 
}) {
  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
  });

  useEffect(() => {
    const fetchTitulos = async () => {
      try {
        const response = await api.get('/api/modelo_laudo/');
        
        if (metodosSelected && metodosSelected.length > 0) {
          const modelosFiltrados = response.data.filter(modelo => 
            metodosSelected.includes(modelo.metodo.toString())
          );
          setTitulosDisponiveis(modelosFiltrados);
        } else {
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
    onChange(selectedTitulo);
    onTituloSelect(selectedTitulo);
    combobox.closeDropdown();
  };

  const titulos = titulosDisponiveis || [];
  const tituloExatoSelecionado = titulos.some((item) => item.titulo === value);
  const termoBusca = normalizarTexto(value);
  const titulosFiltrados =
    tituloExatoSelecionado || !termoBusca
      ? titulos
      : titulos.filter((item) =>
          normalizarTexto(item.titulo).includes(termoBusca)
        );

  return (
    <Combobox
      store={combobox}
      onOptionSubmit={handleTituloSelect}
    >
      <Combobox.Target>
        <Input.Wrapper label="Título do Modelo" required={required}>
          <Input
            placeholder="Digite para buscar ou criar um título"
            value={value}
            onChange={(event) => {
              onChange(event.currentTarget.value);
              combobox.openDropdown();
              combobox.updateSelectedOptionIndex();
            }}
            onClick={() => combobox.openDropdown()}
            onFocus={() => combobox.openDropdown()}
            rightSection={<Combobox.Chevron />}
          />
        </Input.Wrapper>
      </Combobox.Target>

      <Combobox.Dropdown>
        <Combobox.Options mah={250} style={{ overflowY: 'auto' }}>
          {titulosFiltrados.length > 0 ? (
            titulosFiltrados.map((item) => (
              <Combobox.Option key={item.id} value={item.titulo}>
                {item.titulo}
              </Combobox.Option>
            ))
          ) : (
            <Combobox.Empty>Nenhum modelo encontrado</Combobox.Empty>
          )}
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
}

export default TituloCombobox;
