import { formatCpf } from '@/lib/publicPortalSecurity';

export function formatCpfInputValue(value: string): string {
  return formatCpf(value);
}
