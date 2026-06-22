import { type ComponentPropsWithoutRef } from 'react';

import { cn } from '@/lib/utils';

export function SettingsGroupTitle({ className, ...props }: ComponentPropsWithoutRef<'h3'>) {
  return <h3 className={cn('text-sm font-semibold text-foreground', className)} {...props} />;
}