import { type ComponentPropsWithoutRef, type ReactNode } from 'react';
import { type LucideIcon } from 'lucide-react';

import { DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface IconDialogTitleProps extends ComponentPropsWithoutRef<typeof DialogTitle> {
  icon: LucideIcon;
  children: ReactNode;
  iconClassName?: string;
}

export function IconDialogTitle({
  icon: Icon,
  iconClassName,
  className,
  children,
  ...props
}: IconDialogTitleProps) {
  return (
    <DialogTitle
      className={cn('font-display text-xl font-bold flex items-center gap-2 text-foreground', className)}
      {...props}
    >
      <Icon aria-hidden="true" className={cn('h-5 w-5 text-primary', iconClassName)} />
      {children}
    </DialogTitle>
  );
}
