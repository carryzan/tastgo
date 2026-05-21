import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import {
  type DailyRevenueBucket,
  type DashboardKpis,
  type DashboardRanges,
  type HourlyOrdersBucket,
  type ReceivableRow,
  type SourceMixSlice,
  getLocalRanges,
  localDateKey,
  toNumber,
} from './queries'

interface DashboardOrderFact {
  id: string
  created_at: string
  source_id: string
  source_name: string
  source_type: string
  source_settlement_mode: string
  source_logo_url: string | null
  payment_status: string
  effective_net_amount: string | number | null
  effective_net_revenue_to_kitchen: string | number | null
}

async function loadDashboardOrderFacts(
  supabase: SupabaseClient,
  kitchenId: string,
  startIso: string,
  endIso: string,
): Promise<DashboardOrderFact[]> {
  const { data, error } = await supabase
    .rpc('dashboard_order_facts', {
      p_kitchen_id: kitchenId,
      p_start: startIso,
      p_end: endIso,
    })
  if (error) throw new Error(error.message)
  return (data ?? []) as DashboardOrderFact[]
}

export async function fetchDashboardKpis(
  supabase: SupabaseClient,
  kitchenId: string,
  ranges: DashboardRanges,
): Promise<DashboardKpis> {
  const rows = await loadDashboardOrderFacts(
    supabase,
    kitchenId,
    ranges.todayStart,
    ranges.todayEnd
  )
  const orderRevenue = rows.reduce((acc, r) => acc + toNumber(r.effective_net_amount), 0)
  const kitchenRevenue = rows.reduce(
    (acc, r) => acc + toNumber(r.effective_net_revenue_to_kitchen),
    0,
  )
  const orderCount = rows.length
  const avgOrderValue = orderCount > 0 ? orderRevenue / orderCount : 0

  const platformFee = orderRevenue - kitchenRevenue
  return { orderRevenue, kitchenRevenue, platformFee, orderCount, avgOrderValue }
}

export async function fetchHourlyOrders(
  supabase: SupabaseClient,
  kitchenId: string,
  ranges: DashboardRanges,
): Promise<HourlyOrdersBucket[]> {
  const rows = await loadDashboardOrderFacts(
    supabase,
    kitchenId,
    ranges.weekStart,
    ranges.weekEnd
  )

  const buckets: HourlyOrdersBucket[] = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    count: 0,
  }))
  for (const row of rows) {
    const hour = new Date(row.created_at).getHours()
    if (hour >= 0 && hour < 24) buckets[hour].count += 1
  }
  return buckets
}

export async function fetchWeeklyRevenue(
  supabase: SupabaseClient,
  kitchenId: string,
  ranges: DashboardRanges,
): Promise<DailyRevenueBucket[]> {
  const rows = await loadDashboardOrderFacts(
    supabase,
    kitchenId,
    ranges.weekStart,
    ranges.weekEnd
  )

  const byDay = new Map<string, number>()
  for (const row of rows) {
    const key = localDateKey(row.created_at)
    byDay.set(key, (byDay.get(key) ?? 0) + toNumber(row.effective_net_revenue_to_kitchen))
  }

  return ranges.weekDayKeys.map((key, dayIndex) => ({
    dayIndex,
    revenue: byDay.get(key) ?? 0,
  }))
}

export async function fetchSourceMix(
  supabase: SupabaseClient,
  kitchenId: string,
  ranges: DashboardRanges,
): Promise<SourceMixSlice[]> {
  const rows = await loadDashboardOrderFacts(
    supabase,
    kitchenId,
    ranges.todayStart,
    ranges.todayEnd
  )

  const grouped = new Map<string, SourceMixSlice>()
  for (const row of rows) {
    const existing = grouped.get(row.source_id) ?? {
      sourceId: row.source_id,
      sourceName: row.source_name,
      logoUrl: row.source_logo_url,
      count: 0,
      revenue: 0,
    }
    existing.count += 1
    existing.revenue += toNumber(row.effective_net_amount)
    grouped.set(row.source_id, existing)
  }

  return Array.from(grouped.values()).sort((a, b) => b.count - a.count)
}

export async function fetchOfflineRevenue(
  supabase: SupabaseClient,
  kitchenId: string,
  ranges: DashboardRanges,
): Promise<DailyRevenueBucket[]> {
  const rows = await loadDashboardOrderFacts(
    supabase,
    kitchenId,
    ranges.weekStart,
    ranges.weekEnd
  )

  const byDay = new Map<string, number>()
  for (const row of rows) {
    if (row.source_type !== 'offline') continue
    const key = localDateKey(row.created_at)
    byDay.set(key, (byDay.get(key) ?? 0) + toNumber(row.effective_net_revenue_to_kitchen))
  }

  return ranges.weekDayKeys.map((key, dayIndex) => ({
    dayIndex,
    revenue: byDay.get(key) ?? 0,
  }))
}

export async function fetchMarketplaceReceivables(
  supabase: SupabaseClient,
  kitchenId: string,
  ranges: DashboardRanges,
): Promise<ReceivableRow[]> {
  const rows = await loadDashboardOrderFacts(
    supabase,
    kitchenId,
    ranges.monthStart,
    ranges.monthEnd
  )

  const grouped = new Map<string, ReceivableRow>()

  for (const row of rows) {
    if (
      row.payment_status !== 'unpaid' ||
      row.source_settlement_mode !== 'marketplace_receivable'
    ) {
      continue
    }

    const existing =
      grouped.get(row.source_id) ?? {
        sourceId: row.source_id,
        sourceName: row.source_name,
        logoUrl: row.source_logo_url,
        unpaidCount: 0,
        unpaidTotal: 0,
      }

    existing.unpaidCount += 1
    existing.unpaidTotal += toNumber(row.effective_net_amount)
    grouped.set(row.source_id, existing)
  }

  return Array.from(grouped.values()).sort((a, b) => b.unpaidTotal - a.unpaidTotal)
}

// Browser-side entry points (used by useQuery refetch).
export async function fetchDashboardKpisBrowser(
  kitchenId: string,
): Promise<DashboardKpis> {
  return fetchDashboardKpis(createClient(), kitchenId, getLocalRanges())
}

export async function fetchHourlyOrdersBrowser(
  kitchenId: string,
): Promise<HourlyOrdersBucket[]> {
  return fetchHourlyOrders(createClient(), kitchenId, getLocalRanges())
}

export async function fetchWeeklyRevenueBrowser(
  kitchenId: string,
): Promise<DailyRevenueBucket[]> {
  return fetchWeeklyRevenue(createClient(), kitchenId, getLocalRanges())
}

export async function fetchOfflineRevenueBrowser(
  kitchenId: string,
): Promise<DailyRevenueBucket[]> {
  return fetchOfflineRevenue(createClient(), kitchenId, getLocalRanges())
}

export async function fetchMarketplaceReceivablesBrowser(
  kitchenId: string,
): Promise<ReceivableRow[]> {
  return fetchMarketplaceReceivables(createClient(), kitchenId, getLocalRanges())
}

export async function fetchSourceMixBrowser(
  kitchenId: string,
): Promise<SourceMixSlice[]> {
  return fetchSourceMix(createClient(), kitchenId, getLocalRanges())
}
