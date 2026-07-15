import { type ComponentPropsWithoutRef, type ReactNode } from 'react';
import { type LucideIcon } from 'lucide-react';

import { CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface IconCardTitleProps extends ComponentPropsWithoutRef<typeof CardTitle> {
  icon: LucideIcon;
  children: ReactNode;
  iconClassName?: string;
  size?: 'base' | 'lg';
}

export function IconCardTitle({
  icon: Icon,
  iconClassName,
  size = 'lg',
  className,
  children,
  ...props
}: IconCardTitleProps) {
  return (
    <CardTitle
      className={cn(
        'flex items-center gap-2',
        size === 'base' ? 'text-base font-bold' : 'text-lg',
        className,
      )}
      {...props}
    >
      <Icon aria-hidden="true" className={cn('h-5 w-5 text-primary', iconClassName)} />
      {children}
    </CardTitle>
  );
}
