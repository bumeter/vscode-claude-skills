// Numbers and times the way the desktop app writes them.
import { t } from './strings';

/** 950, 12.4K, 216K, 3.4M */
export function compact(n: number): string {
  if (n < 1_000) return String(Math.round(n));
  if (n < 100_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  if (n < 1_000_000) return `${Math.round(n / 1_000)}K`;
  return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
}

/** "today", "yesterday", "3 days", "never". */
export function ago(iso: string | null, now = Date.now()): string {
  if (!iso) return t('never');
  const days = Math.floor((startOfDay(now) - startOfDay(Date.parse(iso))) / 86_400_000);
  if (days <= 0) return t('today');
  if (days === 1) return t('yesterday');
  return t('daysAgo', { n: days });
}

const startOfDay = (ms: number) => { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); };
