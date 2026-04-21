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
        'card-interactive p-4 sm:p-5',
        variants[variant],
        variant === 'default' && 'border border-border/50'
      )}
    >
      <div className="flex items-start justify-between mb-2 sm:mb-3">
        <p
          className={cn(
            'text-xs font-medium pr-2 mt-0.5 line-clamp-2',
            variant === 'default' ? 'text-muted-foreground' : 'opacity-90'
          )}
        >
          {title}
        </p>
        <div
          className={cn(
            'flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg sm:rounded-xl',
            iconVariants[variant]
          )}
        >
          <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
        </div>
      </div>
      
      <div className="space-y-1">
        <p className="stat-value text-xl min-[400px]:text-2xl lg:text-3xl font-extrabold tracking-tight" title={String(value)}>
          {value}
        </p>
        
        {description && !progress && (
          <p
            className={cn(
              'text-[10px] sm:text-xs leading-tight',
              variant === 'default' ? 'text-muted-foreground' : 'opacity-80'
            )}
            title={description}
          >
            {description}
          </p>
        )}
        
        {trend && (
          <div className="flex items-center gap-1 text-[10px] sm:text-sm">
            <span
              className={cn(
                'font-semibold',
                trend.isPositive ? 'text-success' : 'text-destructive'
              )}
            >
              {trend.isPositive ? '+' : '-'}{Math.abs(trend.value)}%
            </span>
            <span className="opacity-70 truncate">vs semana anterior</span>
          </div>
        )}
        
        {progress && (
          <div className="mt-3 sm:mt-4 pt-1 sm:pt-2">
            <div className="flex justify-between items-center text-[10px] sm:text-xs mb-1.5">
              <span className={cn('truncate mr-2', variant === 'default' ? 'text-muted-foreground' : 'opacity-80')}>
                {progress.label || 'Progresso'}
              </span>
              <span className="font-semibold shrink-0">{Math.round(progress.value)}%</span>
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
    </div>
  );
}
