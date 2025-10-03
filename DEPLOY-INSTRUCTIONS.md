# 🚀 INSTRUÇÕES DE DEPLOY - ZENITH TASKS

## ✅ Status do Projeto

- **Build**: ✅ Funcionando perfeitamente!
- **Vercel CLI**: ✅ Instalada e pronta
- **Configurações**: ✅ Arquivos `vercel.json` e `.vercelignore` criados

## 📋 Passo a Passo Simples

### 1️⃣ Fazer Login na Vercel

Abra o terminal e execute:
```bash
vercel login
```

Escolha uma das opções:
- **Continue with GitHub** (recomendado se você usa GitHub)
- **Continue with Email**

### 2️⃣ Deploy Inicial

Execute no terminal:
```bash
vercel
```

Responda as perguntas:
- **Set up and deploy?** → `y` (yes)
- **Which scope?** → Selecione sua conta
- **Link to existing project?** → `n` (no)
- **Project name?** → `zenith-tasks` (ou pressione Enter)
- **In which directory?** → `.` (pressione Enter)
- **Want to modify settings?** → `n` (no)

### 3️⃣ Configurar Variáveis de Ambiente

Após o primeiro deploy, vá para: https://vercel.com/dashboard

1. Clique no projeto **zenith-tasks**
2. Vá em **Settings** → **Environment Variables**
3. Adicione TODAS estas variáveis:

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_ZmFtZWQtc2VhbC01Mi5jbGVyay5hY2NvdW50cy5kZXYk
CLERK_SECRET_KEY=sk_test_9zuwMYfxjKWl0i7v8kMKQBG7xRcCvJaUUHR9L4BXvX
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/
NEXT_PUBLIC_GEMINI_API_KEY=AIzaSyDwFs_TvZMZk0pcKJrm3ao5DJIR3GBCYNs
NEXT_PUBLIC_SUPABASE_URL=https://indijtkshpwkampfmvit.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImluZGlqdGtzaHB3a2FtcGZtdml0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczMDk1NjIsImV4cCI6MjA3Mjg4NTU2Mn0.PW7gbUhUW3n0y0LqRiWzqU5FpBi2pnlVAmYPGGdJQy8
SUPABASE_SERVICE_ROLE_KEY=****************************************************************************************************************************************************************************************************************
```

### 4️⃣ Deploy para Produção

Após adicionar as variáveis, execute:
```bash
vercel --prod
```

## 🎉 Pronto!

Seu app estará disponível em:
- **Preview**: https://zenith-tasks.vercel.app
- **Produção**: https://zenith-tasks.vercel.app

## 🔧 Comandos Úteis

```bash
# Ver status do deploy
vercel ls

# Ver logs
vercel logs

# Fazer novo deploy
vercel --prod
```

## ⚠️ IMPORTANTE

As variáveis de ambiente são ESSENCIAIS para:
- **Clerk**: Autenticação funcionar
- **Gemini**: IA funcionar
- **Supabase**: Banco de dados funcionar

Sem elas, o app não funcionará corretamente!

## 📱 Funcionalidades Disponíveis

✅ Login/Cadastro com Clerk
✅ Criar/Editar/Deletar tarefas
✅ Adicionar anotações
✅ Gerar subtarefas com IA
✅ Chat com IA
✅ Calendário interativo
✅ Gestão financeira
✅ Notas de reunião
✅ Persistência no Supabase

---

**Dúvidas?** O projeto está 100% pronto para deploy! 🚀