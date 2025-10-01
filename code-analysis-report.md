# Code Analysis Report

Generated: 9/26/2025, 2:05:11 AM

## Executive Summary

- **Files Analyzed**: 69
- **Total Dependencies**: 106
- **Code Quality Score**: 0/100

## 🔴 Critical Issues

## 🔁 Duplicate Code

Found 35 groups of duplicate code:

### block duplicated 4 times
- /Users/guilhermevarela/Documents/Projetos/zenith-tasks/src/app/api/assistant/chat/route.ts:9
- /Users/guilhermevarela/Documents/Projetos/zenith-tasks/src/app/api/chat/for-item/route.ts:13
- /Users/guilhermevarela/Documents/Projetos/zenith-tasks/src/app/api/speech/transcribe/route.ts:13
- /Users/guilhermevarela/Documents/Projetos/zenith-tasks/src/app/api/subtasks/generate/route.ts:13

### block duplicated 5 times
- /Users/guilhermevarela/Documents/Projetos/zenith-tasks/src/app/api/mcp/servers/[id]/call/route.ts:24
- /Users/guilhermevarela/Documents/Projetos/zenith-tasks/src/app/api/mcp/servers/[id]/tools/route.ts:22
- /Users/guilhermevarela/Documents/Projetos/zenith-tasks/src/server/mcpRegistry.ts:16
- /Users/guilhermevarela/Documents/Projetos/zenith-tasks/src/services/mcp/client.ts:17
- /Users/guilhermevarela/Documents/Projetos/zenith-tasks/src/services/mcp/client.ts:26

### block duplicated 3 times
- /Users/guilhermevarela/Documents/Projetos/zenith-tasks/src/components/App.tsx:115
- /Users/guilhermevarela/Documents/Projetos/zenith-tasks/src/components/App.tsx:170
- /Users/guilhermevarela/Documents/Projetos/zenith-tasks/src/components/MeetingPage.tsx:29

### block duplicated 2 times
- /Users/guilhermevarela/Documents/Projetos/zenith-tasks/src/components/App.tsx:193
- /Users/guilhermevarela/Documents/Projetos/zenith-tasks/src/components/App.tsx:316

### block duplicated 2 times
- /Users/guilhermevarela/Documents/Projetos/zenith-tasks/src/components/App.tsx:335
- /Users/guilhermevarela/Documents/Projetos/zenith-tasks/src/components/App.tsx:360

### block duplicated 2 times
- /Users/guilhermevarela/Documents/Projetos/zenith-tasks/src/components/App.tsx:526
- /Users/guilhermevarela/Documents/Projetos/zenith-tasks/src/components/App.tsx:552

### block duplicated 2 times
- /Users/guilhermevarela/Documents/Projetos/zenith-tasks/src/components/App.tsx:551
- /Users/guilhermevarela/Documents/Projetos/zenith-tasks/src/components/App.tsx:595

### block duplicated 2 times
- /Users/guilhermevarela/Documents/Projetos/zenith-tasks/src/components/App.tsx:665
- /Users/guilhermevarela/Documents/Projetos/zenith-tasks/src/components/App.tsx:700

### block duplicated 2 times
- /Users/guilhermevarela/Documents/Projetos/zenith-tasks/src/components/App.tsx:669
- /Users/guilhermevarela/Documents/Projetos/zenith-tasks/src/components/App.tsx:704

### block duplicated 2 times
- /Users/guilhermevarela/Documents/Projetos/zenith-tasks/src/components/App.tsx:782
- /Users/guilhermevarela/Documents/Projetos/zenith-tasks/src/services/ai/assistant.ts:88

## 🗑️ Unused Code

Found 68 unused items:

### layout.tsx
- Line 33: RootLayout (function)

### not-found.tsx
- Line 3: NotFound (function)

### page.tsx
- Line 11: HomePage (function)

### page.tsx
- Line 3: SignInPage (function)

### page.tsx
- Line 3: SignUpPage (function)

### Icons.tsx
- Line 3: InboxIcon (function)
- Line 44: FolderIcon (function)
- Line 71: DragHandleIcon (function)
- Line 93: MicVocalIcon (function)
- Line 97: KeyboardIcon (function)
- Line 138: UserIcon (function)
- Line 161: HistoryIcon (function)
- Line 240: ArrowUpCircleIcon (function)
- Line 248: ArrowDownCircleIcon (function)
- Line 277: FileTextIcon (function)
- Line 287: EditIcon (function)
- Line 301: ClockIcon (function)
- Line 308: FilterIcon (function)
- Line 314: EyeIcon (function)
- Line 321: EyeOffIcon (function)
- Line 331: PieChartIcon (function)
- Line 338: CreditCardIcon (function)
- Line 345: RepeatIcon (function)
- Line 360: DownloadIcon (function)
- Line 368: StopIcon (function)
- Line 374: PlayIcon (function)
- Line 380: PauseIcon (function)
- Line 387: VolumeIcon (function)
- Line 394: ChevronDownIcon (function)

### index.ts
- Line 7: analyzeWithAI (function)
- Line 57: estimateComplexity (function)

### client.ts
- Line 23: callTool (function)

### marketplace-registry.ts
- Line 165: getMarketplaceServer (function)
- Line 172: getServersByCategory (function)
- Line 179: searchServers (function)

### date.ts
- Line 1: nextWeekFrom (function)
- Line 7: nextWeekday (function)
- Line 21: toISODate (function)

## ⚠️ Unused Imports

- App.tsx:28 - executePlan
- App.tsx:30 - loadServers
- FinancePage.tsx:5 - DollarSignIcon, TrendingUpIcon, TrendingDownIcon
- aiProvider.ts:1 - ZodTypeAny
- assistant.ts:2 - extractJson

## 💡 Recommendations

### Immediate Actions

1. Run automated fixes for unused imports
2. Review and resolve circular dependencies
3. Consolidate duplicate code blocks

### Long-term Improvements

1. Implement stricter linting rules
2. Add pre-commit hooks for code quality
3. Set up regular code reviews
4. Create shared utility modules for common patterns


## Summary Statistics

```json
{
  "summary": {
    "totalFiles": 69,
    "totalIssues": 119,
    "criticalIssues": 61,
    "codeQualityScore": 0,
    "timestamp": "2025-09-26T05:05:11.512Z"
  },
  "dependencies": {
    "totalDependencies": 106,
    "circularDependencies": 0,
    "unusedImports": 5,
    "orphanExports": 3
  },
  "duplicates": {
    "duplicateGroups": 35,
    "duplicateOccurrences": 46,
    "similarCodePairs": 1583
  },
  "unusedCode": {
    "totalUnused": 68,
    "unusedFunctions": 38,
    "unusedComponents": 0,
    "unusedTypes": 30,
    "unreferencedFiles": 2
  }
}
```
