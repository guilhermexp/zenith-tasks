# ✅ Z.AI Configuração Correta - Endpoint /v4

**Data:** ${new Date().toISOString()}

---

## 🎯 Configuração Correta do Z.AI:

### Chave API:
```
fabf94f1576e4265b4796559172f6666.ahUCMi5fSyfg8g2z
```

### Base URL:
```
https://api.z.ai/api/coding/paas/v4
```

### Modelo:
```
glm-4.6
```

---

## ⚠️ IMPORTANTE: Z.AI usa /v4, NÃO /v1!

Diferente de outros provedores OpenAI-compatíveis que usam `/v1`, o Z.AI usa `/v4`:

```typescript
// ❌ ERRADO - Outros providers
baseURL: 'https://api.openai.com/v1'

// ✅ CORRETO - Z.AI
baseURL: 'https://api.z.ai/api/coding/paas/v4'
```

---

## 🔧 Implementação no aiProvider.ts:

```typescript
case 'zai': {
  const apiKey = config?.apiKey || process.env.ZAI_API_KEY;
  if (!apiKey) {
    throw new Error('ZAI_API_KEY not configured');
  }

  const { createOpenAI } = await import('@ai-sdk/openai');
  
  // Z.AI usa endpoint /v4 ao invés de /v1
  // O AI SDK adiciona automaticamente /chat/completions
  const zai = createOpenAI({
    apiKey,
    baseURL: 'https://api.z.ai/api/coding/paas/v4'
  });

  const modelName = config?.model || process.env.ZAI_MODEL || 'glm-4.6';
  return zai(modelName) as LanguageModel;
}
```

---

## 📊 Como o AI SDK Constrói a URL:

```
baseURL: 'https://api.z.ai/api/coding/paas/v4'
+
endpoint: '/chat/completions' (adicionado automaticamente)
=
URL final: 'https://api.z.ai/api/coding/paas/v4/chat/completions' ✅
```

---

## 🧪 Teste Manual da API:

```bash
curl -X POST https://api.z.ai/api/coding/paas/v4/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer fabf94f1576e4265b4796559172f6666.ahUCMi5fSyfg8g2z" \
  -d '{
    "model": "glm-4.6",
    "messages": [
      {"role": "user", "content": "Olá, como você está?"}
    ],
    "stream": true
  }'
```

**Resposta esperada:** Stream de chunks JSON com as respostas

---

## 🔍 Debugging:

### Logs do Servidor:

```bash
# Deve aparecer:
[AIProvider] Using Z.AI model: glm-4.6 with baseURL: https://api.z.ai/api/coding/paas/v4
[ChatService] Chat processado {"provider":"zai","success":true}
```

### Se der erro 404:

Verificar se a URL está sendo construída como:
```
✅ https://api.z.ai/api/coding/paas/v4/chat/completions
❌ https://api.z.ai/api/coding/paas/v4/responses (endpoint errado)
```

---

## 📋 Variáveis de Ambiente (.env.local):

```env
# Z.AI Configuration
ZAI_API_KEY=fabf94f1576e4265b4796559172f6666.ahUCMi5fSyfg8g2z
ZAI_MODEL=glm-4.6
AI_SDK_PROVIDER=zai
```

---

## ✅ Validação Final:

1. **Restart servidor:**
   ```bash
   Ctrl+C
   npm run dev
   ```

2. **Abrir browser:** `http://localhost:3457`

3. **Abrir Assistente AI**

4. **Selecionar modelo:** GLM-4.6 (Z.AI)

5. **Enviar mensagem**

6. **Verificar logs no terminal:**
   - ✅ Deve mostrar: `Using Z.AI model: glm-4.6 with baseURL: .../v4`
   - ✅ Deve mostrar: `Chat processado {"provider":"zai","success":true}`
   - ❌ NÃO deve mostrar erro 404

---

## 🎯 Diferenças entre Provedores:

| Provider | Base URL | Versão |
|----------|----------|--------|
| OpenAI | `https://api.openai.com` | `/v1` |
| OpenRouter | `https://openrouter.ai/api` | `/v1` |
| Anthropic | `https://api.anthropic.com` | `/v1` |
| **Z.AI** | `https://api.z.ai/api/coding/paas` | **`/v4`** ⚠️ |

---

**STATUS:** ✅ Configuração correta implementada com /v4

---

*Documentação criada em ${new Date().toISOString()}*
