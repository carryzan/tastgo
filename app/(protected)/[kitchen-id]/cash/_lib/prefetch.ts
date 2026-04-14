import { DEFAULT_SERVER_TABLE_PAGE_SIZE } from '@/lib/constants'
import { getQueryClient } from '@/lib/query-client'
import { createClient } from '@/lib/supabase/server'
import {
  CASH_ACCOUNTS_QUERY_KEY,
  CASH_ACCOUNTS_FROM,
  CASH_ACCOUNTS_SELECT,
  CASH_TRANSACTIONS_QUERY_KEY,
  CASH_TRANSACTIONS_FROM,
  CASH_TRANSACTIONS_SELECT,
  DRAWER_SESSIONS_QUERY_KEY,
  DRAWER_SESSIONS_FROM,
  DRAWER_SESSIONS_SELECT,
} from './queries'

const DEFAULT_STATE = {
  sorting: [{ id: 'created_at', desc: true }],
  filters: [],
  search: '',
  pagination: {
    pageIndex: 0,
    pageSize: DEFAULT_SERVER_TABLE_PAGE_SIZE,
  },
}

const DRAWER_DEFAULT_STATE = {
  sorting: [{ id: 'opened_at', desc: true }],
  filters: [],
  search: '',
  pagination: {
    pageIndex: 0,
    pageSize: DEFAULT_SERVER_TABLE_PAGE_SIZE,
  },
}

export async function prefetchCashTabs(kitchenId: string) {
  const queryClient = getQueryClient()
  const supabase = await createClient()

  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: [...CASH_ACCOUNTS_QUERY_KEY, kitchenId, DEFAULT_STATE],
      queryFn: async () => {
        const { data, error, count } = await supabase
          .from(CASH_ACCOUNTS_FROM)
          .select(CASH_ACCOUNTS_SELECT, { count: 'exact' })
          .eq('kitchen_id', kitchenId)
          .order('created_at', { ascending: false })
          .range(0, DEFAULT_SERVER_TABLE_PAGE_SIZE - 1)

        if (error) throw error
        return { rows: data ?? [], rowCount: count ?? 0 }
      },
    }),

    queryClient.prefetchQuery({
      queryKey: [...CASH_TRANSACTIONS_QUERY_KEY, kitchenId, DEFAULT_STATE],
      queryFn: async () => {
        const { data, error, count } = await supabase
          .from(CASH_TRANSACTIONS_FROM)
          .select(CASH_TRANSACTIONS_SELECT, { count: 'exact' })
          .eq('kitchen_id', kitchenId)
          .order('created_at', { ascending: false })
          .range(0, DEFAULT_SERVER_TABLE_PAGE_SIZE - 1)

        if (error) throw error
        return { rows: data ?? [], rowCount: count ?? 0 }
      },
    }),

    queryClient.prefetchQuery({
      queryKey: [...DRAWER_SESSIONS_QUERY_KEY, kitchenId, DRAWER_DEFAULT_STATE],
      queryFn: async () => {
        const { data, error, count } = await supabase
          .from(DRAWER_SESSIONS_FROM)
          .select(DRAWER_SESSIONS_SELECT, { count: 'exact' })
          .eq('kitchen_id', kitchenId)
          .order('opened_at', { ascending: false })
          .range(0, DEFAULT_SERVER_TABLE_PAGE_SIZE - 1)

        if (error) throw error
        return { rows: data ?? [], rowCount: count ?? 0 }
      },
    }),
  ])

  return queryClient
}
