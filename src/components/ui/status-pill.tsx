import { type LucideIcon } from 'lucide-react';

import { Badge, type BadgeProps } from './badge';
import { cn } from '@/lib/utils';

type StatusPillTone = 'success' | 'warning' | 'destructive' | 'neutral';

interface StatusPillProps extends Omit<BadgeProps, 'variant'> {
  tone?: StatusPillTone;
  icon?: LucideIcon;
  iconClassName?: string;
}

const toneToBadgeVariant: Record<StatusPillTone, BadgeProps['variant']> = {
  success: 'success',
  warning: 'warning',
  destructive: 'destructive',
  neutral: 'secondary',
};

export function StatusPill({
  tone = 'neutral',
  icon: Icon,
  iconClassName,
  className,
  children,
  ...props
}: StatusPillProps) {
  return (
    <Badge
      variant={toneToBadgeVariant[tone]}
      className={cn('w-fit gap-1 px-2 py-1 font-medium', className)}
      {...props}
    >
      {Icon && <Icon aria-hidden="true" className={cn('h-3 w-3', iconClassName)} />}
      {children}
    </Badge>
  );
}