import { Title, Text, Paper, Group, Button, Textarea, Stack, Alert, Grid, ActionIcon, ScrollArea, Box, Loader } from '@mantine/core';
import { IconBrain, IconRobot, IconAlertCircle, IconCheck, IconMicrophone, IconMicrophoneOff, IconSend, IconUser, IconTrash } from '@tabler/icons-react';
import { useState, useRef, useEffect } from 'react';
import Layout from '../components/Layout';
import TextEditor from '../components/TextEditor';
import MetodosSelect from '../components/MetodosSelect';
import TituloCombobox from '../components/TituloCombobox';
import SelecionarVariaveisModal from '../components/SelecionarVariaveisModal';
import api from '../api';
import { marked } from 'marked';
import { useAudioTranscription } from '../utils/useAudioTranscription';
import {
    loadChatMessages,
    saveChatMessages,
    resetChatMessages,
    loadModeloSession,
    saveModeloSession,
    IA_LAUDO_AUTOSAVE_KEY,
} from '../utils/iaSession';
import {
    applyFraseToEditor,
    applyFraseHtmlResolvidaToEditor,
    filterFrasesForModelo,
    converterQuebrasDeLinha,
    fraseTemVariaveis,
    inserirComplementoFormatadoNoEditor,
} from '../utils/fraseEngine';
import {
    montarTextoCompostoParaVariaveisDaFrase,
    aplicarValoresSelecionadosAoTexto,
    splitPartesResolvidas,
    textoTemVariaveisParaModal,
} from '../utils/variaveisFrase';
import { resolverTextoClassificacao } from '../utils/numeroOpcaoVariavel';

function IA() {
    const [isGeneratingAnalise, setIsGeneratingAnalise] = useState(false);
    const [erroAnalise, setErroAnalise] = useState('');
    const [sucessoAnalise, setSucessoAnalise] = useState('');
    const [textoAnalise, setTextoAnalise] = useState('');
    const [laudoCopiado, setLaudoCopiado] = useState(false);
    const [messages, setMessages] = useState(() => loadChatMessages());
    const editorAnaliseRef = useRef(null);
    const chatEndRef = useRef(null);

    // Estados para seleção de modelo
    const [metodosModelo, setMetodosModelo] = useState([]);
    const [titulo, setTitulo] = useState('');
    const [titulosDisponiveis, setTitulosDisponiveis] = useState([]);
    const [modeloSelecionado, setModeloSelecionado] = useState(null);
    const [frasesCatalogo, setFrasesCatalogo] = useState([]);
    const [conclusaoDoModelo, setConclusaoDoModelo] = useState('');

    // Modal de variáveis (frases e modelo)
    const [modalVariaveisAberto, setModalVariaveisAberto] = useState(false);
    const [variaveisEncontradas, setVariaveisEncontradas] = useState([]);
    const [gruposOpcoesEncontrados, setGruposOpcoesEncontrados] = useState([]);
    const [elementosOrdenados, setElementosOrdenados] = useState([]);
    const [textoTemporario, setTextoTemporario] = useState('');
    const [textoPuroParaModal, setTextoPuroParaModal] = useState('');
    const [tituloFraseModal, setTituloFraseModal] = useState('');
    const [frasePendenteVariaveis, setFrasePendenteVariaveis] = useState(null);
    const chatVariaveisCallbackRef = useRef(null);

    const [todasFrases, setTodasFrases] = useState([]);

    const {
        isRecording: isRecordingAudio,
        previewText: previewTextAudio,
        toggleRecording: toggleRecordingAudio
    } = useAudioTranscription({
        textoState: textoAnalise,
        setTextoState: setTextoAnalise,
        atalhoTeclado: 'Ctrl+Alt+A',
        pauseDelay: 2000
    });

    const copiarParaAreaTransferencia = async (htmlFormatado) => {
        try {
            // Cria um ClipboardItem com HTML e texto puro
            const blob = new Blob([htmlFormatado], { type: 'text/html' });
            const textoPlano = htmlFormatado.replace(/<[^>]*>/g, ''); // Remove tags HTML para texto puro
            const blobTexto = new Blob([textoPlano], { type: 'text/plain' });
            
            const clipboardItem = new ClipboardItem({
                'text/html': blob,
                'text/plain': blobTexto
            });
            
            await navigator.clipboard.write([clipboardItem]);
            setLaudoCopiado(true);
            
            // Resetar a mensagem após 3 segundos
            setTimeout(() => {
                setLaudoCopiado(false);
            }, 3000);
        } catch (error) {
            console.error('Erro ao copiar HTML para área de transferência:', error);
            // Fallback: tentar copiar apenas o texto puro
            try {
                const textoPlano = htmlFormatado.replace(/<[^>]*>/g, '');
                await navigator.clipboard.writeText(textoPlano);
                setLaudoCopiado(true);
                
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

    useEffect(() => {
        const carregarFrases = async () => {
            try {
                const response = await api.get('/api/frases/');
                setTodasFrases(response.data);
            } catch (error) {
                console.error('Erro ao carregar frases:', error);
            }
        };

        carregarFrases();
    }, []);

    useEffect(() => {
        const restaurarModelo = async () => {
            const saved = loadModeloSession();
            if (!saved?.id || todasFrases.length === 0) return;

            try {
                if (saved.metodosModelo?.length) {
                    setMetodosModelo(saved.metodosModelo);
                } else if (saved.metodo) {
                    setMetodosModelo([String(saved.metodo)]);
                }
                setTitulo(saved.titulo || '');

                let textoModelo = saved.texto;
                let metodoId = saved.metodo;
                if (!textoModelo) {
                    const response = await api.get(`/api/modelo_laudo/${saved.id}/`);
                    textoModelo = response.data.texto;
                    metodoId = response.data.metodo;
                }

                setModeloSelecionado({
                    id: saved.id,
                    titulo: saved.titulo,
                    texto: textoModelo,
                    metodo: metodoId,
                });
                setFrasesCatalogo(filterFrasesForModelo(todasFrases, saved.id, metodoId));
            } catch (error) {
                console.error('Erro ao restaurar modelo da sessão IA:', error);
            }
        };

        restaurarModelo();
    }, [todasFrases]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isGeneratingAnalise]);

    useEffect(() => {
        saveChatMessages(messages);
    }, [messages]);

    const limparEditorLaudo = () => {
        if (editorAnaliseRef.current?.editor) {
            editorAnaliseRef.current.editor.commands.setContent('');
        }
        localStorage.removeItem(IA_LAUDO_AUTOSAVE_KEY);
        setConclusaoDoModelo('');
    };

    const limparChat = () => {
        const temHistorico = messages.some((m) => m.id !== 'welcome');
        if (!temHistorico) return;

        if (!window.confirm('Limpar todo o histórico do chat? Esta ação não apaga o laudo no editor.')) {
            return;
        }

        if (isRecordingAudio) {
            toggleRecordingAudio();
        }

        chatVariaveisCallbackRef.current = null;
        setTextoAnalise('');
        setErroAnalise('');
        setSucessoAnalise('');
        setMessages(resetChatMessages());
    };

    const chatTemHistorico = messages.some((m) => m.id !== 'welcome');

    const aplicarLaudoGeradoNoEditor = (laudoGerado) => {
        const editor = editorAnaliseRef.current?.editor;
        if (!editor) return false;

        try {
            const htmlFormatado = converterMarkdownParaHTML(laudoGerado);
            editor.commands.setContent(htmlFormatado);
        } catch (error) {
            console.error('Erro ao aplicar formatação, inserindo texto simples:', error);
            editor.commands.setContent(laudoGerado);
        }
        localStorage.setItem(IA_LAUDO_AUTOSAVE_KEY, editor.getHTML());
        return true;
    };

    const aplicarComplementoLaudoComIA = async (pedidoComplementar, historico, frasesAplicadas = []) => {
        const complemento = (pedidoComplementar || '').trim();
        if (!complemento) {
            return { ok: false, skipped: true };
        }

        const editor = editorAnaliseRef.current?.editor;
        if (!editor) {
            return { ok: false, error: 'Editor não disponível.' };
        }

        const laudoAtual = editor.getText()?.trim() || '';
        if (!laudoAtual) {
            return { ok: false, skipped: true };
        }

        const response = await api.post('/api/ia/gerar_laudo_radiologia/', {
            texto: complemento,
            laudo_atual: laudoAtual,
            historico,
            modo_catalogo: true,
            frases_aplicadas: frasesAplicadas,
            pedido_complementar: complemento,
        });

        const laudoGerado = response.data.acrescimos || response.data.laudo;
        if (!laudoGerado || String(laudoGerado).startsWith('Erro:')) {
            return {
                ok: false,
                error: response.data.error || laudoGerado || 'Erro ao completar laudo.',
            };
        }

        inserirComplementoFormatadoNoEditor(editor, laudoGerado);
        localStorage.setItem(IA_LAUDO_AUTOSAVE_KEY, editor.getHTML());
        return { ok: true, modo: response.data.modo || 'complementar' };
    };

    const montarMensagemAssistenteCatalogo = (aplicadas, avisos, mensagemBase, editouLaudo) => {
        let mensagem = mensagemBase || 'Pedido processado.';

        if (aplicadas.length > 0) {
            mensagem = `Frases aplicadas: ${aplicadas.join(', ')}.`;
        } else if (!mensagemBase) {
            mensagem = 'Nenhuma frase cadastrada correspondeu ao pedido.';
        }

        if (editouLaudo) {
            mensagem += '\n\nLaudo atualizado com medidas e demais instruções do pedido.';
        }

        if (avisos.length > 0) {
            mensagem += `\n\nAvisos:\n${avisos.join('\n')}`;
        }

        return mensagem;
    };

    const finalizarPedidoCatalogo = async ({
        pedidoComplementar,
        historico,
        aplicadas,
        avisos,
        mensagemAssistenteBase,
    }) => {
        let editouLaudo = false;
        const avisosFinais = [...avisos];

        if (!(pedidoComplementar || '').trim()) {
            return {
                editouLaudo: false,
                avisos: avisosFinais,
                mensagemAssistente: montarMensagemAssistenteCatalogo(
                    aplicadas,
                    avisosFinais,
                    mensagemAssistenteBase,
                    false
                ),
            };
        }

        try {
            const result = await aplicarComplementoLaudoComIA(
                pedidoComplementar,
                historico,
                aplicadas
            );
            if (result.ok) {
                editouLaudo = true;
            } else if (!result.skipped && result.error) {
                avisosFinais.push(`Não foi possível completar o laudo: ${result.error}`);
            }
        } catch (error) {
            const msg = error.response?.data?.error || 'Erro ao completar laudo com IA.';
            avisosFinais.push(msg);
        }

        return {
            editouLaudo,
            avisos: avisosFinais,
            mensagemAssistente: montarMensagemAssistenteCatalogo(
                aplicadas,
                avisosFinais,
                mensagemAssistenteBase,
                editouLaudo
            ),
        };
    };

    const carregarTextoModeloNoEditor = (textoModelo) => {
        const textoFormatado = typeof textoModelo === 'string' ? textoModelo : String(textoModelo);
        const regex = /(?:impressão:|conclusão:)([^]*?)(?=\n|$)/i;
        const match = textoFormatado.match(regex);
        setConclusaoDoModelo(match ? match[1].trim() : '');

        const editor = editorAnaliseRef.current?.editor;
        if (editor) {
            editor.commands.setContent(converterQuebrasDeLinha(textoFormatado));
            localStorage.setItem(IA_LAUDO_AUTOSAVE_KEY, editor.getHTML());
        }
    };

    const abrirModalVariaveisParaFrase = async (fraseObj, medida = null) => {
        if (!fraseTemVariaveis(fraseObj, medida)) {
            const editor = editorAnaliseRef.current?.editor;
            if (!editor) {
                return { success: false, reason: 'Editor não disponível.' };
            }
            return applyFraseToEditor(editor, fraseObj, {
                medida,
                conclusaoDoModelo,
                ignoreVariaveis: true,
            });
        }

        const { textoComposto, resultado, temVariaveis, nSegmentos, sep } =
            await montarTextoCompostoParaVariaveisDaFrase(fraseObj);

        if (!temVariaveis) {
            const editor = editorAnaliseRef.current?.editor;
            if (!editor) {
                return { success: false, reason: 'Editor não disponível.' };
            }
            return applyFraseToEditor(editor, fraseObj, {
                medida,
                conclusaoDoModelo,
                ignoreVariaveis: true,
            });
        }

        setFrasePendenteVariaveis({
            tipo: 'frase',
            frase: fraseObj,
            medida,
            segmentacao: { sep, n: nSegmentos },
        });
        setTextoTemporario(textoComposto);
        setVariaveisEncontradas(resultado.variaveis);
        setGruposOpcoesEncontrados(resultado.gruposOpcoes);
        setElementosOrdenados(resultado.elementosOrdenados);
        setTextoPuroParaModal(resultado.textoPuro);
        setTituloFraseModal(fraseObj.tituloFrase || 'Frase');
        setModalVariaveisAberto(true);
        return { pending: true };
    };

    const abrirModalVariaveisParaModelo = async (textoModelo, tituloModelo) => {
        const { html, resultado, temVariaveis } = await textoTemVariaveisParaModal(textoModelo);
        if (!temVariaveis) {
            return false;
        }

        setFrasePendenteVariaveis({
            tipo: 'modelo',
            tituloModelo,
            textoModeloRaw: textoModelo,
        });
        setTextoTemporario(html);
        setVariaveisEncontradas(resultado.variaveis);
        setGruposOpcoesEncontrados(resultado.gruposOpcoes);
        setElementosOrdenados(resultado.elementosOrdenados);
        setTextoPuroParaModal(resultado.textoPuro);
        setTituloFraseModal(tituloModelo || 'Modelo de laudo');
        setModalVariaveisAberto(true);
        return true;
    };

    const handleVariaveisSelecionadasIA = async (valoresSelecionados, metaClassificacao = {}) => {
        const editor = editorAnaliseRef.current?.editor;
        if (!editor || !frasePendenteVariaveis) {
            setModalVariaveisAberto(false);
            return;
        }

        const valores = { ...valoresSelecionados };
        if (frasePendenteVariaveis.medida && valores['$'] == null) {
            valores['$'] = frasePendenteVariaveis.medida;
        }

        let textoFinal = aplicarValoresSelecionadosAoTexto(textoTemporario, valores);
        textoFinal = resolverTextoClassificacao(
            textoFinal,
            metaClassificacao.soma ?? 0,
            frasePendenteVariaveis?.frase?.frase?.faixasClassificacao,
        );
        const splitResult = splitPartesResolvidas(
            textoFinal,
            frasePendenteVariaveis.segmentacao || null
        );
        if (splitResult.textoFinal) {
            textoFinal = splitResult.textoFinal;
        }

        if (frasePendenteVariaveis.tipo === 'modelo') {
            const htmlFinal = splitResult.textoFinal || textoFinal;
            const textoPuro = htmlFinal
                .replace(/<br\s*\/?>/gi, '\n')
                .replace(/<[^>]+>/g, '');
            const regex = /(?:impressão:|conclusão:)([^]*?)(?=\n|$)/i;
            const match = textoPuro.match(regex);
            setConclusaoDoModelo(match ? match[1].trim() : '');
            editor.commands.setContent(htmlFinal);
            localStorage.setItem(IA_LAUDO_AUTOSAVE_KEY, editor.getHTML());
            setSucessoAnalise(`Modelo "${frasePendenteVariaveis.tituloModelo}" carregado.`);
        } else {
            const partes = splitResult.partesResolvidas || [textoFinal];
            const resultado = applyFraseHtmlResolvidaToEditor(
                editor,
                frasePendenteVariaveis.frase,
                partes,
                { conclusaoDoModelo }
            );

            if (resultado.success) {
                setConclusaoDoModelo('');
                localStorage.setItem(IA_LAUDO_AUTOSAVE_KEY, editor.getHTML());

                const callback = chatVariaveisCallbackRef.current;
                chatVariaveisCallbackRef.current = null;

                if (callback?.textoPedido) {
                    setIsGeneratingAnalise(true);
                    try {
                        const frasesAplicadas = [...(callback.aplicadas || []), resultado.titulo];
                        const finalizado = await finalizarPedidoCatalogo({
                            pedidoComplementar: callback.pedidoComplementar,
                            historico: callback.historico || [],
                            aplicadas: frasesAplicadas,
                            avisos: callback.avisos || [],
                            mensagemAssistenteBase: callback.mensagemAssistenteBase,
                        });

                        setSucessoAnalise(
                            finalizado.editouLaudo
                                ? `Frase "${resultado.titulo}" aplicada e laudo complementado.`
                                : `Frase "${resultado.titulo}" aplicada ao laudo.`
                        );

                        setMessages((prev) => [
                            ...prev,
                            {
                                id: `assistant-${Date.now()}`,
                                role: 'assistant',
                                content: finalizado.mensagemAssistente,
                            },
                        ]);
                    } catch (error) {
                        console.error('Erro ao complementar laudo após modal:', error);
                        setErroAnalise('Frase aplicada, mas falha ao completar o laudo com IA.');
                    } finally {
                        setIsGeneratingAnalise(false);
                    }
                } else {
                    setSucessoAnalise(`Frase "${resultado.titulo}" aplicada ao laudo.`);
                }
            } else {
                setErroAnalise(resultado.reason || 'Erro ao aplicar frase.');
            }
        }

        setModalVariaveisAberto(false);
        setFrasePendenteVariaveis(null);
        setTextoTemporario('');
    };

    const fecharModalVariaveisIA = () => {
        setModalVariaveisAberto(false);
        setFrasePendenteVariaveis(null);
        chatVariaveisCallbackRef.current = null;
    };

    const handleMetodosModeloChange = (newValue) => {
        setMetodosModelo(newValue);
        setTitulo('');
        setModeloSelecionado(null);
        setFrasesCatalogo([]);
        setConclusaoDoModelo('');
        saveModeloSession(null);
    };

    const handleTituloSelect = async (selectedTitulo) => {
        try {
            const modeloEncontrado = titulosDisponiveis.find((item) => item.titulo === selectedTitulo);
            if (!modeloEncontrado) {
                console.error('Modelo não encontrado para o título:', selectedTitulo);
                return;
            }

            const response = await api.get(`/api/modelo_laudo/${modeloEncontrado.id}/`);
            const textoModelo = response.data.texto || '';
            const metodoId = response.data.metodo;

            const editorTexto = editorAnaliseRef.current?.editor?.getText()?.trim();
            if (editorTexto && !window.confirm('Substituir o laudo atual pelo texto do modelo selecionado?')) {
                return;
            }

            const modeloData = {
                id: modeloEncontrado.id,
                titulo: selectedTitulo,
                texto: textoModelo,
                metodo: metodoId,
            };

            setModeloSelecionado(modeloData);
            setFrasesCatalogo(filterFrasesForModelo(todasFrases, modeloData.id, metodoId));
            saveModeloSession({
                ...modeloData,
                metodosModelo,
            });

            const abriuModal = await abrirModalVariaveisParaModelo(textoModelo, selectedTitulo);
            if (!abriuModal) {
                carregarTextoModeloNoEditor(textoModelo);
                setSucessoAnalise(`Modelo "${selectedTitulo}" carregado. ${filterFrasesForModelo(todasFrases, modeloData.id, metodoId).length} frases disponíveis no catálogo.`);
            } else {
                setSucessoAnalise(`Preencha as variáveis do modelo "${selectedTitulo}" para carregar o laudo.`);
            }
        } catch (error) {
            console.error('Erro ao buscar modelo:', error);
            setErroAnalise('Erro ao carregar o modelo selecionado.');
        }
    };

    const handleEnviarMensagem = async () => {
        const texto = textoAnalise.trim();
        if (!texto) {
            setErroAnalise('Por favor, insira as informações do exame.');
            return;
        }

        if (isRecordingAudio) {
            toggleRecordingAudio();
        }

        const laudoAtual = editorAnaliseRef.current?.editor?.getText()?.trim() || '';
        const historico = messages
            .filter((m) => m.id !== 'welcome' && !m.isError)
            .slice(-10)
            .map(({ role, content }) => ({ role, content }));

        const userMessage = {
            id: `user-${Date.now()}`,
            role: 'user',
            content: texto,
        };

        setMessages((prev) => [...prev, userMessage]);
        setTextoAnalise('');
        setIsGeneratingAnalise(true);
        setErroAnalise('');
        setSucessoAnalise('');

        try {
            if (modeloSelecionado?.id) {
                const response = await api.post('/api/ia/resolver_frases/', {
                    modelo_id: modeloSelecionado.id,
                    texto,
                    historico,
                });

                const frasesResolvidas = response.data.frases || [];
                const editor = editorAnaliseRef.current?.editor;
                const aplicadas = [];
                const avisos = [];
                let modalAberto = false;
                let fraseModalTitulo = '';

                let pedidoComplementar = (response.data.pedido_complementar || '').trim();

                if (editor && frasesResolvidas.length > 0) {
                    for (const item of frasesResolvidas) {
                        if (modalAberto) break;

                        const fraseObj = {
                            id: item.id,
                            tituloFrase: item.tituloFrase,
                            categoriaFrase: item.categoriaFrase,
                            frase: item.frase,
                        };
                        const resultado = await abrirModalVariaveisParaFrase(fraseObj, item.medida);

                        if (resultado.pending) {
                            fraseModalTitulo = fraseObj.tituloFrase;
                            avisos.push(`Preencha as variáveis da frase "${fraseObj.tituloFrase}" no modal.`);
                            modalAberto = true;
                        } else if (resultado.success) {
                            aplicadas.push(resultado.titulo);
                        } else {
                            avisos.push(resultado.reason);
                        }
                    }
                    if (aplicadas.length > 0) {
                        setConclusaoDoModelo('');
                    }
                    localStorage.setItem(IA_LAUDO_AUTOSAVE_KEY, editor.getHTML());
                }

                if (!pedidoComplementar && aplicadas.length === 0 && frasesResolvidas.length === 0) {
                    pedidoComplementar = texto.trim();
                }

                if (modalAberto) {
                    chatVariaveisCallbackRef.current = {
                        textoPedido: texto,
                        pedidoComplementar,
                        historico,
                        aplicadas: [...aplicadas],
                        avisos: [...avisos],
                        mensagemAssistenteBase: response.data.mensagem_assistente,
                    };

                    const mensagemAssistente = montarMensagemAssistenteCatalogo(
                        aplicadas,
                        avisos,
                        response.data.mensagem_assistente,
                        false
                    );

                    setSucessoAnalise(`Preencha as variáveis de "${fraseModalTitulo}" para continuar.`);

                    setMessages((prev) => [
                        ...prev,
                        {
                            id: `assistant-${Date.now()}`,
                            role: 'assistant',
                            content: mensagemAssistente,
                        },
                    ]);
                    return;
                }

                const finalizado = await finalizarPedidoCatalogo({
                    pedidoComplementar,
                    historico,
                    aplicadas,
                    avisos,
                    mensagemAssistenteBase: response.data.mensagem_assistente,
                });

                const partesSucesso = [];
                if (aplicadas.length > 0) {
                    partesSucesso.push(`${aplicadas.length} frase(s) aplicada(s)`);
                }
                if (finalizado.editouLaudo) {
                    partesSucesso.push('laudo complementado com IA');
                }

                setSucessoAnalise(
                    partesSucesso.length > 0
                        ? `${partesSucesso.join(' e ')}.`
                        : 'Pedido processado.'
                );

                setMessages((prev) => [
                    ...prev,
                    {
                        id: `assistant-${Date.now()}`,
                        role: 'assistant',
                        content: finalizado.mensagemAssistente,
                    },
                ]);
                return;
            }

            const response = await api.post('/api/ia/gerar_laudo_radiologia/', {
                texto,
                laudo_atual: laudoAtual,
                historico,
            });

            const laudoGerado = response.data.laudo;
            const modo = response.data.modo || (laudoAtual ? 'editar' : 'gerar');

            if (editorAnaliseRef.current?.editor) {
                const editor = editorAnaliseRef.current.editor;

                try {
                    const htmlFormatado = converterMarkdownParaHTML(laudoGerado);
                    editor.commands.setContent(htmlFormatado);
                    editor.commands.setTextSelection(0);

                    if (modo === 'gerar') {
                        setTimeout(() => {
                            const htmlDoEditor = editor.getHTML();
                            copiarParaAreaTransferencia(htmlDoEditor);
                        }, 100);
                    }
                } catch (error) {
                    console.error('Erro ao aplicar formatação, inserindo texto simples:', error);
                    editor.commands.setContent(laudoGerado);
                }
            }

            const mensagemSucesso =
                modo === 'editar'
                    ? `Laudo atualizado com sucesso! (${laudoGerado.length} caracteres)`
                    : `Laudo gerado com sucesso! (${laudoGerado.length} caracteres)`;
            setSucessoAnalise(mensagemSucesso);

            const mensagemAssistente =
                modo === 'editar'
                    ? 'Laudo atualizado conforme solicitado. Revise no editor à direita.'
                    : 'Laudo radiológico gerado. Revise e edite no editor à direita. O conteúdo também foi copiado para a área de transferência.';

            setMessages((prev) => [
                ...prev,
                {
                    id: `assistant-${Date.now()}`,
                    role: 'assistant',
                    content: mensagemAssistente,
                },
            ]);
        } catch (error) {
            console.error('Erro ao gerar laudo de radiologia:', error);

            let mensagemErro = 'Erro ao gerar laudo. Verifique sua conexão e tente novamente.';

            if (error.response?.status === 403) {
                mensagemErro = 'Erro de permissão (403). Verifique se você está logado corretamente.';
            } else if (error.response?.data?.error) {
                mensagemErro = error.response.data.error;
            }

            setErroAnalise(mensagemErro);
            setMessages((prev) => [
                ...prev,
                {
                    id: `assistant-error-${Date.now()}`,
                    role: 'assistant',
                    content: mensagemErro,
                    isError: true,
                },
            ]);
        } finally {
            setIsGeneratingAnalise(false);
        }
    };

    const handleChatKeyDown = (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            if (!isGeneratingAnalise && textoAnalise.trim()) {
                handleEnviarMensagem();
            }
        }
    };

    const renderChatMessage = (message) => {
        const isUser = message.role === 'user';
        const isError = message.isError;

        return (
            <Box
                key={message.id}
                mb="sm"
                style={{
                    display: 'flex',
                    justifyContent: isUser ? 'flex-end' : 'flex-start',
                }}
            >
                <Group
                    align="flex-start"
                    gap="xs"
                    maw="90%"
                    wrap="nowrap"
                    style={{ flexDirection: isUser ? 'row-reverse' : 'row' }}
                >
                    <ActionIcon
                        variant="light"
                        color={isUser ? 'blue' : isError ? 'red' : 'gray'}
                        radius="xl"
                        size="md"
                        aria-hidden
                    >
                        {isUser ? <IconUser size={16} /> : <IconRobot size={16} />}
                    </ActionIcon>
                    <Paper
                        p="sm"
                        radius="md"
                        shadow="xs"
                        bg={isUser ? 'blue.0' : isError ? 'red.0' : 'gray.0'}
                        style={{ flex: 1 }}
                    >
                        <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
                            {message.content}
                        </Text>
                    </Paper>
                </Group>
            </Box>
        );
    };

    const panelHeight = 'calc(100vh - 140px)';

    return (
        <Layout>
            <Group mb="md" align="center">
                <IconBrain size={28} color="var(--mantine-color-blue-6)" />
                <Title order={2}>Laudo Radiológico com IA</Title>
            </Group>

            <Grid gutter="md">
                <Grid.Col span={{ base: 12, md: 5 }}>
                    <Paper
                        withBorder
                        radius="md"
                        shadow="sm"
                        style={{
                            height: panelHeight,
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden',
                        }}
                    >
                        <Box
                            px="md"
                            py="sm"
                            style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}
                        >
                            <Group justify="space-between" align="flex-start" wrap="nowrap">
                                <Box style={{ flex: 1, minWidth: 0 }}>
                                    <Group gap="xs">
                                        <IconRobot size={20} />
                                        <Text fw={600}>Chat</Text>
                                    </Group>
                            <Text size="xs" c="dimmed" mt={4}>
                                Com modelo: aplica frases cadastradas e complementa medidas/achados com IA. Sem modelo: gera laudo livre.
                            </Text>
                                </Box>
                                <Button
                                    size="xs"
                                    variant="subtle"
                                    color="red"
                                    leftSection={<IconTrash size={14} />}
                                    onClick={limparChat}
                                    disabled={!chatTemHistorico || isGeneratingAnalise}
                                    style={{ flexShrink: 0 }}
                                >
                                    Limpar chat
                                </Button>
                            </Group>
                        </Box>

                        <Box px="md" py="sm" style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}>
                            <Stack gap="xs">
                                <Text size="sm" fw={600}>Modelo de laudo (catálogo)</Text>
                                <MetodosSelect
                                    value={metodosModelo}
                                    onChange={handleMetodosModeloChange}
                                />
                                <TituloCombobox
                                    value={titulo}
                                    onChange={setTitulo}
                                    metodosSelected={metodosModelo}
                                    onTituloSelect={handleTituloSelect}
                                    titulosDisponiveis={titulosDisponiveis}
                                    setTitulosDisponiveis={setTitulosDisponiveis}
                                    required={false}
                                />
                                {modeloSelecionado && (
                                    <Text size="xs" c="dimmed">
                                        Modo catálogo: {modeloSelecionado.titulo} — {frasesCatalogo.length} frase(s) disponível(is)
                                    </Text>
                                )}
                            </Stack>
                        </Box>

                        <Box style={{ flex: 1, minHeight: 0 }}>
                            <ScrollArea h="100%" p="md" type="auto" offsetScrollbars>
                                {messages.map(renderChatMessage)}
                                {isGeneratingAnalise && (
                                    <Group gap="xs" mb="sm">
                                        <ActionIcon variant="light" color="gray" radius="xl" size="md">
                                            <IconRobot size={16} />
                                        </ActionIcon>
                                        <Paper p="sm" radius="md" bg="gray.0">
                                            <Group gap="xs">
                                                <Loader size="xs" />
                                                <Text size="sm" c="dimmed">
                                                    Processando laudo...
                                                </Text>
                                            </Group>
                                        </Paper>
                                    </Group>
                                )}
                                <div ref={chatEndRef} />
                            </ScrollArea>
                        </Box>

                        <Box
                            p="md"
                            style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}
                        >
                            <Stack gap="xs">
                                {erroAnalise && (
                                    <Alert icon={<IconAlertCircle size={16} />} color="red" py="xs">
                                        {erroAnalise}
                                    </Alert>
                                )}
                                {sucessoAnalise && (
                                    <Alert icon={<IconCheck size={16} />} color="green" py="xs">
                                        {sucessoAnalise}
                                    </Alert>
                                )}
                                {laudoCopiado && (
                                    <Alert icon={<IconCheck size={16} />} color="blue" py="xs">
                                        Laudo copiado para a área de transferência!
                                    </Alert>
                                )}

                                <div style={{ position: 'relative' }}>
                                    <Textarea
                                        placeholder={
                                            modeloSelecionado
                                                ? 'Ex.: coloca discopatia de todos os discos intervertebrais lombares'
                                                : 'Ex.: Ultrassonografia de abdome. Fígado aumentado, ecotextura heterogênea...'
                                        }
                                        value={textoAnalise}
                                        onChange={(event) => setTextoAnalise(event.currentTarget.value)}
                                        onKeyDown={handleChatKeyDown}
                                        minRows={3}
                                        maxRows={8}
                                        autosize
                                        disabled={isGeneratingAnalise}
                                    />
                                    <ActionIcon
                                        size="md"
                                        variant={isRecordingAudio ? 'filled' : 'subtle'}
                                        color={isRecordingAudio ? 'red' : 'blue'}
                                        onClick={toggleRecordingAudio}
                                        title="Atalho: Ctrl+Alt+A"
                                        disabled={isGeneratingAnalise}
                                        style={{
                                            position: 'absolute',
                                            top: 8,
                                            right: 8,
                                            zIndex: 10,
                                        }}
                                    >
                                        {isRecordingAudio ? (
                                            <IconMicrophoneOff size={18} />
                                        ) : (
                                            <IconMicrophone size={18} />
                                        )}
                                    </ActionIcon>
                                </div>

                                {previewTextAudio && (
                                    <Paper p="xs" bg="blue.0" withBorder>
                                        <Text size="xs" c="blue.7" fw={500}>
                                            Gravando: {previewTextAudio}
                                        </Text>
                                    </Paper>
                                )}

                                <Group justify="flex-end">
                                    <Button
                                        leftSection={<IconSend size={18} />}
                                        onClick={handleEnviarMensagem}
                                        loading={isGeneratingAnalise}
                                        disabled={!textoAnalise.trim()}
                                    >
                                        Enviar
                                    </Button>
                                </Group>
                            </Stack>
                        </Box>
                    </Paper>
                </Grid.Col>

                <Grid.Col span={{ base: 12, md: 7 }}>
                    <Paper
                        withBorder
                        radius="md"
                        shadow="sm"
                        p="md"
                        style={{
                            height: panelHeight,
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden',
                        }}
                    >
                        <Group justify="space-between" mb="sm">
                            <Text fw={600}>Laudo gerado</Text>
                            <Button
                                size="xs"
                                variant="subtle"
                                color="red"
                                onClick={limparEditorLaudo}
                            >
                                Limpar editor
                            </Button>
                        </Group>

                        <Box style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                            <TextEditor
                                ref={editorAnaliseRef}
                                enableAutoSave={true}
                                autoSaveKey={IA_LAUDO_AUTOSAVE_KEY}
                                autoSaveInterval={5000}
                                showLoadButton={true}
                                fillHeight
                                stickyToolbar={false}
                                autoLoadOnMount
                            />
                        </Box>

                        <Group justify="center" mt="md" gap="md">
                            <Button
                                variant="outline"
                                onClick={async () => {
                                    try {
                                        const editor = editorAnaliseRef.current?.editor;
                                        if (!editor) return;
                                        await copiarParaAreaTransferencia(editor.getHTML());
                                    } catch (error) {
                                        console.error('Erro ao copiar laudo:', error);
                                    }
                                }}
                            >
                                Copiar laudo
                            </Button>
                            <Button
                                variant="outline"
                                color="red"
                                onClick={() => {
                                    if (window.confirm('Tem certeza que deseja deletar o laudo?')) {
                                        limparEditorLaudo();
                                    }
                                }}
                            >
                                Deletar laudo
                            </Button>
                        </Group>
                    </Paper>
                </Grid.Col>
            </Grid>

            <SelecionarVariaveisModal
                opened={modalVariaveisAberto}
                onClose={fecharModalVariaveisIA}
                variaveis={variaveisEncontradas}
                gruposOpcoes={gruposOpcoesEncontrados}
                elementosOrdenados={elementosOrdenados}
                onConfirm={handleVariaveisSelecionadasIA}
                tituloFrase={tituloFraseModal}
                temMedida={
                    frasePendenteVariaveis?.frase?.frase?.fraseBase?.includes('$')
                    || textoTemporario?.includes('$')
                }
                textoPuro={textoPuroParaModal}
                faixasClassificacao={
                    frasePendenteVariaveis?.frase?.frase?.faixasClassificacao || []
                }
            />
        </Layout>
    );
}

export default IA;