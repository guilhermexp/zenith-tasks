"use client";

import dynamic from "next/dynamic";
import React from "react";
import type { EnrichedChatMessage } from "@/types/chat";
import type { BundledLanguage } from "shiki";
import { Response } from "./response";
import { Shimmer } from "./shimmer";
import { Source, Sources, SourcesContent, SourcesTrigger } from "./sources";

// Lazy load CodeBlock to reduce initial bundle size (Shiki is ~500KB)
const CodeBlock = dynamic(() => import("./code-block").then(mod => ({ default: mod.CodeBlock })), {
  loading: () => <Shimmer>Loading code...</Shimmer>,
  ssr: false,
});

export interface MessageRouterProps {
  message: EnrichedChatMessage;
  className?: string;
}

/**
 * Routes messages to appropriate AI Elements based on message type
 * Falls back to Response component for standard messages
 */
function MessageRouterImpl({ message, className }: MessageRouterProps) {
  const messageType = message.metadata?.type;

  // Extract text content from message parts
  const getTextContent = () => {
    const textParts = message.parts.filter((part): part is { type: "text"; text: string } => part.type === "text");
    return textParts.map(part => part.text).join("");
  };

  switch (messageType) {
    case "code":
      return (
        <CodeBlock
          className={className}
          language={(message.metadata?.language || "typescript") as BundledLanguage}
          code={getTextContent()}
        />
      );

    case "sources":
      if (!message.metadata?.sources || message.metadata.sources.length === 0) return null;
      return (
        <Sources className={className}>
          <SourcesTrigger count={message.metadata.sources.length} />
          <SourcesContent>
            {message.metadata.sources.map((source) => (
              <Source key={source.id} href={source.url} title={source.title} />
            ))}
          </SourcesContent>
        </Sources>
      );

    case "plan":
    case "reasoning":
    case "task":
    case "tool":
    case "confirmation":
    case "image":
    case "context":
    case "queue":
      // These cases require proper composable implementation
      // For now, fall through to default Response rendering
      return (
        <Response className={className}>
          {getTextContent()}
        </Response>
      );

    default:
      // Default to Response component for standard text messages
      return (
        <Response className={className}>
          {getTextContent()}
        </Response>
      );
  }
}

/**
 * Memoized MessageRouter to prevent unnecessary re-renders
 * Only re-renders when message id or parts change
 */
export const MessageRouter = React.memo(
  MessageRouterImpl,
  (prev, next) => {
    return (
      prev.message.id === next.message.id &&
      prev.message.parts === next.message.parts &&
      prev.className === next.className
    );
  }
);
