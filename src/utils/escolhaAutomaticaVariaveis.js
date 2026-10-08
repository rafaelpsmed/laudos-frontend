import { parseNumeroOpcao } from './numeroOpcaoVariavel';

function tipoCampo(tipoControle) {
  if (tipoControle === 'Grupo de Checkbox' || tipoControle === 'Combobox com múltiplas opções') {
    return 'multipla';
  }
  return 'unica';
}

function campoObrigatorio(tipo) {
  return tipo === 'unica' || tipo === 'grupo' || tipo === 'medida';
}

/**
 * Monta o payload curto enviado à IA e o mapa local chave → valor do laudo.
 */
export function montarPedidoEscolhaAutomatica(fraseId, titulo, resultado) {
  const elementos = resultado?.elementosOrdenados || [];
  const contagem = {};
  elementos.forEach((el) => {
    if (el.tipo === 'variavel') {
      const tituloVar = el.dados?.tituloVariavel;
      contagem[tituloVar] = (contagem[tituloVar] || 0) + 1;
    }
  });

  const vistos = {};
  const campos = [];
  const mapa = {};
  let seq = 0;

  const registrar = (chave, tipo, opcoes, rotulo) => {
    const id = tipo === 'medida' ? `m${seq}` : `c${seq}`;
    seq += 1;
    const opcoesPayload = opcoes.map((op, index) => ({
      id: `o${index}`,
      rotulo: op.rotulo,
    }));
    campos.push({
      id,
      rotulo: rotulo || chave,
      tipo,
      opcoes: tipo === 'medida' ? [] : opcoesPayload,
    });
    mapa[id] = {
      chave,
      tipo,
      rotulo: rotulo || chave,
      opcoes: Object.fromEntries(
        opcoesPayload.map((op, index) => [op.id, {
          valor: opcoes[index].valor,
          numero: opcoes[index].numero,
        }]),
      ),
    };
  };

  elementos.forEach((el) => {
    if (el.tipo === 'variavel') {
      const tituloVar = el.dados?.tituloVariavel;
      const aparicoes = contagem[tituloVar] || 1;
      const pos = vistos[tituloVar] || 0;
      vistos[tituloVar] = pos + 1;
      const chave = aparicoes > 1 ? `${tituloVar}_${pos}` : tituloVar;
      const valores = el.dados?.variavel?.valores || [];
      registrar(
        chave,
        tipoCampo(el.dados?.variavel?.tipo),
        valores.map((v) => ({
          rotulo: v.descricao || v.valor,
          valor: v.valor,
          numero: v.numero,
        })),
        aparicoes > 1 ? `${tituloVar} (${pos + 1})` : tituloVar,
      );
    } else if (el.tipo === 'variavelLocal') {
      const local = el.dados;
      const valores = local?.variavel?.valores || [];
      const controle = local?.variavel?.controle || local?.variavel?.tipo;
      registrar(
        local.textoOriginal,
        tipoCampo(controle),
        valores.map((v) => ({
          rotulo: v.descricao || v.valor,
          valor: v.valor,
          numero: v.numero,
        })),
        local.tituloVariavel || local?.variavel?.label || 'Variável local',
      );
    } else if (el.tipo === 'grupo') {
      const opcoes = el.dados?.opcoes || [];
      registrar(
        el.dados.textoOriginal,
        'grupo',
        opcoes.map((op) => ({ rotulo: op, valor: op })),
        'Grupo de opções',
      );
    } else if (el.tipo === 'medida') {
      registrar('$', 'medida', [], `Medida ${((el.dados?.indice ?? 0) + 1)}`);
    }
  });

  return {
    pedido: {
      id: fraseId,
      titulo: titulo || '',
      campos,
    },
    mapa,
  };
}

export function aplicarEscolhasAutomaticas(mapa, escolhas) {
  const porCampo = {};
  (escolhas || []).forEach((escolha) => {
    if (escolha?.campo) porCampo[escolha.campo] = escolha;
  });

  const valores = {};
  const medidas = [];
  const faltando = [];
  const resumo = [];
  let temMedida = false;
  let soma = 0;
  let temNumero = false;

  const somarOpcao = (opcao) => {
    const n = parseNumeroOpcao(opcao?.numero);
    if (n !== null) {
      soma += n;
      temNumero = true;
    }
  };

  Object.entries(mapa).forEach(([campoId, info]) => {
    const escolha = porCampo[campoId];
    if (info.tipo === 'medida') {
      temMedida = true;
      const texto = String(escolha?.texto || '').trim();
      if (!texto) {
        faltando.push('medida');
        medidas.push('');
        return;
      }
      medidas.push(texto);
      resumo.push(texto);
      return;
    }

    const ids = Array.isArray(escolha?.opcoes) ? escolha.opcoes : [];
    const opcoesEscolhidas = ids.map((id) => info.opcoes[id]).filter((op) => op && op.valor != null && op.valor !== '');
    if (info.tipo === 'multipla') {
      if (opcoesEscolhidas.length) {
        const textos = opcoesEscolhidas.map((op) => op.valor);
        opcoesEscolhidas.forEach(somarOpcao);
        const ultimo = textos[textos.length - 1];
        valores[info.chave] = textos.length === 1
          ? ultimo
          : `${textos.slice(0, -1).join(', ')} e ${ultimo}`;
        resumo.push(valores[info.chave]);
      } else {
        valores[info.chave] = '';
      }
      return;
    }

    if (!opcoesEscolhidas.length) {
      if (campoObrigatorio(info.tipo)) faltando.push(info.rotulo || info.chave);
      return;
    }
    valores[info.chave] = opcoesEscolhidas[0].valor;
    somarOpcao(opcoesEscolhidas[0]);
    resumo.push(opcoesEscolhidas[0].valor);
  });

  if (temMedida) {
    const preenchidas = medidas.filter((m) => m);
    if (preenchidas.length === medidas.length) {
      valores.$ = medidas.length === 1 ? medidas[0] : medidas;
    }
  }

  return {
    completo: faltando.length === 0,
    faltando,
    valores,
    soma: temNumero ? soma : 0,
    resumo: resumo.filter(Boolean).join(' · '),
  };
}
