# AI Specifications 📋

Technical specifications, API documentation, and architectural specifications for all AI features.

## Purpose

This directory contains:
- Feature specifications and requirements
- API endpoint documentation
- Database schema specifications
- Integration specifications
- Protocol specifications
- Performance requirements and SLOs

## Organization

Specifications organized by domain/module:
- **Feature Specs/** - Feature-specific requirements
- **API Specs/** - REST API and protocol specifications
- **Database Specs/** - Schema and data structure documentation
- **Integration Specs/** - Third-party integration specifications
- **Performance Specs/** - Performance requirements and benchmarks

## Current Specifications

### API Endpoints (27 total)

**Main Endpoints**:
- `/api/assistant` - Unified AI assistant with tool execution
- `/api/models` - AI model listing and provider switching
- `/api/inbox/analyze` - Text analysis and categorization
- `/api/subtasks/generate` - AI-powered subtask generation
- `/api/items/*` - Item CRUD operations

**Analytics & Credits**:
- `/api/credits/*` - AI usage tracking
- `/api/analytics` - Usage analytics

**Utility**:
- `/api/debug/*` - Debug utilities
- `/api/test-*` - Test endpoints

See: docs/CLEANUP_REPORT_20251109.md for complete list

### Data Model (MindFlowItem)

**Core Fields**:
- id, userId, title, completed, createdAt, updatedAt

**Item Types**:
- Tarefa, Ideia, Nota, Lembrete, Financeiro, Reunião

**AI Fields**:
- summary, suggestions, chatHistory (JSONB)

**Extended Fields**:
- amount, transactionType (financial)
- dueDate, dueDateIso (scheduling)
- meetingDetails, transcript (meetings)

See: CLAUDE.md for complete schema

### Provider Specifications

**Supported Providers**:
- Google Gemini
- OpenAI (GPT-4, GPT-3.5)
- Anthropic Claude
- XAI (Grok)

**Provider Configuration**:
- Model selection
- Temperature settings
- Token limits
- Context windows

See: docs/MODEL_SWITCHING.md

## Specification Template

When adding specifications, use:

```markdown
# Feature Name

## Overview
Brief description of what this specification covers

## Requirements
- Functional requirements
- Non-functional requirements
- Constraints

## API Specification
- Endpoint paths
- Request/response formats
- Authentication
- Error codes

## Data Model
- Entity definitions
- Relationships
- Constraints

## Implementation Notes
- Special considerations
- Performance requirements
- Security requirements
```

## Last Updated

2025-11-09

---

**Maintained by**: Claude Code AI Assistant
