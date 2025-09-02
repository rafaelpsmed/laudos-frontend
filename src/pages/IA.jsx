import { Container, Title, Text, Paper, Group, Button, Textarea, Stack, Divider, Alert, NavLink, Checkbox, TextInput, Grid } from '@mantine/core';
import { IconBrain, IconSparkles, IconRobot, IconWand, IconAlertCircle, IconCheck, IconFolder, IconFile, IconMicrophone, IconMicrophoneOff } from '@tabler/icons-react';
import { useState, useRef, useEffect } from 'react';
import Layout from '../components/Layout';
import TextEditor from '../components/TextEditor';
import MetodosSelect from '../components/MetodosSelect';
import TituloCombobox from '../components/TituloCombobox';
import api from '../api';
import { marked } from 'marked';

function IA() {
    const [showGeracaoLaudo, setShowGeracaoLaudo] = useState(false);
    const [showSugestoes, setShowSugestoes] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isGeneratingSugestoes, setIsGeneratingSugestoes] = useState(false);
    const [laudoGerado, setLaudoGerado] = useState('');
    const [erro, setErro] = useState('');
    const [sucesso, setSucesso] = useState('');
    const [erroSugestoes, setErroSugestoes] = useState('');
    const [sucessoSugestoes, setSucessoSugestoes] = useState('');
    const [textoSugestoes, setTextoSugestoes] = useState('');
    const [showAnaliseTexto, setShowAnaliseTexto] = useState(true); // Iniciar com Laudo Radiológico ativo
    const [isGeneratingAnalise, setIsGeneratingAnalise] = useState(false);
    const [erroAnalise, setErroAnalise] = useState('');
    const [sucessoAnalise, setSucessoAnalise] = useState('');
    const [textoAnalise, setTextoAnalise] = useState('');
    const [laudoCopiado, setLaudoCopiado] = useState(false);
    const editorRef = useRef(null);
    const editorSugestoesRef = useRef(null);
    const editorAnaliseRef = useRef(null);

    // Estados para seleção de modelo
    const [metodosModelo, setMetodosModelo] = useState([]);
    const [titulo, setTitulo] = useState('');
    const [titulosDisponiveis, setTitulosDisponiveis] = useState([]);
    const [modeloSelecionado, setModeloSelecionado] = useState(null);

    // Estados para seleção de frases
    const [todasFrases, setTodasFrases] = useState([]);
    const [treeData, setTreeData] = useState([]);
    const [frasesSelecionadas, setFrasesSelecionadas] = useState([]);
    const [searchFrases, setSearchFrases] = useState('');

    // Campo de ajustes
    const [ajustesText, setAjustesText] = useState('');

    // Estados para funcionalidade de áudio para texto
    const [ultimoResultadoIndex, setUltimoResultadoIndex] = useState(0);
    const [isRecordingAudio, setIsRecordingAudio] = useState(false);
    const [recognitionAudio, setRecognitionAudio] = useState(null);
    const [previewTextAudio, setPreviewTextAudio] = useState('');
    

    // Função para copiar texto para a área de transferência
    const copiarParaAreaTransferencia = async (texto) => {
        try {
            await navigator.clipboard.writeText(texto);
            setLaudoCopiado(true);
            console.log('Laudo copiado para área de transferência');
            
            // Resetar a mensagem após 3 segundos
            setTimeout(() => {
                setLaudoCopiado(false);
            }, 3000);
        } catch (error) {
            console.error('Erro ao copiar para área de transferência:', error);
            // Fallback para navegadores mais antigos
            try {
                const textArea = document.createElement('textarea');
                textArea.value = texto;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                setLaudoCopiado(true);
                console.log('Laudo copiado usando fallback');
                
                setTimeout(() => {
                    setLaudoCopiado(false);
                }, 3000);
            } catch (fallbackError) {
                console.error('Erro no fallback de cópia:', fallbackError);
            }
        }
    };

    // Função para converter Markdown para HTML
    const converterMarkdownParaHTML = (textoMarkdown) => {
        if (!textoMarkdown) return '';
        
        try {
            // Configurar marked para gerar HTML limpo
            marked.setOptions({
                breaks: true, // Converte \n para <br>
                gfm: true,    // GitHub Flavored Markdown
                sanitize: false // Permitir HTML
            });
            
            // Converter Markdown para HTML
            const html = marked(textoMarkdown);
            
            // Aplicar estilos CSS para manter formatação consistente e rica
            const htmlFormatado = `
                <div style="font-family: Arial, sans-serif; font-size: 12pt; line-height: 1.5; text-align: justify;">
                    <style>
                        .markdown-content h1, .markdown-content h2, .markdown-content h3, 
                        .markdown-content h4, .markdown-content h5, .markdown-content h6 {
                            font-weight: bold;
                            margin: 1em 0 0.5em 0;
                            color: #2c3e50;
                        }
                        .markdown-content h1 { font-size: 18pt; }
                        .markdown-content h2 { font-size: 16pt; }
                        .markdown-content h3 { font-size: 14pt; }
                        .markdown-content strong, .markdown-content b { font-weight: bold; }
                        .markdown-content em, .markdown-content i { font-style: italic; }
                        .markdown-content ul, .markdown-content ol { 
                            margin: 0.5em 0; 
                            padding-left: 2em; 
                        }
                        .markdown-content li { margin: 0.3em 0; }
                        .markdown-content blockquote {
                            border-left: 4px solid #3498db;
                            margin: 1em 0;
                            padding-left: 1em;
                            font-style: italic;
                            color: #7f8c8d;
                        }
                        .markdown-content code {
                            background-color: #f8f9fa;
                            padding: 0.2em 0.4em;
                            border-radius: 3px;
                            font-family: 'Courier New', monospace;
                            font-size: 11pt;
                        }
                        .markdown-content pre {
                            background-color: #f8f9fa;
                            padding: 1em;
                            border-radius: 5px;
                            overflow-x: auto;
                            border: 1px solid #e9ecef;
                        }
                        .markdown-content table {
                            border-collapse: collapse;
                            width: 100%;
                            margin: 1em 0;
                        }
                        .markdown-content th, .markdown-content td {
                            border: 1px solid #dee2e6;
                            padding: 0.5em;
                            text-align: left;
                        }
                        .markdown-content th {
                            background-color: #f8f9fa;
                            font-weight: bold;
                        }
                    </style>
                    <div class="markdown-content">
                        ${html}
                    </div>
                </div>
            `;
            
            return htmlFormatado;
        } catch (error) {
            console.error('Erro ao converter Markdown para HTML:', error);
            // Fallback: retornar texto simples com quebras de linha
            return textoMarkdown.replace(/\n/g, '<br>');
        }
    };

    // Função para alternar gravação de áudio
    const toggleRecordingAudio = () => {
        if (!recognitionAudio) {
            alert('Seu navegador não suporta reconhecimento de voz.');
            return;
        }

        if (isRecordingAudio) {
            recognitionAudio.stop();
            setIsRecordingAudio(false);
            setPreviewTextAudio('');
            setUltimoResultadoIndex(0); // Resetar índice ao parar
            console.log('Gravação parada manualmente pelo usuário');
        } else {
            try {
                setUltimoResultadoIndex(0); // Resetar índice ao iniciar
                recognitionAudio.start();
                setIsRecordingAudio(true);
                setPreviewTextAudio('');
                console.log('Gravação iniciada - reconhecimento contínuo ativo');
            } catch (error) {
                if (error.name === 'NotAllowedError') {
                    alert('Por favor, permita o acesso ao microfone para usar esta função.');
                } else {
                    console.error('Erro ao iniciar gravação:', error);
                    alert('Erro ao iniciar a gravação. Por favor, tente novamente.');
                }
                setIsRecordingAudio(false);
            }
        }
    };

 // Função para adicionar pontuação
    const adicionarPontuacao = (texto) => {
        let textoProcessado = texto.trim();
        
            // Substitui palavras por pontuação
        // textoProcessado = textoProcessado.replace(/\b vírgula\b/gi, ',');
        // textoProcessado = textoProcessado.replace(/\b virgula\b/gi, ',');
        //explicação: \b é um ancorador que indica que a palavra deve começar no início da linha ou no final da linha
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
    };

    // Implementação do reconhecimento de voz para a textarea
    useEffect(() => {
        if ('webkitSpeechRecognition' in window) {
            const recognition = new window.webkitSpeechRecognition();
            recognition.continuous = true; // Manter reconhecimento contínuo
            recognition.interimResults = true;
            recognition.lang = 'pt-BR';

            recognition.onresult = (event) => {
                let finalTranscript = '';
                let interimTranscript = '';

                // Processa apenas os resultados novos (não processados anteriormente)
                for (let i = ultimoResultadoIndex; i < event.results.length; i++) {
                    const result = event.results[i];
                    const transcript = result[0].transcript;

                    if (result.isFinal) {
                        finalTranscript += transcript + ' ';
                    } else {
                        interimTranscript += transcript;
                    }
                }

                // Log para debug
                if (finalTranscript.trim() || interimTranscript.trim()) {
                    console.log('Reconhecimento ativo - processando áudio...');
                    console.log(`Resultados: ${event.results.length}, Índice atual: ${ultimoResultadoIndex}`);
                    console.log(`Final: "${finalTranscript.trim()}", Intermediário: "${interimTranscript.trim()}"`);
                }

                // Atualiza o índice do último resultado processado
                setUltimoResultadoIndex(event.results.length);

                // Atualiza o preview com o texto atual
                // Se há resultado final, mostra o texto processado + intermediário
                // Se não há resultado final, mostra apenas o intermediário
                let previewText = '';
                if (finalTranscript.trim()) {
                    const textoProcessado = adicionarPontuacao(finalTranscript.trim());
                    previewText = textoProcessado + interimTranscript;
                } else {
                    previewText = interimTranscript;
                }
                setPreviewTextAudio(previewText);

                // Se há resultado final, insere na textarea
                if (finalTranscript.trim()) {
                    // Captura o texto atual da textarea
                    const textoAtualTextarea = textoAnalise;
                    
                    // Processa o texto falado (adiciona pontuação)
                    const textoProcessado = adicionarPontuacao(finalTranscript.trim());

                    console.log("=== DEBUG ÁUDIO PARA TEXTO ===");
                    console.log("Texto atual da textarea:", textoAtualTextarea);
                    console.log("Texto falado (processado):", textoProcessado);
                    
                    // Adiciona o texto processado ao final da textarea
                    const textoFinal = textoAtualTextarea + ' ' + textoProcessado;
                    setTextoAnalise(textoFinal);
                    
                    console.log("Texto final da textarea:", textoFinal);
                    console.log("================================");

                    // NÃO limpa o preview - mantém para continuar mostrando em tempo real
                    // setPreviewTextAudio(''); // REMOVIDO
                    
                    // Com continuous: true, o reconhecimento continua automaticamente
                    // Não é necessário reiniciar ou resetar índices
                }
            };

            recognition.onerror = (event) => {
                console.error('Erro no reconhecimento de voz:', event.error);
                setIsRecordingAudio(false);
            };

            recognition.onend = () => {
                console.log('Reconhecimento de áudio terminou');
                // Com continuous: true, o reconhecimento deve continuar automaticamente
                // Se parou, pode ser um erro ou o usuário parou manualmente
                if (isRecordingAudio) {
                    console.log('Reconhecimento parou inesperadamente - tentando reiniciar...');
                    // Apenas em caso de erro, tenta reiniciar uma vez
                    setTimeout(() => {
                        try {
                            recognition.start();
                        } catch (error) {
                            console.error('Erro ao reiniciar reconhecimento:', error);
                            setIsRecordingAudio(false);
                        }
                    }, 100);
                }
            };

            setRecognitionAudio(recognition);
        }
    }, [textoAnalise, isRecordingAudio, ultimoResultadoIndex]);




    // Código limpo - funcionalidade de áudio implementada acima

    // Função para converter quebras de linha
    const converterQuebrasDeLinha = (texto) => {
        if (!texto) return '';
        // Primeiro converte \n para uma quebra de linha real
        const textoComQuebraReal = texto.replace(/\\n/g, '\n');
        // Depois converte as quebras de linha reais para <br>
        return textoComQuebraReal.replace(/\n/g, '<br>');
    };

    // Função auxiliar para aplicar formatação ao texto
    const aplicarFormatacao = (texto) => {
        const editor = editorRef.current?.editor;
        if (!editor) return texto;

        // Obtém a formatação atual do editor
        const formatacaoAtual = editor.getAttributes('textStyle');
        const fonteAtual = formatacaoAtual.fontFamily || 'Arial';
        const tamanhoAtual = formatacaoAtual.fontSize || '12pt';

        // Aplica a formatação ao texto usando o TextStyle
        editor.chain().focus().setMark('textStyle', {
            fontFamily: fonteAtual,
            fontSize: tamanhoAtual
        }).run();

        return `<span style="font-family: ${fonteAtual}; font-size: ${tamanhoAtual}">${texto}</span>`;
    };

    // Carregar todas as frases ao montar o componente
    useEffect(() => {
        const carregarFrases = async () => {
            try {
                const response = await api.get('/api/frases/');
                setTodasFrases(response.data);

                // Organizar frases por categoria para o tree
                const categorias = [...new Set(response.data.map(frase => frase.categoriaFrase))];
                const treeItems = categorias.map(categoria => {
                    const frasesCategoria = response.data.filter(frase => frase.categoriaFrase === categoria);

                    const children = frasesCategoria.map(frase => ({
                        id: `${categoria}-${frase.tituloFrase}`,
                        name: frase.tituloFrase,
                        type: 'titulo',
                        fraseId: frase.id
                    }));

                    return {
                        id: categoria,
                        name: categoria,
                        type: 'categoria',
                        children
                    };
                });

                setTreeData(treeItems);
            } catch (error) {
                console.error('Erro ao carregar frases:', error);
            }
        };

        carregarFrases();
    }, []);

    const handleMetodosModeloChange = (newValue) => {
        setMetodosModelo(newValue);
        setTitulo('');
        setModeloSelecionado(null);
    };

    const handleTituloSelect = async (selectedTitulo) => {
        try {
            const modeloEncontrado = titulosDisponiveis.find(item => item.titulo === selectedTitulo);
            if (!modeloEncontrado) {
                console.error('Modelo não encontrado para o título:', selectedTitulo);
                return;
            }

            const response = await api.get(`/api/modelo_laudo/${modeloEncontrado.id}/`);
            setModeloSelecionado({
                id: modeloEncontrado.id,
                titulo: selectedTitulo,
                texto: response.data.texto
            });

        } catch (error) {
            console.error('Erro ao buscar modelo:', error);
            setErro('Erro ao carregar o modelo selecionado.');
        }
    };

    const handleFraseToggle = (fraseId, checked) => {
        if (checked) {
            setFrasesSelecionadas([...frasesSelecionadas, fraseId]);
        } else {
            setFrasesSelecionadas(frasesSelecionadas.filter(id => id !== fraseId));
        }
    };

    const handleGerarLaudo = async () => {
        if (!modeloSelecionado) {
            setErro('Por favor, selecione um modelo de laudo.');
            return;
        }

        if (frasesSelecionadas.length === 0) {
            setErro('Por favor, selecione pelo menos uma frase.');
            return;
        }

        setIsGenerating(true);
        setErro('');
        setSucesso('');

        try {
            // Buscar textos das frases selecionadas
            const frasesTextos = frasesSelecionadas.map(fraseId => {
                const frase = todasFrases.find(f => f.id === fraseId);
                return frase ? {
                    titulo: frase.tituloFrase,
                    categoria: frase.categoriaFrase,
                    texto: frase.frase.fraseBase || JSON.stringify(frase.frase)
                } : null;
            }).filter(Boolean);

            const response = await api.post('/api/ia/gerar-laudo/', {
                modelo_id: modeloSelecionado.id,
                modelo_texto: modeloSelecionado.texto,
                frases_selecionadas: frasesTextos,
                ajustes: ajustesText
            });

            const laudoGerado = response.data.laudo;
            setLaudoGerado(laudoGerado);

            // Inserir o laudo no editor com formatação
            if (editorRef.current?.editor) {
                const editor = editorRef.current.editor;

                try {
                    // Converter Markdown para HTML com formatação rica
                    const htmlFormatado = converterMarkdownParaHTML(laudoGerado);

                    // Inserir o conteúdo formatado
                    editor.commands.setContent(htmlFormatado);

                    // Mover cursor para o início
                    editor.commands.setTextSelection(0);

                    console.log('Laudo inserido no editor com formatação HTML rica');
                } catch (error) {
                    console.error('Erro ao aplicar formatação, inserindo texto simples:', error);
                    // Fallback: inserir texto simples
                    editor.commands.setContent(laudoGerado);
                }
            } else {
                console.warn('Editor não encontrado para inserir o laudo');
            }

            setSucesso(`Laudo gerado com sucesso pela IA! (${laudoGerado.length} caracteres)`);

        } catch (error) {
            console.error('Erro ao gerar laudo:', error);
            setErro(
                error.response?.data?.error ||
                'Erro ao gerar laudo. Verifique sua conexão e tente novamente.'
            );
        } finally {
            setIsGenerating(false);
        }
    };

    const filterTreeItems = (items, searchTerm) => {
        if (!searchTerm) return items;

        return items.map(item => {
            if (item.type === 'categoria') {
                const filteredChildren = item.children?.filter(child =>
                    child.name.toLowerCase().includes(searchTerm.toLowerCase())
                );

                if ((filteredChildren && filteredChildren.length > 0) ||
                    item.name.toLowerCase().includes(searchTerm.toLowerCase())) {
                    return {
                        ...item,
                        children: filteredChildren
                    };
                }
                return null;
            } else {
                if (item.name.toLowerCase().includes(searchTerm.toLowerCase())) {
                    return item;
                }
                return null;
            }
        }).filter(Boolean);
    };

    const renderTreeItems = (items, searchTerm) => {
        const filteredItems = filterTreeItems(items, searchTerm);

        return filteredItems.map((item) => {
            if (item.type === 'categoria') {
                return (
                    <NavLink
                        key={item.id}
                        label={item.name}
                        leftSection={<IconFolder size={16} />}
                        childrenOffset={28}
                    >
                        {item.children && renderTreeItems(item.children, searchTerm)}
                    </NavLink>
                );
            } else {
                return (
                    <Group key={item.id} gap="xs" pl={28}>
                        <Checkbox
                            checked={frasesSelecionadas.includes(item.fraseId)}
                            onChange={(event) => handleFraseToggle(item.fraseId, event.currentTarget.checked)}
                        />
                        <Text size="sm">{item.name}</Text>
                    </Group>
                );
            }
        });
    };

    const handleGerarSugestoes = async () => {
        if (!textoSugestoes.trim()) {
            setErroSugestoes('Por favor, insira um texto para gerar sugestões.');
            return;
        }

        setIsGeneratingSugestoes(true);
        setErroSugestoes('');
        setSucessoSugestoes('');

        try {
            const response = await api.post('/api/ia/gerar-sugestoes/', {
                texto: textoSugestoes
            });

            const sugestoesGeradas = response.data.sugestoes;

            // Inserir as sugestões no editor
            if (editorSugestoesRef.current?.editor) {
                const editor = editorSugestoesRef.current.editor;

                try {
                    // Converter Markdown para HTML com formatação rica
                    const htmlFormatado = converterMarkdownParaHTML(sugestoesGeradas);

                    // Inserir o conteúdo formatado
                    editor.commands.setContent(htmlFormatado);

                    // Mover cursor para o início
                    editor.commands.setTextSelection(0);

                    console.log('Sugestões inseridas no editor com formatação HTML rica');
                } catch (error) {
                    console.error('Erro ao aplicar formatação, inserindo texto simples:', error);
                    // Fallback: inserir texto simples
                    editor.commands.setContent(sugestoesGeradas);
                }
            } else {
                console.warn('Editor de sugestões não encontrado');
            }

            setSucessoSugestoes(`Sugestões geradas com sucesso! (${sugestoesGeradas.length} caracteres)`);

        } catch (error) {
            console.error('Erro ao gerar sugestões:', error);
            setErroSugestoes(
                error.response?.data?.error ||
                'Erro ao gerar sugestões. Verifique sua conexão e tente novamente.'
            );
        } finally {
            setIsGeneratingSugestoes(false);
        }
    };

    const handleGerarAnalise = async () => {
        if (!textoAnalise.trim()) {
            setErroAnalise('Por favor, insira as informações para gerar o laudo.');
            return;
        }

        // Limpar preview text e parar gravação ao gerar laudo
        if (isRecordingAudio && recognitionAudio) {
            recognitionAudio.stop();
            setIsRecordingAudio(false);
            setPreviewTextAudio('');
            setUltimoResultadoIndex(0);
            console.log('Gravação parada automaticamente ao gerar laudo');
        }

        setIsGeneratingAnalise(true);
        setErroAnalise('');
        setSucessoAnalise('');

        try {
            const response = await api.post('/api/ia/gerar-laudo-radiologia/', {
                texto: textoAnalise
            });

            const laudoGerado = response.data.laudo;

            // Inserir o laudo no editor com formatação
            if (editorAnaliseRef.current?.editor) {
                const editor = editorAnaliseRef.current.editor;

                try {
                    // Converter Markdown para HTML com formatação rica
                    const htmlFormatado = converterMarkdownParaHTML(laudoGerado);

                                         // Inserir o conteúdo formatado
                     editor.commands.setContent(htmlFormatado);

                     // Mover cursor para o início
                     editor.commands.setTextSelection(0);

                     console.log('Laudo de radiologia inserido no editor com formatação HTML rica');
                     
                     // Copiar o laudo para a área de transferência automaticamente
                     copiarParaAreaTransferencia(laudoGerado);
                } catch (error) {
                    console.error('Erro ao aplicar formatação, inserindo texto simples:', error);
                    // Fallback: inserir texto simples
                    editor.commands.setContent(laudoGerado);
                }
            } else {
                console.warn('Editor de análise não encontrado');
            }

            setSucessoAnalise(`Laudo de radiologia gerado com sucesso! (${laudoGerado.length} caracteres)`);

        } catch (error) {
            console.error('Erro ao gerar laudo de radiologia:', error);
            console.error('Status:', error.response?.status);
            console.error('Data:', error.response?.data);
            console.error('Headers:', error.response?.headers);

            let mensagemErro = 'Erro ao gerar laudo. Verifique sua conexão e tente novamente.';

            if (error.response?.status === 403) {
                mensagemErro = 'Erro de permissão (403). Verifique se você está logado corretamente.';
            } else if (error.response?.data?.error) {
                mensagemErro = error.response.data.error;
            }

            setErroAnalise(mensagemErro);
        } finally {
            setIsGeneratingAnalise(false);
        }
    };

    return (
        <Layout>
            <Container size="lg">
                <Group mb="xl" align="center">
                    <IconBrain size={32} color="blue" />
                    <Title order={1}>Inteligência Artificial</Title>
                </Group>

                <Paper shadow="sm" p="xl" radius="md">
                    <Group mb="lg" align="center">
                        <IconSparkles size={24} color="purple" />
                        <Title order={2}>Funcionalidades de IA</Title>
                    </Group>

                                         <Text size="lg" mb="xl" c="dimmed">
                         Esta seção é dedicada às funcionalidades de Inteligência Artificial
                         para auxiliar na criação e otimização de laudos médicos.
                     </Text>
                     
                     <Alert color="blue" icon={<IconBrain size={16} />} mb="xl">
                         <Text size="sm">
                             <strong>Status atual:</strong> Apenas a funcionalidade "Laudo Radiológico" está ativa.
                             As outras funcionalidades estão temporariamente desabilitadas para manutenção.
                         </Text>
                     </Alert>

                                         <Group gap="md" mb="xl">
                         {/* ===== FUNCIONALIDADES TEMPORARIAMENTE DESABILITADAS ===== */}
                         {/* Botão desabilitado e oculto - Geração Automática de Laudos */}
                         <Button
                             leftSection={<IconRobot size={20} />}
                             variant="filled"
                             size="md"
                             onClick={() => setShowGeracaoLaudo(!showGeracaoLaudo)}
                             style={{ display: 'none' }} // Oculto
                             disabled={true} // Desabilitado
                         >
                             Geração Automática de Laudos
                         </Button>
 
                         {/* Botão desabilitado e oculto - Sugestões Inteligentes */}
                         <Button
                             leftSection={<IconSparkles size={20} />}
                             variant="outline"
                             size="md"
                             onClick={() => setShowSugestoes(!showSugestoes)}
                             style={{ display: 'none' }} // Oculto
                             disabled={true} // Desabilitado
                         >
                             Sugestões Inteligentes
                         </Button>
                         {/* ===== FIM DAS FUNCIONALIDADES DESABILITADAS ===== */}

                         {/* ===== FUNCIONALIDADE ATIVA ===== */}
                         {/* Botão habilitado e visível - Laudo Radiológico */}
                         <Button
                             leftSection={<IconBrain size={20} />}
                             variant="light"
                             size="md"
                             onClick={() => setShowAnaliseTexto(!showAnaliseTexto)}
                             style={{ display: 'block' }} // Visível
                             disabled={false} // Habilitado
                         >
                             Laudo Radiológico
                         </Button>
                         {/* ===== FIM DA FUNCIONALIDADE ATIVA ===== */}
                     </Group>

                                         {/* ===== FUNCIONALIDADE TEMPORARIAMENTE DESABILITADA ===== */}
                     {showGeracaoLaudo && (
                         <Stack gap="md">
                             <Divider label="Geração Automática de Laudos com IA (DESABILITADA)" labelPosition="center" />

                            <Grid>
                                <Grid.Col span={6}>
                                    <Stack gap="md">
                                        <Title order={4}>1. Selecione o Modelo</Title>
                                        <MetodosSelect
                                            value={metodosModelo}
                                            onChange={handleMetodosModeloChange}
                                            placeholder="Selecione o método"
                                        />

                                        {metodosModelo.length > 0 && (
                                            <TituloCombobox
                                                metodosSelected={metodosModelo}
                                                value={titulo}
                                                onChange={setTitulo}
                                                onTituloSelect={handleTituloSelect}
                                                titulosDisponiveis={titulosDisponiveis}
                                                setTitulosDisponiveis={setTitulosDisponiveis}
                                            />
                                        )}

                                        {modeloSelecionado && (
                                            <Alert color="blue" icon={<IconCheck size={16} />}>
                                                Modelo selecionado: <strong>{modeloSelecionado.titulo}</strong>
                                            </Alert>
                                        )}
                                    </Stack>
                                </Grid.Col>

                                <Grid.Col span={6}>
                                    <Stack gap="md">
                                        <Title order={4}>2. Selecione as Frases</Title>
                                        <TextInput
                                            placeholder="Buscar frases..."
                                            value={searchFrases}
                                            onChange={(event) => setSearchFrases(event.currentTarget.value)}
                                        />

                                        <Paper shadow="xs" p="sm" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                            {renderTreeItems(treeData, searchFrases)}
                                        </Paper>

                                        {frasesSelecionadas.length > 0 && (
                                            <Alert color="green" icon={<IconCheck size={16} />}>
                                                {frasesSelecionadas.length} frase(s) selecionada(s)
                                            </Alert>
                                        )}
                                    </Stack>
                                </Grid.Col>
                            </Grid>

                            <Divider />

                            <Stack gap="md">
                                <Title order={4}>3. Ajustes e Instruções (Opcional)</Title>
                                <Textarea
                                    label="Instruções para a IA"
                                    placeholder="Ex: 'Remover contradições entre achados normais e patológicos', 'Ajustar linguagem técnica', 'Manter coerência entre os achados'..."
                                    value={ajustesText}
                                    onChange={(event) => setAjustesText(event.currentTarget.value)}
                                    minRows={3}
                                    maxRows={6}
                                    autosize
                                />
                            </Stack>

                            {erro && (
                                <Alert icon={<IconAlertCircle size={16} />} color="red">
                                    {erro}
                                </Alert>
                            )}

                            {sucesso && (
                                <Alert icon={<IconCheck size={16} />} color="green">
                                    {sucesso}
                                </Alert>
                            )}

                            <Group justify="center">
                                <Button
                                    leftSection={<IconWand size={20} />}
                                    onClick={handleGerarLaudo}
                                    loading={isGenerating}
                                    // disabled={!modeloSelecionado || frasesSelecionadas.length === 0}
                                    size="lg"
                                >
                                    {isGenerating ? 'Gerando Laudo com IA...' : 'Gerar Laudo com IA'}
                                </Button>
                            </Group>

                            <Divider />

                            <Paper shadow="xs" p="md" radius="md" style={{ backgroundColor: '#f8f9fa' }}>
                                <Group justify="space-between" mb="md">
                                    <Text size="sm" fw={500}>Laudo Gerado pela IA:</Text>
                                    <Button
                                        size="xs"
                                        variant="subtle"
                                        color="red"
                                        onClick={() => {
                                            if (editorRef.current?.editor) {
                                                editorRef.current.editor.commands.setContent('');
                                            }
                                        }}
                                    >
                                        Limpar Editor
                                    </Button>
                                </Group>
                                <TextEditor ref={editorRef} />
                            </Paper>
                        </Stack>
                    )}

                                         {/* ===== FUNCIONALIDADE TEMPORARIAMENTE DESABILITADA ===== */}
                     {showSugestoes && (
                         <Stack gap="md" mt="xl">
                             <Divider label="Sugestões Inteligentes (DESABILITADA)" labelPosition="center" />

                            <Stack gap="md">
                                <Title order={4}>Análise e Sugestões de Melhoria</Title>
                                <Text size="sm" c="dimmed">
                                    Cole um texto de laudo existente para receber sugestões de melhoria, correções e otimizações.
                                </Text>

                                <Textarea
                                    label="Texto para análise"
                                    placeholder="Cole aqui o texto do laudo que você deseja analisar e receber sugestões de melhoria..."
                                    value={textoSugestoes}
                                    onChange={(event) => setTextoSugestoes(event.currentTarget.value)}
                                    minRows={6}
                                    maxRows={12}
                                    autosize
                                />

                                {erroSugestoes && (
                                    <Alert icon={<IconAlertCircle size={16} />} color="red">
                                        {erroSugestoes}
                                    </Alert>
                                )}

                                {sucessoSugestoes && (
                                    <Alert icon={<IconCheck size={16} />} color="green">
                                        {sucessoSugestoes}
                                    </Alert>
                                )}

                                <Group justify="center">
                                    <Button
                                        leftSection={<IconSparkles size={20} />}
                                        onClick={handleGerarSugestoes}
                                        loading={isGeneratingSugestoes}
                                        disabled={!textoSugestoes.trim()}
                                        size="lg"
                                        variant="outline"
                                    >
                                        {isGeneratingSugestoes ? 'Analisando...' : 'Gerar Sugestões'}
                                    </Button>
                                </Group>

                                <Divider />

                                <Paper shadow="xs" p="md" radius="md" style={{ backgroundColor: '#f0f8ff' }}>
                                    <Group justify="space-between" mb="md">
                                        <Text size="sm" fw={500}>Sugestões e Melhorias:</Text>
                                        <Button
                                            size="xs"
                                            variant="subtle"
                                            color="red"
                                            onClick={() => {
                                                if (editorSugestoesRef.current?.editor) {
                                                    editorSugestoesRef.current.editor.commands.setContent('');
                                                }
                                            }}
                                        >
                                            Limpar Editor
                                        </Button>
                                    </Group>
                                    <TextEditor ref={editorSugestoesRef} />
                                </Paper>
                            </Stack>
                        </Stack>
                    )}

                                         {/* ===== FUNCIONALIDADE ATIVA ===== */}
                     {showAnaliseTexto && (
                         <Stack gap="md" mt="xl">
                             <Divider label="Geração de Laudo Radiológico" labelPosition="center" />

                            <Stack gap="md">
                                                                 <Title order={4}>Laudo Radiológico Especializado</Title>
                                 <Text size="sm" c="dimmed">
                                     Descreva os achados do exame e a IA gerará um laudo radiológico completo seguindo os padrões médicos.
                                     Você pode digitar ou usar o botão de áudio para falar as informações.
                                 </Text>

                                                                 <Stack gap="xs">
                                     <Group justify="space-between" align="center">
                                         <Text size="sm" fw={500}>Informações do exame</Text>
                                         <Group gap="xs">
                                             <Button
                                                 size="xs"
                                                 variant={isRecordingAudio ? "filled" : "outline"}
                                                 color={isRecordingAudio ? "red" : "blue"}
                                                 leftSection={isRecordingAudio ? <IconMicrophoneOff size={16} /> : <IconMicrophone size={16} />}
                                                 onClick={toggleRecordingAudio}
                                                 disabled={!recognitionAudio}
                                             >
                                                 {isRecordingAudio ? 'Parar Gravação' : 'Gravar Áudio'}
                                             </Button>
                                             <Button
                                                 size="xs"
                                                 variant="outline"
                                                 color="gray"
                                                 leftSection={<IconFile size={16} />}
                                                 onClick={() => {
                                                     setTextoAnalise('');
                                                     setPreviewTextAudio('');
                                                     console.log('Textarea limpa para nova gravação');
                                                 }}
                                                 disabled={!textoAnalise.trim()}
                                             >
                                                 Limpar Texto
                                             </Button>
                                         </Group>
                                     </Group>
                                     
                                     <Textarea
                                         placeholder="Exemplo: 'Ultrassonografia de abdome total. Paciente com dor abdominal. Fígado aumentado de tamanho, ecotextura heterogênea. Vesícula biliar com cálculo de 1,2cm. Rins normais.'"
                                         value={textoAnalise}
                                         onChange={(event) => setTextoAnalise(event.currentTarget.value)}
                                         minRows={6}
                                         maxRows={12}
                                         autosize
                                     />
                                     
                                     {/* Preview do texto sendo gravado */}
                                     {previewTextAudio && (
                                         <Paper p="xs" bg="blue.0" withBorder>
                                             <Text size="xs" c="blue.7" fw={500}>
                                                 Gravando: {previewTextAudio}
                                             </Text>
                                         </Paper>
                                     )}
                                 </Stack>

                                {erroAnalise && (
                                    <Alert icon={<IconAlertCircle size={16} />} color="red">
                                        {erroAnalise}
                                    </Alert>
                                )}

                                {sucessoAnalise && (
                                    <Alert icon={<IconCheck size={16} />} color="green">
                                        {sucessoAnalise}
                                    </Alert>
                                )}
                                
                                {laudoCopiado && (
                                    <Alert icon={<IconCheck size={16} />} color="blue">
                                        Laudo copiado com sucesso para a área de transferência!
                                    </Alert>
                                )}

                                <Group justify="center">
                                    <Button
                                        leftSection={<IconBrain size={20} />}
                                        onClick={handleGerarAnalise}
                                        loading={isGeneratingAnalise}
                                        disabled={!textoAnalise.trim()}
                                        size="lg"
                                        variant="light"
                                    >
                                        {isGeneratingAnalise ? 'Gerando Laudo...' : 'Gerar Laudo Radiológico'}
                                    </Button>
                                </Group>

                                <Divider />

                                <Paper shadow="xs" p="md" radius="md" style={{ backgroundColor: '#f5f5f5' }}>
                                    <Group justify="space-between" mb="md">
                                        <Text size="sm" fw={500}>Laudo Radiológico Gerado:</Text>
                                        <Button
                                            size="xs"
                                            variant="subtle"
                                            color="red"
                                            onClick={() => {
                                                if (editorAnaliseRef.current?.editor) {
                                                    editorAnaliseRef.current.editor.commands.setContent('');
                                                }
                                            }}
                                        >
                                            Limpar Editor
                                        </Button>
                                    </Group>
                                    <TextEditor ref={editorAnaliseRef} />
                                </Paper>
                            </Stack>
                        </Stack>
                    )}

                                         {/* Comentado temporariamente - funcionalidades desabilitadas
                     {!showGeracaoLaudo && !showSugestoes && !showAnaliseTexto && (
                         <Text size="sm" mt="xl" c="dimmed" fs="italic">
                             🚧 Funcionalidades em desenvolvimento...
                         </Text>
                     )}
                     */}
                </Paper>
            </Container>
        </Layout>
    );
}

export default IA;