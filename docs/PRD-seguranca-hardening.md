# PRD — Remoção de exposição de segredos e hardening

Status: Draft
Data: 2025-09-08
Owner: Engenharia
Stakeholders: Produto, Segurança, Engenharia

1) Contexto e problema
Hoje a aplicação expõe segredos em artefatos de repositório e no bundle do cliente (NEXT_PUBLIC_*), além de logs parciais de chaves. O consumo de IA também ocorre no cliente, exigindo chave pública. Isso cria riscos de segurança, compliance e abuso de API. Há ainda inconsistências de toolchain (npm vs pnpm) e oportunidades de fortalecer qualidade com lint e testes.

2) Objetivos (o que vamos alcançar)
- Remover exposição de segredos do repositório e do bundle do cliente.
- Centralizar todo consumo de IA no servidor usando apenas GEMINI_API_KEY server-side.
- Endurecer (hardening) o uso de variáveis de ambiente e revisão de logs.
- Padronizar o toolchain (npm OU pnpm) e ajustar dependências (turbo → devDependencies).
- Elevar a qualidade com regras de lint e testes (unitários e E2E smoke).

3) Escopo (in)
- Sanitização de arquivos versionados (p.ex., TEST_REPORT.md) para remoção de quaisquer segredos ou pseudosegredos.
- Remoção de logs que exibam total/parcial de chaves.
- Criação/ajuste de API Routes para consumo de IA, incluindo Talk Mode (transcrição) no servidor.
- Remoção do uso de NEXT_PUBLIC_GEMINI_API_KEY e adoção de GEMINI_API_KEY apenas no servidor.
- Ajustes de .gitignore para evitar commits acidentais de .env* e artefatos de build.
- Padronização de toolchain e ajuste de dependências (turbo como devDependency).
- Adição de regras de linter e testes mínimos.

4) Fora de escopo (out)
- Migração completa de persistência de dados do app (localStorage → DB). Pode ser discutido em PRD futuro.
- Observabilidade completa (Sentry/Datadog). Aqui apenas recomendações.

5) Requisitos e critérios de aceitação
5.1 Remover trechos sensíveis de TEST_REPORT.md (e rotacionar chaves no provedor)
- Requisito
  - Expurgar qualquer token/chave/segredo do arquivo TEST_REPORT.md e similares.
  - Incluir nota no documento indicando que o conteúdo foi sanitizado.
  - Rotacionar chaves no Google/OpenRouter no ambiente real.
- Aceitação
  - grep no repositório por padrões de chaves retorna vazio (ex.: "AIza", "sk-or-", etc.).
  - Registro de rotação documentado em CHANGELOG ou Security Notes.

5.2 Remover logs da key em App.tsx (ou qualquer lugar)
- Requisito
  - Eliminar console.log que imprima parte/total de segredos.
  - Adotar regra de lint para bloquear logs sensíveis em produção (no-console com exceções).
- Aceitação
  - next dev/start não imprime quaisquer partes da chave.
  - ESLint falha se houver console.log fora de ambientes permitidos.

5.3 Trocar consumo de IA no cliente por chamadas ao backend (inclui Talk Mode)
- Requisito
  - Criar endpoint server-side para transcrição de áudio (ex.: POST /api/speech/transcribe) recebendo base64 e retornando a transcrição.
  - Ajustar TalkModeModal para enviar áudio ao endpoint e nunca chamar @google/generative-ai diretamente no cliente.
  - Ajustar fluxos de análise/assistente para sempre passarem por API Routes.
- Aceitação
  - Build do cliente não contém o pacote @google/generative-ai nem NEXT_PUBLIC_GEMINI_API_KEY como referência de runtime.
  - Teste manual: Talk Mode funciona sem erros e sem chave no cliente.

5.4 Hardening de variáveis de ambiente
- Requisito
  - Usar somente GEMINI_API_KEY (server-side). Remover dependência de NEXT_PUBLIC_GEMINI_API_KEY.
  - Atualizar next.config.js para não injetar chaves no client.
  - Atualizar .env.example e README com instruções seguras.
- Aceitação
  - Busca por NEXT_PUBLIC_GEMINI_API_KEY no código retorna zero ocorrências.
  - Rotas server-side funcionam com GEMINI_API_KEY e retornam erro controlado quando ausente.

5.5 Adicionar .gitignore adequado
- Requisito
  - Ignorar: .env, .env.local, .env*.local, node_modules, .next, tsconfig.tsbuildinfo e similares.
- Aceitação
  - git check-ignore confirma que esses arquivos são ignorados.

5.6 Padronização de toolchain (npm OU pnpm) e turbo em devDependencies
- Requisito
  - Decisão: Adotar npm (menos mudança) OU adotar pnpm (monorepo-friendly). Padrão sugerido: npm (porque existe package-lock.json no root e apenas 1 pacote em packages/shared).
  - Se npm: remover pnpm-workspace.yaml e referências. Se pnpm: remover package-lock.json e criar pnpm-lock.yaml.
  - Mover turbo para devDependencies se mantido no projeto.
- Aceitação
  - Somente um lockfile presente.
  - Script de build e dev funcionam com o gerenciador escolhido.
  - npm ls --prod não lista turbo (apenas em devDeps).

5.7 Qualidade — Linter e regras
- Requisito
  - Adicionar no-console (permitindo console.error/warn em dev), import/order e regras básicas de segurança.
  - Adicionar script npm run lint:ci para CI.
- Aceitação
  - npm run lint passa localmente.
  - Quebra no CI quando regras forem violadas.

5.8 Qualidade — Testes
- Requisito
  - Unit (Vitest ou Jest) cobrindo:
    - services/ai/prompts.ts (formato/conteúdo mínimo)
    - services/ai/orchestrator.ts (pós-processamento por tipo)
    - services/ai/index.ts (extract/parse mínimo com mocking)
  - E2E Smoke (Playwright):
    - Fluxo de criação de item simples.
    - Fluxo Talk Mode (mockar transcrição no endpoint) para validar UX e chamada ao backend.
- Aceitação
  - npm test (ou npm run test) passa localmente.
  - Playwright smoke roda em CI headless e passa.

6) Plano técnico (alto nível)
- Remover referências client-side a @google/generative-ai e substituir por chamadas ao backend.
- Implementar /api/speech/transcribe usando GEMINI_API_KEY server-side (com rate-limit e timeouts). Alternativa: fallback model/try-catch como já existe nos demais endpoints.
- Ajustar assistant/analyze para priorizar AI via server (já existe) e garantir que o client só faça fetch.
- Atualizar next.config.js removendo env NEXT_PUBLIC_GEMINI_API_KEY.
- Reforçar rateLimit.ts (mantém simples in-memory; opção de Redis futura).
- Atualizar .env.example, README e docs com instruções seguras.
- Padronização de toolchain: (Assunção) Adotar npm. Remover pnpm-workspace.yaml e mover turbo para devDependencies. Caso desejem pnpm, inverter passos.
- Lint/CI: configurar regras, script lint:ci e (em PR futuro) workflow GitHub Actions.
- Testes: adicionar base de Vitest/Jest e Playwright com testes mínimos.

7) Métricas de sucesso
- 0 ocorrências de NEXT_PUBLIC_GEMINI_API_KEY no repo e bundle.
- 0 referências a chaves/API no client em runtime.
- Testes (unit + smoke) ≥ 80% passar (cobertura não é meta aqui, mas passar = obrigatório).
- Lint sem violações em CI.

8) Riscos e mitigação
- Quebra de funcionalidades de IA ao mover para backend.
  - Mitigação: feature flag temporária, fallback de modelo, testes smoke.
- Tempo adicional para decisão de toolchain.
  - Mitigação: assumir npm por padrão e reavaliar monorepo depois.
- Falsos positivos em regras de lint.
  - Mitigação: calibrar regras gradualmente (warn → error).

9) Rollout e comunicação
- Branch dedicada: chore/security-hardening-secrets
- PR com checklist de aceitação deste PRD.
- Comunicação interna: changelog com nota de segurança (remoção de segredos e mudança de fluxo IA para server).

10) Plano de testes
- Unit: rodar npm test local e em CI.
- E2E: Playwright headless no CI (smoke curto).
- Manual: validação de Talk Mode e Assistant no ambiente dev.

11) Backout plan
- Caso Talk Mode falhe após mudanças: reverter Talk Mode para versão anterior temporariamente (apenas enquanto corrige endpoint), mantendo ainda remoção de logs e segredos.
- Manter commit atômico por tópico (segurança vs talk mode) para revert seletivo.

12) Tarefas (backlog executável)
A. Segurança
- [ ] Sanitizar TEST_REPORT.md removendo segredos e inserir aviso de conteúdo sanitizado.
- [ ] Rotacionar chaves no Google/OpenRouter (fora do repo; registrar nota).
- [ ] Remover logs com pedaços de chave (App.tsx).
- [ ] Remover uso de NEXT_PUBLIC_GEMINI_API_KEY e references.
- [ ] Ajustar next.config.js para não injetar chaves públicas.
- [ ] Atualizar .env.example e README.
- [ ] Adicionar/ajustar .gitignore (ignorar .env*, .next, tsconfig.tsbuildinfo, etc.).

B. Backend IA
- [ ] Criar /api/speech/transcribe (POST, base64, timeout, rate-limit, erros claros).
- [ ] Atualizar TalkModeModal para usar o endpoint (sem IA no cliente).

C. Toolchain
- [ ] Decidir entre npm/pnpm (Assunção: npm).
- [ ] Remover artefatos do outro gerenciador (package-lock.json ou pnpm-workspace.yaml/pnpm-lock.yaml conforme decisão).
- [ ] Mover turbo para devDependencies (ou remover se não utilizado).

D. Qualidade
- [ ] Adicionar ESLint regras: no-console (exceto warn/error), import/order, segurança básica.
- [ ] Adicionar script lint:ci.
- [ ] Adicionar Vitest/Jest em services/ai (3 testes mínimos).
- [ ] Adicionar Playwright smoke (2 cenários mínimos).

13) Dependências e decisões pendentes
- Decisão: npm vs pnpm (proposta: npm por simplicidade atual).
- Confirmação: manter talk mode e assistant com as mesmas funcionalidades pós-migração server-side.

14) Anexos
- Exemplos de padrões .gitignore para Next.js.
- Especificação API /api/speech/transcribe (rótulo inicial):
  - POST body: { audioBase64: string, mimeType?: string }
  - 200: { text: string }
  - 400/413/429/500 com body { error: string }

