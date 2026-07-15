import { type ReactNode, useId } from 'react';
import { cn } from '@/lib/utils';

interface SettingsSectionProps {
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  asideClassName?: string;
}

export function SettingsSection({
  title,
  description,
  children,
  className,
  contentClassName,
  asideClassName,
}: SettingsSectionProps) {
  const titleId = useId();

  return (
    <section aria-labelledby={titleId} className={cn('grid gap-6 md:grid-cols-3', className)}>
      <div className={cn('md:col-span-1 space-y-1', asideClassName)}>
        <h2 id={titleId} className="font-medium">
          {title}
        </h2>
        {description && (
          <p className="text-sm text-muted-foreground">
            {description}
          </p>
        )}
      </div>

      <div className={cn('md:col-span-2', contentClassName)}>
        {children}
      </div>
    </section>
  );
}
