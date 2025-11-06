"use client";

import SiriOrb from "@/components/ui/SiriOrb";

export interface EmptyStateProps {
  className?: string;
}

/**
 * Empty state component for AI chat
 * Displays SiriOrb icon with welcome message
 */
export function EmptyState({ className }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center h-full min-h-[200px] text-center ${className || ''}`}>
      <div className="mb-4">
        <SiriOrb size="48px" colors={{ bg: "oklch(22.64% 0 0)" }} />
      </div>
      <h3 className="text-neutral-300 text-xl font-medium mb-2">
        Capture um pensamento para começar
      </h3>
      <p className="text-neutral-500 text-base max-w-xs">
        Como posso ajudar você hoje? Digite abaixo ou pressione ESC para fechar.
      </p>
    </div>
  );
}
