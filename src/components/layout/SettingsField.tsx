import { type ComponentPropsWithoutRef, type ReactNode } from 'react';

import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface SettingsFieldProps extends ComponentPropsWithoutRef<'div'> {
  label: ReactNode;
  htmlFor?: string;
  description?: ReactNode;
  labelClassName?: string;
  descriptionClassName?: string;
}

export function SettingsField({
  label,
  htmlFor,
  description,
  labelClassName,
  descriptionClassName,
  className,
  children,
  ...props
}: SettingsFieldProps) {
  return (
    <div className={cn('space-y-2', className)} {...props}>
      <Label htmlFor={htmlFor} className={labelClassName}>
        {label}
      </Label>
      {children}
      {description && (
        <p className={cn('text-[10px] text-muted-foreground', descriptionClassName)}>
          {description}
        </p>
      )}
    </div>
  );
}