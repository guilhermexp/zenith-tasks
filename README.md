# Zenith Tasks - Gerenciador de Tarefas Inteligente 🚀

Um aplicativo moderno de gerenciamento de tarefas com IA integrada, desenvolvido com Next.js, Neon PostgreSQL e suporte para múltiplos provedores de IA (Google Gemini, OpenAI, Anthropic, XAI).

**Status**: ✅ Produção-ready | 🚀 Deployed em https://zenith-tasks.vercel.app | 📊 27 API routes | 🔄 Última atualização: 2025-11-09

## ✨ Funcionalidades

- 📝 **Gerenciamento Inteligente de Tarefas** - Análise e categorização automática via IA
- 🤖 **Assistente AI Integrado** - Conversa contextual com execução de ferramentas
- 💬 **AI Elements Integration** - Interface rica com syntax highlighting, fontes citadas, e planejamento multi-etapas
- 📅 **Calendário Interativo** - Visualização temporal de compromissos
- 💰 **Gestão Financeira** - Controle de entrada e saídas
- 📋 **Notas de Reunião** - Transcrição e resumo automático com IA

- ☁️ **Sincronização em Tempo Real** - Via Supabase (PostgreSQL + Realtime)
- 🔐 **Autenticação Segura** - Via Clerk (com bypass opcional para dev)

## 🛠 Stack Tecnológica

### Frontend
- **Next.js 15.5.2** - App Router com Server/Client Components
- **React 18.3.1** - UI Library
- **TypeScript 5.9.2** - Type Safety
- **Tailwind CSS 3.4.17** - Styling
- **Framer Motion 12** - Animations

### Backend & AI
- **Next.js API Routes** - Backend endpoints (27 routes consolidadas)
- **Vercel AI SDK 5.0.87** - AI abstraction layer with UI Elements
- **Vercel AI Elements** - Composable AI UI components (48+ components)
- **Multi-Provider Support**:
  - 🔵 Google Gemini
  - 🟠 OpenAI (GPT-4, GPT-3.5-turbo)
  - 🔴 Anthropic Claude
  - ✨ XAI Grok
- **Shiki** - Syntax highlighting with github-dark theme
- **Neon PostgreSQL 1.0.2** - Serverless PostgreSQL com connection pooling
- **Drizzle ORM 0.44.7** - Type-safe database queries
- **Clerk 6.34.1** - Authentication (optional bypass para dev)

### Infrastructure
- **Vercel** - Hosting & deployment (serverless functions)
- **Neon Cloud** - Managed PostgreSQL database


## 🚀 Quick Start

### Pré-requisitos

```bash
node >= 18.0.0
npm >= 9.0.0
```

### Instalação

```bash
# Clone o repositório
git clone https://github.com/seu-usuario/zenith-tasks.git
cd zenith-tasks

# Instale as dependências
npm install

# Configure as variáveis de ambiente
cp .env.example .env
# Edite .env com suas credenciais

# Execute o servidor de desenvolvimento
npm run dev
```

Acesse: **http://localhost:3457**

### Scripts Disponíveis

```bash
npm run dev       # Servidor de desenvolvimento (porta 3457)
npm run build     # Build de produção
npm start         # Servidor de produção (porta 3456)
npm run lint      # Linting com ESLint
npm run typecheck # Verificação de tipos TypeScript
```

## 📚 Documentação Completa

### Arquivos Principais
| Documento | Descrição |
|-----------|-----------|
| [CLAUDE.md](./CLAUDE.md) | 🏗️ Architecture overview & development guidelines |
| [README.md](./README.md) | 📖 Project overview & quick start (este arquivo) |
| [AGENTS.md](./AGENTS.md) | 🤖 Agent context & repository guidelines |

### Documentação de Cleanup Recente (2025-11-09)
| Documento | Descrição |
|-----------|-----------|
| [CLEANUP_REPORT_20251109.md](./docs/CLEANUP_REPORT_20251109.md) | 🧹 Comprehensive cleanup report com métricas |
| [MODEL_SWITCHING.md](./docs/MODEL_SWITCHING.md) | 🔄 Multi-provider model switching guide |
| [VERCEL_AI_SDK_DOCS.md](./docs/VERCEL_AI_SDK_DOCS.md) | 📚 Complete AI SDK reference |

### Diretórios de Documentação AI
| Diretório | Propósito |
|-----------|-----------|
| [ai_changelog/](./ai_changelog/) | 📝 Histórico de versões e release notes |
| [ai_docs/](./ai_docs/) | 📖 Guias técnicos e documentação |
| [ai_issues/](./ai_issues/) | 🐛 Bugs conhecidos e issues |
| [ai_research/](./ai_research/) | 🔬 Notas de pesquisa e experimentos |
| [ai_specs/](./ai_specs/) | 📋 Especificações e documentação de API |
| [docs/](./docs/) | 📚 Documentação de arquitetura e features |

### Documentação Técnica Detalhada
- **[AI Elements Integration](./docs/ai-elements.md)** - 48+ componentes para UI com IA
- **[AGENT_TOOLS.md](./docs/AGENT_TOOLS.md)** - Lista completa de 17+ ferramentas do assistente
- **[AI_SDK_V5_COMPLETE_GUIDE.md](./docs/AI_SDK_V5_COMPLETE_GUIDE.md)** - Guia completo do AI SDK
- **[STREAMING_EVENTS_GUIDE.md](./docs/STREAMING_EVENTS_GUIDE.md)** - Arquitetura de streaming de eventos
- **[ai_research/](./ai_research/)** - Research notes and experiments
- **[ai_specs/](./ai_specs/)** - Feature and API specifications

## 🏗️ Estrutura do Projeto

```
zenith-tasks/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/                # API Routes
│   │   │   ├── assistant/      # Assistente IA com tools
│   │   │   ├── inbox/          # Análise de texto

│   │   │   ├── models/         # Lista de modelos
│   │   │   └── ...
│   │   ├── layout.tsx          # Root layout
│   │   └── page.tsx            # Home page
│   ├── components/             # React components
│   │   ├── App.tsx             # Main app component
│   │   ├── Sidebar.tsx         # Navigation
│   │   ├── TaskList.tsx        # Task list
│   │   ├── DetailPanel.tsx     # Task details
│   │   ├── CalendarPage.tsx    # Calendar view
│   │   └── ui/                 # UI components
│   ├── hooks/                  # React hooks
│   ├── lib/                    # Libraries & config
│   ├── server/                 # Server-side code
│   │   ├── aiProvider.ts       # AI provider abstraction
│   │   ├── ai/                 # AI services
│   │   └── ...
│   ├── services/               # Business logic
│   │   ├── ai/                 # AI services
│   │   ├── database/           # Database services
│   │   └── ...
│   ├── types/                  # TypeScript types
│   └── utils/                  # Utilities
├── docs/                       # Documentation
│   └── architecture/           # Architecture docs
│       ├── README.md           # Main architecture doc
│       ├── adrs/               # ADRs
│       └── diagrams/           # PlantUML diagrams
├── public/                     # Static assets
└── ...
```

## 🔒 Segurança

> ⚠️ **ATENÇÃO**: O projeto está em fase de desenvolvimento com bypass de autenticação opcional.
>
> **Status Atual:**
> - ✅ Clerk configurado e funcional (`./ai_docs/CLERK_CONFIGURADO.md`)
> - ✅ Autenticação pode ser ativada/desativada via middleware
> - ⏳ Faltam implementações antes de produção:
>   1. Configurar Row-Level Security no Supabase
>   2. Implementar rate limiting
>   3. Revisar e rotacionar credenciais
>   4. Adicionar audit logging
>
> Para mais detalhes, consulte a documentação em `/ai_docs/`

## 🤝 Contribuindo

Contribuições são bem-vindas! Para contribuir:

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📝 Licença

Este projeto está sob a licença MIT. Ver arquivo `LICENSE` para mais detalhes.

## 🙏 Agradecimentos

- [Next.js](https://nextjs.org/) pela excelente framework
- [Vercel](https://vercel.com/) pelo AI SDK e hosting
- [Supabase](https://supabase.com/) pelo backend-as-a-service
- [Google](https://ai.google.dev/) pelo Gemini API
- Comunidade open-source por todas as bibliotecas incríveis

---

**Desenvolvido com ❤️ por Guilherme Varela**

📧 [Contato] | 🐙 [GitHub](https://github.com/seu-usuario) | 🌐 [Website]