import { type ComponentPropsWithoutRef, type ReactNode } from 'react';
import { type LucideIcon } from 'lucide-react';

import { CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface SettingsCardHeaderProps extends Omit<ComponentPropsWithoutRef<typeof CardHeader>, 'title'> {
  icon: LucideIcon;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  iconClassName?: string;
  titleClassName?: string;
  descriptionClassName?: string;
}

export function SettingsCardHeader({
  icon: Icon,
  title,
  description,
  action,
  iconClassName,
  titleClassName,
  descriptionClassName,
  className,
  ...props
}: SettingsCardHeaderProps) {
  return (
    <CardHeader
      className={cn(
        action && 'flex flex-col gap-3 space-y-0 sm:flex-row sm:items-start sm:justify-between',
        className,
      )}
      {...props}
    >
      <div className="min-w-0 space-y-1">
        <CardTitle className={cn('flex items-center gap-2 text-lg', titleClassName)}>
          <Icon aria-hidden="true" className={cn('h-5 w-5 text-primary', iconClassName)} />
          {title}
        </CardTitle>
        {description && <CardDescription className={descriptionClassName}>{description}</CardDescription>}
      </div>
      {action}
    </CardHeader>
  );
}
