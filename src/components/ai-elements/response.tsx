"use client";

import { cn } from "@/lib/utils";
import { type ComponentProps, memo } from "react";
import { Streamdown } from "streamdown";

type ResponseProps = ComponentProps<typeof Streamdown>;

export const Response = memo(
  ({ className, ...props }: ResponseProps) => (
    <Streamdown
      className={cn(
        "size-full text-base leading-relaxed [&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
        "[&_p]:text-base [&_li]:text-base [&_h1]:text-2xl [&_h2]:text-xl [&_h3]:text-lg",
        className
      )}
      {...props}
    />
  ),
  (prevProps, nextProps) => prevProps.children === nextProps.children
);

Response.displayName = "Response";
