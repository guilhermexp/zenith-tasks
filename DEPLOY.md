# 🚀 Deploy para Vercel - Zenith Tasks

## Pré-requisitos
- Conta na [Vercel](https://vercel.com)
- Vercel CLI instalada (já está! ✅)

## Passo a Passo para Deploy

### 1. Fazer login na Vercel
```bash
vercel login
```
Escolha seu método preferido (GitHub, Google, Email, etc)

### 2. Deploy do Projeto
```bash
vercel --prod
```

Durante o primeiro deploy, a Vercel vai perguntar:
- **Set up and deploy "~/Documents/Projetos/zenith-tasks"?** → Yes
- **Which scope do you want to deploy to?** → Selecione sua conta
- **Link to existing project?** → No (criar novo)
- **What's your project's name?** → zenith-tasks (ou outro nome)
- **In which directory is your code located?** → ./ (diretório atual)

### 3. Configurar Variáveis de Ambiente

Após o deploy inicial, acesse: https://vercel.com/dashboard

1. Clique no seu projeto
2. Vá em **Settings** → **Environment Variables**
3. Adicione as seguintes variáveis:

```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_ZmFtZWQtc2VhbC01Mi5jbGVyay5hY2NvdW50cy5kZXYk
CLERK_SECRET_KEY=sk_test_9zuwMYfxjKWl0i7v8kMKQBG7xRcCvJaUUHR9L4BXvX

# URLs do Clerk
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/

# Gemini AI
NEXT_PUBLIC_GEMINI_API_KEY=AIzaSyDwFs_TvZMZk0pcKJrm3ao5DJIR3GBCYNs

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://indijtkshpwkampfmvit.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImluZGlqdGtzaHB3a2FtcGZtdml0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczMDk1NjIsImV4cCI6MjA3Mjg4NTU2Mn0.PW7gbUhUW3n0y0LqRiWzqU5FpBi2pnlVAmYPGGdJQy8
```

### 4. Fazer Redeploy
Após adicionar as variáveis de ambiente:
```bash
vercel --prod
```

## 🔗 URLs Importantes

Após o deploy, você terá:
- **URL de Produção**: https://zenith-tasks.vercel.app (ou similar)
- **Dashboard**: https://vercel.com/dashboard
- **Analytics**: Disponível no dashboard da Vercel

## ⚡ Deploy Rápido (após configuração inicial)

Para futuros deploys, apenas execute:
```bash
vercel --prod
```

## 🛠 Comandos Úteis

```bash
# Deploy para preview (staging)
vercel

# Deploy para produção
vercel --prod

# Ver logs de produção
vercel logs

# Ver variáveis de ambiente
vercel env ls

# Adicionar variável de ambiente via CLI
vercel env add VARIABLE_NAME
```

## 📱 Configurações Importantes

O arquivo `vercel.json` já está configurado com:
- Framework: Next.js
- Comandos de build otimizados
- Mapeamento de variáveis de ambiente

## 🔒 Segurança

- As chaves sensíveis estão configuradas como variáveis de ambiente
- O arquivo `.vercelignore` previne upload de arquivos desnecessários
- As credenciais do Supabase são protegidas com RLS (Row Level Security)

## 🚨 Troubleshooting

Se houver erro no build:
1. Verifique se todas as variáveis de ambiente estão configuradas
2. Execute `npm run build` localmente para testar
3. Verifique os logs: `vercel logs`

---

**Pronto para deploy! 🎉**