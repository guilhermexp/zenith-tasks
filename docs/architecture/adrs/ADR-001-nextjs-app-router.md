# ADR-001: Adoção do Next.js 15 com App Router

## Status

✅ **Aceito** - Janeiro 2025

## Contexto

Precisávamos escolher um framework frontend/fullstack para construir o Zenith Tasks. Os requisitos incluíam:

- Renderização server-side (SSR) para SEO e performance
- API routes integradas para backend
- Suporte a React com TypeScript
- Streaming de dados e UI
- Boa experiência do desenvolvedor (DX)
- Deploy fácil na Vercel

### Alternativas Consideradas

| Framework | Prós | Contras |
|-----------|------|---------|
| **Next.js App Router** | SSR nativo, streaming, server components, API routes, DX excelente | Curva de aprendizado, padrões novos |
| Next.js Pages Router | Mais maduro, docs extensas, comunidade grande | Sem server components, menos features modernas |
| Remix | Nested routing, streaming, performance | Menor ecossistema, menos ferramentas |
| Vanilla React + Express | Controle total, flexibilidade máxima | Muito boilerplate, sem SSR out-of-the-box |
| Astro | Performance excelente, multi-framework | Menos adequado para apps interativos |

## Decisão

**Escolhemos Next.js 15 com App Router** pelos seguintes motivos:

1. **Server Components por padrão**
   - Reduz bundle JavaScript no cliente
   - Melhora performance de carregamento inicial
   - Facilita data fetching server-side

2. **Streaming de UI e Dados**
   - Essencial para chat com IA (streaming de respostas)
   - Melhora perceived performance
   - Suspense boundaries nativos

3. **API Routes Integradas**
   - Não precisa de servidor separado
   - Co-location de frontend e backend
   - Deploy simplificado

4. **Suporte ao AI SDK**
   - Vercel AI SDK é otimizado para Next.js
   - Exemplos e documentação extensos
   - Streaming de IA funciona out-of-the-box

5. **Layouts e Co-location**
   - Layouts compartilhados reduzem código
   - Co-location de rotas e componentes melhora DX
   - File-based routing é intuitivo

## Consequências

### Positivas ✅

- ✅ **Performance**: SSR + streaming + server components = carregamento rápido
- ✅ **DX**: Hot reload, TypeScript nativo, erro handling bom
- ✅ **Produtividade**: Menos boilerplate, convenções claras
- ✅ **Ecosystem**: Plugins, integrações, comunidade ativa
- ✅ **Deploy**: Vercel é otimizada para Next.js

### Negativas ⚠️

- ⚠️ **Curva de aprendizado**: Server vs Client Components confunde no início
- ⚠️ **Padrões novos**: App Router é mais recente, menos exemplos que Pages Router
- ⚠️ **Vendor lock-in**: Vercel-specific features (Edge Runtime, Middleware)
- ⚠️ **Complexidade**: Mais "mágica" que React puro

### Riscos Mitigados

| Risco | Mitigação |
|-------|-----------|
| Breaking changes no Next.js | Pin de versão (`15.5.2`), changelog monitoring |
| Performance issues | Lazy loading, code splitting, bundle analysis |
| Learning curve alta | Docs internas, code reviews, pair programming |

## Implementação

### Estrutura de Diretórios

```
src/
├── app/                    # App Router
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Home page
│   ├── api/                # API routes
│   └── (auth)/             # Route groups
├── components/             # React components
├── lib/                    # Shared libraries
└── server/                 # Server-side only code
```

### Configuração (`next.config.js`)

```javascript
const nextConfig = {
  experimental: {
    serverActions: true,
    optimizePackageImports: true
  }
}
```

## Referências

- [Next.js App Router Docs](https://nextjs.org/docs/app)
- [React Server Components](https://react.dev/reference/rsc/server-components)
- [Vercel AI SDK](https://sdk.vercel.ai/docs)

---

**Data**: Janeiro 2025
**Autor**: Guilherme Varela
**Revisores**: -
