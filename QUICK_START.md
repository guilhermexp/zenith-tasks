# 🚀 Quick Start - Configurar AI Provider

Você está recebendo erro **503 (Service Unavailable)** porque nenhum provider de AI está configurado.

## ⚡ Solução Rápida (2 minutos)

### Opção 1: Google Gemini (GRATUITO - Recomendado)

1. **Obtenha sua API key grátis:**
   - Acesse: https://makersuite.google.com/app/apikey
   - Clique em "Create API Key"
   - Copie a chave

2. **Configure no `.env.local`:**
   ```bash
   # Google Gemini (Gratuito)
   AI_SDK_PROVIDER=google
   GEMINI_API_KEY=sua_chave_aqui
   ```

3. **Reinicie o servidor:**
   ```bash
   npm run dev
   ```

✅ **Pronto!** Agora todas as funções AI vão funcionar gratuitamente.

---

### Opção 2: AI Gateway (Mais Robusto)

Se quiser usar múltiplos providers com fallback automático:

1. **Crie conta no Portkey:**
   - Acesse: https://portkey.ai
   - Crie conta gratuita
   - Vá em Settings > API Keys
   - Copie a chave

2. **Configure no `.env.local`:**
   ```bash
   # AI Gateway
   USE_AI_GATEWAY=true
   AI_GATEWAY_API_KEY=pk-portkey-sua_chave_aqui

   # Fallback (caso Gateway falhe)
   AI_SDK_PROVIDER=google
   GEMINI_API_KEY=sua_chave_google
   ```

3. **Reinicie o servidor:**
   ```bash
   npm run dev
   ```

---

### Opção 3: Z.AI (Para Desenvolvimento)

```bash
# Z.AI
AI_SDK_PROVIDER=zai
ZAI_API_KEY=sua_chave_zai
ZAI_MODEL=glm-4.6
```

---

## 🔍 Verificar Configuração

Após configurar, acesse:
```
http://localhost:3457/api/debug/providers
```

Deve mostrar:
```json
{
  "activeProvider": "google",
  "providers": {
    "google": { "configured": true }
  }
}
```

---

## ❌ Erro 503 Persistente?

1. **Verifique se `.env.local` existe:**
   ```bash
   ls -la .env.local
   ```

2. **Verifique se as variáveis estão corretas:**
   ```bash
   cat .env.local | grep -E "(GEMINI|AI_SDK|GATEWAY)"
   ```

3. **Reinicie o servidor completamente:**
   ```bash
   # Pare o servidor (Ctrl+C)
   # Limpe cache
   rm -rf .next
   # Reinicie
   npm run dev
   ```

---

## 📝 Exemplo de `.env.local` Completo

```bash
# ============================================
# AI CONFIGURATION (Escolha UMA opção)
# ============================================

# OPÇÃO 1: Google Gemini (RECOMENDADO - Gratuito)
AI_SDK_PROVIDER=google
GEMINI_API_KEY=AIzaSy...

# OPÇÃO 2: AI Gateway (Avançado)
# USE_AI_GATEWAY=true
# AI_GATEWAY_API_KEY=pk-portkey-...

# OPÇÃO 3: Z.AI (Desenvolvimento)
# AI_SDK_PROVIDER=zai
# ZAI_API_KEY=...

# ============================================
# OUTRAS CONFIGURAÇÕES (Opcionais)
# ============================================

# Clerk (funciona em modo keyless se vazio)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

# Supabase (usa localStorage se vazio)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

---

## ✅ Testando

Após configurar, teste:

1. **Adicionar uma tarefa** → `/api/inbox/analyze` deve funcionar
2. **Usar o assistente** → Chat deve responder
3. **Gerar subtarefas** → Deve criar subtarefas automaticamente

---

## 💡 Dica

**Use Google Gemini** para começar - é gratuito, rápido e tem contexto gigante (2M tokens)!

```bash
AI_SDK_PROVIDER=google
GEMINI_API_KEY=sua_chave_google
```

**Apenas isso já resolve tudo!** 🎉
