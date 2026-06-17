export const IA_CHAT_STORAGE_KEY = 'ia_chat_messages';
export const IA_LAUDO_AUTOSAVE_KEY = 'ia_laudo_radiologico_autoSave';
export const IA_MODELO_STORAGE_KEY = 'ia_modelo_selecionado';

export const IA_WELCOME_MESSAGE = {
  id: 'welcome',
  role: 'assistant',
  content:
    'Descreva os achados do exame (digite ou use o microfone). Com um modelo selecionado, o chat aplica frases cadastradas no editor; sem modelo, a IA gera ou edita o laudo livremente. Frases ou modelos com variáveis abrem um modal de preenchimento.',
};

export function loadChatMessages() {
  try {
    const raw = localStorage.getItem(IA_CHAT_STORAGE_KEY);
    if (!raw) {
      return [IA_WELCOME_MESSAGE];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return [IA_WELCOME_MESSAGE];
    }
    return parsed;
  } catch {
    return [IA_WELCOME_MESSAGE];
  }
}

export function saveChatMessages(messages) {
  try {
    localStorage.setItem(IA_CHAT_STORAGE_KEY, JSON.stringify(messages));
  } catch (error) {
    console.error('Erro ao salvar conversa da IA:', error);
  }
}

export function resetChatMessages() {
  const messages = [IA_WELCOME_MESSAGE];
  saveChatMessages(messages);
  return messages;
}

export function clearIaSession() {
  localStorage.removeItem(IA_CHAT_STORAGE_KEY);
  localStorage.removeItem(IA_LAUDO_AUTOSAVE_KEY);
  localStorage.removeItem(IA_MODELO_STORAGE_KEY);
}

export function loadModeloSession() {
  try {
    const raw = localStorage.getItem(IA_MODELO_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveModeloSession(modelo) {
  try {
    if (!modelo) {
      localStorage.removeItem(IA_MODELO_STORAGE_KEY);
      return;
    }
    localStorage.setItem(IA_MODELO_STORAGE_KEY, JSON.stringify(modelo));
  } catch (error) {
    console.error('Erro ao salvar modelo da IA:', error);
  }
}
