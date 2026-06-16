import { type ReactNode } from 'react';
import { Header } from '@/components/Header';
import { cn } from '@/lib/utils';

interface AppPageProps {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}

export function AppPage({ children, className, contentClassName }: AppPageProps) {
  return (
    <div className={cn('min-h-screen bg-background', className)}>
      <Header />
      <main className={cn('container py-6 md:py-8 space-y-6', contentClassName)}>
        {children}
      </main>
    </div>
  );
}
