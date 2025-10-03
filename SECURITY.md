# 🔒 Práticas de Segurança

## ❌ NUNCA FAÇA ISSO:

1. **NUNCA compartilhe API keys** em chats, emails, código público
2. **NUNCA commite `.env.local`** no git
3. **NUNCA exponha chaves** em screenshots ou logs públicos

## ✅ SEMPRE FAÇA ISSO:

1. **Mantenha chaves em `.env.local`** (já está no `.gitignore`)
2. **Revogue chaves expostas** imediatamente
3. **Use variáveis de ambiente** em produção (Vercel/Railway/etc)

---

## 🛡️ O que Fazer se Expôs uma Chave:

### 1. REVOGUE IMEDIATAMENTE

**Google Cloud:**
- https://console.cloud.google.com/apis/credentials
- Delete a chave comprometida
- Crie uma nova

**Portkey:**
- https://portkey.ai/settings/api-keys
- Delete a chave comprometida
- Crie uma nova

**OpenAI:**
- https://platform.openai.com/api-keys
- Revoke a chave comprometida
- Crie uma nova

**Anthropic:**
- https://console.anthropic.com/settings/keys
- Delete a chave comprometida
- Crie uma nova

### 2. Monitore Uso Suspeito

- Verifique logs de uso nas próximas 24-48h
- Configure alertas de gastos se disponível
- Reporte à plataforma se detectar uso não autorizado

### 3. Atualize Localmente

```bash
# Atualize .env.local com a NOVA chave
nano .env.local

# Reinicie o servidor
npm run dev
```

---

## 📋 Checklist de Segurança

Antes de deployar ou compartilhar código:

- [ ] `.env.local` está no `.gitignore`?
- [ ] Não há chaves hardcoded no código?
- [ ] Variáveis de ambiente estão configuradas no serviço de deploy?
- [ ] `.env.example` não contém valores reais?
- [ ] Logs não expõem informações sensíveis?

---

## 🔐 Arquivo `.gitignore` Correto

Verifique se seu `.gitignore` inclui:

```
# Environment variables
.env
.env.local
.env.*.local
.env.development
.env.production

# API Keys
*.key
*.pem
secrets/
```

---

## 🚀 Deploy Seguro (Vercel)

```bash
# NÃO coloque chaves em .env.local
# Use o dashboard da Vercel:

1. Vercel Dashboard → Seu Projeto
2. Settings → Environment Variables
3. Adicione cada variável:
   - AI_GATEWAY_API_KEY
   - GEMINI_API_KEY
   - etc.
```

---

## 📞 Contato em Caso de Emergência

Se você expôs chaves acidentalmente:

1. **Revogue IMEDIATAMENTE**
2. Monitore uso nas próximas 48h
3. Se detectar uso não autorizado, contate o suporte da plataforma
4. Considere trocar cartão de crédito se houver cobranças suspeitas

---

## 💡 Dica: Como Compartilhar Configuração

Se precisar ajuda com configuração:

```bash
# ❌ ERRADO:
"Minha chave é: AIzaSy..."

# ✅ CORRETO:
"Tenho uma chave do Google configurada mas está dando erro X"
# Ou compartilhe apenas os primeiros caracteres mascarados:
"Minha chave começa com AIzaSy... e termina com ...1cY"
```

---

## 🔍 Como Verificar se Está Seguro

```bash
# Verifique se .env.local não está no git:
git ls-files | grep .env.local
# Deve retornar vazio

# Verifique se está no .gitignore:
cat .gitignore | grep .env.local
# Deve mostrar: .env.local

# Procure por chaves hardcoded no código:
grep -r "AIza" src/
grep -r "sk-" src/
# Não deve encontrar nada
```

---

## ✅ Está Seguro Quando:

- ✅ `.env.local` existe e está no `.gitignore`
- ✅ Nenhuma chave no código-fonte
- ✅ Deploy usa variáveis de ambiente do dashboard
- ✅ Chaves antigas expostas foram revogadas
- ✅ Você NUNCA compartilha chaves completas

---

**Lembre-se: Segurança não é opcional! 🔒**
