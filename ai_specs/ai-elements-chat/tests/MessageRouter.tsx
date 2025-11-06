"use client";

import type { EnrichedChatMessage, MessageType } from "@/types/chat";
import type { BundledLanguage } from "shiki";
import { Response } from "./response";
import { CodeBlock } from "./code-block";
import { Sources, Source, SourcesContent, SourcesTrigger } from "./sources";
import { Plan } from "./plan";
import { Reasoning } from "./reasoning";
import { Task, TaskItem } from "./task";
import { Tool } from "./tool";
import { Confirmation } from "./confirmation";
import { Image } from "./image";
import { Context } from "./context";
import { InlineCitation } from "./inline-citation";
import { Queue } from "./queue";

export interface MessageRouterProps {
  message: EnrichedChatMessage;
  className?: string;
}

/**
 * Routes messages to appropriate AI Elements based on message type
 * Falls back to Response component for standard messages
 */
export function MessageRouter({ message, className }: MessageRouterProps) {
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
