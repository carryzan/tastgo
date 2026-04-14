import { DEFAULT_SERVER_TABLE_PAGE_SIZE } from '@/lib/constants'
import { getQueryClient } from '@/lib/query-client'
import { createClient } from '@/lib/supabase/server'
import {
  SUPPLIERS_QUERY_KEY,
  SUPPLIERS_FROM,
  SUPPLIERS_SELECT,
  PURCHASES_QUERY_KEY,
  PURCHASES_FROM,
  PURCHASES_SELECT,
  PAYMENTS_QUERY_KEY,
  PAYMENTS_FROM,
  PAYMENTS_SELECT,
  RETURNS_QUERY_KEY,
  RETURNS_FROM,
  RETURNS_SELECT,
  CREDIT_NOTES_QUERY_KEY,
  CREDIT_NOTES_FROM,
  CREDIT_NOTES_SELECT,
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

export async function prefetchProcurementTabs(kitchenId: string) {
  const queryClient = getQueryClient()
  const supabase = await createClient()

  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: [...SUPPLIERS_QUERY_KEY, kitchenId, DEFAULT_STATE],
      queryFn: async () => {
        const { data, error, count } = await supabase
          .from(SUPPLIERS_FROM)
          .select(SUPPLIERS_SELECT, { count: 'exact' })
          .eq('kitchen_id', kitchenId)
          .order('created_at', { ascending: false })
          .range(0, DEFAULT_SERVER_TABLE_PAGE_SIZE - 1)
        if (error) throw error
        return { rows: data ?? [], rowCount: count ?? 0 }
      },
    }),

    queryClient.prefetchQuery({
      queryKey: [...PURCHASES_QUERY_KEY, kitchenId, DEFAULT_STATE],
      queryFn: async () => {
        const { data, error, count } = await supabase
          .from(PURCHASES_FROM)
          .select(PURCHASES_SELECT, { count: 'exact' })
          .eq('kitchen_id', kitchenId)
          .order('created_at', { ascending: false })
          .range(0, DEFAULT_SERVER_TABLE_PAGE_SIZE - 1)
        if (error) throw error
        return { rows: data ?? [], rowCount: count ?? 0 }
      },
    }),

    queryClient.prefetchQuery({
      queryKey: [...PAYMENTS_QUERY_KEY, kitchenId, DEFAULT_STATE],
      queryFn: async () => {
        const { data, error, count } = await supabase
          .from(PAYMENTS_FROM)
          .select(PAYMENTS_SELECT, { count: 'exact' })
          .eq('kitchen_id', kitchenId)
          .order('created_at', { ascending: false })
          .range(0, DEFAULT_SERVER_TABLE_PAGE_SIZE - 1)
        if (error) throw error
        return { rows: data ?? [], rowCount: count ?? 0 }
      },
    }),

    queryClient.prefetchQuery({
      queryKey: [...RETURNS_QUERY_KEY, kitchenId, DEFAULT_STATE],
      queryFn: async () => {
        const { data, error, count } = await supabase
          .from(RETURNS_FROM)
          .select(RETURNS_SELECT, { count: 'exact' })
          .eq('kitchen_id', kitchenId)
          .order('created_at', { ascending: false })
          .range(0, DEFAULT_SERVER_TABLE_PAGE_SIZE - 1)
        if (error) throw error
        return { rows: data ?? [], rowCount: count ?? 0 }
      },
    }),

    queryClient.prefetchQuery({
      queryKey: [...CREDIT_NOTES_QUERY_KEY, kitchenId, DEFAULT_STATE],
      queryFn: async () => {
        const { data, error, count } = await supabase
          .from(CREDIT_NOTES_FROM)
          .select(CREDIT_NOTES_SELECT, { count: 'exact' })
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
