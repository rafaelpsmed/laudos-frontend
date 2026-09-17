import api from '../api';
import {
  converterQuebrasDeLinha,
  aplicarFormatacao,
} from './fraseEngine';
import { isTokenSomaClassificacao } from './numeroOpcaoVariavel';

/** Separador invisível entre trechos (base, substituições outras, conclusão) no modal de variáveis. */
export const SEP_SEGMENTO_VARIAVEIS = '\uE000';

export function capitalizarInicioDaFrase(conteudo) {
  if (!conteudo) return conteudo;
  return conteudo.replace(/^((?:\s|<[^>]+>)*(?:-\s*)?)([a-záàâãéêíóôõúç])/i, (match, prefixo, letra) => {
    return `${prefixo}${letra.toUpperCase()}`;
  });
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function ehChaveVariavelLocal(chave) {
  return chave.startsWith('{') && (
    chave.includes('"tipo":"variavelLocal"') || chave.includes('"tipo":variavelLocal')
  );
}

function substituirChaveExata(texto, chave, valor) {
  return texto.replace(new RegExp(escapeRegExp(chave), 'g'), valor);
}

function tituloDeBlobLocal(jsonString) {
  try {
    const estrutura = JSON.parse(jsonString);
    return String(estrutura.label || estrutura.titulo || '').trim();
  } catch {
    return '';
  }
}

function valorDefinicaoGlobal(titulo, variaveisNormais, variaveisPorTitulo) {
  const instancias = variaveisPorTitulo[titulo];
  if (Array.isArray(instancias)) {
    const primeiro = instancias.find((v) => v !== undefined);
    if (primeiro !== undefined) return primeiro;
  }
  if (Object.prototype.hasOwnProperty.call(variaveisNormais, titulo)) {
    return variaveisNormais[titulo];
  }
  return undefined;
}

function aplicarReferenciasNoTexto(texto, { variaveisNormais, variaveisPorTitulo, blobsLocais }) {
  let out = texto;
  out = out.replace(/\{@([^{}]+)\}/g, (full, tituloBruto) => {
    const titulo = String(tituloBruto || '').trim();
    const valor = valorDefinicaoGlobal(titulo, variaveisNormais, variaveisPorTitulo);
    return valor !== undefined ? valor : full;
  });
  out = out.replace(/\[REF: ([^\]]+)\]/g, (full, tituloBruto) => {
    const titulo = String(tituloBruto || '').trim();
    const encontrado = blobsLocais.find(([json]) => tituloDeBlobLocal(json) === titulo);
    return encontrado ? encontrado[1] : full;
  });
  return out;
}

function aplicarMedidasNoTexto(texto, valor) {
  if (Array.isArray(valor)) {
    let i = 0;
    return texto.replace(/\$/g, () => {
      const v = valor[i++];
      return v !== undefined && String(v).trim() !== '' ? String(v) : '$';
    });
  }
  return texto.replace(/\$/g, valor);
}

export function aplicarValoresSelecionadosAoTexto(textoTemporario, valoresSelecionados) {
  let textoFinal = textoTemporario;
  const variaveisPorTitulo = {};
  const variaveisNormais = {};
  const blobsLocais = [];
  const gruposAntigos = [];
  let medidas = undefined;

  Object.entries(valoresSelecionados).forEach(([chave, valor]) => {
    if (chave === '$') {
      medidas = valor;
    } else if (ehChaveVariavelLocal(chave)) {
      blobsLocais.push([chave, valor]);
    } else if (chave.includes('//')) {
      gruposAntigos.push([chave, valor]);
    } else if (chave.includes('_') && /^.+_\d+$/.test(chave)) {
      const partes = chave.split('_');
      const instanciaIndex = parseInt(partes[partes.length - 1], 10);
      const tituloBase = partes.slice(0, -1).join('_');
      if (!variaveisPorTitulo[tituloBase]) {
        variaveisPorTitulo[tituloBase] = [];
      }
      variaveisPorTitulo[tituloBase][instanciaIndex] = valor;
    } else {
      variaveisNormais[chave] = valor;
    }
  });

  blobsLocais.forEach(([chave, valor]) => {
    textoFinal = substituirChaveExata(textoFinal, chave, valor);
  });

  gruposAntigos.forEach(([chave, valor]) => {
    textoFinal = substituirChaveExata(textoFinal, chave, valor);
  });

  Object.entries(variaveisNormais).forEach(([chave, valor]) => {
    const regex = new RegExp(`{${escapeRegExp(chave)}}`, 'g');
    textoFinal = textoFinal.replace(regex, valor);
  });

  Object.entries(variaveisPorTitulo).forEach(([tituloBase, instancias]) => {
    const regex = new RegExp(`{${escapeRegExp(tituloBase)}}`, 'g');
    let ocorrenciasEncontradas = 0;
    textoFinal = textoFinal.replace(regex, (match) => {
      const v = instancias[ocorrenciasEncontradas];
      ocorrenciasEncontradas += 1;
      return v !== undefined ? v : match;
    });
  });

  textoFinal = aplicarReferenciasNoTexto(textoFinal, {
    variaveisNormais,
    variaveisPorTitulo,
    blobsLocais,
  });

  if (medidas !== undefined) {
    textoFinal = aplicarMedidasNoTexto(textoFinal, medidas);
  }

  return textoFinal;
}

export function splitPartesResolvidas(textoFinal, segInfo) {
  if (!segInfo) {
    return { partesResolvidas: null, textoFinal: capitalizarInicioDaFrase(textoFinal) };
  }
  const { sep, n } = segInfo;
  let partes = textoFinal.split(sep);
  while (partes.length < n) partes.push('');
  if (partes.length > n) {
    partes = [...partes.slice(0, n - 1), partes.slice(n - 1).join(sep)];
  }
  return { partesResolvidas: partes.map((p) => capitalizarInicioDaFrase(p)), textoFinal: null };
}

export function unpackPartesNaFrase(fraseAtual, partes) {
  const nSub = fraseAtual.frase.substituicoesOutras?.length ?? 0;
  const temConc = !!fraseAtual.frase.conclusao;
  const base = partes[0] ?? '';
  const subs = [];
  for (let i = 0; i < nSub; i += 1) {
    subs.push(partes[1 + i] ?? '');
  }
  const conclusaoResolvida = temConc ? (partes[1 + nSub] ?? '') : '';
  return { base, subs, conclusaoResolvida, temConc };
}

export function buildFraseFromPartesResolvidas(fraseOriginal, partesResolvidas) {
  const { base, subs, conclusaoResolvida } = unpackPartesNaFrase(fraseOriginal, partesResolvidas);
  const clone = {
    ...fraseOriginal,
    frase: { ...(fraseOriginal.frase || {}) },
  };
  clone.frase.fraseBase = base;
  if (clone.frase.substituicoesOutras?.length) {
    clone.frase.substituicoesOutras = clone.frase.substituicoesOutras.map((sub, idx) => ({
      ...sub,
      substituirPor: subs[idx] ?? sub.substituirPor,
    }));
  }
  if (clone.frase.conclusao && conclusaoResolvida) {
    clone.frase.conclusao = conclusaoResolvida;
  }
  return clone;
}

export async function montarTextoCompostoParaVariaveisDaFrase(frase) {
  const blocos = [];
  const addBloco = (raw) => {
    blocos.push(aplicarFormatacao(converterQuebrasDeLinha(raw ?? '')));
  };

  addBloco(frase.frase.fraseBase);
  if (frase.frase.substituicoesOutras?.length) {
    frase.frase.substituicoesOutras.forEach((sub) => {
      addBloco(sub.substituirPor);
    });
  }
  if (frase.frase.conclusao) {
    addBloco(frase.frase.conclusao);
  }

  const textoComposto = blocos.join(SEP_SEGMENTO_VARIAVEIS);
  const resultado = await buscarVariaveisNoTexto(textoComposto, frase);
  const temVariaveis =
    resultado.variaveis.length > 0 ||
    resultado.gruposOpcoes.length > 0 ||
    resultado.variaveisLocais.length > 0 ||
    textoComposto.includes('$');

  return {
    textoComposto,
    resultado,
    temVariaveis,
    nSegmentos: blocos.length,
    sep: SEP_SEGMENTO_VARIAVEIS,
  };
}

export async function textoTemVariaveisParaModal(texto, frase = null) {
  const html = aplicarFormatacao(converterQuebrasDeLinha(texto ?? ''));
  const resultado = await buscarVariaveisNoTexto(html, frase);
  const temVariaveis =
    resultado.variaveis.length > 0 ||
    resultado.gruposOpcoes.length > 0 ||
    resultado.variaveisLocais.length > 0 ||
    html.includes('$');
  return { html, resultado, temVariaveis };
}

export async function buscarVariaveisNoTexto(texto, frase = null) {
    try {
      // Busca todas as variáveis
      const response = await api.get('/api/variaveis/');
      const todasVariaveis = response.data;
      
      // Extrai o texto puro do HTML removendo tags, mas mantendo o conteúdo
      // Isso é necessário porque o editor retorna HTML, mas as variáveis locais estão no texto
      // IMPORTANTE: Processa as entidades HTML ANTES de remover as tags para evitar problemas
      let textoPuro = texto
        .replace(/&nbsp;/g, ' ') // Converte &nbsp; para espaço
        .replace(/&amp;/g, '&') // Converte &amp; para & (deve vir antes de &lt; e &gt;)
        .replace(/&lt;/g, '<') // Converte &lt; para <
        .replace(/&gt;/g, '>') // Converte &gt; para >
        .replace(/&quot;/g, '"') // Converte &quot; para "
        .replace(/&#39;/g, "'") // Converte &#39; para '
        .replace(/&#91;/g, '[') // Converte &#91; para [
        .replace(/&#93;/g, ']') // Converte &#93; para ]
        .replace(/&#x5B;/g, '[') // Converte &#x5B; para [
        .replace(/&#x5D;/g, ']') // Converte &#x5D; para ]
        .replace(/<br\s*\/?>/gi, '\n') // Converte <br> para quebra de linha
        .replace(/<[^>]+>/g, ''); // Remove todas as tags HTML (deve vir por último)
      
      // Debug: verifica se o texto contém variáveis locais
      // console.log('🔍 Texto original (primeiros 500 chars):', texto.substring(0, 500));
      // console.log('🔍 Texto puro (primeiros 500 chars):', textoPuro.substring(0, 500));
      // console.log('🔍 Contém {JSON} de variável local?', textoPuro.includes('"tipo":"variavelLocal"') || textoPuro.includes('"tipo":variavelLocal'));
      // console.log('🔍 Contém [LOCAL:?', textoPuro.includes('[LOCAL:'));
      
      // Se temos a frase passada como parâmetro, também verifica a frase base original
      if (frase && frase.frase && frase.frase.fraseBase) {
        // console.log('🔍 Frase base original do backend (primeiros 200 chars):', frase.frase.fraseBase.substring(0, 200));
        // console.log('🔍 Frase base contém [[LOCAL:?', frase.frase.fraseBase.includes('[[LOCAL:'));
        // console.log('🔍 Frase base contém [LOCAL:?', frase.frase.fraseBase.includes('[LOCAL:'));
      }
      
      // Array para armazenar todos os elementos na ordem que aparecem
      const elementosOrdenados = [];
      
      // Encontra todas as ocorrências de {variavel}
      const regexVariaveis = /{([^}]+)}/g;
      let match;
      
      while ((match = regexVariaveis.exec(textoPuro)) !== null) {
        const tituloVariavel = match[1];
        if (String(tituloVariavel).startsWith('@') || String(tituloVariavel).startsWith('#')) {
          continue;
        }
        if (isTokenSomaClassificacao(tituloVariavel)) {
          continue;
        }
        // Procura a variável pelo título exato
        const variavel = todasVariaveis.find(v => v.tituloVariavel === tituloVariavel);
        
        if (variavel) {
          elementosOrdenados.push({
            tipo: 'variavel',
            dados: variavel,
            posicao: match.index,
            textoOriginal: match[0]
          });
        }
      }

      // Encontra todas as ocorrências de variáveis locais no formato {JSON} (formato completo salvo no backend)
      // Procura por JSONs que começam com {"tipo":"variavelLocal"
      let encontrouVariavelLocal = false;
      let posicaoBusca = 0;
      
      // Busca por JSONs de variáveis locais no texto puro
      while (posicaoBusca < textoPuro.length) {
        // Procura pelo início de um JSON de variável local
        const inicioJson = textoPuro.indexOf('{"tipo":"variavelLocal"', posicaoBusca);
        if (inicioJson === -1) {
          // Também tenta sem aspas no valor (caso o JSON tenha sido salvo sem aspas)
          const inicioJsonSemAspas = textoPuro.indexOf('{"tipo":variavelLocal', posicaoBusca);
          if (inicioJsonSemAspas === -1) break;
          posicaoBusca = inicioJsonSemAspas;
        } else {
          posicaoBusca = inicioJson;
        }
        
        // Encontra o { correspondente
        const inicio = posicaoBusca;
        let profundidade = 0;
        let fim = inicio;
        let dentroString = false;
        let escape = false;
        
        // Percorre o texto para encontrar o } correspondente
        for (let i = inicio; i < textoPuro.length; i++) {
          const char = textoPuro[i];
          
          if (escape) {
            escape = false;
            continue;
          }
          
          if (char === '\\') {
            escape = true;
            continue;
          }
          
          if (char === '"' && !escape) {
            dentroString = !dentroString;
            continue;
          }
          
          if (dentroString) continue;
          
          if (char === '{') {
            profundidade++;
          } else if (char === '}') {
            profundidade--;
            if (profundidade === 0) {
              fim = i + 1;
              break;
            }
          }
        }
        
        if (fim > inicio) {
          // Extrai o JSON completo
          const jsonString = textoPuro.substring(inicio, fim);
          
          try {
            // Tenta parsear o JSON (pode precisar corrigir aspas se necessário)
            let jsonParaParsear = jsonString;
            // Se o JSON não tiver aspas no valor de tipo, adiciona
            if (jsonString.includes('"tipo":variavelLocal')) {
              jsonParaParsear = jsonString.replace(/"tipo":variavelLocal/g, '"tipo":"variavelLocal"');
            }
            
            const estruturaVariavel = JSON.parse(jsonParaParsear);
            
            // Verifica se é uma variável local
            if (estruturaVariavel.tipo === 'variavelLocal') {
              encontrouVariavelLocal = true;
              const tituloVariavel = estruturaVariavel.label || estruturaVariavel.titulo || 'Variável Local';
              
              // console.log('✅ Variável local encontrada (formato JSON):', jsonString.substring(0, 100));
              
              // Cria uma estrutura similar às variáveis globais para processamento
              const variavelLocalFormatada = {
                tituloVariavel: tituloVariavel,
                variavel: estruturaVariavel,
                isLocal: true,
                textoOriginal: jsonString, // Usado como chave para identificação única
                id: `local_${inicio}_${elementosOrdenados.length}` // ID único baseado na posição
              };
              
              elementosOrdenados.push({
                tipo: 'variavelLocal',
                dados: variavelLocalFormatada,
                posicao: inicio
              });
              
              posicaoBusca = fim;
            } else {
              posicaoBusca = fim;
            }
          } catch (error) {
            // console.error('❌ Erro ao processar variável local:', error);
            // console.error('   JSON string:', jsonString);
            posicaoBusca = fim;
          }
        } else {
          break;
        }
      }
      
      // Se não encontrou no formato completo, tenta detectar o formato formatado [LOCAL: Título]
      // OU tenta buscar diretamente na frase original do backend se temos acesso a ela
      if (!encontrouVariavelLocal) {
        // PRIMEIRO: Se temos a frase passada como parâmetro, busca diretamente na frase base original
        // Isso é mais confiável do que tentar extrair do HTML
        if (frase && frase.frase) {
          const partesOrigemVariavelLocal = [
            frase.frase.fraseBase,
            frase.frase.conclusao,
            ...(frase.frase.substituicoesOutras?.map((s) => s.substituirPor) || []),
          ].filter((x) => x != null && String(x) !== '');
          const fraseBaseOriginal = partesOrigemVariavelLocal.join('\n');

          if (fraseBaseOriginal) {
          // Busca variáveis locais no formato {JSON} na frase original
          let posicaoBuscaOriginal = 0;
          
          while (posicaoBuscaOriginal < fraseBaseOriginal.length) {
            // Procura pelo início de um JSON de variável local
            const inicioJson = fraseBaseOriginal.indexOf('{"tipo":"variavelLocal"', posicaoBuscaOriginal);
            if (inicioJson === -1) {
              // Também tenta sem aspas no valor
              const inicioJsonSemAspas = fraseBaseOriginal.indexOf('{"tipo":variavelLocal', posicaoBuscaOriginal);
              if (inicioJsonSemAspas === -1) break;
              posicaoBuscaOriginal = inicioJsonSemAspas;
            } else {
              posicaoBuscaOriginal = inicioJson;
            }
            
            // Encontra o { correspondente
            const inicio = posicaoBuscaOriginal;
            let profundidade = 0;
            let fim = inicio;
            let dentroString = false;
            let escape = false;
            
            // Percorre o texto para encontrar o } correspondente
            for (let i = inicio; i < fraseBaseOriginal.length; i++) {
              const char = fraseBaseOriginal[i];
              
              if (escape) {
                escape = false;
                continue;
              }
              
              if (char === '\\') {
                escape = true;
                continue;
              }
              
              if (char === '"' && !escape) {
                dentroString = !dentroString;
                continue;
              }
              
              if (dentroString) continue;
              
              if (char === '{') {
                profundidade++;
              } else if (char === '}') {
                profundidade--;
                if (profundidade === 0) {
                  fim = i + 1;
                  break;
                }
              }
            }
            
            if (fim > inicio) {
              // Extrai o JSON completo
              const jsonString = fraseBaseOriginal.substring(inicio, fim);
              
              try {
                // Tenta parsear o JSON
                let jsonParaParsear = jsonString;
                if (jsonString.includes('"tipo":variavelLocal')) {
                  jsonParaParsear = jsonString.replace(/"tipo":variavelLocal/g, '"tipo":"variavelLocal"');
                }
                
                const estruturaVariavel = JSON.parse(jsonParaParsear);
                const tituloVariavel = estruturaVariavel.label || estruturaVariavel.titulo || 'Variável Local';
                
                // console.log('✅ Variável local encontrada na frase base original:', jsonString.substring(0, 100));
                
                // Encontra a posição aproximada no texto puro procurando pelo título formatado
                const textoFormatado = `[LOCAL: ${tituloVariavel}]`;
                const posicaoAproximada = textoPuro.indexOf(textoFormatado);
                const posicao = posicaoAproximada !== -1 ? posicaoAproximada : textoPuro.length;
                
                // Cria a estrutura para processamento
                const variavelLocalFormatada = {
                  tituloVariavel: tituloVariavel,
                  variavel: estruturaVariavel,
                  isLocal: true,
                  textoOriginal: jsonString, // Usa o JSON completo como chave
                  id: `local_${posicao}_${elementosOrdenados.length}`
                };
                
                elementosOrdenados.push({
                  tipo: 'variavelLocal',
                  dados: variavelLocalFormatada,
                  posicao: posicao
                });
                
                encontrouVariavelLocal = true;
                posicaoBuscaOriginal = fim;
              } catch (error) {
                // console.error('❌ Erro ao processar variável local da frase base:', error);
                // console.error('   JSON string:', jsonString);
                posicaoBuscaOriginal = fim;
              }
            } else {
              break;
            }
          }
          }
        }
        
        // SEGUNDO: Se ainda não encontrou, tenta detectar padrões [LOCAL: Título] no texto puro
        // e buscar a frase original do backend
        if (!encontrouVariavelLocal) {
          // Detecta padrões [LOCAL: Título] (formato formatado sem JSON)
          const regexVariavelLocalFormatada = /\[LOCAL:\s*([^\]]+)\]/g;
          let matchFormatado;
          const variaveisFormatadasEncontradas = [];
          
          while ((matchFormatado = regexVariavelLocalFormatada.exec(textoPuro)) !== null) {
            const tituloFormatado = matchFormatado[1].trim();
            // console.log('⚠️ Variável local formatada encontrada (sem JSON):', `[LOCAL: ${tituloFormatado}]`);
            variaveisFormatadasEncontradas.push({
              textoFormatado: matchFormatado[0],
              titulo: tituloFormatado,
              posicao: matchFormatado.index
            });
          }
          
          // Se encontrou variáveis no formato formatado, tenta buscar a frase original do backend
          if (variaveisFormatadasEncontradas.length > 0) {
            // console.log('🔍 Tentando buscar formato completo da frase do backend...');
            
            try {
              let fraseBaseOriginal = '';
              
              // Se temos a frase passada como parâmetro, busca diretamente
              if (frase && frase.id) {
                const fraseResponse = await api.get(`/api/frases/${frase.id}/`);
                const fd = fraseResponse.data.frase;
                fraseBaseOriginal = [
                  fd?.fraseBase,
                  fd?.conclusao,
                  ...(fd?.substituicoesOutras?.map((s) => s.substituirPor) || []),
                ]
                  .filter((x) => x != null && String(x) !== '')
                  .join('\n');
              } else {
                // Se não temos frase, busca todas as frases e tenta encontrar
                const todasFrasesResponse = await api.get('/api/frases/');
                for (const fraseItem of todasFrasesResponse.data) {
                  const f = fraseItem.frase;
                  if (!f) continue;
                  const blob = [
                    f.fraseBase,
                    f.conclusao,
                    ...(f.substituicoesOutras?.map((s) => s.substituirPor) || []),
                  ]
                    .filter((x) => x != null && String(x) !== '')
                    .join('\n');
                  if (
                    blob.includes('"tipo":"variavelLocal"') ||
                    blob.includes('"tipo":variavelLocal')
                  ) {
                    fraseBaseOriginal = blob;
                    break;
                  }
                }
              }
              
              if (fraseBaseOriginal) {
              // console.log('🔍 Frase base original do backend (primeiros 200 chars):', fraseBaseOriginal.substring(0, 200));
              // console.log('🔍 Contém {JSON} de variável local?', fraseBaseOriginal.includes('"tipo":"variavelLocal"') || fraseBaseOriginal.includes('"tipo":variavelLocal'));
                
              // Busca variáveis locais no formato {JSON} na frase original
              let posicaoBuscaBackend = 0;
              
              while (posicaoBuscaBackend < fraseBaseOriginal.length) {
                // Procura pelo início de um JSON de variável local
                const inicioJson = fraseBaseOriginal.indexOf('{"tipo":"variavelLocal"', posicaoBuscaBackend);
                if (inicioJson === -1) {
                  const inicioJsonSemAspas = fraseBaseOriginal.indexOf('{"tipo":variavelLocal', posicaoBuscaBackend);
                  if (inicioJsonSemAspas === -1) break;
                  posicaoBuscaBackend = inicioJsonSemAspas;
                } else {
                  posicaoBuscaBackend = inicioJson;
                }
                
                // Encontra o { correspondente
                const inicio = posicaoBuscaBackend;
                let profundidade = 0;
                let fim = inicio;
                let dentroString = false;
                let escape = false;
                
                for (let i = inicio; i < fraseBaseOriginal.length; i++) {
                  const char = fraseBaseOriginal[i];
                  
                  if (escape) {
                    escape = false;
                    continue;
                  }
                  
                  if (char === '\\') {
                    escape = true;
                    continue;
                  }
                  
                  if (char === '"' && !escape) {
                    dentroString = !dentroString;
                    continue;
                  }
                  
                  if (dentroString) continue;
                  
                  if (char === '{') {
                    profundidade++;
                  } else if (char === '}') {
                    profundidade--;
                    if (profundidade === 0) {
                      fim = i + 1;
                      break;
                    }
                  }
                }
                
                if (fim > inicio) {
                  const jsonString = fraseBaseOriginal.substring(inicio, fim);
                  
                  try {
                    let jsonParaParsear = jsonString;
                    if (jsonString.includes('"tipo":variavelLocal')) {
                      jsonParaParsear = jsonString.replace(/"tipo":variavelLocal/g, '"tipo":"variavelLocal"');
                    }
                    
                    const estruturaVariavel = JSON.parse(jsonParaParsear);
                    const tituloVariavel = estruturaVariavel.label || estruturaVariavel.titulo || 'Variável Local';
                    
                    // Verifica se esta variável corresponde a alguma das variáveis formatadas encontradas
                    const variavelCorrespondente = variaveisFormatadasEncontradas.find(
                      v => v.titulo === tituloVariavel
                    );
                    
                    if (variavelCorrespondente) {
                      // console.log('✅ Variável local encontrada no backend:', jsonString.substring(0, 100));
                      
                      // Cria a estrutura para processamento
                      const variavelLocalFormatada = {
                        tituloVariavel: tituloVariavel,
                        variavel: estruturaVariavel,
                        isLocal: true,
                        textoOriginal: jsonString, // Usa o JSON completo como chave
                        id: `local_${variavelCorrespondente.posicao}_${elementosOrdenados.length}`
                      };
                      
                      elementosOrdenados.push({
                        tipo: 'variavelLocal',
                        dados: variavelLocalFormatada,
                        posicao: variavelCorrespondente.posicao
                      });
                      
                      encontrouVariavelLocal = true;
                    }
                    
                    posicaoBuscaBackend = fim;
                  } catch (error) {
                    // console.error('❌ Erro ao processar variável local do backend:', error);
                    posicaoBuscaBackend = fim;
                  }
                } else {
                  break;
                }
              }
              }
            } catch (error) {
              // console.error('❌ Erro ao buscar frase do backend:', error);
            }
            
            if (!encontrouVariavelLocal) {
              // console.error('❌ ERRO: Não foi possível recuperar o formato completo das variáveis locais.');
              // console.error('   Variáveis encontradas no formato formatado:', variaveisFormatadasEncontradas);
            }
          }
        }
      }
      
      if (!encontrouVariavelLocal) {
        // console.log('⚠️ Nenhuma variável local encontrada no texto');
      }

      // Encontra todas as ocorrências de grupos de opções [op1//op2//op3] (formato antigo)
      // IMPORTANTE: Esta regex deve vir DEPOIS da regex de variáveis locais para evitar conflitos
      const regexOpcoes = /\[(([^\]]+)\/\/([^\]]+)(?:\/\/[^\]]+)*)\](?!\])/g; // Adicionado negative lookahead para não pegar [[LOCAL...]]
      let matchOpcoes;
      
      while ((matchOpcoes = regexOpcoes.exec(textoPuro)) !== null) {
        const grupoCompleto = matchOpcoes[0]; // Inclui os [ ]
        const conteudoGrupo = matchOpcoes[1]; // Conteúdo entre [ ]
        const opcoes = conteudoGrupo.split('//').map(op => op.trim());
        
        elementosOrdenados.push({
          tipo: 'grupo',
          dados: {
            textoOriginal: grupoCompleto,
            opcoes: opcoes
          },
          posicao: matchOpcoes.index
        });
      }

      // Verifica se tem medida ($) - adiciona UMA entrada para CADA ocorrência
      const regexMedidas = /\$/g;
      let matchMedida;
      let indiceMedida = 0;
      while ((matchMedida = regexMedidas.exec(textoPuro)) !== null) {
        elementosOrdenados.push({
          tipo: 'medida',
          dados: { textoOriginal: '$', indice: indiceMedida },
          posicao: matchMedida.index
        });
        indiceMedida++;
      }
      
      // Ordena os elementos pela posição no texto
      elementosOrdenados.sort((a, b) => a.posicao - b.posicao);
      
      // Separa os elementos por tipo para manter compatibilidade
      const variaveisEncontradas = elementosOrdenados
        .filter(el => el.tipo === 'variavel')
        .map(el => el.dados);
        
      const gruposOpcoes = elementosOrdenados
        .filter(el => el.tipo === 'grupo')
        .map(el => el.dados);
      
      const variaveisLocaisEncontradas = elementosOrdenados
        .filter(el => el.tipo === 'variavelLocal')
        .map(el => el.dados);
      
      // console.log('📦 Variáveis locais encontradas:', variaveisLocaisEncontradas.length);
      if (variaveisLocaisEncontradas.length > 0) {
        // console.log('   Primeira variável local:', variaveisLocaisEncontradas[0]);
      }
      
      return {
        variaveis: variaveisEncontradas,
        gruposOpcoes: gruposOpcoes,
        variaveisLocais: variaveisLocaisEncontradas,
        elementosOrdenados: elementosOrdenados,
        textoPuro: textoPuro
      };
    } catch (error) {
      // console.error('Erro ao buscar variáveis:', error);
      return {
        variaveis: [],
        gruposOpcoes: [],
        variaveisLocais: [],
        elementosOrdenados: [],
        textoPuro: ''
      };
    }
}
