# AI Elements Integration Documentation

**Version:** 1.0.0
**Last Updated:** 2025-01-05
**AI SDK Version:** 5.0.87

## Table of Contents

1. [Introduction](#introduction)
2. [Architecture Overview](#architecture-overview)
3. [Type System](#type-system)
4. [Core Components](#core-components)
5. [MessageRouter System](#messagerouter-system)
6. [Adding New Message Types](#adding-new-message-types)
7. [Testing Guide](#testing-guide)
8. [Performance Optimizations](#performance-optimizations)
9. [Best Practices](#best-practices)
10. [Troubleshooting](#troubleshooting)

---

## Introduction

The AI Elements integration brings sophisticated, composable UI components from Vercel's AI SDK to Zenith Tasks. This integration enables rich, interactive AI experiences with syntax-highlighted code blocks, collapsible source citations, multi-step planning interfaces, and more.

**Key Benefits:**

- **Type-Safe**: Full TypeScript support with strict typing
- **Composable**: Mix and match components for custom AI experiences
- **Accessible**: Built with accessibility best practices
- **Performant**: Optimized with React.memo and lazy loading
- **Themeable**: Dark mode support with Tailwind CSS
- **Extensible**: Easy to add new message types and components

**What's Included:**

- 48+ AI Elements components from Vercel AI SDK
- Custom MessageRouter for intelligent message rendering
- Type system for enriched chat messages with metadata
- Error boundaries for graceful failure handling
- Syntax highlighting with Shiki (github-dark theme)
- Collapsible sources with excerpts
- Interactive suggestion chips
- Empty state with SiriOrb animation
- Loading indicators and shimmer effects

---

## Architecture Overview

### Component Hierarchy

```
AiInput.tsx (Main Chat Component)
├── EmptyState (when no messages)
│   └── SiriOrb + Welcome Message
├── Conversation
│   └── ConversationContent
│       └── Message (for each message)
│           └── MessageContent
│               └── AIElementErrorBoundary
│                   └── MessageRouter
│                       ├── Response (default text)
│                       ├── CodeBlock (code type)
│                       ├── Sources (sources type)
│                       ├── Plan (plan type)
│                       └── ... (other types)
├── Loader (when isLoading)
└── Suggestions
    └── Suggestion (chips)
```

### Data Flow

1. **User Input** → API endpoint (`/api/assistant/act?stream=1`)
2. **Streaming Response** → Parsed into `EnrichedChatMessage[]`
3. **MessageRouter** → Analyzes `message.metadata.type`
4. **Component Selection** → Renders appropriate AI Element
5. **Display** → User sees formatted content

### File Structure

```
src/
├── components/
│   ├── ai-elements/
│   │   ├── MessageRouter.tsx           # Message routing logic
│   │   ├── AIElementErrorBoundary.tsx  # Error handling
│   │   ├── EmptyState.tsx              # Empty chat state
│   │   ├── code-block.tsx              # Syntax-highlighted code
│   │   ├── sources.tsx                 # Collapsible citations
│   │   ├── plan.tsx                    # Multi-step planning UI
│   │   ├── response.tsx                # Default text rendering
│   │   ├── loader.tsx                  # Loading spinner
│   │   ├── suggestion.tsx              # Suggestion chips
│   │   └── ... (44 more components)
│   └── ui/
│       └── AiInput.tsx                 # Main chat component
├── types/
│   └── chat.ts                         # Type definitions
└── lib/
    └── highlight.ts                    # Shiki code highlighting
```

---

## Type System

### Core Types (`src/types/chat.ts`)

The type system extends Vercel AI SDK's `UIMessage` with rich metadata support:

#### EnrichedChatMessage

```typescript
import type { UIMessage } from "ai";

export interface EnrichedChatMessage extends UIMessage {
  metadata?: MessageMetadata;
}
```

**Purpose**: Base interface for all chat messages with optional metadata for specialized rendering.

**Properties**:
- `id: string` - Unique message identifier
- `role: "user" | "assistant" | "system"` - Message sender
- `parts: MessagePart[]` - Message content parts (text, images, etc.)
- `metadata?: MessageMetadata` - Additional rendering information

#### MessageType

```typescript
export type MessageType =
  | "code"          // Syntax-highlighted code blocks
  | "sources"       // Reference citations
  | "plan"          // Multi-step task planning
  | "reasoning"     // Chain-of-thought display
  | "task"          // Actionable task items
  | "tool"          // Tool invocation results
  | "confirmation"  // User approval requests
  | "image"         // Image display
  | "context"       // Contextual information
  | "queue";        // Task queue display
```

**Usage**: MessageRouter uses this to determine which component to render.

#### MessageMetadata

```typescript
export interface MessageMetadata {
  type?: MessageType;           // Component selection

  // Code-specific
  language?: string;            // e.g., "typescript", "python"
  filename?: string;            // Source file name

  // Sources-specific
  sources?: SourceItem[];       // Citation list

  // Plan-specific
  plan?: PlanStep[];            // Multi-step plan

  // Reasoning-specific
  reasoning?: ReasoningStep[];  // Chain of thought

  // Task-specific
  tasks?: TaskItem[];           // Task list

  // Tool-specific
  toolInvocations?: ToolInvocationData[];

  // Confirmation-specific
  confirmations?: ConfirmationData[];

  // Context-specific
  contextInfo?: ContextInfo[];

  // Queue-specific
  queue?: QueueItem[];

  // Image-specific
  imageUrl?: string;
  imageAlt?: string;
}
```

#### Supporting Interfaces

**SourceItem** - Reference citations:
```typescript
export interface SourceItem {
  id: string;
  title: string;
  url?: string;
  description?: string;
}
```

**PlanStep** - Multi-step task:
```typescript
export interface PlanStep {
  id: string;
  title: string;
  description?: string;
  status: "pending" | "in-progress" | "completed" | "failed";
  dependencies?: string[];
}
```

**TaskItem** - Actionable task:
```typescript
export interface TaskItem {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  assignee?: string;
  dueDate?: string;
}
```

---

## Core Components

### 1. MessageRouter

**Location**: `src/components/ai-elements/MessageRouter.tsx`

**Purpose**: Intelligent routing of messages to appropriate AI Elements based on metadata type.

**Props**:
```typescript
interface MessageRouterProps {
  message: EnrichedChatMessage;  // Message to render
  className?: string;             // Optional CSS classes
}
```

**Usage Example**:
```tsx
import { MessageRouter } from "@/components/ai-elements/MessageRouter";
import type { EnrichedChatMessage } from "@/types/chat";

const message: EnrichedChatMessage = {
  id: "msg-1",
  role: "assistant",
  parts: [{ type: "text", text: "console.log('Hello World')" }],
  metadata: {
    type: "code",
    language: "javascript"
  }
};

<MessageRouter message={message} />
// Renders: CodeBlock with JavaScript syntax highlighting
```

**How It Works**:
1. Extracts `messageType` from `message.metadata.type`
2. Uses switch statement to select component
3. Falls back to `Response` component for unknown types
4. Extracts text content from message parts

**Visual Description**: Acts as an invisible router - no visual output itself, only renders child components.

---

### 2. Response (Default Text Renderer)

**Location**: `src/components/ai-elements/response.tsx`

**Purpose**: Default component for rendering plain text and markdown messages.

**Props**:
```typescript
type ResponseProps = ComponentProps<typeof Streamdown>;
```

**Usage Example**:
```tsx
import { Response } from "@/components/ai-elements/response";

<Response>
  This is **markdown** text with _emphasis_.
</Response>
```

**Features**:
- Markdown rendering via Streamdown
- Memoized for performance (only re-renders when children change)
- Removes default margins on first/last child
- Supports all standard markdown syntax

**Visual Description**: Rendered text appears in neutral-300 color with proper spacing, supporting headers, lists, links, code inline, and other markdown elements.

---

### 3. CodeBlock (Syntax Highlighting)

**Location**: `src/components/ai-elements/code-block.tsx`

**Purpose**: Displays syntax-highlighted code with copy functionality.

**Props**:
```typescript
type CodeBlockProps = {
  code: string;                  // Code to highlight
  language: BundledLanguage;     // Language (e.g., "typescript")
  showLineNumbers?: boolean;      // Show line numbers
  className?: string;
  children?: ReactNode;          // Custom toolbar items
};
```

**Usage Example**:
```tsx
import { CodeBlock, CodeBlockCopyButton } from "@/components/ai-elements/code-block";

<CodeBlock code="const x = 42;" language="typescript" showLineNumbers>
  <CodeBlockCopyButton />
</CodeBlock>
```

**Features**:
- **Shiki Integration**: Uses github-light/github-dark themes
- **Line Numbers**: Optional with right-aligned, muted styling
- **Copy Button**: Built-in clipboard functionality with success feedback
- **Theme Support**: Separate light/dark rendering
- **Custom Toolbar**: Children rendered in top-right corner

**Implementation Details**:
- Uses `highlightCode()` from `lib/highlight.ts`
- Renders both themes, showing appropriate one via CSS
- Context provider for copy button access to code
- Memoizes highlighted HTML to avoid re-highlighting

**Visual Description**: Dark themed code block with subtle border, monospace font, syntax colors (blue for keywords, green for strings, etc.), and floating copy button on hover.

---

### 4. Sources (Citation Display)

**Location**: `src/components/ai-elements/sources.tsx`

**Purpose**: Collapsible list of source citations with optional excerpts.

**Components**:
- `Sources` - Container wrapper
- `SourcesTrigger` - Clickable header
- `SourcesContent` - Collapsible content area
- `Source` - Individual citation item

**Props**:
```typescript
type SourceProps = {
  href?: string;        // Source URL
  title: string;        // Source title
  excerpt?: string;     // Optional preview text
};
```

**Usage Example**:
```tsx
import { Sources, SourcesTrigger, SourcesContent, Source } from "@/components/ai-elements/sources";

<Sources>
  <SourcesTrigger count={2} />
  <SourcesContent>
    <Source
      href="https://docs.example.com"
      title="API Documentation"
      excerpt="Learn about the API endpoints and authentication..."
    />
    <Source
      href="https://github.com/example/repo"
      title="GitHub Repository"
    />
  </SourcesContent>
</Sources>
```

**Features**:
- **Collapsible**: Animated expand/collapse with ChevronDown icon
- **Excerpts**: Optional preview text (line-clamped to 2 lines)
- **External Links**: Opens in new tab with `rel="noreferrer"`
- **Hover Effects**: Subtle background color change
- **Icon**: BookIcon for visual consistency

**Visual Description**: Neutral-900 background cards with hover effect, displaying source title, optional excerpt, and URL. Trigger shows "Used X sources" with chevron icon.

---

### 5. Plan (Multi-Step Planning)

**Location**: `src/components/ai-elements/plan.tsx`

**Purpose**: Display multi-step plans with status indicators and collapsible details.

**Components**:
- `Plan` - Main container
- `PlanHeader` - Header section
- `PlanTitle` - Title with shimmer support
- `PlanDescription` - Description with shimmer
- `PlanAction` - Action button area
- `PlanContent` - Collapsible content
- `PlanTrigger` - Expand/collapse button
- `PlanStep` - Individual step with status

**Props**:
```typescript
type PlanStepProps = {
  title: string;
  status: "pending" | "in-progress" | "completed" | "failed";
  description?: string;
  substeps?: Array<{ title: string; status: PlanStepStatus }>;
};
```

**Usage Example**:
```tsx
import {
  Plan, PlanHeader, PlanTitle, PlanDescription,
  PlanContent, PlanStep
} from "@/components/ai-elements/plan";

<Plan isStreaming={false}>
  <PlanHeader>
    <PlanTitle>Database Migration Plan</PlanTitle>
    <PlanDescription>
      Three-step process to migrate from Supabase to Neon
    </PlanDescription>
  </PlanHeader>
  <PlanContent>
    <PlanStep
      title="Backup existing data"
      status="completed"
      description="Export all tables to JSON"
    />
    <PlanStep
      title="Create new schema"
      status="in-progress"
      substeps={[
        { title: "Generate migrations", status: "completed" },
        { title: "Run migrations", status: "in-progress" }
      ]}
    />
    <PlanStep
      title="Restore data"
      status="pending"
    />
  </PlanContent>
</Plan>
```

**Status Indicators**:
- **pending** (○): Neutral-600, neutral-800 background
- **in-progress** (◐): Blue-400, blue-900 background
- **completed** (✓): Green-400, green-900 background
- **failed** (✗): Red-400, red-900 background

**Features**:
- **Streaming Support**: Shimmer effect while `isStreaming={true}`
- **Substeps**: Nested step hierarchy with indentation
- **Visual Indicators**: Unicode symbols and color coding
- **Collapsible**: Optional expand/collapse with PlanTrigger

**Visual Description**: Card-based UI with clear status indicators, hierarchical layout for substeps, and shimmer animation during streaming.

---

### 6. EmptyState

**Location**: `src/components/ai-elements/EmptyState.tsx`

**Purpose**: Welcome screen displayed when chat has no messages.

**Props**:
```typescript
interface EmptyStateProps {
  className?: string;
}
```

**Usage Example**:
```tsx
import { EmptyState } from "@/components/ai-elements/EmptyState";

{messages.length === 0 && <EmptyState />}
```

**Features**:
- **SiriOrb Animation**: Pulsing orb with dark background
- **Welcome Message**: Portuguese greeting and instructions
- **Centered Layout**: Flexbox centered with min-height
- **Responsive**: Adapts to container size

**Visual Description**: Centered layout with animated SiriOrb (48px), heading "Capture um pensamento para começar" in neutral-300, and muted instruction text.

---

### 7. Loader

**Location**: `src/components/ai-elements/loader.tsx`

**Purpose**: Animated loading indicator for AI responses.

**Props**:
```typescript
type LoaderProps = {
  size?: number;        // Icon size in pixels (default: 16)
  className?: string;
};
```

**Usage Example**:
```tsx
import { Loader } from "@/components/ai-elements/loader";

{isLoading && (
  <div className="flex items-center gap-2">
    <Loader size={20} />
    <span>Pensando...</span>
  </div>
)}
```

**Features**:
- **Animated SVG**: Rotating icon with opacity gradients
- **Customizable Size**: Size prop controls dimensions
- **Smooth Animation**: CSS spin animation
- **Accessible**: Includes title attribute

**Visual Description**: Circular spinner with 8 spokes at varying opacity levels, creating smooth rotation effect.

---

### 8. Suggestion (Suggestion Chips)

**Location**: `src/components/ai-elements/suggestion.tsx`

**Purpose**: Clickable suggestion chips for quick prompts.

**Components**:
- `Suggestions` - Horizontal scrollable container
- `Suggestion` - Individual chip button

**Props**:
```typescript
type SuggestionProps = {
  suggestion: string;                       // Suggestion text
  onClick?: (suggestion: string) => void;  // Click handler
  variant?: ButtonVariant;                 // Button style
  size?: ButtonSize;
};
```

**Usage Example**:
```tsx
import { Suggestions, Suggestion } from "@/components/ai-elements/suggestion";

const suggestions = [
  "What are the latest trends in AI?",
  "How does machine learning work?",
  "Explain quantum computing"
];

<Suggestions>
  {suggestions.map((s) => (
    <Suggestion
      key={s}
      suggestion={s}
      onClick={(text) => handleSuggestionClick(text)}
    />
  ))}
</Suggestions>
```

**Features**:
- **Horizontal Scroll**: ScrollArea with hidden scrollbar
- **Rounded Pills**: Outline variant with rounded-full class
- **Click Handler**: Passes suggestion text to callback
- **Accessible**: Button semantics with proper ARIA labels

**Visual Description**: Horizontal row of pill-shaped outline buttons with neutral border, spaced evenly, scrollable on overflow.

---

### 9. AIElementErrorBoundary

**Location**: `src/components/ai-elements/AIElementErrorBoundary.tsx`

**Purpose**: Catches and displays errors in AI component rendering.

**Props**:
```typescript
interface AIElementErrorBoundaryProps {
  children: ReactNode;    // Components to protect
  fallback?: ReactNode;   // Custom error UI
}
```

**Usage Example**:
```tsx
import { AIElementErrorBoundary } from "@/components/ai-elements/AIElementErrorBoundary";

<AIElementErrorBoundary
  fallback={<div>Something went wrong</div>}
>
  <MessageRouter message={message} />
</AIElementErrorBoundary>
```

**Features**:
- **Error Catching**: getDerivedStateFromError lifecycle
- **Console Logging**: componentDidCatch logs to console
- **User-Friendly**: Red-themed error card with details toggle
- **Custom Fallback**: Optional custom error UI

**Visual Description**: Red border card (border-red-700/60) with red background (bg-red-900/20), showing error message and collapsible details section.

---

## MessageRouter System

### How MessageRouter Works

The MessageRouter is the heart of the AI Elements integration. It analyzes each message and determines the appropriate component to render.

**Decision Flow**:

```
EnrichedChatMessage
    │
    ├─> metadata.type === "code"
    │   └─> <CodeBlock language={metadata.language} />
    │
    ├─> metadata.type === "sources"
    │   └─> <Sources> with Source list
    │
    ├─> metadata.type === "plan"
    │   └─> <Plan> (currently falls back to Response)
    │
    ├─> metadata.type === undefined
    │   └─> <Response> (default)
    │
    └─> other types
        └─> <Response> (fallback)
```

### Currently Implemented Types

| Type | Component | Status | Features |
|------|-----------|--------|----------|
| `code` | CodeBlock | ✅ Fully implemented | Syntax highlighting, copy button, line numbers |
| `sources` | Sources | ✅ Fully implemented | Collapsible, excerpts, external links |
| Default | Response | ✅ Fully implemented | Markdown rendering, memoized |

### Fallback Types (Rendered as Response)

These types are recognized but currently fall back to Response component:
- `plan` - Multi-step planning
- `reasoning` - Chain-of-thought
- `task` - Task lists
- `tool` - Tool invocations
- `confirmation` - User approvals
- `image` - Image display
- `context` - Context info
- `queue` - Task queues

---

## Adding New Message Types

### Step 1: Define Type in `src/types/chat.ts`

```typescript
// Add to MessageType union
export type MessageType =
  | "code"
  | "sources"
  | "plan"
  | "myNewType";  // ← Add here

// Add to MessageMetadata interface
export interface MessageMetadata {
  type?: MessageType;
  // ... existing fields
  myNewTypeData?: MyNewTypeData;  // ← Add here
}

// Define new interface
export interface MyNewTypeData {
  title: string;
  items: string[];
}
```

### Step 2: Update MessageRouter

```typescript
// src/components/ai-elements/MessageRouter.tsx

import { MyNewComponent } from "./my-new-component";

export function MessageRouter({ message, className }: MessageRouterProps) {
  const messageType = message.metadata?.type;
  const getTextContent = () => { /* ... */ };

  switch (messageType) {
    // ... existing cases

    case "myNewType":
      if (!message.metadata?.myNewTypeData) return null;
      return (
        <MyNewComponent
          className={className}
          data={message.metadata.myNewTypeData}
        />
      );

    default:
      return <Response className={className}>{getTextContent()}</Response>;
  }
}
```

### Step 3: Create Component

```typescript
// src/components/ai-elements/my-new-component.tsx

"use client";

import type { MyNewTypeData } from "@/types/chat";

export interface MyNewComponentProps {
  data: MyNewTypeData;
  className?: string;
}

export function MyNewComponent({ data, className }: MyNewComponentProps) {
  return (
    <div className={className}>
      <h3>{data.title}</h3>
      <ul>
        {data.items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
```

### Step 4: Update API Response

Ensure your API endpoint returns the correct metadata:

```typescript
// In API route (e.g., /api/assistant/act)

const message: EnrichedChatMessage = {
  id: generateId(),
  role: "assistant",
  parts: [{ type: "text", text: "Here is my new type" }],
  metadata: {
    type: "myNewType",
    myNewTypeData: {
      title: "Example Title",
      items: ["Item 1", "Item 2", "Item 3"]
    }
  }
};
```

---

## Testing Guide

### Unit Testing MessageRouter

See `src/components/ai-elements/__tests__/MessageRouter.test.tsx` for examples.

**Test Structure**:
```typescript
describe('MessageRouter', () => {
  it('renders Response for undefined type', () => {
    const message = createMessage('Hello World');
    render(<MessageRouter message={message} />);
    expect(screen.getByTestId('response')).toBeInTheDocument();
  });

  it('renders CodeBlock for code type', () => {
    const message = createMessage('console.log()', {
      type: 'code',
      language: 'javascript'
    });
    render(<MessageRouter message={message} />);
    expect(screen.getByTestId('code-block')).toBeInTheDocument();
  });
});
```

### Integration Testing Chat Flow

See `src/__tests__/integration/chat-flow.test.tsx` for examples.

**Key Tests**:
1. **Empty State Rendering** - Verify EmptyState shows when no messages
2. **Suggestion Interaction** - Click suggestion → API call
3. **Message Submission** - Type + submit → user + assistant messages
4. **Loader Display** - Verify loader during API call
5. **Error Handling** - Mock error → error message displayed
6. **Model Selection** - Change model → state updated
7. **Modal Close** - ESC key → modal closes

### Running Tests

⚠️ **Note**: Test dependencies are not installed. Tests are for reference only.

```bash
# If you install testing dependencies:
npm install --save-dev @testing-library/react @testing-library/jest-dom @testing-library/user-event jest

# Then run:
npm test
```

---

## Performance Optimizations

### 1. React.memo on Response Component

The Response component is memoized to prevent unnecessary re-renders:

```typescript
export const Response = memo(
  ({ className, ...props }: ResponseProps) => (
    <Streamdown className={cn(/* ... */)} {...props} />
  ),
  (prevProps, nextProps) => prevProps.children === nextProps.children
);
```

**Why**: Text content rarely changes once streamed, so we avoid expensive Streamdown re-parsing.

### 2. Lazy Loading CodeBlock

CodeBlock uses Shiki which is a heavy library (~500KB). Consider lazy loading:

```typescript
// In MessageRouter.tsx
import dynamic from 'next/dynamic';
import { Shimmer } from './shimmer';

const CodeBlock = dynamic(() => import('./code-block'), {
  loading: () => <Shimmer>Loading code...</Shimmer>,
  ssr: false
});
```

**Benefits**:
- Reduces initial bundle size
- CodeBlock only loads when needed
- Shows shimmer during loading

### 3. MessageRouter Memoization

Memoize MessageRouter with custom comparison:

```typescript
export const MessageRouter = React.memo(
  MessageRouterImpl,
  (prev, next) => {
    return (
      prev.message.id === next.message.id &&
      prev.message.parts === next.message.parts
    );
  }
);
```

**Why**: Prevents re-routing when message content hasn't changed.

### 4. Highlight Code Caching

The highlightCode function runs asynchronously and caches results:

```typescript
const [html, setHtml] = useState<string>("");
const mounted = useRef(false);

useEffect(() => {
  highlightCode(code, language, showLineNumbers).then(([light, dark]) => {
    if (!mounted.current) {
      setHtml(light);
      setDarkHtml(dark);
      mounted.current = true;
    }
  });

  return () => { mounted.current = false; };
}, [code, language, showLineNumbers]);
```

**Why**: Avoids re-highlighting identical code blocks.

---

## Best Practices

### 1. Always Use AIElementErrorBoundary

Wrap MessageRouter in error boundary to prevent entire UI crash:

```tsx
<AIElementErrorBoundary>
  <MessageRouter message={message} />
</AIElementErrorBoundary>
```

### 2. Validate Metadata Before Rendering

```typescript
case "sources":
  if (!message.metadata?.sources || message.metadata.sources.length === 0) {
    return null;  // Don't render empty sources
  }
  // ... render Sources
```

### 3. Use TypeScript Strict Mode

Enable strict type checking to catch errors early:

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}
```

### 4. Keep Message Parts Immutable

Don't mutate message.parts - create new arrays:

```typescript
// ❌ Bad
message.parts.push({ type: "text", text: "new" });

// ✅ Good
const newMessage = {
  ...message,
  parts: [...message.parts, { type: "text", text: "new" }]
};
```

### 5. Extract Text Content Safely

```typescript
const getTextContent = () => {
  const textParts = message.parts.filter(
    (part): part is { type: "text"; text: string } => part.type === "text"
  );
  return textParts.map(part => part.text).join("");
};
```

### 6. Use Semantic HTML

AI Elements use semantic HTML - maintain this in custom components:

```tsx
// ✅ Good
<article>
  <h2>Title</h2>
  <p>Content</p>
</article>

// ❌ Bad
<div>
  <div>Title</div>
  <div>Content</div>
</div>
```

### 7. Accessibility First

- Use ARIA labels for icons
- Ensure keyboard navigation
- Maintain focus management
- Test with screen readers

---

## Troubleshooting

### Issue: CodeBlock Not Highlighting

**Symptoms**: Code appears as plain text without colors

**Solutions**:
1. Check language is valid BundledLanguage: `"typescript"`, not `"ts"`
2. Verify Shiki installed: `npm list shiki`
3. Check console for Shiki loading errors
4. Ensure `highlightCode()` function is imported correctly

### Issue: Sources Not Collapsing

**Symptoms**: SourcesContent always visible

**Solutions**:
1. Verify Collapsible components from `@/components/ui/collapsible`
2. Check Radix UI collapsible installed: `npm list @radix-ui/react-collapsible`
3. Ensure `SourcesTrigger` has `asChild` prop removed (if added manually)

### Issue: Messages Not Routing Correctly

**Symptoms**: All messages render as Response, ignoring type

**Solutions**:
1. Console.log `message.metadata?.type` to verify it's set
2. Check API response includes correct metadata structure
3. Verify MessageRouter switch statement includes your type
4. Ensure no TypeScript errors in MessageRouter file

### Issue: Performance Degradation with Many Messages

**Symptoms**: Chat slows down after 50+ messages

**Solutions**:
1. Implement message virtualization with `react-window`
2. Add pagination (show last 20 messages, load more on scroll)
3. Verify React.memo is applied to MessageRouter
4. Check for unnecessary re-renders with React DevTools Profiler

### Issue: Shimmer Effect Not Showing During Streaming

**Symptoms**: No shimmer animation while AI is responding

**Solutions**:
1. Verify `isStreaming` prop passed to Plan component
2. Check Shimmer component exists in `@/components/ai-elements/shimmer`
3. Ensure CSS animations enabled (check Tailwind config)

### Issue: Test Files Have TypeScript Errors

**This is expected!** Test dependencies are not installed. Tests are for documentation purposes only.

**To fix (if you want to run tests)**:
```bash
npm install --save-dev @testing-library/react @testing-library/jest-dom @testing-library/user-event jest jest-environment-jsdom
```

---

## Conclusion

The AI Elements integration provides a robust, type-safe, and performant foundation for building rich AI experiences in Zenith Tasks. By following the patterns and best practices outlined in this documentation, you can extend and customize the AI interface to meet your specific needs.

**Next Steps**:

1. Implement missing message types (plan, reasoning, task, etc.)
2. Add custom toolbar actions to CodeBlock
3. Create specialized Source types (GitHub, documentation, etc.)
4. Implement message search and filtering
5. Add export functionality for conversations

**Resources**:

- [Vercel AI SDK Documentation](https://sdk.vercel.ai/docs)
- [AI Elements Storybook](https://ai-sdk-ai-elements.vercel.sh/)
- [Shiki Documentation](https://shiki.style/)
- [Streamdown Documentation](https://github.com/streamdown/streamdown)

---

**Documentation Version**: 1.0.0
**Word Count**: 4,500+
**Last Updated**: 2025-01-05
