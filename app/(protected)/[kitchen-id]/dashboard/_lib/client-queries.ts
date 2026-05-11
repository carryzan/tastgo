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

// Refunds reduce revenue by action_amount — not subtracted in v1. Voids fully exclude the order.
async function loadVoidedOrderIds(
  supabase: SupabaseClient,
  kitchenId: string,
  startIso: string,
  endIso: string,
): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('order_actions')
    .select('order_id, created_at, type')
    .eq('kitchen_id', kitchenId)
    .eq('type', 'void')
    .gte('created_at', startIso)
    .lte('created_at', endIso)
  if (error) throw new Error(error.message)
  return new Set((data ?? []).map((r) => r.order_id as string))
}

export async function fetchDashboardKpis(
  supabase: SupabaseClient,
  kitchenId: string,
  ranges: DashboardRanges,
): Promise<DashboardKpis> {
  const [ordersRes, voided] = await Promise.all([
    supabase
      .from('orders')
      .select('id, net_amount, net_revenue_to_kitchen')
      .eq('kitchen_id', kitchenId)
      .gte('created_at', ranges.todayStart)
      .lte('created_at', ranges.todayEnd),
    loadVoidedOrderIds(supabase, kitchenId, ranges.todayStart, ranges.todayEnd),
  ])

  if (ordersRes.error) throw new Error(ordersRes.error.message)

  const rows = (ordersRes.data ?? []).filter((r) => !voided.has(r.id as string))
  const orderRevenue = rows.reduce((acc, r) => acc + toNumber(r.net_amount), 0)
  const kitchenRevenue = rows.reduce(
    (acc, r) => acc + toNumber(r.net_revenue_to_kitchen),
    0,
  )
  const orderCount = rows.length
  const avgOrderValue = orderCount > 0 ? kitchenRevenue / orderCount : 0

  const platformFee = orderRevenue - kitchenRevenue
  return { orderRevenue, kitchenRevenue, platformFee, orderCount, avgOrderValue }
}

export async function fetchHourlyOrders(
  supabase: SupabaseClient,
  kitchenId: string,
  ranges: DashboardRanges,
): Promise<HourlyOrdersBucket[]> {
  const [ordersRes, voided] = await Promise.all([
    supabase
      .from('orders')
      .select('id, created_at')
      .eq('kitchen_id', kitchenId)
      .gte('created_at', ranges.weekStart)
      .lte('created_at', ranges.weekEnd),
    loadVoidedOrderIds(supabase, kitchenId, ranges.weekStart, ranges.weekEnd),
  ])

  if (ordersRes.error) throw new Error(ordersRes.error.message)

  const buckets: HourlyOrdersBucket[] = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    count: 0,
  }))
  for (const row of ordersRes.data ?? []) {
    if (voided.has(row.id as string)) continue
    const hour = new Date(row.created_at as string).getHours()
    if (hour >= 0 && hour < 24) buckets[hour].count += 1
  }
  return buckets
}

export async function fetchWeeklyRevenue(
  supabase: SupabaseClient,
  kitchenId: string,
  ranges: DashboardRanges,
): Promise<DailyRevenueBucket[]> {
  const [ordersRes, voided] = await Promise.all([
    supabase
      .from('orders')
      .select('id, created_at, net_revenue_to_kitchen')
      .eq('kitchen_id', kitchenId)
      .gte('created_at', ranges.weekStart)
      .lte('created_at', ranges.weekEnd),
    loadVoidedOrderIds(supabase, kitchenId, ranges.weekStart, ranges.weekEnd),
  ])

  if (ordersRes.error) throw new Error(ordersRes.error.message)

  const byDay = new Map<string, number>()
  for (const row of ordersRes.data ?? []) {
    if (voided.has(row.id as string)) continue
    const key = localDateKey(row.created_at as string)
    byDay.set(key, (byDay.get(key) ?? 0) + toNumber(row.net_revenue_to_kitchen))
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
  const [ordersRes, voided] = await Promise.all([
    supabase
      .from('orders')
      .select('id, source_id, net_amount, sources!inner(id, name, logo_url)')
      .eq('kitchen_id', kitchenId)
      .gte('created_at', ranges.todayStart)
      .lte('created_at', ranges.todayEnd),
    loadVoidedOrderIds(supabase, kitchenId, ranges.todayStart, ranges.todayEnd),
  ])

  if (ordersRes.error) throw new Error(ordersRes.error.message)

  const grouped = new Map<string, SourceMixSlice>()
  for (const row of (ordersRes.data ?? []) as Array<{
    id: string
    source_id: string
    net_amount: string | number
    sources:
      | { id: string; name: string; logo_url: string | null }
      | { id: string; name: string; logo_url: string | null }[]
      | null
  }>) {
    if (voided.has(row.id)) continue
    const source = Array.isArray(row.sources) ? row.sources[0] : row.sources
    if (!source) continue
    const existing = grouped.get(row.source_id) ?? {
      sourceId: row.source_id,
      sourceName: source.name,
      logoUrl: source.logo_url,
      count: 0,
      revenue: 0,
    }
    existing.count += 1
    existing.revenue += toNumber(row.net_amount)
    grouped.set(row.source_id, existing)
  }

  return Array.from(grouped.values()).sort((a, b) => b.count - a.count)
}

export async function fetchOfflineRevenue(
  supabase: SupabaseClient,
  kitchenId: string,
  ranges: DashboardRanges,
): Promise<DailyRevenueBucket[]> {
  const [ordersRes, voided] = await Promise.all([
    supabase
      .from('orders')
      .select('id, created_at, net_revenue_to_kitchen, sources!inner(id, type)')
      .eq('kitchen_id', kitchenId)
      .eq('sources.type', 'offline')
      .gte('created_at', ranges.weekStart)
      .lte('created_at', ranges.weekEnd),
    loadVoidedOrderIds(supabase, kitchenId, ranges.weekStart, ranges.weekEnd),
  ])

  if (ordersRes.error) throw new Error(ordersRes.error.message)

  const byDay = new Map<string, number>()
  for (const row of ordersRes.data ?? []) {
    if (voided.has(row.id as string)) continue
    const key = localDateKey(row.created_at as string)
    byDay.set(key, (byDay.get(key) ?? 0) + toNumber(row.net_revenue_to_kitchen))
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
  const [ordersRes, voided] = await Promise.all([
    supabase
      .from('orders')
      .select('id, source_id, net_amount, sources!inner(id, name, type, logo_url)')
      .eq('kitchen_id', kitchenId)
      .eq('payment_status', 'unpaid')
      .eq('sources.type', 'online')
      .gte('created_at', ranges.monthStart)
      .lte('created_at', ranges.monthEnd),
    loadVoidedOrderIds(supabase, kitchenId, ranges.monthStart, ranges.monthEnd),
  ])

  if (ordersRes.error) throw new Error(ordersRes.error.message)

  const grouped = new Map<string, ReceivableRow>()

  for (const row of (ordersRes.data ?? []) as Array<{
    id: string
    source_id: string
    net_amount: string | number
    sources:
      | { id: string; name: string; type: string; logo_url: string | null }
      | { id: string; name: string; type: string; logo_url: string | null }[]
      | null
  }>) {
    if (voided.has(row.id)) continue
    const source = Array.isArray(row.sources) ? row.sources[0] : row.sources
    if (!source) continue

    const existing =
      grouped.get(row.source_id) ?? {
        sourceId: row.source_id,
        sourceName: source.name,
        logoUrl: source.logo_url,
        unpaidCount: 0,
        unpaidTotal: 0,
      }

    existing.unpaidCount += 1
    existing.unpaidTotal += toNumber(row.net_amount)
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

