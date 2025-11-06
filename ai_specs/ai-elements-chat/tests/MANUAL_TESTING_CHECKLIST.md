# Manual Testing & Visual QA Checklist - AI Elements Chat

## Test Scenarios to Validate

### 1. Empty State
- [ ] Chat opens and shows EmptyState component
- [ ] SiriOrb animation visible (48px)
- [ ] Title: "Capture um pensamento para começar"
- [ ] Description text visible
- [ ] 4 suggestion chips displayed horizontally

### 2. Suggestion Chips
- [ ] Click "What are the latest trends in AI?" → input populated, message sent
- [ ] Click "How does machine learning work?" → input populated, message sent
- [ ] Click "Explain quantum computing" → input populated, message sent
- [ ] Click "Best practices for React hooks?" → input populated, message sent
- [ ] Chips disappear after first message

### 3. Message Rendering (Text)
- [ ] User message appears on the right (or appropriate side)
- [ ] AI message appears on the left (or appropriate side)
- [ ] Text content renders correctly
- [ ] Conversation component wraps messages
- [ ] Message component structure correct

### 4. Loading States
- [ ] Loader component shows when isLoading=true
- [ ] Loader positioned correctly (flex justify-start px-4)
- [ ] Loader disappears when response arrives

### 5. AI Elements Components (Mock Data Testing)

#### CodeBlock (type: 'code')
- [ ] Syntax highlighting visible (github-dark theme)
- [ ] Copy button functional
- [ ] JavaScript code renders correctly
- [ ] TypeScript code renders correctly
- [ ] Python code renders correctly

#### Sources (type: 'sources')
- [ ] "Used N sources" trigger visible
- [ ] Click expands source list
- [ ] Each source shows title (linked)
- [ ] Source URLs clickable
- [ ] Collapse/expand animation smooth

#### Plan (type: 'plan')
- [ ] Plan steps display in cards
- [ ] Status indicators visible (pending/in-progress/completed/failed)
- [ ] Colors correct (neutral/blue/green/red)
- [ ] Substeps indented if present

#### Reasoning (type: 'reasoning')
- [ ] "Thinking..." or BrainIcon visible when collapsed
- [ ] Click expands reasoning steps
- [ ] Each thought visible
- [ ] Conclusion highlighted if present

#### Task (type: 'task')
- [ ] Checklist format
- [ ] Checkboxes toggle on click
- [ ] Completed items show line-through
- [ ] Assignee/dueDate visible if present

#### Tool (type: 'tool')
- [ ] Tool name displayed prominently
- [ ] Parameters show as JSON (collapsible)
- [ ] Result visible if present
- [ ] Status badge correct (pending/running/completed/error)

#### Queue (type: 'queue')
- [ ] Queue items listed
- [ ] Status colors correct
- [ ] Progress indicator shows X/Total
- [ ] Attachments render if present

#### Confirmation (type: 'confirmation')
- [ ] Action title visible
- [ ] Description paragraph clear
- [ ] Approve button (green styling)
- [ ] Reject button (red/neutral styling)
- [ ] Buttons trigger callbacks

#### Image (type: 'image')
- [ ] Image renders with correct URL
- [ ] Loading skeleton shows while loading
- [ ] Error state if URL invalid
- [ ] Responsive sizing (max-width)

#### Context (type: 'context')
- [ ] Token count visible
- [ ] Model name visible
- [ ] Response time visible
- [ ] Formatting: "Tokens: 1234 | Model: GPT-4 | Time: 2.3s"

#### InlineCitation (type: 'inline-citation')
- [ ] Citation number/symbol shows inline ([1], [2])
- [ ] Hover shows tooltip with source info
- [ ] Click navigates or expands details

### 6. Error Handling
- [ ] AIElementErrorBoundary catches component errors
- [ ] Fallback UI shows: "Failed to render AI component. Please try again."
- [ ] Red border (border-red-700/60)
- [ ] Red background (bg-red-900/20)
- [ ] Error details expandable

### 7. Responsive Design
- [ ] Mobile view (< 640px): Chat functional
- [ ] Tablet view (640-1024px): Chat functional
- [ ] Desktop view (> 1024px): Chat functional
- [ ] Suggestion chips wrap on small screens

### 8. Visual Consistency
- [ ] All components use neutral dark theme
- [ ] Borders: neutral-800/60, neutral-700/60
- [ ] Text: neutral-300, neutral-500, neutral-600
- [ ] Backgrounds: neutral-900, neutral-950
- [ ] Hover states consistent

### 9. Animations
- [ ] Modal open/close smooth (framer-motion)
- [ ] Collapsible expand/collapse smooth
- [ ] Loader animation runs smoothly
- [ ] No janky transitions (60fps)

### 10. Keyboard Navigation
- [ ] Tab navigates through elements
- [ ] Enter submits message
- [ ] Shift+Enter adds newline
- [ ] ESC closes modal
- [ ] Arrow keys navigate suggestions (if implemented)

### 11. Accessibility
- [ ] Screen reader announces messages
- [ ] ARIA labels present on buttons
- [ ] Color contrast passes WCAG AA
- [ ] Focus indicators visible

### 12. Integration with Existing Features
- [ ] ModelSelector still functional
- [ ] SiriOrb renders correctly
- [ ] Header close button works
- [ ] Input area maintains functionality

## Browser Compatibility

Test in:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest, if available)
- [ ] Edge (latest)

## Performance

- [ ] First message render < 100ms
- [ ] Scroll smooth with 50+ messages
- [ ] No memory leaks (check DevTools)
- [ ] Bundle size acceptable (< 200KB increase)

## Notes

Document any issues found during manual testing here.

---

**Testing Date:** _____________
**Tested By:** _____________
**Build Version:** _____________
**Issues Found:** _____________
