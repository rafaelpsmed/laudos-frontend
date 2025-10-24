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
  atalhoTeclado = 'Shift+A',
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
  const adicionarPontuacao = useCallback((texto) => {
    let textoProcessado = texto.trim();
    
    // Substitui palavras por pontuação
    // \b é um ancorador que indica o limite da palavra
    textoProcessado = textoProcessado.replace(/vírgula\b/gi, ',');
    textoProcessado = textoProcessado.replace(/virgula\b/gi, ',');
    textoProcessado = textoProcessado.replace(/ponto final\b/gi, '.');
    textoProcessado = textoProcessado.replace(/ponto e vírgula\b/gi, ';');
    textoProcessado = textoProcessado.replace(/ponto e virgula\b/gi, ';');
    textoProcessado = textoProcessado.replace(/hífen\b/gi, '-');
    textoProcessado = textoProcessado.replace(/hifen\b/gi, '-');
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
    
    return textoProcessado + ' ';
  }, []);

  /**
   * Insere o texto acumulado no editor ou textarea
   */
  const insertAccumulatedText = useCallback(() => {
    const texto = accumulatedTextRef.current.trim();
    
    if (!texto) {
      // console.log('⚠️ Nenhum texto acumulado para inserir');
      return;
    }

    // console.log('📝 Inserindo texto acumulado:', texto);
    const textoProcessado = adicionarPontuacao(texto);
    
    // Se há editor TipTap
    if (editorRef.current) {
      try {
        const { from } = editorRef.current.state.selection;
        editorRef.current.chain()
          .focus()
          .insertContentAt(from, textoProcessado)
          .run();
        // console.log('✅ Texto inserido no editor:', textoProcessado);
      } catch (error) {
        console.error('❌ Erro ao inserir no editor:', error);
      }
    } 
    // Se há textarea com estado controlado
    else if (setTextoStateRef.current) {
      const textoFinal = textoStateRef.current + ' ' + textoProcessado;
      setTextoStateRef.current(textoFinal);
      // console.log('✅ Texto inserido em textarea');
    }

    // Callback de conclusão
    if (onTranscriptionComplete) {
      onTranscriptionComplete(textoProcessado);
    }

    // Limpa texto acumulado e preview
    accumulatedTextRef.current = '';
    setPreviewText('');
  }, [adicionarPontuacao, onTranscriptionComplete]);

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
      
      // Verifica se o atalho corresponde
      let atalhoMatch = true;
      
      if (atalhoPartes.includes('shift') && !event.shiftKey) atalhoMatch = false;
      if (atalhoPartes.includes('ctrl') && !event.ctrlKey) atalhoMatch = false;
      if (atalhoPartes.includes('alt') && !event.altKey) atalhoMatch = false;
      
      // Pega a tecla principal (última parte do atalho)
      const teclaPrincipal = atalhoPartes[atalhoPartes.length - 1];
      
      if (atalhoMatch && (event.key.toLowerCase() === teclaPrincipal || event.code.toLowerCase().includes(teclaPrincipal))) {
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

