import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

interface EmptyStateProps {
  title: ReactNode;
  description?: ReactNode;
  icon?: LucideIcon;
  action?: ReactNode;
  variant?: "plain" | "outlined";
  className?: string;
}

export function EmptyState({ title, description, icon: Icon, action, variant = "plain", className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "text-center text-muted-foreground",
        variant === "outlined" && "rounded-xl border border-dashed border-border/60 bg-muted/10",
        className,
      )}
    >
      {Icon && <Icon aria-hidden="true" className="mx-auto mb-3 h-12 w-12 opacity-30" />}
      <p className="font-medium">{title}</p>
      {description && <p className="mt-1 text-sm">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
