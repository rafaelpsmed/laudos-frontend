import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Hook customizado para transcrição de áudio para texto com reconhecimento de voz
 * 
 * @param {Object} options - Opções de configuração
 * @param {Object} options.editor - Instância do editor TipTap (opcional, para TextEditor)
 * @param {string} options.textoState - Estado do texto atual (opcional, para textarea)
 * @param {Function} options.setTextoState - Função para atualizar o estado do texto (opcional, para textarea)
 * @param {string} options.atalhoTeclado - Atalho de teclado para iniciar/parar gravação (padrão: 'Shift+A')
 * @param {number} options.pauseDelay - Tempo de pausa em ms antes de inserir texto (padrão: 2000ms = 2s)
 * @param {Function} options.onTranscriptionComplete - Callback executado quando a transcrição é concluída
 * 
 * @returns {Object} - Objeto com estados e funções para controle da transcrição
 */
export const useAudioTranscription = ({
  editor = null,
  textoState = '',
  setTextoState = null,
  atalhoTeclado = 'Escape',
  // atalhoTeclado = 'Ctrl+Shift+Q',
  pauseDelay = 2000,
  onTranscriptionComplete = null
} = {}) => {
  // Estados
  const [isRecording, setIsRecording] = useState(false);
  const [recognition, setRecognition] = useState(null);
  const [previewText, setPreviewText] = useState('');
  
  // Refs
  const paradaIntencionalRef = useRef(false);
  const editorRef = useRef(editor);
  const textoStateRef = useRef(textoState);
  const setTextoStateRef = useRef(setTextoState);
  const isRecordingRef = useRef(isRecording);
  const pauseTimerRef = useRef(null); // Timer para detectar pausa
  const accumulatedTextRef = useRef(''); // Texto acumulado

  // Atualiza refs quando os valores mudam
  useEffect(() => {
    editorRef.current = editor;
    textoStateRef.current = textoState;
    setTextoStateRef.current = setTextoState;
    isRecordingRef.current = isRecording;
  }, [editor, textoState, setTextoState, isRecording]);

  /**
   * Adiciona pontuação ao texto baseado em comandos de voz
   * 
   * @param {string} texto - Texto a ser processado
   * @returns {string} - Texto processado com pontuação
   */
  const adicionarPontuacao = useCallback((texto, forcarMaiuscula = false, precisaEspaco = true) => {
    let textoProcessado = texto.trim();
    
    // Substitui palavras por pontuação
    // \b é um ancorador que indica o limite da palavra
    textoProcessado = textoProcessado.replace(/\s*vírgula\s*\b/gi, ', ');
    textoProcessado = textoProcessado.replace(/\s*virgula\s*\b/gi, ', ');
    textoProcessado = textoProcessado.replace(/\s*ponto final\s*\b/gi, '. ');
    textoProcessado = textoProcessado.replace(/\s*ponto e vírgula\s*\b/gi, '; ');
    textoProcessado = textoProcessado.replace(/\s*ponto e virgula\s*\b/gi, '; ');
    textoProcessado = textoProcessado.replace(/hífen\b/gi, '- ');
    textoProcessado = textoProcessado.replace(/hifen\b/gi, '- ');
    textoProcessado = textoProcessado.replace(/nova linha\b/gi, '\n');
    textoProcessado = textoProcessado.replace(/próxima linha\b/gi, '\n');
    textoProcessado = textoProcessado.replace(/parágrafo\b/gi, '\n');
    
    // Capitaliza primeira letra após ponto final
    textoProcessado = textoProcessado.replace(/\.\s+([a-z])/g, (match, letter) => {
      return '. ' + letter.toUpperCase();
    });
    
    // Capitaliza primeira letra após hífen
    textoProcessado = textoProcessado.replace(/-\s+([a-z])/g, (match, letter) => {
      return '- ' + letter.toUpperCase();
    });

    // Capitaliza a primeira letra se o contexto exigir (ex: início de frase)
    if (forcarMaiuscula && textoProcessado.length > 0) {
      const primeiraLetra = textoProcessado.charAt(0).toUpperCase();
      textoProcessado = primeiraLetra + textoProcessado.slice(1);
    }
    
    // Adiciona espaço no início se necessário
    return (precisaEspaco ? ' ' : '') + textoProcessado;
  }, []);

  /**
   * Função para corrigir texto usando Groq (Llama 3)
   */
  const corrigirTextoComGroq = useCallback(async (texto, deveCapitalizar) => {
    const apiKey = import.meta.env.VITE_GROQ_API_KEY; // Ler do .env
    
    if (!apiKey) return null; // Sem chave, retorna null para usar fallback

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile", // Modelo muito rápido e gratuito
          messages: [
            {
              role: "system",
              content: `Você é um assistente especialista em corrigir transcrições de laudos médicos radiológicos em português. 
              Sua tarefa é apenas pontuar corretamente, e corrigir a gramática e os termos técnicos radiológicos do texto fornecido.
              Regras:
              1. NÃO adicione nenhum texto extra, explicação ou "Aqui está". Retorne APENAS o texto corrigido.
              2. Mantenha o sentido técnico médico e radiológico.
              3. Insira vírgulas, pontos e outros sinais de pontuação onde gramaticalmente necessário.
              4. As medidas devem ser em centímetros, a menos que seja especificado outro tipo de medida, e devem estar no seguinte formato: A x B cm (A e B são as medidas). Ordenar as medidas da maior para a menor.

              

              6. ${deveCapitalizar ? 'Comece a frase com letra Maiúscula.' : 'Mantenha a caixa alta/baixa original da primeira palavra, a menos que seja nome próprio.'}`
            },
            // 5. Se for pedido para calcular o volume, deve ser calculado o volume em centímetros cúbicos, dessa forma: A*B*C*0.523 e deve ser colocado no seguinte formato: A x B x C cm³ (A, B e C são as medidas). 
            // Ordenar as medidas da maior para a menor. Não precisa mostar a fórmula do cálculo do volume.
            {
              role: "user",
              content: texto
            }
          ],
          temperature: 0.1, // Baixa temperatura para ser mais determinístico
          max_tokens: 1024
        })
      });

      const data = await response.json();
      if (data.choices && data.choices[0]) {
        return data.choices[0].message.content.trim();
      }
      return null;
    } catch (error) {
      console.error('Erro ao chamar Groq:', error);
      return null; // Em caso de erro, usa o fallback
    }
  }, []);

  /**
   * Insere o texto acumulado no editor ou textarea
   */
  const insertAccumulatedText = useCallback(async () => {
    const texto = accumulatedTextRef.current.trim();
    
    if (!texto) {
      return;
    }

    // Determina se deve capitalizar baseado no contexto anterior
    let deveCapitalizar = false;
    let precisaEspaco = true;

    if (editorRef.current) {
      const { state } = editorRef.current;
      const { from } = state.selection;
      
      // Se é o início do documento
      if (from <= 1) {
        deveCapitalizar = true;
        precisaEspaco = false;
      } else {
        // Verifica se é início de bloco/parágrafo
        const $pos = state.doc.resolve(from);
        const isStartOfBlock = $pos.parentOffset === 0;

        // Pega os últimos caracteres antes do cursor para capitalização
        const textoAnterior = state.doc.textBetween(Math.max(0, from - 5), from, '\n', ' ');
        
        // Verifica se termina com pontuação que exige maiúscula (. ? ! -) OU se é início de parágrafo
        if (/[.?!-]\s*$/.test(textoAnterior) || isStartOfBlock) {
          deveCapitalizar = true;
        }

        // Pega apenas o último caractere para verificação de espaço
        const ultimoCaractere = state.doc.textBetween(Math.max(0, from - 1), from, '\n', '\n');
        
        // Se o último caractere for espaço OU se for início de um bloco (nova linha), NÃO precisa de espaço
        if (/\s$/.test(ultimoCaractere) || isStartOfBlock) {
          precisaEspaco = false;
        }
      }
    } else if (textoStateRef.current) {
      const textoAnterior = textoStateRef.current;
      if (!textoAnterior || /[.?!]\s*$/.test(textoAnterior.trim())) {
        deveCapitalizar = true;
      }
      if (!textoAnterior || /\s$/.test(textoAnterior)) {
        precisaEspaco = false;
      }
    }

    // Tenta corrigir com IA
    let textoFinal = null;
    
    const textoIA = await corrigirTextoComGroq(texto, deveCapitalizar);
    
    if (textoIA) {
        // Se a IA retornou sucesso, usamos o texto dela
        // A IA já deve ter capitalizado se pedimos, mas o espaço inicial nós controlamos
        textoFinal = (precisaEspaco ? ' ' : '') + textoIA;
    } else {
        // Fallback: Se não tem chave ou deu erro, usa o método antigo (Regex)
        textoFinal = adicionarPontuacao(texto, deveCapitalizar, precisaEspaco);
    }

    // Se há editor TipTap
    if (editorRef.current) {
      try {
        const { from } = editorRef.current.state.selection;
        editorRef.current.chain()
          .focus()
          .insertContentAt(from, textoFinal)
          .run();
      } catch (error) {
        console.error('❌ Erro ao inserir no editor:', error);
      }
    } 
    // Se há textarea com estado controlado
    else if (setTextoStateRef.current) {
      const conteudoAtual = textoStateRef.current || '';
      const novoConteudo = conteudoAtual + textoFinal;
      setTextoStateRef.current(novoConteudo);
    }

    // Callback de conclusão
    if (onTranscriptionComplete) {
      onTranscriptionComplete(textoFinal);
    }

    // Limpa texto acumulado e preview
    accumulatedTextRef.current = '';
    setPreviewText('');
  }, [adicionarPontuacao, onTranscriptionComplete, corrigirTextoComGroq]);

  /**
   * Alterna o estado de gravação (inicia ou para)
   */
  const toggleRecording = useCallback(() => {
    // console.log('🎤 toggleRecording chamado. isRecording:', isRecording, 'recognition:', recognition);
    
    if (!recognition) {
      console.error('❌ Recognition não disponível');
      alert('Seu navegador não suporta reconhecimento de voz.');
      return;
    }

    if (isRecording) {
      // console.log('⏹️ Parando gravação');
      
      // Cancela timer de pausa se houver
      if (pauseTimerRef.current) {
        clearTimeout(pauseTimerRef.current);
        pauseTimerRef.current = null;
      }
      
      // Insere qualquer texto pendente antes de parar
      if (accumulatedTextRef.current.trim()) {
        insertAccumulatedText();
      }
      
      // Marca que a parada é intencional
      paradaIntencionalRef.current = true;
      recognition.stop();
      setIsRecording(false);
      setPreviewText('');
      accumulatedTextRef.current = '';
    } else {
      try {
        // console.log('▶️ Iniciando gravação');
        // Marca que a gravação está iniciando (não é parada intencional)
        paradaIntencionalRef.current = false;
        accumulatedTextRef.current = '';
        
        // Se há editor, coloca o foco nele (usa ref)
        if (editorRef.current) {
          // console.log('✅ Editor disponível, focando...');
          editorRef.current.commands.focus();
        }
        
        recognition.start();
        setIsRecording(true);
        setPreviewText('');
        // console.log('✅ Gravação iniciada com sucesso');
      } catch (error) {
        console.error('❌ Erro ao iniciar gravação:', error);
        if (error.name === 'NotAllowedError') {
          alert('Por favor, permita o acesso ao microfone para usar esta função.');
        } else {
          console.error('Erro ao iniciar gravação:', error);
          alert('Erro ao iniciar a gravação. Por favor, tente novamente.');
        }
        setIsRecording(false);
      }
    }
  }, [recognition, isRecording, insertAccumulatedText]);

  /**
   * Para a gravação (útil para chamar externamente)
   */
  const stopRecording = useCallback(() => {
    if (isRecording && recognition) {
      // Cancela timer se houver
      if (pauseTimerRef.current) {
        clearTimeout(pauseTimerRef.current);
        pauseTimerRef.current = null;
      }
      
      // Insere texto pendente
      if (accumulatedTextRef.current.trim()) {
        insertAccumulatedText();
      }
      
      paradaIntencionalRef.current = true;
      recognition.stop();
      setIsRecording(false);
      setPreviewText('');
      accumulatedTextRef.current = '';
    }
  }, [isRecording, recognition, insertAccumulatedText]);

  /**
   * Inicia a gravação (útil para chamar externamente)
   */
  const startRecording = useCallback(() => {
    if (!isRecording && recognition) {
      try {
        paradaIntencionalRef.current = false;
        accumulatedTextRef.current = '';
        
        if (editorRef.current) {
          editorRef.current.commands.focus();
        }
        
        recognition.start();
        setIsRecording(true);
        setPreviewText('');
      } catch (error) {
        console.error('Erro ao iniciar gravação:', error);
        setIsRecording(false);
      }
    }
  }, [isRecording, recognition]);

  // Configuração do reconhecimento de voz com a NOVA ESTRATÉGIA
  useEffect(() => {
    // console.log('🔧 Configurando reconhecimento de voz com estratégia de pausa...');
    // console.log('⏱️ Tempo de pausa configurado:', pauseDelay, 'ms');
    
    if (!('webkitSpeechRecognition' in window)) {
      console.warn('❌ Reconhecimento de voz não suportado neste navegador');
      return;
    }

    const recognitionInstance = new window.webkitSpeechRecognition();
    recognitionInstance.continuous = true; // ✅ SEMPRE contínuo agora
    recognitionInstance.interimResults = true;
    recognitionInstance.lang = 'pt-BR';
    
    // console.log('✅ Reconhecimento criado em modo CONTÍNUO');

    recognitionInstance.onstart = () => {
      // console.log('🎙️ Reconhecimento INICIADO');
    };

    recognitionInstance.onresult = (event) => {
      // console.log('📝 onresult disparado. Resultados:', event.results.length);
      
      // Cancela o timer anterior (usuário ainda está falando)
      if (pauseTimerRef.current) {
        // console.log('⏰ Timer de pausa cancelado - usuário ainda está falando');
        clearTimeout(pauseTimerRef.current);
        pauseTimerRef.current = null;
      }
      
      // Pega o último resultado (mais recente)
      const lastResult = event.results[event.results.length - 1];
      const transcript = lastResult[0].transcript;
      
      if (lastResult.isFinal) {
        // console.log('✅ Resultado FINAL:', transcript);
        // Adiciona ao texto acumulado
        accumulatedTextRef.current += ' ' + transcript;
      } else {
        // console.log('⏳ Resultado intermediário:', transcript);
        // Não adiciona ao acumulado ainda, mas mostra no preview
      }
      
      // Atualiza o preview com texto acumulado + intermediário
      const previewTexto = (accumulatedTextRef.current + ' ' + (!lastResult.isFinal ? transcript : '')).trim();
      setPreviewText(previewTexto);
      // console.log('👁️ Preview atualizado:', previewTexto);
      
      // ✅ NOVA ESTRATÉGIA: Inicia timer de pausa
      pauseTimerRef.current = setTimeout(() => {
        // console.log(`⏰ ${pauseDelay}ms de pausa detectado - inserindo texto automaticamente`);
        insertAccumulatedText();
        pauseTimerRef.current = null;
      }, pauseDelay);
      
      // console.log('⏰ Timer de pausa iniciado:', pauseDelay, 'ms');
    };

    recognitionInstance.onerror = (event) => {
      console.error('❌ Erro no reconhecimento:', event.error);
      
      // Cancela timer se houver erro
      if (pauseTimerRef.current) {
        clearTimeout(pauseTimerRef.current);
        pauseTimerRef.current = null;
      }
      
      // 'aborted' não é um erro real, é apenas quando o usuário para manualmente
      if (event.error === 'aborted') {
        paradaIntencionalRef.current = true;
      } else {
        console.error('Erro no reconhecimento de voz:', event.error);
      }
      setIsRecording(false);
    };
    
    recognitionInstance.onend = () => {
      // console.log('🔚 Reconhecimento terminou. isRecording:', isRecordingRef.current, 'paradaIntencional:', paradaIntencionalRef.current);
      
      // Cancela timer se houver
      if (pauseTimerRef.current) {
        clearTimeout(pauseTimerRef.current);
        pauseTimerRef.current = null;
      }
      
      // Se a parada foi intencional, não reinicia
      if (paradaIntencionalRef.current) {
        // console.log('✋ Parada intencional');
        setIsRecording(false);
        return;
      }
      
      // Se ainda está gravando, reinicia automaticamente
      if (isRecordingRef.current) {
        // console.log('🔄 Reconhecimento encerrado inesperadamente, reiniciando...');
        setTimeout(() => {
          try {
            recognitionInstance.start();
            // console.log('✅ Reconhecimento reiniciado');
          } catch (error) {
            console.error('❌ Erro ao reiniciar:', error);
            setIsRecording(false);
          }
        }, 100);
      } else {
        // console.log('⏹️ Gravação encerrada');
      }
    };

    setRecognition(recognitionInstance);
    // console.log('✅ Recognition configurado e salvo no estado');

    // Cleanup
    return () => {
      if (pauseTimerRef.current) {
        clearTimeout(pauseTimerRef.current);
      }
      if (recognitionInstance) {
        try {
          recognitionInstance.stop();
        } catch (error) {
          // Ignora erro se já estiver parado
        }
      }
    };
  }, [pauseDelay, insertAccumulatedText]);

  // Atalhos de teclado para gravar/parar áudio e inserir texto
  useEffect(() => {
    const handleKeyDown = (event) => {
      // ✅ NOVO: Enter durante gravação = insere texto imediatamente
      if (event.key === 'Enter' && isRecordingRef.current && accumulatedTextRef.current.trim()) {
        // console.log('⏎ Enter pressionado - inserindo texto imediatamente');
        event.preventDefault();
        
        // Cancela o timer de pausa se houver
        if (pauseTimerRef.current) {
          clearTimeout(pauseTimerRef.current);
          pauseTimerRef.current = null;
        }
        
        // Insere o texto acumulado
        insertAccumulatedText();
        return;
      }
      
      // Ignora se a tecla pressionada é apenas uma modificadora sozinha
      if (event.key === 'Alt' || event.key === 'Control' || event.key === 'Shift' || event.key === 'Meta') {
        return;
      }
      
      // Parse do atalho de teclado
      const atalhoPartes = atalhoTeclado.split('+').map(k => k.trim().toLowerCase());
      
      // Pega a tecla principal (última parte do atalho)
      const teclaPrincipal = atalhoPartes[atalhoPartes.length - 1];
      
      // Verifica se o atalho corresponde
      let atalhoMatch = true;
      
      // Verifica modificadores - devem estar pressionados se necessários, e soltos se não necessários
      if (atalhoPartes.includes('shift')) {
        if (!event.shiftKey) atalhoMatch = false;
      } else {
        if (event.shiftKey) atalhoMatch = false;
      }
      
      if (atalhoPartes.includes('ctrl') || atalhoPartes.includes('control')) {
        if (!event.ctrlKey) atalhoMatch = false;
      } else {
        if (event.ctrlKey) atalhoMatch = false;
      }
      
      if (atalhoPartes.includes('alt')) {
        if (!event.altKey) atalhoMatch = false;
      } else {
        if (event.altKey) atalhoMatch = false;
      }
      
      // Verifica a tecla principal
      if (atalhoMatch && event.key.toLowerCase() === teclaPrincipal) {
        event.preventDefault();
        toggleRecording();
      }
    };

    // Adiciona o listener
    window.addEventListener('keydown', handleKeyDown);

    // Remove o listener quando o componente desmontar
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [toggleRecording, atalhoTeclado, insertAccumulatedText]);

  return {
    // Estados
    isRecording,
    previewText,
    recognition,
    
    // Funções
    toggleRecording,
    stopRecording,
    startRecording,
    adicionarPontuacao,
  };
};

export default useAudioTranscription;
