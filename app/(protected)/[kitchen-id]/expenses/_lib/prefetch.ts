import { DEFAULT_SERVER_TABLE_PAGE_SIZE } from '@/lib/constants'
import { getQueryClient } from '@/lib/query-client'
import { createClient } from '@/lib/supabase/server'
import {
  EXPENSE_RECORDS_QUERY_KEY,
  EXPENSE_RECORDS_FROM,
  EXPENSE_RECORDS_SELECT,
  EXPENSE_CATEGORIES_QUERY_KEY,
  EXPENSE_CATEGORIES_FROM,
  EXPENSE_CATEGORIES_SELECT,
  EXPENSE_RECURRING_QUERY_KEY,
  EXPENSE_RECURRING_FROM,
  EXPENSE_RECURRING_SELECT,
} from './queries'

const RECORDS_DEFAULT_STATE = {
  sorting: [{ id: 'expense_date', desc: true }],
  filters: [],
  search: '',
  pagination: {
    pageIndex: 0,
    pageSize: DEFAULT_SERVER_TABLE_PAGE_SIZE,
  },
}

const CATEGORIES_DEFAULT_STATE = {
  sorting: [{ id: 'name', desc: false }],
  filters: [],
  search: '',
  pagination: {
    pageIndex: 0,
    pageSize: DEFAULT_SERVER_TABLE_PAGE_SIZE,
  },
}

const RECURRING_DEFAULT_STATE = {
  sorting: [{ id: 'next_due_date', desc: false }],
  filters: [],
  search: '',
  pagination: {
    pageIndex: 0,
    pageSize: DEFAULT_SERVER_TABLE_PAGE_SIZE,
  },
}

export async function prefetchExpenseTabs(kitchenId: string) {
  const queryClient = getQueryClient()
  const supabase = await createClient()

  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: [...EXPENSE_RECORDS_QUERY_KEY, kitchenId, RECORDS_DEFAULT_STATE],
      queryFn: async () => {
        const { data, error, count } = await supabase
          .from(EXPENSE_RECORDS_FROM)
          .select(EXPENSE_RECORDS_SELECT, { count: 'exact' })
          .eq('kitchen_id', kitchenId)
          .order('expense_date', { ascending: false })
          .range(0, DEFAULT_SERVER_TABLE_PAGE_SIZE - 1)
        if (error) throw error
        return { rows: data ?? [], rowCount: count ?? 0 }
      },
    }),
    queryClient.prefetchQuery({
      queryKey: [...EXPENSE_CATEGORIES_QUERY_KEY, kitchenId, CATEGORIES_DEFAULT_STATE],
      queryFn: async () => {
        const { data, error, count } = await supabase
          .from(EXPENSE_CATEGORIES_FROM)
          .select(EXPENSE_CATEGORIES_SELECT, { count: 'exact' })
          .eq('kitchen_id', kitchenId)
          .order('name', { ascending: true })
          .range(0, DEFAULT_SERVER_TABLE_PAGE_SIZE - 1)
        if (error) throw error
        return { rows: data ?? [], rowCount: count ?? 0 }
      },
    }),
    queryClient.prefetchQuery({
      queryKey: [...EXPENSE_RECURRING_QUERY_KEY, kitchenId, RECURRING_DEFAULT_STATE],
      queryFn: async () => {
        const { data, error, count } = await supabase
          .from(EXPENSE_RECURRING_FROM)
          .select(EXPENSE_RECURRING_SELECT, { count: 'exact' })
          .eq('kitchen_id', kitchenId)
          .order('next_due_date', { ascending: true })
          .range(0, DEFAULT_SERVER_TABLE_PAGE_SIZE - 1)
        if (error) throw error
        return { rows: data ?? [], rowCount: count ?? 0 }
      },
    }),
  ])

  return queryClient
}
