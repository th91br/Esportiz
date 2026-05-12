/**
 * Helper to get the current date in YYYY-MM-DD format using the local timezone.
 * This avoids the bug where `new Date().toISOString().split('T')[0]` returns tomorrow's date 
 * after 21:00 in UTC-3 (Brazil).
 */
export function getLocalTodayDate(): string {
  return toLocalDateString(new Date());
}

/**
 * Helper to convert any Date object into YYYY-MM-DD using the local timezone.
 */
export function toLocalDateString(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
