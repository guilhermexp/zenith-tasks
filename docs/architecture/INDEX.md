# Zenith Tasks - Índice de Documentação Arquitetural

> **Projeto**: Zenith Tasks
> **Versão**: 1.0.0
> **Data**: Janeiro 2025
> **Autor**: Guilherme Varela

---

## 📚 Documentos Disponíveis

### 📘 Documentação Principal

| Documento | Descrição | Status |
|-----------|-----------|--------|
| **[README.md](./README.md)** | Documentação completa de arquitetura (C4 Model, componentes, dados) | ✅ Completo |
| **[deployment-guide.md](./deployment-guide.md)** | Guia detalhado de deploy para produção | ✅ Completo |

### 📊 Diagramas (PlantUML)

| Diagrama | Tipo | Arquivo |
|----------|------|---------|
| **System Context** | C4 Level 1 | [c4-system-context.puml](./diagrams/c4-system-context.puml) |
| **Container** | C4 Level 2 | [c4-container.puml](./diagrams/c4-container.puml) |
| **Data Flow - Task Creation** | Sequence | [data-flow-task-creation.puml](./diagrams/data-flow-task-creation.puml) |

#### Como visualizar diagramas PlantUML

```bash
# Opção 1: VS Code Extension
# Instale: PlantUML (jebbs.plantuml)

# Opção 2: Online
# Acesse: http://www.plantuml.com/plantuml/uml/

# Opção 3: CLI
brew install plantuml
plantuml diagrams/*.puml
```

### 📝 Architecture Decision Records (ADRs)

| ADR | Título | Status | Data |
|-----|--------|--------|------|
| **[ADR-001](./adrs/ADR-001-nextjs-app-router.md)** | Adoção do Next.js 15 com App Router | ✅ Aceito | Jan 2025 |
| **[ADR-002](./adrs/ADR-002-supabase-backend.md)** | Supabase como Backend-as-a-Service | ✅ Aceito | Jan 2025 |
| ADR-003 | AI SDK 5.0 com Múltiplos Provedores | 🟡 Planejado | - |
| ADR-004 | Clerk Auth com Bypass Temporário | ⚠️ Temporário | Jan 2025 |
| ADR-005 | Model Context Protocol (MCP) | ✅ Aceito | Jan 2025 |

---

## 🏗️ Estrutura de Arquitetura

### Níveis de Documentação (C4 Model)

```
📊 System Context (Nível 1)
  ├─ Usuários e sistemas externos
  └─ Integrações (Gemini, Supabase, Clerk, MCP)

📦 Containers (Nível 2)
  ├─ Web Application (Next.js)
  ├─ API Routes
  ├─ AI Service Layer
  ├─ MCP Client
  ├─ Database Service
  └─ Databases (PostgreSQL, Redis)

🧩 Components (Nível 3)
  ├─ Frontend Components
  │   ├─ App.tsx (main orchestrator)
  │   ├─ Sidebar, TaskList, DetailPanel
  │   ├─ CalendarPage, FinancePage, MeetingPage
  │   └─ AI Input, ModelSelector
  ├─ Backend Services
  │   ├─ AI Service (aiProvider.ts)
  │   ├─ Database Service (items.ts)
  │   ├─ MCP Client (mcp/client.ts)
  │   └─ Credits System (credits/)
  └─ Shared Utilities
      ├─ State Management (state/)
      ├─ Hooks (hooks/)
      └─ Utils (utils/)

🔢 Code (Nível 4)
  └─ Ver estrutura detalhada no README.md
```

---

## 🎯 Quick Start

### Para Desenvolvedores

1. **Entender a arquitetura geral**
   - Ler [README.md](./README.md) (seções 1-4)
   - Visualizar diagramas C4

2. **Entender decisões de design**
   - Ler ADRs (especialmente ADR-001 e ADR-002)

3. **Setup local**
   ```bash
   git clone <repo>
   npm install
   cp .env.example .env
   npm run dev
   ```

4. **Explorar código**
   - Começar por `src/app/page.tsx`
   - Depois `src/components/App.tsx`
   - Entender fluxo de dados (README.md seção 6)

### Para Arquitetos

1. **Review de decisões**
   - Todos os ADRs em `adrs/`
   - Diagramas C4 em `diagrams/`

2. **Avaliar trade-offs**
   - Vendor lock-in (Vercel, Supabase)
   - Custos de escalabilidade
   - Segurança (RLS, auth)

3. **Planejar melhorias**
   - Ver "Próximos Passos" no README.md
   - Criar novos ADRs para mudanças

### Para DevOps/SRE

1. **Entender infraestrutura**
   - Ler [deployment-guide.md](./deployment-guide.md)
   - Review de env vars necessárias

2. **Setup de monitoramento**
   - Sentry para errors
   - Vercel Analytics para performance
   - Supabase Dashboard para database

3. **Configurar CI/CD**
   - GitHub Actions (exemplo no deployment-guide)
   - Vercel auto-deploy

---

## 🔍 Busca Rápida

### Encontrar Informação por Tópico

| Tópico | Documento | Seção |
|--------|-----------|-------|
| **Visão Geral do Sistema** | README.md | Seção 1 |
| **Integrações Externas** | README.md | Seção 2 (Context) |
| **Componentes Frontend** | README.md | Seção 4 |
| **Modelo de Dados** | README.md | Seção 5 |
| **Fluxo de Criação de Tarefa** | README.md | Seção 6.1 |
| **Fluxo de Chat com IA** | README.md | Seção 6.2 |
| **Segurança** | README.md | Seção 7 |
| **Por que Next.js?** | ADR-001 | Todo |
| **Por que Supabase?** | ADR-002 | Todo |
| **Como fazer deploy?** | deployment-guide.md | Todo |
| **Variáveis de ambiente** | deployment-guide.md | Seção 4 |
| **Troubleshooting** | deployment-guide.md | Última seção |

---

## 📖 Convenções de Documentação

### Formato de ADRs

Todos os ADRs seguem o template:

```markdown
# ADR-XXX: Título

## Status
✅ Aceito | 🟡 Proposto | ⚠️ Temporário | ❌ Rejeitado

## Contexto
Problema a ser resolvido

## Decisão
Solução escolhida

## Consequências
Positivas ✅ | Negativas ⚠️ | Riscos

## Implementação
Código e config necessários
```

### Diagramas

- **PlantUML** para diagramas técnicos (C4, Sequence, etc)
- **Mermaid** para diagramas inline no README
- Manter diagramas versionados junto com código

### Versionamento

Documentação segue versão do app (`package.json`):

```json
{
  "version": "1.0.0"
}
```

Atualizar `docs/architecture/README.md` header quando versão mudar.

---

## 🚀 Contribuindo com a Documentação

### Adicionar Novo ADR

1. Criar arquivo `adrs/ADR-XXX-titulo.md`
2. Seguir template de ADR
3. Adicionar no índice deste arquivo
4. Commit e PR

### Atualizar Diagramas

1. Editar `.puml` em `diagrams/`
2. Gerar PNG (opcional): `plantuml diagrams/*.puml`
3. Commit e PR

### Revisar Documentação

Frequência recomendada:

- **Mensal**: Review de ADRs (novos? desatualizados?)
- **Trimestral**: Review de diagramas (refletem código?)
- **A cada release**: Atualizar version no header

---

## 📈 Métricas de Qualidade

### Checklist de Documentação Completa

- [x] Diagrama de Contexto (C4 L1)
- [x] Diagrama de Contêineres (C4 L2)
- [ ] Diagrama de Componentes (C4 L3) - Planejado
- [x] Fluxo de dados principais
- [x] ADRs de decisões importantes
- [x] Guia de deployment
- [ ] Runbook de operações - Planejado
- [ ] Guia de troubleshooting - Planejado

### Cobertura

```
✅ Arquitetura geral: 90%
✅ Decisões técnicas: 80%
✅ Deployment: 100%
⚠️ Operações (SRE): 30%
⚠️ Troubleshooting: 40%
```

---

## 🔗 Links Úteis

### Documentação Externa

- [Next.js Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Vercel AI SDK](https://sdk.vercel.ai/docs)
- [Clerk Auth Docs](https://clerk.com/docs)
- [Model Context Protocol](https://modelcontextprotocol.io/)

### Ferramentas

- [PlantUML Online Editor](http://www.plantuml.com/plantuml/uml/)
- [Mermaid Live Editor](https://mermaid.live/)
- [C4 Model](https://c4model.com/)
- [ADR Tools](https://adr.github.io/)

### Repositórios Relacionados

- [Zenith Tasks (Main)](https://github.com/seu-usuario/zenith-tasks)
- [Supabase Schema Migrations](./supabase/migrations/)

---

## 📞 Contato

**Mantenedor**: Guilherme Varela
**Email**: [seu-email]
**GitHub**: [@seu-usuario]

Para questões sobre arquitetura, abrir issue com label `architecture`.

---

**Última atualização**: Janeiro 2025
**Versão do índice**: 1.0.0
