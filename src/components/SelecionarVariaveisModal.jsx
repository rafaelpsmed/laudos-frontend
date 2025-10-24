import { Modal, Stack, Text, Checkbox, Group, Button, TextInput, Radio, Select, MultiSelect, Divider } from '@mantine/core';
import { useState, useEffect } from 'react';
import api from '../api';
import ComboboxAutocomplete from './componentesVariaveisModal/ComboboxAutocomplete';

function SelecionarVariaveisModal({ opened, onClose, variaveis, gruposOpcoes, elementosOrdenados, onConfirm, tituloFrase, temMedida }) {
  const [valoresSelecionados, setValoresSelecionados] = useState({});
  const [variaveisDetalhes, setVariaveisDetalhes] = useState([]);
  const [medida, setMedida] = useState('');
  const [opcoesRadio, setOpcoesRadio] = useState({});
  const [variaveisPorInstancia, setVariaveisPorInstancia] = useState({}); // Estado para controlar cada instância separadamente
  const [contagemVariaveis, setContagemVariaveis] = useState({}); // Para contar ocorrências de cada variável

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
    // console.log('temMedida:', temMedida);
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
        const variaveisInstanciaIniciais = {};

        // Conta quantas vezes cada variável aparece
        const contagemVariaveisTemp = {};
        elementosOrdenados.forEach(elemento => {
          if (elemento.tipo === 'variavel') {
            const titulo = elemento.dados.tituloVariavel;
            contagemVariaveisTemp[titulo] = (contagemVariaveisTemp[titulo] || 0) + 1;
          }
        });
        setContagemVariaveis(contagemVariaveisTemp);

        // Para cada variável, verifica se ela aparece múltiplas vezes
        detalhes.forEach(variavel => {
          const titulo = variavel.tituloVariavel;
          const aparicoes = contagemVariaveisTemp[titulo] || 1;

          if (aparicoes > 1) {
            // Se aparece múltiplas vezes, cria estados separados para cada instância
            for (let i = 0; i < aparicoes; i++) {
              const instanciaId = `${titulo}_${i}`;
              if (escolhasSalvas[instanciaId] !== undefined) {
                if (variavel.variavel.tipo === "Grupo de Checkbox" || variavel.variavel.tipo === "Combobox com múltiplas opções") {
                  valoresIniciais[instanciaId] = Array.isArray(escolhasSalvas[instanciaId])
                    ? escolhasSalvas[instanciaId]
                    : [];
                } else {
                  valoresIniciais[instanciaId] = escolhasSalvas[instanciaId];
                }
              } else {
                valoresIniciais[instanciaId] = variavel.variavel.tipo.includes('múltiplas') ? [] : '';
              }
              variaveisInstanciaIniciais[instanciaId] = variavel;
            }
          } else {
            // Se aparece apenas uma vez, usa o comportamento normal
            if (escolhasSalvas[variavel.id] !== undefined) {
              if (variavel.variavel.tipo === "Grupo de Checkbox" || variavel.variavel.tipo === "Combobox com múltiplas opções") {
                valoresIniciais[variavel.id] = Array.isArray(escolhasSalvas[variavel.id])
                  ? escolhasSalvas[variavel.id]
                  : [];
              } else {
                valoresIniciais[variavel.id] = escolhasSalvas[variavel.id];
              }
            } else {
              valoresIniciais[variavel.id] = variavel.variavel.tipo.includes('múltiplas') ? [] : '';
            }
          }
        });

        setValoresSelecionados(valoresIniciais);
        setVariaveisPorInstancia(variaveisInstanciaIniciais);
      } catch (error) {
        console.error('Erro ao buscar detalhes das variáveis:', error);
      }
    };

    if (opened && variaveis.length > 0) {
      buscarDetalhesVariaveis();
    }
  }, [opened, variaveis, elementosOrdenados]);

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

  // Função auxiliar para renderizar controles de variável por instância
  const renderControleInstancia = (variavel, instanciaId, tituloBase) => {
    const tipo = variavel.variavel.tipo;

    const valores = variavel.variavel.valores.map(v => ({
      value: v.valor,
      label: v.descricao
    }));

    const value = valoresSelecionados[instanciaId] || '';

    if (tipo === "Combobox") {
      return (
        <ComboboxAutocomplete
          label={`${tituloBase} (instância ${instanciaId.split('_')[1]})`}
          placeholder="Selecione um valor"
          data={valores}
          value={value}
          onChange={(value) => handleChange(instanciaId, value)}
        />
      );
    } else if (tipo === "Grupo de Radio") {
      return (
        <Stack>
          <Text size="sm" fw={500}>{`${tituloBase} (instância ${instanciaId.split('_')[1]})`}</Text>
          <Radio.Group
            value={value}
            onChange={(value) => handleChange(instanciaId, value)}
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
          <Text size="sm" fw={500}>{`${tituloBase} (instância ${instanciaId.split('_')[1]})`}</Text>
          <Checkbox.Group
            value={Array.isArray(value) ? value : []}
            onChange={(value) => handleChange(instanciaId, value)}
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
          <Text size="sm" fw={500}>{`${tituloBase} (instância ${instanciaId.split('_')[1]})`}</Text>
          <MultiSelect
            label=""
            placeholder="Selecione os valores"
            data={valores}
            value={Array.isArray(value) ? value : []}
            onChange={(value) => handleChange(instanciaId, value)}
            searchable
            required={false}
            clearable
          />
        </Stack>
      );
    }
  };

  const handleConfirm = () => {
    const resultado = {};

    // Conta quantas vezes cada variável aparece
    const contagemVariaveis = {};
    elementosOrdenados.forEach(elemento => {
      if (elemento.tipo === 'variavel') {
        const titulo = elemento.dados.tituloVariavel;
        contagemVariaveis[titulo] = (contagemVariaveis[titulo] || 0) + 1;
      }
    });

    // Processa cada variável considerando se ela aparece múltiplas vezes
    variaveisDetalhes.forEach(variavel => {
      const titulo = variavel.tituloVariavel;
      const aparicoes = contagemVariaveis[titulo] || 1;

      if (aparicoes > 1) {
        // Se aparece múltiplas vezes, processa cada instância separadamente
        for (let i = 0; i < aparicoes; i++) {
          const instanciaId = `${titulo}_${i}`;
          const valorSelecionado = valoresSelecionados[instanciaId];

          if (variavel.variavel.tipo === "Grupo de Checkbox" || variavel.variavel.tipo === "Combobox com múltiplas opções") {
            const valores = Array.isArray(valorSelecionado) ? valorSelecionado : [];
            const valoresTexto = valores.map(val => {
              const valorEncontrado = variavel.variavel.valores.find(v => v.valor === val);
              return valorEncontrado ? valorEncontrado.valor : val;
            });

            if (valoresTexto.length > 0) {
              const delimitador = variavel.variavel.delimitador || ', ';
              const ultimoDelimitador = variavel.variavel.ultimoDelimitador || ' e ';

              if (valoresTexto.length === 1) {
                resultado[instanciaId] = valoresTexto[0];
              } else {
                const ultimoValor = valoresTexto.pop();
                resultado[instanciaId] = valoresTexto.join(delimitador) + ultimoDelimitador + ultimoValor;
              }
            } else {
              resultado[instanciaId] = '';
            }
          } else {
            const valorEncontrado = variavel.variavel.valores.find(v => v.valor === valorSelecionado);
            resultado[instanciaId] = valorEncontrado ? valorEncontrado.valor : valorSelecionado;
          }
        }
      } else {
        // Se aparece apenas uma vez, usa o comportamento normal
        const valorSelecionado = valoresSelecionados[variavel.id];

        if (variavel.variavel.tipo === "Grupo de Checkbox" || variavel.variavel.tipo === "Combobox com múltiplas opções") {
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
          const valorEncontrado = variavel.variavel.valores.find(v => v.valor === valorSelecionado);
          resultado[variavel.tituloVariavel] = valorEncontrado ? valorEncontrado.valor : valorSelecionado;
        }
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
        {/* Renderiza elementos na ordem que aparecem no texto */}
        {elementosOrdenados && elementosOrdenados.map((elemento, index) => {
          if (elemento.tipo === 'grupo') {
            return (
              <Stack key={`grupo_${index}`} spacing="xs">
                <Text size="sm" fw={500}>Grupo de opções {index + 1}:</Text>
                {/* <Text size="xs" c="dimmed" style={{ fontFamily: 'monospace', backgroundColor: '#f1f3f5', padding: '4px 8px', borderRadius: '4px' }}>
                  {elemento.dados.textoOriginal}
                </Text> */}
                <Radio.Group
                  value={opcoesRadio[`grupo_${index}`] || elemento.dados.opcoes[0]}
                  onChange={(value) => setOpcoesRadio(prev => ({
                    ...prev,
                    [`grupo_${index}`]: value
                  }))}
                >
                  <Stack mt="xs" spacing="xs">
                    {elemento.dados.opcoes.map((opcao) => (
                      <Radio
                        key={opcao}
                        value={opcao}
                        label={opcao}
                      />
                    ))}
                  </Stack>
                </Radio.Group>
                {/* <Divider my="xs" /> */}
              </Stack>
            );
          } else if (elemento.tipo === 'medida') {
            return (
              <TextInput
                key={`medida_${index}`}
                label="Medida"
                value={medida}
                onChange={(event) => setMedida(event.currentTarget.value)}
                placeholder="Digite a medida"
              />
            );
          } else if (elemento.tipo === 'variavel') {
            // Encontra os detalhes da variável
            const variavelDetalhes = variaveisDetalhes.find(v => v.id === elemento.dados.id);
            if (variavelDetalhes) {
              const titulo = elemento.dados.tituloVariavel;
              const aparicoes = contagemVariaveis[titulo] || 1;

              if (aparicoes > 1) {
                // Se aparece múltiplas vezes, encontra qual instância renderizar
                // Encontra a posição desta variável entre as ocorrências
                let posicao = 0;
                for (let i = 0; i < elementosOrdenados.length; i++) {
                  const el = elementosOrdenados[i];
                  if (el.tipo === 'variavel' && el.dados.tituloVariavel === titulo) {
                    if (el === elemento) break;
                    posicao++;
                  }
                }

                const instanciaId = `${titulo}_${posicao}`;
                const variavelInstancia = variaveisPorInstancia[instanciaId];

                if (variavelInstancia) {
                  return (
                    <div key={`variavel_${index}`}>
                      {renderControleInstancia(variavelInstancia, instanciaId, titulo)}
                    </div>
                  );
                }
              } else {
                // Se aparece apenas uma vez, usa o comportamento normal
                return (
                  <div key={`variavel_${index}`}>
                    {renderControle(variavelDetalhes)}
                  </div>
                );
              }
            }
          }
          return null;
        })}

        <Group position="right" mt="md">
          <Button onClick={handleConfirm}>Confirmar</Button>
        </Group>
      </Stack>
    </Modal>
  );
}

export default SelecionarVariaveisModal; 

