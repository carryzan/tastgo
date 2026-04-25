import { DEFAULT_SERVER_TABLE_PAGE_SIZE } from '@/lib/constants'
import { getQueryClient } from '@/lib/query-client'
import { createClient } from '@/lib/supabase/server'
import {
  OFFLINE_SETTLEMENTS_FROM,
  OFFLINE_SETTLEMENTS_QUERY_KEY,
  OFFLINE_SETTLEMENTS_SELECT,
  ONLINE_SETTLEMENTS_FROM,
  ONLINE_SETTLEMENTS_QUERY_KEY,
  ONLINE_SETTLEMENTS_SELECT,
} from './queries'

const ONLINE_SETTLEMENTS_DEFAULT_STATE = {
  sorting: [{ id: 'created_at', desc: true }],
  filters: [],
  search: '',
  pagination: {
    pageIndex: 0,
    pageSize: DEFAULT_SERVER_TABLE_PAGE_SIZE,
  },
}

const OFFLINE_SETTLEMENTS_DEFAULT_STATE = {
  sorting: [{ id: 'created_at', desc: true }],
  filters: [],
  search: '',
  pagination: {
    pageIndex: 0,
    pageSize: DEFAULT_SERVER_TABLE_PAGE_SIZE,
  },
}

export async function prefetchSettlementTabs(kitchenId: string) {
  const queryClient = getQueryClient()
  const supabase = await createClient()

  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: [
        ...ONLINE_SETTLEMENTS_QUERY_KEY,
        kitchenId,
        ONLINE_SETTLEMENTS_DEFAULT_STATE,
      ],
      queryFn: async () => {
        const { data, error, count } = await supabase
          .from(ONLINE_SETTLEMENTS_FROM)
          .select(ONLINE_SETTLEMENTS_SELECT, { count: 'exact' })
          .eq('kitchen_id', kitchenId)
          .order('created_at', { ascending: false })
          .range(0, DEFAULT_SERVER_TABLE_PAGE_SIZE - 1)

        if (error) throw error
        return { rows: data ?? [], rowCount: count ?? 0 }
      },
    }),
    queryClient.prefetchQuery({
      queryKey: [
        ...OFFLINE_SETTLEMENTS_QUERY_KEY,
        kitchenId,
        OFFLINE_SETTLEMENTS_DEFAULT_STATE,
      ],
      queryFn: async () => {
        const { data, error, count } = await supabase
          .from(OFFLINE_SETTLEMENTS_FROM)
          .select(OFFLINE_SETTLEMENTS_SELECT, { count: 'exact' })
          .eq('kitchen_id', kitchenId)
          .order('created_at', { ascending: false })
          .range(0, DEFAULT_SERVER_TABLE_PAGE_SIZE - 1)

        if (error) throw error
        return { rows: data ?? [], rowCount: count ?? 0 }
      },
    }),
  ])

  return queryClient
}
