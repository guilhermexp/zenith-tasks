"use client";

import { motion } from "framer-motion";

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
      className="bg-black border border-white/5 rounded-full overflow-hidden shadow-lg shadow-black/20"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <footer className="mt-auto flex h-[44px] items-center justify-center whitespace-nowrap select-none">
        <div className="flex items-center justify-center px-3 max-sm:h-10 max-sm:px-2" title={placeholder}>
          <SiriOrb
            size="24px"
            colors={{
              bg: "oklch(22.64% 0 0)",
            }}
          />
        </div>
      </footer>
    </motion.div>
  );
}

export default MorphSurface;
