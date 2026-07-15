/**
 * Shared currency formatting helper. Uses the browser's locale by default
 * so dollar symbols/varying thousands separators render naturally per the
 * user's environment.
 */
export function formatCurrency(amount: number, withSign = false): string {
  const formatted = new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
  }).format(Math.abs(amount));
  return withSign ? (amount < 0 ? `−${formatted}` : `+${formatted}`) : formatted;
}
