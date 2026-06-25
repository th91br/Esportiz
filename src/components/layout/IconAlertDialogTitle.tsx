import { type ComponentPropsWithoutRef, type ReactNode } from 'react';
import { type LucideIcon } from 'lucide-react';

import { AlertDialogTitle } from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

interface IconAlertDialogTitleProps extends ComponentPropsWithoutRef<typeof AlertDialogTitle> {
  icon: LucideIcon;
  children: ReactNode;
  iconClassName?: string;
}

export function IconAlertDialogTitle({
  icon: Icon,
  iconClassName,
  className,
  children,
  ...props
}: IconAlertDialogTitleProps) {
  return (
    <AlertDialogTitle className={cn('flex items-center gap-2 text-xl font-bold', className)} {...props}>
      <Icon aria-hidden="true" className={cn('h-6 w-6 text-destructive shrink-0', iconClassName)} />
      {children}
    </AlertDialogTitle>
  );
}
