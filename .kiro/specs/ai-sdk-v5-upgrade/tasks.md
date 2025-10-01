# Implementation Plan

- [x] 1. Modernizar AIProvider com singleton pattern e cache
  - Refatorar src/server/aiProvider.ts para usar classe singleton
  - Implementar cache de modelos para evitar recriações
  - Adicionar suporte para múltiplos providers (Anthropic, OpenAI)
  - Implementar configurações avançadas (temperature, maxTokens, etc)
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 2. Implementar sistema de tools estruturado com AI SDK v5
  - Criar src/server/ai/tools/ com definições de ferramentas
  - Migrar lógica existente para formato tool() do v5
  - Implementar schemas de input/output com Zod
  - Adicionar callbacks para streaming de tool execution
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [ ] 3. Desenvolver gerenciador MCP completo
  - Criar src/server/mcp/manager.ts para conexões MCP
  - Implementar suporte para diferentes transportes (stdio, sse, http)
  - Integrar ferramentas MCP com ferramentas locais
  - Adicionar tratamento de falhas e fallbacks
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ] 4. Melhorar streaming com eventos granulares
  - Refatorar src/app/api/assistant/chat/route.ts para usar streamText v5
  - Implementar callbacks detalhados (onToolCall, onStepFinish, etc)
  - Adicionar eventos de progresso para UI
  - Implementar fallback gracioso para resposta única
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [ ] 5. Expandir structured output com schemas complexos
  - Criar src/server/ai/schemas.ts com schemas Zod avançados
  - Implementar retry automático em caso de falha de validação
  - Adicionar suporte para objetos aninhados e arrays
  - Implementar fallback para texto livre quando necessário
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 6. Implementar tratamento de erros robusto
  - Criar src/server/ai/error-handler.ts com categorização de erros
  - Implementar backoff exponencial para rate limits
  - Adicionar retry automático com configurações ajustadas
  - Implementar logging detalhado para debugging
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [ ] 7. Adicionar persistência e cache inteligente
  - Criar src/server/storage/conversation.ts para salvar conversas
  - Implementar cache com TTL apropriado para diferentes dados
  - Adicionar estratégias de limpeza de memória
  - Implementar fallback para modo temporário se storage falhar
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 8. Implementar segurança e validação avançada
  - Criar src/server/ai/security.ts com sanitização de inputs
  - Implementar detecção e bloqueio de prompt injection
  - Adicionar mascaramento de dados sensíveis
  - Implementar rate limiting por usuário
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [x] 9. Refatorar rotas da API para usar nova arquitetura
  - Atualizar src/app/api/assistant/route.ts com nova estrutura
  - Migrar src/app/api/assistant/chat/route.ts para streaming v5
  - Criar novas rotas para tools e análise estruturada
  - Adicionar rotas para gerenciamento MCP
  - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1_

- [ ] 10. Criar testes e documentação para nova implementação
  - Escrever testes unitários para todos os novos componentes
  - Criar testes de integração para fluxos completos
  - Documentar APIs e configurações
  - Criar guias de migração e troubleshooting
  - _Requirements: 6.4, 7.4, 8.4_