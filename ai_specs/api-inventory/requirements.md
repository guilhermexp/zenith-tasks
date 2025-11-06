# Requirements: api-inventory

## 1. Visão Geral
Objetivo: Automatizar o inventário de todas as APIs/endpoints disponíveis no(s) código(s) do repositório, incluindo método HTTP, caminho, handler/arquivo, parâmetros, payloads, respostas, autenticacão/autorização e organização por serviço/módulo. Exportar um relatório em Markdown e, opcionalmente, uma especificação OpenAPI.
Problema do usuário: Necessidade de visibilidade completa e atualizada das interfaces expostas, para auditoria, documentação, QA e integração entre equipes.

## 2. Requisitos Funcionais

### RF-1 Descoberta de Endpoints
User Story: Como mantenedor, eu quero descobrir automaticamente todos os endpoints do repositório, para que eu tenha um inventário preciso sem esforço manual.

Aceitação (EARS):
1. WHEN o sistema escanear o repositório THEN o sistema SHALL identificar frameworks de API e pontos de montagem de rotas (por exemplo: Express/Fastify/Koa/Hono/NestJS, Next.js API, Flask/FastAPI/Django, Axum/Actix/Rocket, Gin/Chi/net-http, etc.).
2. IF um framework suportado for detectado THEN o sistema SHALL extrair para cada rota o método HTTP, caminho, arquivo, possível handler e linha aproximada.
3. WHERE houver múltiplos serviços/pacotes THEN o sistema SHALL separar os resultados por serviço/módulo.
4. IF nenhuma rota for encontrada THEN o sistema SHALL registrar justificativa clara das verificações realizadas.

### RF-2 Metadados de Autenticação e Versionamento
User Story: Como auditor de segurança, eu quero ver anotações de autenticação e versionamento por endpoint, para avaliar riscos e políticas.

Aceitação (EARS):
1. WHEN um endpoint possuir middlewares/guards de autenticação THEN o sistema SHALL anotar o mecanismo detectado (ex.: requireAuth, @UseGuards(AuthGuard), scopes/roles).
2. IF o caminho contiver prefixos de versão (ex.: /v1, /api/v2) THEN o sistema SHALL registrar a versão identificada.

### RF-3 Relatório em Markdown
User Story: Como leitor de documentação, eu quero um relatório legível em Markdown, para consultar endpoints por serviço com detalhes essenciais.

Aceitação (EARS):
1. WHEN a descoberta concluir THEN o sistema SHALL gerar um arquivo Markdown consolidado contendo, para cada endpoint: método, caminho, arquivo do handler, assinatura (quando possível), parâmetros esperados, corpo de requisição (quando inferível), códigos de resposta conhecidos e requisitos de autenticação.
2. WHERE o repositório contiver mais de um serviço THEN o sistema SHALL organizar o relatório por serviço/módulo, com índice.
3. IF houver endpoints similares/duplicados THEN o sistema SHALL normalizar caminhos e remover duplicatas mantendo referências de origem.

### RF-4 Exportação OpenAPI (Opcional)
User Story: Como integrador, eu quero uma especificação OpenAPI, para facilitar geração de clientes e validação automática.

Aceitação (EARS):
1. WHEN solicitado pelo usuário THEN o sistema SHALL gerar um arquivo openapi.yaml com os paths detectados.
2. IF for possível inferir schemas de request/response THEN o sistema SHALL incluir exemplos ou tipos básicos.
3. IF não for possível inferir tipos com confiança THEN o sistema SHALL documentar limitações e incluir placeholders coerentes.

### RF-5 Execução Não Intrusiva
User Story: Como desenvolvedor, eu quero que a análise não modifique o código nem execute servidores, para manter segurança e reprodutibilidade.

Aceitação (EARS):
1. WHEN executado THEN o sistema SHALL realizar análise estática e leitura de arquivos apenas.
2. WHILE a análise estiver em andamento THEN o sistema SHALL não alterar arquivos fora da pasta de documentação do inventário.

## 3. Requisitos Técnicos (Não Funcionais)

### RNF-1 Desempenho
User Story: Como usuário, eu quero que a geração do inventário termine em tempo razoável, para não interromper meu fluxo.

Aceitação (EARS):
1. WHEN executado em um repositório típico de tamanho médio THEN o sistema SHALL concluir a descoberta em menos de 5 minutos.
2. IF o repositório for muito grande THEN o sistema SHALL informar progresso e quaisquer limitações de abrangência usadas (por exemplo, pastas ignoradas).

### RNF-2 Completude e Robustez
User Story: Como responsável por QA, eu quero um resultado consistente mesmo com estilos diferentes de código, para garantir cobertura ampla.

Aceitação (EARS):
1. IF rotas forem definidas por padrões comuns (router.METHOD, decorators, registradores de rotas) THEN o sistema SHALL detectá-las.
2. IF padrões não convencionais forem encontrados THEN o sistema SHALL sinalizar potenciais lacunas no relatório.

### RNF-3 Reprodutibilidade e Rastreabilidade
User Story: Como auditor, eu quero traço claro entre endpoint e arquivo/linha, para verificação futura.

Aceitação (EARS):
1. WHEN registrar cada endpoint THEN o sistema SHALL incluir caminho do arquivo relativo e número de linha aproximado quando possível.
2. WHERE handlers nomeados existirem THEN o sistema SHALL registrar o nome do handler.

### RNF-4 Formatos de Saída
User Story: Como consumidor de dados, eu quero formatos legíveis e estruturados, para usos diversos.

Aceitação (EARS):
1. WHEN o inventário for gerado THEN o sistema SHALL produzir pelo menos: Spec/api-inventory/endpoints.txt e Spec/api-inventory/endpoints.json.
2. IF a exportação OpenAPI for habilitada THEN o sistema SHALL produzir Spec/api-inventory/openapi.yaml válido.

## 4. Critérios de Aceite Gerais
1. WHEN a execução finalizar THEN o sistema SHALL criar Spec/api-inventory/endpoints.txt e Spec/api-inventory/endpoints.json contendo a lista de endpoints e metadados mínimos (método, caminho, arquivo).
2. IF múltiplos serviços forem detectados THEN o sistema SHALL segmentar resultados por serviço/módulo no relatório Markdown.
3. IF nenhum endpoint for encontrado THEN o sistema SHALL registrar no relatório o conjunto de verificações realizadas e possíveis motivos.

## 5. Fora de Escopo
- Execução de servidores ou chamadas reais às APIs.
- Refatoração de código para adequar a detecção.
- Geração de exemplos detalhados quando não houver base para inferência.
- Garantia de 100% de inferência de tipos em todas as stacks.
