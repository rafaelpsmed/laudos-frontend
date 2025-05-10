import { Combobox, useCombobox, InputBase, Input } from '@mantine/core';
import { useState, useEffect } from 'react';

function ComboboxAutocomplete({ 
  label, 
  placeholder, 
  data, 
  value, 
  onChange,
  required = false,
  disabled = false
}) {
  const combobox = useCombobox({
    onDropdownClose: () => {
      combobox.resetSelectedOption();
    },
  });

  const [search, setSearch] = useState('');

  const filteredOptions = data.filter((item) =>
    item.label.toLowerCase().includes(search.toLowerCase().trim())
  );

  return (
    <Combobox
      store={combobox}
      onOptionSubmit={(val) => {
        onChange(val);
        combobox.closeDropdown();
      }}
    >
      <Combobox.Target>
        <InputBase
          label={label}
          placeholder={placeholder}
          value={value}
          onChange={(event) => {
            onChange(event.currentTarget.value);
            setSearch(event.currentTarget.value);
          }}
          onClick={() => combobox.openDropdown()}
          onFocus={() => combobox.openDropdown()}
          onBlur={() => {
            setTimeout(() => combobox.closeDropdown(), 200);
          }}
          rightSection={<Combobox.Chevron />}
          required={required}
          disabled={disabled}
        />
      </Combobox.Target>

      <Combobox.Dropdown>
        <Combobox.Search
          value={search}
          onChange={(event) => setSearch(event.currentTarget.value)}
          placeholder="Buscar..."
        />
        <Combobox.Options>
          {filteredOptions.length === 0 ? (
            <Combobox.Empty>Nenhum resultado encontrado</Combobox.Empty>
          ) : (
            filteredOptions.map((item) => (
              <Combobox.Option value={item.value} key={item.value}>
                {item.label}
              </Combobox.Option>
            ))
          )}
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
}

export default ComboboxAutocomplete; 