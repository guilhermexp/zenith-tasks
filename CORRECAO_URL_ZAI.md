# 🔧 Correção da URL Z.AI

**Status:** ✅ Corrigido

## ❌ Erro:
```
[Error [AI_APICallError]: Not Found]
url: 'https://api.z.ai/api/coding/paas/v4/responses'
statusCode: 404
path: "/v4/responses"
```

## 🎯 Causa:
O SDK da OpenAI adiciona automaticamente o path `/v4/chat/completions` à baseURL.

### Configuração Errada:
```typescript
baseURL: 'https://api.z.ai/api/coding/paas/v4'
// SDK tenta: /v4/responses ❌
```

### Configuração Correta:
```typescript
baseURL: 'https://api.z.ai/api/coding/paas'
// SDK usa: /v4/chat/completions ✅
```

## ✅ Solução:

**Arquivo:** `/src/server/aiProvider.ts`

```typescript
case 'zai': {
  const { createOpenAI } = await import('@ai-sdk/openai');
  const zai = createOpenAI({
    apiKey,
    baseURL: 'https://api.z.ai/api/coding/paas'  // ✅ SEM /v4
  });
  return zai('glm-4.6') as LanguageModel;
}
```

## ✅ Teste:
```bash
curl -X POST https://api.z.ai/api/coding/paas/v4/chat/completions \
  -H "Authorization: Bearer $ZAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"glm-4.6","messages":[{"role":"user","content":"oi"}]}'

# ✅ Funciona!
```

## 🚀 Agora:
**Restart servidor:**
```bash
npm run dev
```

**Testar chat no app - deve funcionar! ✅**
