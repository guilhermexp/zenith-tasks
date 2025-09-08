# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Scripts
- `npm run dev` - Start development server on port 3456
- `npm run build` - Build for production
- `npm start` - Start production server on port 3456
- `npm run lint` - Run ESLint checks

### Environment Setup
- Requires `NEXT_PUBLIC_GEMINI_API_KEY` environment variable for AI features
- Create `.env.local` from `.env.example` and add Gemini API key
- Get API key from [Google AI Studio](https://makersuite.google.com/app/apikey)

## Architecture Overview

### Core Application Structure
Zenith Tasks is a Next.js 14 app using client-side rendering with a single-page application pattern. The main entry point is `src/components/App.tsx` which manages all application state and renders different pages based on navigation.

### State Management Pattern
- **Central State**: All items are managed in `App.tsx` using React state
- **Local Storage**: Persistent storage using browser localStorage with key `zenith-tasks-items`
- **AI Integration**: Google Gemini AI for text analysis, categorization, and chat features
- **Item Structure**: All items follow the `MindFlowItem` interface with extensible type system

### Component Architecture
- **App.tsx**: Main application controller with all business logic
- **Sidebar.tsx**: Navigation and search interface
- **TaskList.tsx**: Default list view for all item types
- **Specialized Pages**: CalendarPage, FinancePage, MeetingPage, UpdatesPage for specific views
- **DetailPanel.tsx**: Right sidebar for item details and AI chat
- **TalkModeModal.tsx**: Voice input interface

### Data Flow
1. Items are created through AI analysis (`analyzeTextWithAI` function)
2. All operations update central state in App.tsx
3. State changes automatically persist to localStorage
4. Components receive data via props from App.tsx

### AI Integration Points
- **Text Analysis**: `analyzeTextWithAI()` - categorizes text into structured items
- **Chat Interface**: `chatWithAI()` - contextual AI assistance per item
- **Voice Processing**: `handleAudioReady()` - audio-to-text conversion (currently demo)

### Item Type System
Items support multiple types: 'Tarefa', 'Ideia', 'Nota', 'Lembrete', 'Financeiro', 'Reunião'
- Base properties: id, title, completed, createdAt, type, summary
- Type-specific fields: amount/transactionType (Financeiro), meetingDetails (Reunião)
- Extensible through subtasks, chat history, due dates

### Navigation System
- Filter-based navigation in sidebar
- Special pages render different components
- Search functionality filters across all item properties
- Count badges show items per category

### Key Design Patterns
- **Portuguese Language**: All UI text and data types use Portuguese
- **Dark Theme**: Neutral-950 background with Tailwind CSS
- **TypeScript**: Full type safety with comprehensive interfaces
- **Component Composition**: Minimal prop drilling, functional component architecture

### File Organization
- `src/types/index.ts` - All TypeScript interfaces and types
- `src/components/` - All React components, no sub-folders
- `src/app/` - Next.js App Router structure
- Component naming follows PascalCase, one component per file

### Styling Approach
- Tailwind CSS utility classes throughout
- Custom CSS variables in globals.css for consistent theming
- Inter font from Google Fonts
- Responsive design with mobile-first approach