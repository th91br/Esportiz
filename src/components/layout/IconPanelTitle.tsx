import { type ComponentPropsWithoutRef, type ReactNode } from 'react';
import { type LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

interface IconPanelTitleProps extends ComponentPropsWithoutRef<'h3'> {
  icon: LucideIcon;
  children: ReactNode;
  iconClassName?: string;
}

export function IconPanelTitle({
  icon: Icon,
  iconClassName,
  className,
  children,
  ...props
}: IconPanelTitleProps) {
  return (
    <h3
      className={cn(
        'font-display font-bold text-lg text-foreground flex items-center gap-2 md:text-xl',
        className,
      )}
      {...props}
    >
      <Icon aria-hidden="true" className={cn('h-5 w-5 text-primary', iconClassName)} />
      {children}
    </h3>
  );
}
