import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  progress?: {
    value: number;
    label?: string;
  };
  variant?: 'default' | 'primary' | 'success' | 'warning';
}

export function StatCard({
  title,
  value,
  icon: Icon,
  description,
  trend,
  progress,
  variant = 'default',
}: StatCardProps) {
  const variants = {
    default: 'bg-card',
    primary: 'bg-gradient-hero text-white',
    success: 'bg-success text-success-foreground',
    warning: 'bg-warning text-warning-foreground',
  };

  const iconVariants = {
    default: 'bg-primary/10 text-primary',
    primary: 'bg-white/20 text-white',
    success: 'bg-white/20 text-white',
    warning: 'bg-white/20 text-white',
  };

  return (
    <div
      className={cn(
        'card-interactive p-5 md:p-6',
        variants[variant],
        variant === 'default' && 'border border-border/50'
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2 w-full">
          <p
            className={cn(
              'text-sm font-medium',
              variant === 'default' ? 'text-muted-foreground' : 'opacity-90'
            )}
          >
            {title}
          </p>
          <p className="stat-value">{value}</p>
          {description && !progress && (
            <p
              className={cn(
                'text-sm',
                variant === 'default' ? 'text-muted-foreground' : 'opacity-80'
              )}
            >
              {description}
            </p>
          )}
          {trend && (
            <div className="flex items-center gap-1 text-sm">
              <span
                className={cn(
                  'font-semibold',
                  trend.isPositive ? 'text-success' : 'text-destructive'
                )}
              >
                {trend.isPositive ? '+' : '-'}{Math.abs(trend.value)}%
              </span>
              <span className="opacity-70">vs semana anterior</span>
            </div>
          )}
          {progress && (
            <div className="mt-4 pt-2">
              <div className="flex justify-between items-center text-xs mb-1.5">
                <span className={cn(variant === 'default' ? 'text-muted-foreground' : 'opacity-80')}>{progress.label || 'Progresso'}</span>
                <span className="font-semibold">{Math.round(progress.value)}%</span>
              </div>
              <div className="h-1.5 w-full bg-muted/30 rounded-full overflow-hidden">
                <div 
                  className={cn("h-full rounded-full transition-all duration-500", variant === 'default' ? 'bg-primary' : 'bg-white')} 
                  style={{ width: `${Math.min(100, Math.max(0, progress.value))}%` }}
                />
              </div>
            </div>
          )}
        </div>
        <div
          className={cn(
            'flex h-12 w-12 shrink-0 ml-4 items-center justify-center rounded-xl',
            iconVariants[variant]
          )}
        >
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}
