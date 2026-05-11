import { getQueryClient } from '@/lib/query-client'
import { createClient } from '@/lib/supabase/server'
import {
  fetchDashboardKpis,
  fetchHourlyOrders,
  fetchMarketplaceReceivables,
  fetchOfflineRevenue,
  fetchSourceMix,
  fetchWeeklyRevenue,
} from './client-queries'
import {
  DASHBOARD_HOURLY_QUERY_KEY,
  DASHBOARD_KPIS_QUERY_KEY,
  DASHBOARD_OFFLINE_REVENUE_QUERY_KEY,
  DASHBOARD_RECEIVABLES_QUERY_KEY,
  DASHBOARD_SOURCE_MIX_QUERY_KEY,
  DASHBOARD_WEEKLY_REVENUE_QUERY_KEY,
  getLocalRanges,
} from './queries'

export async function prefetchDashboard(kitchenId: string) {
  const queryClient = getQueryClient()
  const supabase = await createClient()
  const ranges = getLocalRanges()

  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: [...DASHBOARD_KPIS_QUERY_KEY, kitchenId, ranges.dayKey],
      queryFn: () => fetchDashboardKpis(supabase, kitchenId, ranges),
    }),
    queryClient.prefetchQuery({
      queryKey: [...DASHBOARD_HOURLY_QUERY_KEY, kitchenId, ranges.dayKey],
      queryFn: () => fetchHourlyOrders(supabase, kitchenId, ranges),
    }),
    queryClient.prefetchQuery({
      queryKey: [...DASHBOARD_WEEKLY_REVENUE_QUERY_KEY, kitchenId, ranges.dayKey],
      queryFn: () => fetchWeeklyRevenue(supabase, kitchenId, ranges),
    }),
    queryClient.prefetchQuery({
      queryKey: [...DASHBOARD_SOURCE_MIX_QUERY_KEY, kitchenId, ranges.dayKey],
      queryFn: () => fetchSourceMix(supabase, kitchenId, ranges),
    }),
    queryClient.prefetchQuery({
      queryKey: [...DASHBOARD_RECEIVABLES_QUERY_KEY, kitchenId, ranges.monthKey],
      queryFn: () => fetchMarketplaceReceivables(supabase, kitchenId, ranges),
    }),
    queryClient.prefetchQuery({
      queryKey: [...DASHBOARD_OFFLINE_REVENUE_QUERY_KEY, kitchenId, ranges.dayKey],
      queryFn: () => fetchOfflineRevenue(supabase, kitchenId, ranges),
    }),
  ])

  return queryClient
}
