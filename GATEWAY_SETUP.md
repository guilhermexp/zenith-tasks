# Como Usar AI Gateway ao Invés do OpenRouter

O projeto **já possui implementação completa do AI Gateway** (Portkey/Vercel AI Gateway) que é mais confiável que o OpenRouter com AI SDK v5.

## ✅ Vantagens do AI Gateway

1. **Compatibilidade Total** com AI SDK v5
2. **Fallback Automático** entre provedores
3. **Cache e Rate Limiting** integrados
4. **Seleção Inteligente** de modelos baseada em contexto
5. **Gerenciamento de Créditos** centralizado

## 🔧 Configuração

### 1. Adicionar Variáveis de Ambiente

No seu arquivo `.env.local`, adicione:

```bash
# AI Gateway Configuration
AI_GATEWAY_API_KEY=sua_chave_aqui
USE_AI_GATEWAY=true

# Opcional: URL customizada (padrão: https://api.portkey.ai/v1)
AI_GATEWAY_BASE_URL=https://api.portkey.ai/v1
```

### 2. Obter API Key

O projeto suporta dois gateways:

**Opção 1: Portkey (Recomendado)**
- Acesse: https://portkey.ai
- Crie uma conta gratuita
- Obtenha sua API key em Settings > API Keys
- Configure seus provedores (OpenAI, Anthropic, Google, etc.)

**Opção 2: Vercel AI Gateway**
- Se você usar deploy na Vercel, o gateway já está disponível
- Configure em: https://vercel.com/dashboard/ai

### 3. Remover/Comentar OpenRouter (opcional)

No `.env.local`, você pode remover ou comentar:

```bash
# AI_SDK_PROVIDER=openrouter  # <-- comentar esta linha
# OPENROUTER_API_KEY=...       # <-- comentar esta linha
```

## 🚀 Como Funciona

### Fluxo Automático

Quando você configura o Gateway, o sistema automaticamente:

1. **Tenta usar o Gateway primeiro** se `USE_AI_GATEWAY=true`
2. **Seleciona o melhor modelo** baseado no contexto da tarefa:
   - `analysis` → Modelos determinísticos (temp=0.3)
   - `creative` → Modelos criativos (temp=0.9)
   - `code` → Modelos para código (temp=0.2)
   - `chat` → Modelos balanceados (temp=0.7)
3. **Faz fallback** para provedores diretos se o Gateway falhar
4. **Gerencia créditos** automaticamente

### Seleção de Modelos

O Gateway escolhe modelos automaticamente baseado em:

```typescript
// Contextos disponíveis
'task-planning'    // Planejamento de tarefas
'creative-writing' // Escrita criativa
'code-generation'  // Geração de código
'chat'             // Chat geral
'analysis'         // Análise de dados
```

## 📊 Verificar Status

### Via API Debug

```bash
curl http://localhost:3457/api/debug/providers
```

Retorna:

```json
{
  "gateway": {
    "configured": true,
    "enabled": true,
    "key": "pk-xxxxx..."
  },
  "providers": {
    "zai": { "configured": true },
    "google": { "configured": false },
    "openrouter": { "configured": true }
  },
  "recommendations": [
    "Gateway está ativo e funcionando"
  ]
}
```

### Via Logs

Quando o servidor iniciar, você verá:

```
[AIProvider] Attempting to use AI Gateway
[Gateway] Initialized with API key
[Gateway] Loaded real models from API
[AIProvider] Using Gateway model: openai/gpt-4o
```

## 🔄 Migração do OpenRouter para Gateway

### Antes (com erros AI SDK v5):

```bash
AI_SDK_PROVIDER=openrouter
OPENROUTER_API_KEY=sk-or-...
OPENROUTER_MODEL=google/gemma-2-9b-it:free
```

### Depois (estável):

```bash
# Ativar Gateway
USE_AI_GATEWAY=true
AI_GATEWAY_API_KEY=pk-portkey-...

# Gateway vai usar o modelo mais adequado automaticamente
# Ou você pode especificar: AI_GATEWAY_DEFAULT_MODEL=openai/gpt-4o
```

## 🛠️ Configuração Avançada

### Fallback Providers

O Gateway pode fazer fallback entre múltiplos provedores:

```typescript
// No código (já implementado)
const gateway = new GatewayProvider({
  apiKey: process.env.AI_GATEWAY_API_KEY,
  fallbackProviders: ['openai', 'anthropic', 'google']
});
```

### Cache de Modelos

```typescript
// Cache automático de 5 minutos (configurável)
const gateway = new GatewayProvider({
  metadataCacheRefreshMillis: 5 * 60 * 1000
});
```

## 🐛 Troubleshooting

### Gateway não está sendo usado

1. Verifique se `USE_AI_GATEWAY=true` está definido
2. Verifique se `AI_GATEWAY_API_KEY` está presente
3. Veja os logs do servidor para mensagens do Gateway

### Erro "Gateway not available"

- Verifique sua API key em https://portkey.ai
- Teste a conexão: `curl -H "x-portkey-api-key: $AI_GATEWAY_API_KEY" https://api.portkey.ai/v1/models`

### Ainda usando OpenRouter

- Confirme que `.env.local` tem as variáveis corretas
- Reinicie o servidor: `npm run dev`
- Limpe o cache: `rm -rf .next && npm run dev`

## 📚 Arquivos Relacionados

- `src/server/ai/gateway/provider.ts` - Implementação do Gateway
- `src/server/aiProvider.ts` - Gerenciador de AI providers
- `src/app/api/debug/providers/route.ts` - Debug endpoint
- `test-ai-gateway.ts` - Script de teste do Gateway

## 🎯 Próximos Passos

1. Obtenha sua chave do Portkey
2. Configure as variáveis de ambiente
3. Reinicie o servidor
4. Teste com: `/api/inbox/analyze` ou chat assistant
5. Monitore os logs para confirmar uso do Gateway

---

**Nota**: O Gateway resolve todos os problemas de compatibilidade com AI SDK v5 que você está enfrentando com OpenRouter!
