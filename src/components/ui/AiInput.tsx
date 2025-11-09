"use client";

import { motion } from "motion/react";

import { Button } from "@/components/ui/button";
import SiriOrb from "@/components/ui/SiriOrb";

interface MorphSurfaceProps {
  placeholder?: string;
}

/**
 * Placeholder for the future chat surface.
 * The button remains visible but intentionally does nothing for now.
 */
export function MorphSurface({
  placeholder = "Assistente indisponível no momento",
}: MorphSurfaceProps) {
  return (
    <motion.div
      className="bg-neutral-950 border border-neutral-800 rounded-full overflow-hidden shadow-lg shadow-black/20"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <footer className="mt-auto flex h-[44px] items-center justify-center whitespace-nowrap select-none">
        <div className="flex items-center justify-center gap-2 px-3 max-sm:h-10 max-sm:px-2">
          <div className="flex w-fit items-center gap-2">
            <SiriOrb
              size="24px"
              colors={{
                bg: "oklch(22.64% 0 0)",
              }}
            />
          </div>

          <Button
            type="button"
            className="flex h-fit flex-1 justify-center rounded-full px-3 py-1.5 sm:px-4 sm:py-2 text-neutral-400 bg-neutral-900/60 cursor-default min-w-[50px] sm:min-w-[60px]"
            variant="ghost"
            disabled
            title={placeholder}
          >
            <span className="font-semibold text-sm sm:text-base">AI</span>
          </Button>
        </div>
      </footer>
    </motion.div>
  );
}

export default MorphSurface;
