import {
  endOfDay,
  endOfMonth,
  startOfDay,
  startOfMonth,
  subDays,
} from 'date-fns'

export const DASHBOARD_KPIS_QUERY_KEY = ['dashboard', 'kpis'] as const
export const DASHBOARD_HOURLY_QUERY_KEY = ['dashboard', 'hourly'] as const
export const DASHBOARD_RECEIVABLES_QUERY_KEY = ['dashboard', 'receivables'] as const
export const DASHBOARD_WEEKLY_REVENUE_QUERY_KEY = ['dashboard', 'weekly-revenue'] as const
export const DASHBOARD_SOURCE_MIX_QUERY_KEY = ['dashboard', 'source-mix'] as const
export const DASHBOARD_OFFLINE_REVENUE_QUERY_KEY = ['dashboard', 'offline-revenue'] as const

export interface DashboardKpis {
  orderRevenue: number
  kitchenRevenue: number
  platformFee: number
  orderCount: number
  avgOrderValue: number
}

export interface HourlyOrdersBucket {
  hour: number
  count: number
}

export interface DailyRevenueBucket {
  dayIndex: number
  revenue: number
}

export interface SourceMixSlice {
  sourceId: string
  sourceName: string
  logoUrl: string | null
  count: number
  revenue: number
}

export interface ReceivableRow {
  sourceId: string
  sourceName: string
  logoUrl: string | null
  unpaidCount: number
  unpaidTotal: number
}

export interface DashboardRanges {
  dayKey: string
  monthKey: string
  todayStart: string
  todayEnd: string
  weekStart: string
  weekEnd: string
  monthStart: string
  monthEnd: string
  weekDayKeys: string[]
}

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function getLocalRanges(now: Date = new Date()): DashboardRanges {
  const today = startOfDay(now)
  const todayEnd = endOfDay(now)
  const weekStart = startOfDay(subDays(now, 6))
  const monthStart = startOfMonth(now)
  const monthEnd = endOfMonth(now)

  const weekDayKeys: string[] = []
  for (let i = 6; i >= 0; i--) {
    weekDayKeys.push(ymd(subDays(today, i)))
  }

  return {
    dayKey: ymd(today),
    monthKey: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`,
    todayStart: today.toISOString(),
    todayEnd: todayEnd.toISOString(),
    weekStart: weekStart.toISOString(),
    weekEnd: todayEnd.toISOString(),
    monthStart: monthStart.toISOString(),
    monthEnd: monthEnd.toISOString(),
    weekDayKeys,
  }
}

export function toNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0
  const n = typeof value === 'string' ? Number(value) : value
  return Number.isFinite(n) ? n : 0
}

export function localDateKey(iso: string): string {
  return ymd(new Date(iso))
}

const compactFormatter = new Intl.NumberFormat(undefined, {
  notation: 'compact',
  maximumFractionDigits: 1,
})

export function formatCompact(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return '0'
  const n = typeof value === 'string' ? Number(value) : value
  if (!Number.isFinite(n)) return '0'
  if (Math.abs(n) < 1000) {
    return n % 1 === 0 ? n.toString() : n.toFixed(1)
  }
  return compactFormatter.format(n)
}

export const CHART_PALETTE = [
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
  'var(--chart-1)',
] as const
