import { type ReactNode } from 'react';
import { type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  icon?: LucideIcon;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({ title, description, icon: Icon, actions, className }: PageHeaderProps) {
  return (
    <div className={cn('flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4', className)}>
      <div>
        <h1 className="text-3xl font-display font-bold flex items-center gap-2">
          {Icon && <Icon aria-hidden="true" className="h-7 w-7 text-primary" />}
          {title}
        </h1>
        {description && (
          <p className="text-muted-foreground mt-1">
            {description}
          </p>
        )}
      </div>

      {actions && (
        <div className="w-full sm:w-auto sm:shrink-0 [&>*]:w-full sm:[&>*]:w-auto [&_button]:w-full sm:[&_button]:w-auto">
          {actions}
        </div>
      )}
    </div>
  );
}
