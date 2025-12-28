import { Modal, Stack, Text, Checkbox, Group, Button, TextInput, Radio, Select, MultiSelect, Divider } from '@mantine/core';
import { useState, useEffect } from 'react';
import api from '../api';
import ComboboxAutocomplete from './componentesVariaveisModal/ComboboxAutocomplete';

function SelecionarVariaveisModal({ opened, onClose, variaveis, gruposOpcoes, elementosOrdenados, onConfirm, tituloFrase, temMedida }) {
  const [valoresSelecionados, setValoresSelecionados] = useState({});
  const [variaveisDetalhes, setVariaveisDetalhes] = useState([]);
  // Uma medida por ocorrência de '$' no texto
  const [medidas, setMedidas] = useState([]);
  const [opcoesRadio, setOpcoesRadio] = useState({});
  const [variaveisPorInstancia, setVariaveisPorInstancia] = useState({}); // Estado para controlar cada instância separadamente
  const [contagemVariaveis, setContagemVariaveis] = useState({}); // Para contar ocorrências de cada variável
  const [todasVariaveisCache, setTodasVariaveisCache] = useState([]); // Cache de todas as variáveis para referências
  const [modalReferenciaAberto, setModalReferenciaAberto] = useState(false);
  const [variavelReferenciadaAtual, setVariavelReferenciadaAtual] = useState(null);
  const [variavelIdOrigem, setVariavelIdOrigem] = useState(null);
  const [valorOrigem, setValorOrigem] = useState(null);
  const [valorReferenciaSelecionado, setValorReferenciaSelecionado] = useState(null);

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

  const quantidadeMedidasNoTexto = (elementosOrdenados || []).filter(e => e.tipo === 'medida').length;

  // Função auxiliar para obter o label de exibição da variável
  const getLabelDisplay = (variavel) => {
    return variavel?.variavel?.label || variavel?.tituloVariavel || '';
  };

  useEffect(() => {
    // console.log('temMedida:', temMedida);
    const buscarDetalhesVariaveis = async () => {
      try {
        // Busca todas as variáveis para cache (usado na expansão de referências)
        const todasVariaveisResponse = await api.get('/api/variaveis/');
        setTodasVariaveisCache(todasVariaveisResponse.data);

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

        // Inicializa valores para variáveis locais também
        elementosOrdenados.forEach(elemento => {
          if (elemento.tipo === 'variavelLocal') {
            const textoOriginal = elemento.dados.textoOriginal;
            const estruturaVariavel = elemento.dados.variavel;

            if (escolhasSalvas[textoOriginal] !== undefined) {
              const tipoControle = estruturaVariavel.controle || estruturaVariavel.tipo;
              if (tipoControle === "Grupo de Checkbox" || tipoControle === "Combobox com múltiplas opções") {
                valoresIniciais[textoOriginal] = Array.isArray(escolhasSalvas[textoOriginal])
                  ? escolhasSalvas[textoOriginal]
                  : [];
              } else {
                valoresIniciais[textoOriginal] = escolhasSalvas[textoOriginal];
              }
            } else {
              const tipoControle = estruturaVariavel.controle || estruturaVariavel.tipo;
              valoresIniciais[textoOriginal] = tipoControle?.includes('múltiplas') ? [] : '';
            }
          }
        });

        setValoresSelecionados(valoresIniciais);
        setVariaveisPorInstancia(variaveisInstanciaIniciais);
      } catch (error) {
        console.error('Erro ao buscar detalhes das variáveis:', error);
      }
    };

    const inicializarVariaveisLocais = () => {
      const escolhasSalvas = carregarEscolhas();
      const valoresLocaisIniciais = {};

      // Inicializa valores para variáveis locais
      elementosOrdenados.forEach(elemento => {
        if (elemento.tipo === 'variavelLocal') {
          const textoOriginal = elemento.dados.textoOriginal;
          const estruturaVariavel = elemento.dados.variavel;

          if (escolhasSalvas[textoOriginal] !== undefined) {
            const tipoControle = estruturaVariavel.controle || estruturaVariavel.tipo;
            if (tipoControle === "Grupo de Checkbox" || tipoControle === "Combobox com múltiplas opções") {
              valoresLocaisIniciais[textoOriginal] = Array.isArray(escolhasSalvas[textoOriginal])
                ? escolhasSalvas[textoOriginal]
                : [];
            } else {
              valoresLocaisIniciais[textoOriginal] = escolhasSalvas[textoOriginal];
            }
          } else {
            const tipoControle = estruturaVariavel.controle || estruturaVariavel.tipo;
            valoresLocaisIniciais[textoOriginal] = tipoControle?.includes('múltiplas') ? [] : '';
          }
        }
      });

      setValoresSelecionados(prev => ({
        ...prev,
        ...valoresLocaisIniciais
      }));
    };

    if (opened) {
      if (variaveis.length > 0) {
        buscarDetalhesVariaveis();
      } else {
        // Se não há variáveis globais, inicializa apenas variáveis locais
        inicializarVariaveisLocais();
      }
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

      // Inicializa medidas (uma por '$') com base no cache do localStorage
      if (temMedida && quantidadeMedidasNoTexto > 0) {
        const escolhasSalvas = carregarEscolhas();
        const salvo = escolhasSalvas?.['$'];
        const arrSalvo = Array.isArray(salvo) ? salvo : (typeof salvo === 'string' ? [salvo] : []);
        const medidasIniciais = Array.from({ length: quantidadeMedidasNoTexto }, (_, i) => arrSalvo[i] ?? '');
        setMedidas(medidasIniciais);
      } else {
        setMedidas([]);
      }
    }
  }, [opened, gruposOpcoes, temMedida, quantidadeMedidasNoTexto]);

  const handleMedidaChange = (indice, valor) => {
    const novas = [...(medidas || [])];
    novas[indice] = valor;
    setMedidas(novas);

    // Persiste junto com as demais escolhas já salvas
    const escolhasSalvas = carregarEscolhas();
    salvarEscolhas({
      ...escolhasSalvas,
      '$': novas
    });
  };

  const handleChange = (variavelId, valor) => {
    // Verifica se o valor selecionado contém referências
    const referencias = detectarReferencias(valor);
    
    if (referencias.length > 0) {
      // Se tem referência, busca a variável referenciada e abre modal secundário
      const primeiraReferencia = referencias[0];
      const variavelRef = encontrarVariavelReferenciada(primeiraReferencia);
      
      if (variavelRef) {
        // Salva temporariamente a seleção
        setValorOrigem(valor);
        setVariavelIdOrigem(variavelId);
        setVariavelReferenciadaAtual(variavelRef);
        setValorReferenciaSelecionado(null);
        setModalReferenciaAberto(true);
      } else {
        // Variável referenciada não encontrada, salva normalmente
        const novosValores = {
          ...valoresSelecionados,
          [variavelId]: valor
        };
        setValoresSelecionados(novosValores);
        const escolhasSalvas = carregarEscolhas();
        salvarEscolhas({ ...escolhasSalvas, ...novosValores });
      }
    } else {
      // Não tem referência, salva normalmente
      const novosValores = {
        ...valoresSelecionados,
        [variavelId]: valor
      };
      setValoresSelecionados(novosValores);
      const escolhasSalvas = carregarEscolhas();
      salvarEscolhas({ ...escolhasSalvas, ...novosValores });
    }
  };

  // Função para detectar referências no formato {NomeVariável}
  const detectarReferencias = (texto) => {
    const regex = /\{([^}]+)\}/g;
    const referencias = [];
    let match;
    while ((match = regex.exec(texto)) !== null) {
      referencias.push(match[1]); // Nome da variável sem as chaves
    }
    return referencias;
  };

  // Função para encontrar variável referenciada no cache
  const encontrarVariavelReferenciada = (nomeVariavel) => {
    return todasVariaveisCache.find(v => v.tituloVariavel === nomeVariavel);
  };

  // Função para resolver referências em um valor (substitui {NomeVariável} pelo valor selecionado)
  const resolverReferencias = (valor, variavelRef, valorRefSelecionado) => {
    if (!variavelRef || !valorRefSelecionado) return valor;
    
    const nomeEscapado = variavelRef.tituloVariavel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\{${nomeEscapado}\\}`, 'g');
    
    // Se é array (checkbox ou múltiplas opções), processa cada valor
    if (Array.isArray(valorRefSelecionado)) {
      const valoresFinais = valorRefSelecionado.map(valRef => {
        const valorEncontrado = variavelRef.variavel.valores.find(v => v.valor === valRef);
        return valorEncontrado ? valorEncontrado.valor : valRef;
      });
      
      // Usa delimitadores se disponíveis
      if (variavelRef.variavel.delimitador && variavelRef.variavel.ultimoDelimitador && valoresFinais.length > 1) {
        const ultimoValor = valoresFinais.pop();
        const valorFormatado = valoresFinais.join(variavelRef.variavel.delimitador) + 
                               variavelRef.variavel.ultimoDelimitador + ultimoValor;
        return valor.replace(regex, valorFormatado);
      } else {
        const valorFormatado = valoresFinais.join(variavelRef.variavel.delimitador || ', ');
        return valor.replace(regex, valorFormatado);
      }
    } else {
      // Valor único
      const valorEncontrado = variavelRef.variavel.valores.find(v => v.valor === valorRefSelecionado);
      const valorFinal = valorEncontrado ? valorEncontrado.valor : valorRefSelecionado;
      
      return valor.replace(regex, valorFinal);
    }
  };

  // Função auxiliar para renderizar controles de variável por instância
  const renderControleInstancia = (variavel, instanciaId, tituloBase) => {
    const tipo = variavel.variavel.tipo;
    const labelDisplay = getLabelDisplay(variavel);

    // Renderiza valores originais (sem expansão)
    const valores = variavel.variavel.valores.map(v => ({
      value: v.valor,
      label: v.descricao
    }));

    const value = valoresSelecionados[instanciaId] || '';

    if (tipo === "Combobox") {
      return (
        <ComboboxAutocomplete
          label={`${labelDisplay} (instância ${instanciaId.split('_')[1]})`}
          placeholder="Selecione um valor"
          data={valores}
          value={value}
          onChange={(value) => handleChange(instanciaId, value)}
        />
      );
    } else if (tipo === "Grupo de Radio") {
      return (
        <Stack>
          <Text size="sm" fw={500}>{`${labelDisplay} (instância ${instanciaId.split('_')[1]})`}</Text>
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
          <Text size="sm" fw={500}>{`${labelDisplay} (instância ${instanciaId.split('_')[1]})`}</Text>
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
          <Text size="sm" fw={500}>{`${labelDisplay} (instância ${instanciaId.split('_')[1]})`}</Text>
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
              // Busca no valor original, mas se não encontrar, pode ser valor expandido - usa diretamente
              const valorEncontrado = variavel.variavel.valores.find(v => v.valor === val);
              return valorEncontrado ? valorEncontrado.valor : val; // Se for expandido, já está resolvido
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
            // Para valores expandidos, usa diretamente o valor selecionado
            // (já está resolvido, sem referências)
            const valorEncontrado = variavel.variavel.valores.find(v => v.valor === valorSelecionado);
            // Se não encontrar nos valores originais, pode ser um valor expandido - usa diretamente
            resultado[instanciaId] = valorEncontrado ? valorEncontrado.valor : valorSelecionado;
          }
        }
      } else {
        // Se aparece apenas uma vez, usa o comportamento normal
        const valorSelecionado = valoresSelecionados[variavel.id];

        if (variavel.variavel.tipo === "Grupo de Checkbox" || variavel.variavel.tipo === "Combobox com múltiplas opções") {
          const valores = Array.isArray(valorSelecionado) ? valorSelecionado : [];
          const valoresTexto = valores.map(val => {
            // Busca no valor original, mas se não encontrar, pode ser valor expandido - usa diretamente
            const valorEncontrado = variavel.variavel.valores.find(v => v.valor === val);
            return valorEncontrado ? valorEncontrado.valor : val; // Se for expandido, já está resolvido
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
          // Para valores expandidos, usa diretamente o valor selecionado
          // (já está resolvido, sem referências)
          const valorEncontrado = variavel.variavel.valores.find(v => v.valor === valorSelecionado);
          // Se não encontrar nos valores originais, pode ser um valor expandido - usa diretamente
          resultado[variavel.tituloVariavel] = valorEncontrado ? valorEncontrado.valor : valorSelecionado;
        }
      }
    });

    // Adiciona a medida ao resultado se existir
    if (temMedida && quantidadeMedidasNoTexto > 0) {
      const medidasTrim = (medidas || []).map(m => (typeof m === 'string' ? m.trim() : String(m ?? '').trim()));
      // Mantém compatibilidade: 1 medida -> string, múltiplas -> array
      resultado['$'] = quantidadeMedidasNoTexto === 1 ? (medidasTrim[0] ?? '') : medidasTrim;
    }

    // Adiciona as opções selecionadas dos grupos de radio
    if (gruposOpcoes) {
      gruposOpcoes.forEach((grupo, index) => {
        resultado[grupo.textoOriginal] = opcoesRadio[`grupo_${index}`] || grupo.opcoes[0];
      });
    }

    // Processa variáveis locais
    elementosOrdenados.forEach(elemento => {
      if (elemento.tipo === 'variavelLocal') {
        const variavelLocal = elemento.dados;
        const textoOriginal = variavelLocal.textoOriginal;
        const valorSelecionado = valoresSelecionados[textoOriginal];

        const tipoControle = variavelLocal.variavel.controle || variavelLocal.variavel.tipo;
        if (tipoControle === "Grupo de Checkbox" || tipoControle === "Combobox com múltiplas opções") {
          const valores = Array.isArray(valorSelecionado) ? valorSelecionado : [];
          const valoresTexto = valores.map(val => {
            const valorEncontrado = variavelLocal.variavel.valores.find(v => v.valor === val);
            return valorEncontrado ? valorEncontrado.valor : val;
          });

          if (valoresTexto.length > 0) {
            const delimitador = variavelLocal.variavel.delimitador || ', ';
            const ultimoDelimitador = variavelLocal.variavel.ultimoDelimitador || ' e ';

            if (valoresTexto.length === 1) {
              resultado[textoOriginal] = valoresTexto[0];
            } else {
              const ultimoValor = valoresTexto.pop();
              resultado[textoOriginal] = valoresTexto.join(delimitador) + ultimoDelimitador + ultimoValor;
            }
          } else {
            resultado[textoOriginal] = '';
          }
        } else {
          const valorEncontrado = variavelLocal.variavel.valores.find(v => v.valor === valorSelecionado);
          resultado[textoOriginal] = valorEncontrado ? valorEncontrado.valor : (valorSelecionado || '');
        }
      }
    });

    onConfirm(resultado);
    onClose();
  };

  // Função para atualizar valor quando usuário seleciona (sem aplicar ainda)
  const handleSelecaoReferencia = (valor) => {
    setValorReferenciaSelecionado(valor);
  };

  // Função chamada quando usuário confirma no modal secundário - aplica tudo e insere no editor
  const handleConfirmarReferenciaEFechar = () => {
    if (!variavelReferenciadaAtual || !valorOrigem || !variavelIdOrigem) {
      return;
    }
    
    // Validação: não pode ser null ou string vazia
    if (valorReferenciaSelecionado === null || valorReferenciaSelecionado === '') {
      return;
    }
    
    // Se for array vazio, não resolve referência (mantém o valor original com {NomeVariável})
    let valorResolvido;
    if (Array.isArray(valorReferenciaSelecionado) && valorReferenciaSelecionado.length === 0) {
      // Array vazio - não substitui a referência, mantém o valor original
      valorResolvido = valorOrigem;
    } else {
      // Resolve a referência substituindo {NomeVariável} pelo valor selecionado
      valorResolvido = resolverReferencias(valorOrigem, variavelReferenciadaAtual, valorReferenciaSelecionado);
    }

    // Atualiza o valor resolvido
    const novosValores = {
      ...valoresSelecionados,
      [variavelIdOrigem]: valorResolvido
    };
    setValoresSelecionados(novosValores);
    const escolhasSalvas = carregarEscolhas();
    salvarEscolhas({ ...escolhasSalvas, ...novosValores });
    
    // Fecha o modal de referência
    setModalReferenciaAberto(false);
    setVariavelReferenciadaAtual(null);
    setVariavelIdOrigem(null);
    setValorOrigem(null);
    setValorReferenciaSelecionado(null);
    
    // Processa o resultado com os NOVOS valores atualizados
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
          const valorSelecionado = novosValores[instanciaId];
          
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
        const valorSelecionado = novosValores[variavel.id];
        
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
    if (temMedida && quantidadeMedidasNoTexto > 0) {
      const medidasTrim = (medidas || []).map(m => (typeof m === 'string' ? m.trim() : String(m ?? '').trim()));
      resultado['$'] = quantidadeMedidasNoTexto === 1 ? (medidasTrim[0] ?? '') : medidasTrim;
    }
    
    // Adiciona as opções selecionadas dos grupos de radio
    if (gruposOpcoes) {
      gruposOpcoes.forEach((grupo, index) => {
        resultado[grupo.textoOriginal] = opcoesRadio[`grupo_${index}`] || grupo.opcoes[0];
      });
    }
    
    // Fecha modal principal e envia resultado
    onConfirm(resultado);
    onClose();
  };

  // Função para renderizar controle da variável referenciada no modal secundário
  const renderControleReferencia = (variavel) => {
    const tipo = variavel.variavel.tipo;
    const labelDisplay = getLabelDisplay(variavel);
    
    const valores = variavel.variavel.valores.map(v => ({
      value: v.valor,
      label: v.descricao
    }));

    if (tipo === "Combobox") {
      return (
        <ComboboxAutocomplete
          label={labelDisplay}
          placeholder="Selecione um valor"
          data={valores}
          value={valorReferenciaSelecionado || ''}
          onChange={handleSelecaoReferencia}
        />
      );
    } else if (tipo === "Grupo de Radio") {
      return (
        <Stack>
          <Text size="sm" fw={500}>{labelDisplay}</Text>
          <Radio.Group
            value={valorReferenciaSelecionado || ''}
            onChange={handleSelecaoReferencia}
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
          <Text size="sm" fw={500}>{labelDisplay}</Text>
          <Checkbox.Group
            value={Array.isArray(valorReferenciaSelecionado) ? valorReferenciaSelecionado : []}
            onChange={handleSelecaoReferencia}
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
          <Text size="sm" fw={500}>{labelDisplay}</Text>
          <MultiSelect
            label=""
            placeholder="Selecione os valores"
            data={valores}
            value={Array.isArray(valorReferenciaSelecionado) ? valorReferenciaSelecionado : []}
            onChange={handleSelecaoReferencia}
            searchable
            required={false}
            clearable
          />
        </Stack>
      );
    }
  };

  // Função para renderizar controle de variável local
  const renderControleLocal = (variavelLocal) => {
    // Usa 'controle' do JSON (novo formato) ou 'tipo' (formato antigo) para compatibilidade
    const tipo = variavelLocal.variavel.controle || variavelLocal.variavel.tipo;
    const labelDisplay = variavelLocal.variavel.label || variavelLocal.tituloVariavel || 'Variável Local';
    
    // Renderiza valores originais (sem expansão)
    const valores = variavelLocal.variavel.valores.map(v => ({
      value: v.valor,
      label: v.descricao
    }));

    const textoOriginal = variavelLocal.textoOriginal;

    if (tipo === "Combobox") {
      return (
        <ComboboxAutocomplete
          label={labelDisplay}
          placeholder="Selecione um valor"
          data={valores}
          value={valoresSelecionados[textoOriginal] || ''}
          onChange={(value) => {
            const novosValores = {
              ...valoresSelecionados,
              [textoOriginal]: value
            };
            setValoresSelecionados(novosValores);
            const escolhasSalvas = carregarEscolhas();
            salvarEscolhas({ ...escolhasSalvas, ...novosValores });
          }}
        />
      );
    } else if (tipo === "Grupo de Radio") {
      return (
        <Stack>
          <Text size="sm" fw={500}>{labelDisplay}</Text>
          <Radio.Group
            value={valoresSelecionados[textoOriginal] || ''}
            onChange={(value) => {
              const novosValores = {
                ...valoresSelecionados,
                [textoOriginal]: value
              };
              setValoresSelecionados(novosValores);
              const escolhasSalvas = carregarEscolhas();
              salvarEscolhas({ ...escolhasSalvas, ...novosValores });
            }}
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
          <Text size="sm" fw={500}>{labelDisplay}</Text>
          <Checkbox.Group
            value={Array.isArray(valoresSelecionados[textoOriginal]) ? valoresSelecionados[textoOriginal] : []}
            onChange={(value) => {
              const novosValores = {
                ...valoresSelecionados,
                [textoOriginal]: value
              };
              setValoresSelecionados(novosValores);
              const escolhasSalvas = carregarEscolhas();
              salvarEscolhas({ ...escolhasSalvas, ...novosValores });
            }}
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
          <Text size="sm" fw={500}>{labelDisplay}</Text>
          <MultiSelect
            label=""
            placeholder="Selecione os valores"
            data={valores}
            value={Array.isArray(valoresSelecionados[textoOriginal]) ? valoresSelecionados[textoOriginal] : []}
            onChange={(value) => {
              const novosValores = {
                ...valoresSelecionados,
                [textoOriginal]: value
              };
              setValoresSelecionados(novosValores);
              const escolhasSalvas = carregarEscolhas();
              salvarEscolhas({ ...escolhasSalvas, ...novosValores });
            }}
            searchable
            required={false}
            clearable
          />
        </Stack>
      );
    }
  };

  const renderControle = (variavel) => {
    const tipo = variavel.variavel.tipo;
    const labelDisplay = getLabelDisplay(variavel);
    
    // Renderiza valores originais (sem expansão)
    const valores = variavel.variavel.valores.map(v => ({
      value: v.valor,
      label: v.descricao
    }));

    if (tipo === "Combobox") {
      return (
        <ComboboxAutocomplete
          label={labelDisplay}
          placeholder="Selecione um valor"
          data={valores}
          value={valoresSelecionados[variavel.id] || ''}
          onChange={(value) => handleChange(variavel.id, value)}
        />
      );
    } else if (tipo === "Grupo de Radio") {
      return (
        <Stack>
          <Text size="sm" fw={500}>{labelDisplay}</Text>
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
          <Text size="sm" fw={500}>{labelDisplay}</Text>
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
          <Text size="sm" fw={500}>{labelDisplay}</Text>
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
            const indice = elemento?.dados?.indice ?? 0;
            return (
              <TextInput
                key={`medida_${index}`}
                label={quantidadeMedidasNoTexto > 1 ? `Medida ${indice + 1}` : 'Medida'}
                value={medidas[indice] ?? ''}
                onChange={(event) => handleMedidaChange(indice, event.currentTarget.value)}
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
          } else if (elemento.tipo === 'variavelLocal') {
            // Renderiza variável local
            const variavelLocal = elemento.dados;
            return (
              <div key={`variavelLocal_${index}`}>
                {renderControleLocal(variavelLocal)}
              </div>
            );
          }
          return null;
        })}

        <Group position="right" mt="md">
          <Button onClick={handleConfirm}>Confirmar</Button>
        </Group>
      </Stack>

      {/* Modal secundário para variáveis referenciadas */}
      <Modal
        opened={modalReferenciaAberto}
        onClose={() => {
          setModalReferenciaAberto(false);
          setVariavelReferenciadaAtual(null);
          setVariavelIdOrigem(null);
          setValorOrigem(null);
          setValorReferenciaSelecionado(null);
        }}
        title={variavelReferenciadaAtual ? `Selecionar ${variavelReferenciadaAtual.tituloVariavel}` : 'Selecionar Variável Referenciada'}
        size="md"
      >
        {variavelReferenciadaAtual && (
          <Stack>
            <Text size="sm" c="dimmed" mb="md">
              Selecione um valor para a variável referenciada
            </Text>
            {renderControleReferencia(variavelReferenciadaAtual)}
            <Group position="right" mt="md">
              <Button 
                variant="outline" 
                onClick={() => {
                  setModalReferenciaAberto(false);
                  setVariavelReferenciadaAtual(null);
                  setVariavelIdOrigem(null);
                  setValorOrigem(null);
                  setValorReferenciaSelecionado(null);
                }}
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleConfirmarReferenciaEFechar}
                disabled={
                  valorReferenciaSelecionado === null || 
                  valorReferenciaSelecionado === '' ||
                  (Array.isArray(valorReferenciaSelecionado) && valorReferenciaSelecionado.length === 0)
                }
              >
                Confirmar
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </Modal>
  );
}

export default SelecionarVariaveisModal; 

