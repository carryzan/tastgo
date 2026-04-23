import { DEFAULT_SERVER_TABLE_PAGE_SIZE } from '@/lib/constants'
import { getQueryClient } from '@/lib/query-client'
import { createClient } from '@/lib/supabase/server'
import {
  STOCK_COUNT_SESSIONS_FROM,
  STOCK_COUNT_SESSIONS_QUERY_KEY,
  STOCK_COUNT_SESSIONS_SELECT,
  WASTE_LEDGER_FROM,
  WASTE_LEDGER_QUERY_KEY,
  WASTE_LEDGER_SELECT,
} from './queries'

const STOCK_COUNT_SESSIONS_DEFAULT_STATE = {
  sorting: [{ id: 'created_at', desc: true }],
  filters: [],
  search: '',
  pagination: {
    pageIndex: 0,
    pageSize: DEFAULT_SERVER_TABLE_PAGE_SIZE,
  },
}

const WASTE_LEDGER_DEFAULT_STATE = {
  sorting: [{ id: 'created_at', desc: true }],
  filters: [],
  search: '',
  pagination: {
    pageIndex: 0,
    pageSize: DEFAULT_SERVER_TABLE_PAGE_SIZE,
  },
}

export async function prefetchStockControlTabs(kitchenId: string) {
  const queryClient = getQueryClient()
  const supabase = await createClient()

  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: [
        ...STOCK_COUNT_SESSIONS_QUERY_KEY,
        kitchenId,
        STOCK_COUNT_SESSIONS_DEFAULT_STATE,
      ],
      queryFn: async () => {
        const { data, error, count } = await supabase
          .from(STOCK_COUNT_SESSIONS_FROM)
          .select(STOCK_COUNT_SESSIONS_SELECT, { count: 'exact' })
          .eq('kitchen_id', kitchenId)
          .order('created_at', { ascending: false })
          .range(0, DEFAULT_SERVER_TABLE_PAGE_SIZE - 1)

        if (error) throw error
        return { rows: data ?? [], rowCount: count ?? 0 }
      },
    }),
    queryClient.prefetchQuery({
      queryKey: [
        ...WASTE_LEDGER_QUERY_KEY,
        kitchenId,
        WASTE_LEDGER_DEFAULT_STATE,
      ],
      queryFn: async () => {
        const { data, error, count } = await supabase
          .from(WASTE_LEDGER_FROM)
          .select(WASTE_LEDGER_SELECT, { count: 'exact' })
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
