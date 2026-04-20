import { DEFAULT_SERVER_TABLE_PAGE_SIZE } from '@/lib/constants'
import { getQueryClient } from '@/lib/query-client'
import { createClient } from '@/lib/supabase/server'
import {
  CHART_ACCOUNTS_QUERY_KEY,
  CHART_ACCOUNTS_FROM,
  CHART_ACCOUNTS_SELECT,
  DRAWER_SESSIONS_QUERY_KEY,
  DRAWER_SESSIONS_FROM,
  DRAWER_SESSIONS_SELECT,
  JOURNAL_ENTRIES_QUERY_KEY,
  JOURNAL_ENTRIES_FROM,
  JOURNAL_ENTRIES_SELECT,
  ACCOUNTING_PERIODS_QUERY_KEY,
  ACCOUNTING_PERIODS_FROM,
  ACCOUNTING_PERIODS_SELECT,
} from './queries'

const COA_DEFAULT_STATE = {
  sorting: [{ id: 'code', desc: false }],
  filters: [],
  search: '',
  pagination: { pageIndex: 0, pageSize: DEFAULT_SERVER_TABLE_PAGE_SIZE },
}

const DRAWER_DEFAULT_STATE = {
  sorting: [{ id: 'opened_at', desc: true }],
  filters: [],
  search: '',
  pagination: { pageIndex: 0, pageSize: DEFAULT_SERVER_TABLE_PAGE_SIZE },
}

const JOURNAL_DEFAULT_STATE = {
  sorting: [{ id: 'entry_date', desc: true }],
  filters: [],
  search: '',
  pagination: { pageIndex: 0, pageSize: DEFAULT_SERVER_TABLE_PAGE_SIZE },
}

const PERIODS_DEFAULT_STATE = {
  sorting: [{ id: 'start_date', desc: true }],
  filters: [],
  search: '',
  pagination: { pageIndex: 0, pageSize: DEFAULT_SERVER_TABLE_PAGE_SIZE },
}

export async function prefetchCashTabs(kitchenId: string) {
  const queryClient = getQueryClient()
  const supabase = await createClient()

  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: [...CHART_ACCOUNTS_QUERY_KEY, kitchenId, COA_DEFAULT_STATE],
      queryFn: async () => {
        const { data, error, count } = await supabase
          .from(CHART_ACCOUNTS_FROM)
          .select(CHART_ACCOUNTS_SELECT, { count: 'exact' })
          .eq('kitchen_id', kitchenId)
          .order('code', { ascending: true })
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

    queryClient.prefetchQuery({
      queryKey: [...JOURNAL_ENTRIES_QUERY_KEY, kitchenId, JOURNAL_DEFAULT_STATE],
      queryFn: async () => {
        const { data, error, count } = await supabase
          .from(JOURNAL_ENTRIES_FROM)
          .select(JOURNAL_ENTRIES_SELECT, { count: 'exact' })
          .eq('kitchen_id', kitchenId)
          .order('entry_date', { ascending: false })
          .range(0, DEFAULT_SERVER_TABLE_PAGE_SIZE - 1)
        if (error) throw error
        return { rows: data ?? [], rowCount: count ?? 0 }
      },
    }),

    queryClient.prefetchQuery({
      queryKey: [
        ...ACCOUNTING_PERIODS_QUERY_KEY,
        kitchenId,
        PERIODS_DEFAULT_STATE,
      ],
      queryFn: async () => {
        const { data, error, count } = await supabase
          .from(ACCOUNTING_PERIODS_FROM)
          .select(ACCOUNTING_PERIODS_SELECT, { count: 'exact' })
          .eq('kitchen_id', kitchenId)
          .order('start_date', { ascending: false })
          .range(0, DEFAULT_SERVER_TABLE_PAGE_SIZE - 1)
        if (error) throw error
        return { rows: data ?? [], rowCount: count ?? 0 }
      },
    }),
  ])

  return queryClient
}
