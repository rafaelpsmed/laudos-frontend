# 🌐 Configuração do Frontend para PythonAnywhere

## 📋 Situação Atual

Atualmente o frontend está configurado para conectar ao **backend local** (`http://localhost:8000`).

Para conectar ao **PythonAnywhere**, você precisa criar um arquivo de configuração.

---

## ✅ Como Configurar

### **Passo 1: Criar arquivo `.env`**

Na pasta `laudos-frontend`, crie um arquivo chamado `.env` (exatamente com este nome, começando com ponto):

```bash
# Windows (PowerShell)
cd laudos-frontend
New-Item .env -ItemType File

# Windows (CMD)
cd laudos-frontend
type nul > .env

# Linux/Mac
cd laudos-frontend
touch .env
```

### **Passo 2: Adicionar a URL do PythonAnywhere**

Abra o arquivo `.env` e adicione:

```env
VITE_API_URL=https://SEU_USERNAME.pythonanywhere.com
```

**⚠️ IMPORTANTE:**
- Substitua `SEU_USERNAME` pelo seu username real do PythonAnywhere
- **NÃO** adicione barra `/` no final da URL
- **NÃO** adicione `/api` no final

**Exemplo correto:**
```env
VITE_API_URL=https://joaosilva.pythonanywhere.com
```

**❌ Exemplos incorretos:**
```env
VITE_API_URL=https://joaosilva.pythonanywhere.com/     # ❌ Barra no final
VITE_API_URL=https://joaosilva.pythonanywhere.com/api  # ❌ /api no final
```

### **Passo 3: Reiniciar o servidor**

Após criar o arquivo `.env`:

1. **Pare** o servidor de desenvolvimento (Ctrl+C)
2. **Inicie** novamente:
   ```bash
   npm run dev
   ```

---

## 🔄 Alternando entre Local e Produção

### **Para usar PythonAnywhere (Produção):**
```env
VITE_API_URL=https://SEU_USERNAME.pythonanywhere.com
```

### **Para usar Backend Local (Desenvolvimento):**
```env
VITE_API_URL=http://localhost:8000
```

**Ou simplesmente delete/renomeie o arquivo `.env`** para usar localhost automaticamente.

---

## 🧪 Como Testar se Está Conectando Corretamente

1. Abra o **Console do Navegador** (F12)
2. Vá para a aba **Network** (Rede)
3. Faça login no sistema
4. Verifique as requisições:
   - ✅ **Correto:** `https://SEU_USERNAME.pythonanywhere.com/api/auth/login/`
   - ❌ **Errado:** `http://localhost:8000/api/auth/login/`

---

## 📁 Estrutura de Arquivos

```
laudos-frontend/
├── .env                    ← ✅ CRIAR ESTE ARQUIVO
├── .env.example           ← Modelo (opcional)
├── src/
│   └── api.js             ← Usa VITE_API_URL
└── ...
```

---

## 🛡️ Segurança

- ✅ O arquivo `.env` está no `.gitignore` (não será enviado ao GitHub)
- ✅ Cada desenvolvedor deve ter seu próprio `.env`
- ✅ **NUNCA** commite o arquivo `.env` para o repositório

---

## 🐛 Solução de Problemas

### **Erro: "Failed to fetch" ou "Network Error"**
- Verifique se a URL do PythonAnywhere está correta
- Verifique se o backend está rodando no PythonAnywhere
- Verifique se há CORS configurado no backend

### **Ainda conecta em localhost**
- Certifique-se que o arquivo se chama exatamente `.env` (com ponto no início)
- Reinicie o servidor (`npm run dev`)
- Limpe o cache do navegador (Ctrl+Shift+Delete)

### **Erro 404 nas requisições**
- Verifique se não há barra `/` no final da URL
- Verifique se não adicionou `/api` no final

---

## 📞 Onde Está Configurado?

O código que lê a variável de ambiente está em:

**`laudos-frontend/src/api.js` (linha 4):**
```javascript
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
```

- Se `VITE_API_URL` estiver definido no `.env` → usa PythonAnywhere
- Se não estiver definido → usa localhost

---

## ✅ Checklist de Configuração

- [ ] Criar arquivo `.env` na pasta `laudos-frontend`
- [ ] Adicionar `VITE_API_URL=https://SEU_USERNAME.pythonanywhere.com`
- [ ] Substituir `SEU_USERNAME` pelo username real
- [ ] Reiniciar o servidor (`npm run dev`)
- [ ] Testar login no sistema
- [ ] Verificar requisições no Network (F12)

---

**Pronto! Seu frontend agora está conectado ao PythonAnywhere! 🎉**

