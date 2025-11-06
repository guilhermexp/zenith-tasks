// Extracted from src/components/ui/AiInput.tsx - Message Rendering Section
// CORRECTED: Now using MessageRouter instead of renderMessage function

import { Conversation, ConversationContent } from "@/components/ai-elements/conversation"
import { Message, MessageContent } from "@/components/ai-elements/message"
import { MessageRouter } from "@/components/ai-elements/MessageRouter"
import { AIElementErrorBoundary } from "@/components/ai-elements/AIElementErrorBoundary"
import { EmptyState } from "@/components/ai-elements/EmptyState"

// CORRECTED Message rendering structure:
/*
{messages.length === 0 ? (
  <div className="p-4 sm:p-6">
    <EmptyState />
  </div>
) : (
  <Conversation>
    <ConversationContent className="space-y-0">
      {messages.map((msg) => {
        // Convert simple message to UIMessage format
        const uiMessage = {
          id: msg.id,
          role: msg.role as "user" | "assistant" | "system",
          parts: [{ type: "text" as const, text: msg.content || "" }],
        };

        return (
          <Message key={msg.id} from={msg.role}>
            <MessageContent>
              <AIElementErrorBoundary>
                <MessageRouter message={uiMessage} />
              </AIElementErrorBoundary>
            </MessageContent>
          </Message>
        );
      })}
    </ConversationContent>
  </Conversation>
)}
*/

// Key changes from old implementation:
// 1. Replaced simple divs with AI Elements: Conversation, ConversationContent, Message, MessageContent
// 2. Wrapped content with AIElementErrorBoundary for error handling
// 3. ✅ NOW USING MessageRouter instead of renderMessage function
// 4. ✅ Removed variant="contained" to use default MessageContent styling
// 5. ✅ Removed prose classes wrapper - MessageRouter handles its own styling
// 6. Converts simple message format to UIMessage format with parts array
// 7. ✅ renderMessage function completely removed from codebase

// INCORRECT code (before correction):
/*
<MessageContent variant="contained">
  <AIElementErrorBoundary>
    <div className="prose prose-sm dark:prose-invert max-w-none">
      {renderMessage(msg.content)}
    </div>
  </AIElementErrorBoundary>
</MessageContent>
*/

// CORRECT code (after correction):
/*
<MessageContent>
  <AIElementErrorBoundary>
    <MessageRouter message={uiMessage} />
  </AIElementErrorBoundary>
</MessageContent>
*/
