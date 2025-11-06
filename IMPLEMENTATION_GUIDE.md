# Guia de Implementação - Zenith Tasks

## 📋 Resumo das Funcionalidades Implementadas

Este documento descreve todas as novas funcionalidades implementadas no Zenith Tasks para melhorar a experiência do usuário, arquitetura e funcionalidades modernas.

## ✅ Funcionalidades Implementadas

### 1. 🎨 Sistema de Temas (ThemeContext)

**Arquivo:** `src/contexts/ThemeContext.tsx`

**Funcionalidades:**
- Suporte a temas dark/light/system
- Persistência no localStorage
- Detecção automática de preferência do sistema
- Sincronização com meta theme-color

**Como usar:**
```tsx
import { useTheme } from '@/contexts/ThemeContext';

function MyComponent() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  return (
    <button onClick={() => setTheme('dark')}>
      Tema atual: {resolvedTheme}
    </button>
  );
}
```

### 2. 🎛️ Context de UI Global (UIContext)

**Arquivo:** `src/contexts/UIContext.tsx`

**Funcionalidades:**
- Gerenciamento de sidebar
- Sistema de modais global
- Estado de loading global
- Busca global
- Command palette
- Detecção de mobile view

**Como usar:**
```tsx
import { useUI } from '@/contexts/UIContext';

function MyComponent() {
  const {
    isSidebarOpen,
    toggleSidebar,
    openModal,
    setLoading
  } = useUI();

  const handleAction = () => {
    setLoading(true);
    // ... do something
    setLoading(false);
  };

  return <button onClick={toggleSidebar}>Toggle Sidebar</button>;
}
```

### 3. ⚙️ Preferências do Usuário (UserPreferencesContext)

**Arquivo:** `src/contexts/UserPreferencesContext.tsx`

**Funcionalidades:**
- Preferências de visualização (list/grid/kanban)
- Configurações de ordenação
- Feature flags (notificações, sons, animações, IA)
- Preferências de acessibilidade
- Preferências de IA (modelo, temperatura)
- Persistência automática no localStorage

**Como usar:**
```tsx
import { useUserPreferences } from '@/contexts/UserPreferencesContext';

function MyComponent() {
  const { preferences, updatePreference } = useUserPreferences();

  return (
    <div>
      <p>Visualização: {preferences.defaultView}</p>
      <button onClick={() => updatePreference('defaultView', 'grid')}>
        Mudar para Grid
      </button>
    </div>
  );
}
```

### 4. 🔄 Componentes de Loading

**Arquivo:** `src/components/ui/Loading.tsx`

**Componentes:**
- `<Loading />` - Spinner padrão
- `<LoadingDots />` - Dots animados
- `<LoadingBar />` - Barra de progresso
- `<LoadingSkeleton />` - Skeleton loaders

**Como usar:**
```tsx
import { Loading, LoadingDots, LoadingBar, LoadingSkeleton } from '@/components/ui/Loading';

function MyComponent() {
  return (
    <div>
      <Loading size="large" message="Carregando..." />
      <LoadingDots />
      <LoadingBar progress={60} />
      <LoadingSkeleton className="h-20 w-full" count={3} />
    </div>
  );
}
```

### 5. 🎭 Sistema de Modais Global

**Arquivo:** `src/components/ui/ModalSystem.tsx`

**Funcionalidades:**
- Portal-based modals
- Múltiplos modais simultâneos
- Backdrop com blur
- Animações suaves
- Controle via UIContext

**Como usar:**
```tsx
import { useUI } from '@/contexts/UIContext';
import { Modal } from '@/components/ui/ModalSystem';

function MyComponent() {
  const { openModal, closeModal } = useUI();

  const handleOpenModal = () => {
    openModal(
      'my-modal',
      <Modal
        title="Meu Modal"
        onClose={() => closeModal('my-modal')}
      >
        <p>Conteúdo do modal</p>
      </Modal>
    );
  };

  return <button onClick={handleOpenModal}>Abrir Modal</button>;
}
```

### 6. 🧭 Breadcrumbs

**Arquivo:** `src/components/Breadcrumbs.tsx`

**Funcionalidades:**
- Navegação hierárquica
- Suporte a ícones
- Separadores customizáveis
- Animações nos hovers

**Como usar:**
```tsx
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { HomeIcon, CalendarIcon } from '@/components/Icons';

function MyComponent() {
  const items = [
    { label: 'Início', icon: HomeIcon, onClick: () => navigate('/') },
    { label: 'Calendário', icon: CalendarIcon, onClick: () => navigate('/calendar') },
    { label: 'Janeiro 2025' }
  ];

  return <Breadcrumbs items={items} />;
}
```

### 7. 🔍 Busca Global

**Arquivo:** `src/components/GlobalSearch.tsx`

**Funcionalidades:**
- Busca rápida por todos os itens
- Navegação por teclado (↑↓ Enter)
- Filtro por tipo
- Preview de resultados
- Atalho Ctrl+K

**Como usar:**
```tsx
import { GlobalSearch } from '@/components/GlobalSearch';
import { useUI } from '@/contexts/UIContext';

function MyComponent() {
  const { items } = useItems();
  const handleSelectItem = (item) => {
    // Handle item selection
  };

  return (
    <GlobalSearch
      items={items}
      onSelectItem={handleSelectItem}
    />
  );
}
```

### 8. ⌨️ Atalhos de Teclado

**Arquivos:**
- `src/hooks/useKeyboardShortcuts.ts`
- `src/components/KeyboardShortcutsHelp.tsx`

**Atalhos implementados:**
- `Ctrl+K` - Busca global
- `Ctrl+/` - Mostrar atalhos
- `Ctrl+B` - Toggle sidebar
- `Ctrl+N` - Nova tarefa
- `Ctrl+Space` - Assistente AI
- `?` - Ajuda

**Como usar:**
```tsx
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

function MyComponent() {
  useKeyboardShortcuts({
    enabled: true,
    shortcuts: [
      {
        key: 'n',
        ctrl: true,
        description: 'Nova tarefa',
        action: () => createNewTask(),
      },
    ],
  });

  return <div>Component content</div>;
}
```

### 9. 📱 PWA (Progressive Web App)

**Arquivos:**
- `public/manifest.json`
- `public/sw.js`
- `src/utils/pwa.ts`
- `src/components/PWAInstallPrompt.tsx`
- `src/components/PWAInitializer.tsx`

**Funcionalidades:**
- App instalável
- Offline support
- Cache de assets
- Background sync
- Push notifications
- Shortcuts do app

**Como usar:**
O PWA é inicializado automaticamente via `PWAInitializer` no layout.

### 10. 🔌 WebSocket

**Arquivos:**
- `src/hooks/useWebSocket.ts`
- `src/contexts/WebSocketContext.tsx`

**Funcionalidades:**
- Conexão WebSocket persistente
- Reconexão automática
- Fila de mensagens
- Context para uso global

**Como usar:**
```tsx
import { useWebSocketContext } from '@/contexts/WebSocketContext';

function MyComponent() {
  const { isConnected, send, lastMessage } = useWebSocketContext();

  const handleSend = () => {
    send({
      type: 'UPDATE_ITEM',
      payload: { itemId: '123' },
      timestamp: Date.now(),
    });
  };

  return (
    <div>
      Status: {isConnected ? 'Conectado' : 'Desconectado'}
    </div>
  );
}
```

### 11. 📊 Analytics

**Arquivos:**
- `src/utils/analytics.ts`
- `src/app/api/analytics/route.ts`

**Funcionalidades:**
- Tracking de eventos
- Page views
- Eventos customizados
- Fila automática
- Privacy-focused

**Como usar:**
```tsx
import { useAnalytics } from '@/utils/analytics';

function MyComponent() {
  const analytics = useAnalytics();

  const handleAction = () => {
    analytics.trackEvent('button_clicked', {
      button: 'save',
      context: 'task-edit'
    });
  };

  return <button onClick={handleAction}>Save</button>;
}
```

## 🔧 Configuração

### 1. Variáveis de Ambiente

Adicione ao seu `.env.local`:

```bash
# WebSocket (opcional)
NEXT_PUBLIC_WS_URL=ws://localhost:3457/ws

# Analytics (opcional)
NEXT_PUBLIC_ANALYTICS_ENABLED=true
```

### 2. Ícones PWA

Para gerar os ícones PWA de produção, você pode usar ferramentas como:
- [PWA Asset Generator](https://www.pwabuilder.com/)
- [RealFaviconGenerator](https://realfavicongenerator.net/)

Os ícones devem ser colocados em:
- `/public/icon-192.png` (192x192)
- `/public/icon-512.png` (512x512)

### 3. Service Worker

O Service Worker (`/public/sw.js`) é registrado automaticamente via `PWAInitializer`.

**Importante:** Em desenvolvimento, você pode precisar limpar o cache do service worker ao fazer alterações.

## 📝 Próximos Passos

### Tarefas Pendentes:

1. **Gerar ícones PWA de produção**
   - Criar icon-192.png
   - Criar icon-512.png
   - Criar screenshots para a PWA

2. **Configurar WebSocket backend**
   - Implementar endpoint WebSocket em Next.js
   - Adicionar lógica de broadcast

3. **Integrar Analytics**
   - Escolher serviço de analytics (Plausible, Mixpanel, etc.)
   - Implementar armazenamento de eventos

4. **Testes**
   - Testar PWA em dispositivos móveis
   - Testar offline functionality
   - Testar todos os atalhos de teclado
   - Testar responsividade

## 🎯 Melhorias Futuras

- [ ] Adicionar testes automatizados
- [ ] Implementar keyboard shortcuts customizáveis
- [ ] Adicionar mais temas (além de dark/light)
- [ ] Implementar tour guiado para novos usuários
- [ ] Adicionar mais analytics events
- [ ] Implementar rate limiting no WebSocket
- [ ] Adicionar compressão de dados no cache

## 📚 Recursos

- [Next.js PWA Guide](https://nextjs.org/docs/app/building-your-application/configuring/progressive-web-apps)
- [Web.dev PWA](https://web.dev/progressive-web-apps/)
- [MDN Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)

## 🤝 Contribuindo

Para adicionar novas funcionalidades, siga o padrão estabelecido:

1. Crie o componente/hook/context
2. Adicione TypeScript types apropriados
3. Documente o uso no código
4. Atualize este guia
5. Teste em diferentes dispositivos e navegadores

---

**Desenvolvido com ❤️ para Zenith Tasks**
