import { cn } from "@/lib/utils";

interface LoadingStateProps {
  label?: string;
  className?: string;
}

export function LoadingState({ label = "Carregando", className }: LoadingStateProps) {
  return (
    <div role="status" aria-label={label} aria-live="polite" className={cn("flex justify-center", className)}>
      <div
        data-slot="loading-spinner"
        aria-hidden="true"
        className="h-8 w-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"
      />
    </div>
  );
}
