import { type ReactNode } from 'react';

export function AppProvider({ children }: { children: ReactNode }) {
  // AppProvider is now just a pass-through since state is managed by React Query
  return <>{children}</>;
}
