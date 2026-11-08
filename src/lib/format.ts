import type { Locale } from '@/lib/i18n';

export function formatDZD(amount: number, locale: Locale = 'ar'): string {
  const n = Number.isFinite(amount) ? amount : 0;
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-DZ' : 'fr-DZ', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);
}

export function formatCurrency(amount: number, locale: Locale = 'ar'): string {
  const suffix = locale === 'ar' ? 'دج' : 'DZD';
  return `${formatDZD(amount, locale)} ${suffix}`;
}

export function formatCurrencyShort(amount: number, locale: Locale = 'ar'): string {
  const n = Number.isFinite(amount) ? amount : 0;
  const suffix = locale === 'ar' ? 'دج' : 'DZD';
  if (locale === 'fr') {
    if (Math.abs(n) >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)} Md DZD`;
    if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(2)} M DZD`;
    if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)} k DZD`;
    return `${n} DZD`;
  }
  if (Math.abs(n) >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)} مليار دج`;
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(2)} مليون دج`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)} ألف دج`;
  return `${n} ${suffix}`;
}

export function formatDate(iso: string | undefined, locale: Locale = 'ar'): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-DZ' : 'fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(d);
}

export function formatDateShort(iso: string | undefined, locale: Locale = 'ar'): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-DZ' : 'fr-FR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

export function daysUntil(iso?: string): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86_400_000);
}

export function relativeDeadline(
  iso: string | undefined,
  locale: Locale = 'ar',
): { label: string; tone: 'danger' | 'warning' | 'ok' | 'none' } {
  const days = daysUntil(iso);
  if (days === null) return { label: '—', tone: 'none' };
  if (locale === 'fr') {
    if (days < 0) return { label: `En retard ${Math.abs(days)} j`, tone: 'danger' };
    if (days === 0) return { label: "Aujourd'hui", tone: 'danger' };
    if (days <= 30) return { label: `Dans ${days} j`, tone: 'warning' };
    return { label: `Dans ${days} j`, tone: 'ok' };
  }
  if (days < 0) return { label: `متأخر ${Math.abs(days)} يوم`, tone: 'danger' };
  if (days === 0) return { label: 'اليوم', tone: 'danger' };
  if (days <= 7) return { label: `بعد ${days} أيام`, tone: 'warning' };
  if (days <= 30) return { label: `بعد ${days} يوماً`, tone: 'warning' };
  return { label: `بعد ${days} يوماً`, tone: 'ok' };
}

export function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export function nowISO(): string {
  return new Date().toISOString();
}

export function cls(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}
