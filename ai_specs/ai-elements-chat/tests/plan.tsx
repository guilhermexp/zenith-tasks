"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { ChevronsUpDownIcon } from "lucide-react";
import type { ComponentProps } from "react";
import { createContext, useContext } from "react";
import { Shimmer } from "./shimmer";

type PlanContextValue = {
  isStreaming: boolean;
};

const PlanContext = createContext<PlanContextValue | null>(null);

const usePlan = () => {
  const context = useContext(PlanContext);
  if (!context) {
    throw new Error("Plan components must be used within Plan");
  }
  return context;
};

export type PlanProps = ComponentProps<typeof Collapsible> & {
  isStreaming?: boolean;
};

export const Plan = ({
  className,
  isStreaming = false,
  children,
  ...props
}: PlanProps) => (
  <PlanContext.Provider value={{ isStreaming }}>
    <Collapsible asChild data-slot="plan" {...props}>
      <Card className={cn("shadow-none", className)}>{children}</Card>
    </Collapsible>
  </PlanContext.Provider>
);

export type PlanHeaderProps = ComponentProps<typeof CardHeader>;

export const PlanHeader = ({ className, ...props }: PlanHeaderProps) => (
  <CardHeader
    className={cn("flex items-start justify-between", className)}
    data-slot="plan-header"
    {...props}
  />
);

export type PlanTitleProps = Omit<
  ComponentProps<typeof CardTitle>,
  "children"
> & {
  children: string;
};

export const PlanTitle = ({ children, ...props }: PlanTitleProps) => {
  const { isStreaming } = usePlan();

  return (
    <CardTitle data-slot="plan-title" {...props}>
      {isStreaming ? <Shimmer>{children}</Shimmer> : children}
    </CardTitle>
  );
};

export type PlanDescriptionProps = Omit<
  ComponentProps<typeof CardDescription>,
  "children"
> & {
  children: string;
};

export const PlanDescription = ({
  className,
  children,
  ...props
}: PlanDescriptionProps) => {
  const { isStreaming } = usePlan();

  return (
    <CardDescription
      className={cn("text-balance", className)}
      data-slot="plan-description"
      {...props}
    >
      {isStreaming ? <Shimmer>{children}</Shimmer> : children}
    </CardDescription>
  );
};

export type PlanActionProps = ComponentProps<typeof CardAction>;

export const PlanAction = (props: PlanActionProps) => (
  <CardAction data-slot="plan-action" {...props} />
);

export type PlanContentProps = ComponentProps<typeof CardContent>;

export const PlanContent = (props: PlanContentProps) => (
  <CollapsibleContent asChild>
    <CardContent data-slot="plan-content" {...props} />
  </CollapsibleContent>
);

export type PlanFooterProps = ComponentProps<"div">;

export const PlanFooter = (props: PlanFooterProps) => (
  <CardFooter data-slot="plan-footer" {...props} />
);

export type PlanTriggerProps = ComponentProps<typeof CollapsibleTrigger>;

export const PlanTrigger = ({ className, ...props }: PlanTriggerProps) => (
  <CollapsibleTrigger asChild>
    <Button
      className={cn("size-8", className)}
      data-slot="plan-trigger"
      size="icon"
      variant="ghost"
      {...props}
    >
      <ChevronsUpDownIcon className="size-4" />
      <span className="sr-only">Toggle plan</span>
    </Button>
  </CollapsibleTrigger>
);

// PlanStep with status indicators
export type PlanStepStatus = "pending" | "in-progress" | "completed" | "failed";

export type PlanStepProps = ComponentProps<"div"> & {
  title: string;
  status: PlanStepStatus;
  description?: string;
  substeps?: Array<{ title: string; status: PlanStepStatus }>;
};

const statusConfig = {
  pending: {
    color: "text-neutral-600",
    bgColor: "bg-neutral-800/30",
    icon: "○",
  },
  "in-progress": {
    color: "text-blue-400",
    bgColor: "bg-blue-900/20",
    icon: "◐",
  },
  completed: {
    color: "text-green-400",
    bgColor: "bg-green-900/20",
    icon: "✓",
  },
  failed: {
    color: "text-red-400",
    bgColor: "bg-red-900/20",
    icon: "✗",
  },
};

export const PlanStep = ({
  title,
  status,
  description,
  substeps,
  className,
  ...props
}: PlanStepProps) => {
  const config = statusConfig[status];

  return (
    <div
      className={cn(
        "flex flex-col gap-2 p-3 rounded-md border",
        config.bgColor,
        "border-neutral-800",
        className
      )}
      {...props}
    >
      <div className="flex items-start gap-2">
        <span className={cn("text-lg font-mono", config.color)}>{config.icon}</span>
        <div className="flex-1">
          <h4 className={cn("font-medium text-sm", config.color)}>{title}</h4>
          {description && (
            <p className="text-xs text-neutral-500 mt-1">{description}</p>
          )}
        </div>
      </div>

      {substeps && substeps.length > 0 && (
        <div className="ml-6 space-y-1 border-l-2 border-neutral-800 pl-3">
          {substeps.map((substep, index) => {
            const subConfig = statusConfig[substep.status];
            return (
              <div key={index} className="flex items-center gap-2 text-xs">
                <span className={cn("font-mono", subConfig.color)}>
                  {subConfig.icon}
                </span>
                <span className={subConfig.color}>{substep.title}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
