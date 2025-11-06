"use client";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { BookIcon, ChevronDownIcon } from "lucide-react";
import type { ComponentProps } from "react";

export type SourcesProps = ComponentProps<"div">;

export const Sources = ({ className, ...props }: SourcesProps) => (
  <Collapsible
    className={cn("not-prose mb-4 text-primary text-xs", className)}
    {...props}
  />
);

export type SourcesTriggerProps = ComponentProps<typeof CollapsibleTrigger> & {
  count: number;
};

export const SourcesTrigger = ({
  className,
  count,
  children,
  ...props
}: SourcesTriggerProps) => (
  <CollapsibleTrigger
    className={cn("flex items-center gap-2", className)}
    {...props}
  >
    {children ?? (
      <>
        <p className="font-medium">Used {count} sources</p>
        <ChevronDownIcon className="h-4 w-4" />
      </>
    )}
  </CollapsibleTrigger>
);

export type SourcesContentProps = ComponentProps<typeof CollapsibleContent>;

export const SourcesContent = ({
  className,
  ...props
}: SourcesContentProps) => (
  <CollapsibleContent
    className={cn(
      "mt-3 flex w-fit flex-col gap-2",
      "data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 outline-none data-[state=closed]:animate-out data-[state=open]:animate-in",
      className
    )}
    {...props}
  />
);

export type SourceProps = ComponentProps<"a"> & {
  excerpt?: string;
};

export const Source = ({ href, title, excerpt, children, ...props }: SourceProps) => (
  <a
    className={cn(
      "flex flex-col gap-1 p-3 rounded-md border border-neutral-800 bg-neutral-900/30 hover:bg-neutral-800/40 transition-colors",
      "text-neutral-300 hover:text-neutral-100"
    )}
    href={href}
    rel="noreferrer"
    target="_blank"
    {...props}
  >
    {children ?? (
      <>
        <div className="flex items-center gap-2">
          <BookIcon className="h-4 w-4 shrink-0" />
          <span className="font-medium text-sm">{title}</span>
        </div>
        {excerpt && (
          <p className="text-xs text-neutral-500 line-clamp-2 mt-1">{excerpt}</p>
        )}
        {href && (
          <span className="text-xs text-neutral-600 truncate">{href}</span>
        )}
      </>
    )}
  </a>
);
