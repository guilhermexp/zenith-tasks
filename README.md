# Zenith Tasks - Gerenciador de Tarefas Inteligente 🚀

Um aplicativo moderno de gerenciamento de tarefas com IA integrada, desenvolvido com Next.js, Supabase e Gemini AI.

## ✨ Funcionalidades

- 📝 **Gerenciamento Inteligente de Tarefas** - Análise e categorização automática via IA
- 🤖 **Assistente AI Integrado** - Conversa contextual com execução de ferramentas
- 📅 **Calendário Interativo** - Visualização temporal de compromissos
- 💰 **Gestão Financeira** - Controle de entrada e saídas
- 📋 **Notas de Reunião** - Transcrição e resumo automático com IA
- 🔌 **MCP Integration** - Suporte ao Model Context Protocol para extensibilidade
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
- **Next.js API Routes** - Backend endpoints
- **Vercel AI SDK 5.0** - AI abstraction layer
- **Google Gemini** - Primary AI model (gemini-2.5-flash)
- **Supabase 2.57.4** - PostgreSQL + Realtime + Auth
- **Clerk 6.33.1** - Authentication (optional bypass for dev)

### Infrastructure
- **Vercel** - Hosting & deployment
- **Supabase Cloud** - Database & realtime subscriptions
- **Upstash Redis** - Optional caching (MCP registry)

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

## 📚 Documentação

### 📖 [Documentação Completa de Arquitetura](./docs/architecture/README.md)

Acesse a documentação detalhada incluindo:

- **C4 Model Diagrams** - System Context, Containers, Components
- **Architecture Decision Records (ADRs)** - Decisões de design documentadas
- **Deployment Guide** - Guia completo de deploy para produção
- **Data Models** - Schema do banco de dados e tipos TypeScript
- **Security** - Práticas de segurança e configurações
- **Monitoring** - Setup de monitoramento e alertas

### 📑 Quick Links

| Documento | Descrição |
|-----------|-----------|
| [Arquitetura Overview](./docs/architecture/README.md) | Visão geral completa do sistema |
| [Guia de Deployment](./docs/architecture/deployment-guide.md) | Como fazer deploy em produção |
| [ADR-001: Next.js](./docs/architecture/adrs/ADR-001-nextjs-app-router.md) | Por que Next.js App Router? |
| [ADR-002: Supabase](./docs/architecture/adrs/ADR-002-supabase-backend.md) | Por que Supabase? |
| [Diagramas PlantUML](./docs/architecture/diagrams/) | Diagramas C4 e fluxos de dados |

## 🏗️ Estrutura do Projeto

```
zenith-tasks/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/                # API Routes
│   │   │   ├── assistant/      # Assistente IA com tools
│   │   │   ├── inbox/          # Análise de texto
│   │   │   ├── mcp/            # MCP servers
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
│   │   ├── mcp/                # MCP client
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

> ⚠️ **ATENÇÃO**: O projeto está com bypass de autenticação ativo para desenvolvimento.
>
> **Antes de fazer deploy em produção:**
> 1. Reativar autenticação Clerk
> 2. Configurar Row-Level Security no Supabase
> 3. Implementar rate limiting
> 4. Revisar variáveis de ambiente sensíveis
>
> Ver [Deployment Guide](./docs/architecture/deployment-guide.md) para detalhes.

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