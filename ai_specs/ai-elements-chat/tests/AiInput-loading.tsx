// Extracted from src/components/ui/AiInput.tsx - Loading Section
// This shows how loading state is rendered using AI Elements

import { Loader } from "@/components/ai-elements/loader"
import { Shimmer } from "@/components/ai-elements/shimmer"

// Loading indicator structure:
/*
{isLoading && (
  <div className="flex justify-start px-4">
    <Loader />
  </div>
)}
*/

// Key changes from old implementation:
// 1. Replaced custom loading dots (3 bouncing divs) with Loader component
// 2. Removed bg-neutral-900/60 wrapper
// 3. Kept flex justify-start for left alignment
// 4. Added px-4 for horizontal padding to match conversation content

// Old implementation (removed):
/*
{isLoading && (
  <div className="flex justify-start">
    <div className="bg-neutral-900/60 text-neutral-300 border border-neutral-800/60 px-3 py-2 rounded-lg text-sm">
      <div className="flex space-x-1">
        <div className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce"></div>
        <div className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce delay-100"></div>
        <div className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce delay-200"></div>
      </div>
    </div>
  </div>
)}
*/
