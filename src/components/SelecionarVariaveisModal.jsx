import { Modal, Stack, Text, Checkbox, Group, Button, TextInput, Radio, Select, MultiSelect, Divider } from '@mantine/core';
import { useState, useEffect } from 'react';
import api from '../api';
import ComboboxAutocomplete from './componentesVariaveisModal/ComboboxAutocomplete';

function SelecionarVariaveisModal({ opened, onClose, variaveis, gruposOpcoes, onConfirm, tituloFrase, temMedida }) {
  const [valoresSelecionados, setValoresSelecionados] = useState({});
  const [variaveisDetalhes, setVariaveisDetalhes] = useState([]);
  const [medida, setMedida] = useState('');
  const [opcoesRadio, setOpcoesRadio] = useState({});

  // Função para salvar as escolhas no localStorage
  const salvarEscolhas = (valores) => {
    try {
      localStorage.setItem('variaveisSelecionadas', JSON.stringify(valores));
    } catch (error) {
      console.error('Erro ao salvar escolhas:', error);
    }
  };

  // Função para carregar as escolhas do localStorage
  const carregarEscolhas = () => {
    try {
      const escolhasSalvas = localStorage.getItem('variaveisSelecionadas');
      return escolhasSalvas ? JSON.parse(escolhasSalvas) : {};
    } catch (error) {
      console.error('Erro ao carregar escolhas:', error);
      return {};
    }
  };

  useEffect(() => {
    console.log('temMedida:', temMedida);
    const buscarDetalhesVariaveis = async () => {
      try {
        const detalhes = await Promise.all(
          variaveis.map(async (variavel) => {
            const response = await api.get(`/api/variaveis/${variavel.id}/`);
            return response.data;
          })
        );
        setVariaveisDetalhes(detalhes);
        
        // Carrega as escolhas salvas
        const escolhasSalvas = carregarEscolhas();
        
        // Inicializa o estado dos valores selecionados
        const valoresIniciais = {};
        detalhes.forEach(variavel => {
          // Se existe uma escolha salva para esta variável, usa ela
          if (escolhasSalvas[variavel.id] !== undefined) {
            // Garante que o valor seja um array para controles de múltipla seleção
            if (variavel.variavel.tipo === "Grupo de Checkbox" || variavel.variavel.tipo === "Combobox com múltiplas opções") {
              valoresIniciais[variavel.id] = Array.isArray(escolhasSalvas[variavel.id]) 
                ? escolhasSalvas[variavel.id] 
                : [];
            } else {
              valoresIniciais[variavel.id] = escolhasSalvas[variavel.id];
            }
          } else {
            // Caso contrário, inicializa com valor padrão
            valoresIniciais[variavel.id] = variavel.variavel.tipo.includes('múltiplas') ? [] : '';
          }
        });
        setValoresSelecionados(valoresIniciais);
      } catch (error) {
        console.error('Erro ao buscar detalhes das variáveis:', error);
      }
    };

    if (opened && variaveis.length > 0) {
      buscarDetalhesVariaveis();
    }
  }, [opened, variaveis]);

  useEffect(() => {
    if (opened) {
      // Inicializa os estados dos radio buttons para cada grupo de opções
      if (gruposOpcoes && gruposOpcoes.length > 0) {
        const estadosIniciais = {};
        gruposOpcoes.forEach((grupo, index) => {
          estadosIniciais[`grupo_${index}`] = grupo.opcoes[0]; // Seleciona primeira opção por padrão
        });
        setOpcoesRadio(estadosIniciais);
      }
    }
  }, [opened, gruposOpcoes]);

  const handleChange = (variavelId, valor) => {
    const novosValores = {
      ...valoresSelecionados,
      [variavelId]: valor
    };
    setValoresSelecionados(novosValores);
    // Salva as escolhas no localStorage
    salvarEscolhas(novosValores);
  };

  const handleConfirm = () => {
    const resultado = {};
    variaveisDetalhes.forEach(variavel => {
      const valorSelecionado = valoresSelecionados[variavel.id];
      
      if (variavel.variavel.tipo === "Grupo de Checkbox" || variavel.variavel.tipo === "Combobox com múltiplas opções") {
        // Para controles de múltipla seleção
        const valores = Array.isArray(valorSelecionado) ? valorSelecionado : [];
        const valoresTexto = valores.map(val => {
          const valorEncontrado = variavel.variavel.valores.find(v => v.valor === val);
          return valorEncontrado ? valorEncontrado.valor : val;
        });

        if (valoresTexto.length > 0) {
          const delimitador = variavel.variavel.delimitador || ', ';
          const ultimoDelimitador = variavel.variavel.ultimoDelimitador || ' e ';
          
          if (valoresTexto.length === 1) {
            resultado[variavel.tituloVariavel] = valoresTexto[0];
          } else {
            const ultimoValor = valoresTexto.pop();
            resultado[variavel.tituloVariavel] = valoresTexto.join(delimitador) + ultimoDelimitador + ultimoValor;
          }
        } else {
          resultado[variavel.tituloVariavel] = '';
        }
      } else {
        // Para controles de seleção única
        const valorEncontrado = variavel.variavel.valores.find(v => v.valor === valorSelecionado);
        resultado[variavel.tituloVariavel] = valorEncontrado ? valorEncontrado.valor : valorSelecionado;
      }
    });

    // Adiciona a medida ao resultado se existir
    if (temMedida && medida.trim()) {
      resultado['$'] = medida.trim();
    }

    // Adiciona as opções selecionadas dos grupos de radio
    if (gruposOpcoes) {
      gruposOpcoes.forEach((grupo, index) => {
        resultado[grupo.textoOriginal] = opcoesRadio[`grupo_${index}`] || grupo.opcoes[0];
      });
    }

    onConfirm(resultado);
    onClose();
  };

  const renderControle = (variavel) => {
    const tipo = variavel.variavel.tipo;
    
    const valores = variavel.variavel.valores.map(v => ({
      value: v.valor,
      label: v.descricao
    }));

    if (tipo === "Combobox") {
      return (
        <ComboboxAutocomplete
          label={variavel.tituloVariavel}
          placeholder="Selecione um valor"
          data={valores}
          value={valoresSelecionados[variavel.id] || ''}
          onChange={(value) => handleChange(variavel.id, value)}
        />
      );
    } else if (tipo === "Grupo de Radio") {
      return (
        <Stack>
          <Text size="sm" fw={500}>{variavel.tituloVariavel}</Text>
          <Radio.Group
            value={valoresSelecionados[variavel.id] || ''}
            onChange={(value) => handleChange(variavel.id, value)}
          >
            <Stack mt="xs">
              {valores.map((valor) => (
                <Radio
                  key={valor.value}
                  value={valor.value}
                  label={valor.label}
                />
              ))}
            </Stack>
          </Radio.Group>
        </Stack>
      );
    } else if (tipo === "Grupo de Checkbox") {
      return (
        <Stack>
          <Text size="sm" fw={500}>{variavel.tituloVariavel}</Text>
          <Checkbox.Group
            value={valoresSelecionados[variavel.id] || []}
            onChange={(value) => handleChange(variavel.id, value)}
          >
            <Stack mt="xs">
              {valores.map((valor) => (
                <Checkbox
                  key={valor.value}
                  value={valor.value}
                  label={valor.label}
                />
              ))}
            </Stack>
          </Checkbox.Group>
        </Stack>
      );
    } else if (tipo === "Combobox com múltiplas opções") {
      return (
        <Stack>
          <Text size="sm" fw={500}>{variavel.tituloVariavel}</Text>
          <MultiSelect
            label=""
            placeholder="Selecione os valores"
            data={valores}
            value={Array.isArray(valoresSelecionados[variavel.id]) ? valoresSelecionados[variavel.id] : []}
            onChange={(value) => handleChange(variavel.id, value)}
            searchable
            required={false}
            clearable
          />
        </Stack>
      );
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={`Selecionar Valores${tituloFrase ? ` - ${tituloFrase}` : ''}`}
      size="lg"
    >
      <Stack>
        {/* Grupos de opções com radio buttons */}
        {gruposOpcoes && gruposOpcoes.map((grupo, index) => (
          <Stack key={`grupo_${index}`} spacing="xs">
            <Text size="sm" fw={500}>Grupo de opções {index + 1}:</Text>
            <Text size="xs" c="dimmed" style={{ fontFamily: 'monospace', backgroundColor: '#f1f3f5', padding: '4px 8px', borderRadius: '4px' }}>
              {grupo.textoOriginal}
            </Text>
            <Radio.Group
              value={opcoesRadio[`grupo_${index}`] || grupo.opcoes[0]}
              onChange={(value) => setOpcoesRadio(prev => ({
                ...prev,
                [`grupo_${index}`]: value
              }))}
            >
              <Group mt="xs">
                {grupo.opcoes.map((opcao) => (
                  <Radio
                    key={opcao}
                    value={opcao}
                    label={opcao}
                  />
                ))}
              </Group>
            </Radio.Group>
            <Divider my="xs" />
          </Stack>
        ))}

        {/* Campo de medida */}
        {temMedida && (
          <TextInput
            label="Medida"
            value={medida}
            onChange={(event) => setMedida(event.currentTarget.value)}
            placeholder="Digite a medida"
          />
        )}

        {/* Variáveis existentes */}
        {variaveisDetalhes.map((variavel) => (
          <div key={variavel.id}>
            {renderControle(variavel)}
          </div>
        ))}

        <Group position="right" mt="md">
          <Button onClick={handleConfirm}>Confirmar</Button>
        </Group>
      </Stack>
    </Modal>
  );
}

export default SelecionarVariaveisModal; 

