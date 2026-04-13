import { DEFAULT_SERVER_TABLE_PAGE_SIZE } from '@/lib/constants'
import { getQueryClient } from '@/lib/query-client'
import { createClient } from '@/lib/supabase/server'
import {
  RECIPES_QUERY_KEY,
  RECIPES_FROM,
  RECIPES_SELECT,
  BATCHES_QUERY_KEY,
  BATCHES_FROM,
  BATCHES_SELECT,
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

export async function prefetchProductionTabs(kitchenId: string) {
  const queryClient = getQueryClient()
  const supabase = await createClient()

  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: [...RECIPES_QUERY_KEY, kitchenId, DEFAULT_STATE],
      queryFn: async () => {
        const { data, error, count } = await supabase
          .from(RECIPES_FROM)
          .select(RECIPES_SELECT, { count: 'exact' })
          .eq('kitchen_id', kitchenId)
          .order('created_at', { ascending: false })
          .range(0, DEFAULT_SERVER_TABLE_PAGE_SIZE - 1)

        if (error) throw error
        return { rows: data ?? [], rowCount: count ?? 0 }
      },
    }),

    queryClient.prefetchQuery({
      queryKey: [...BATCHES_QUERY_KEY, kitchenId, DEFAULT_STATE],
      queryFn: async () => {
        const { data, error, count } = await supabase
          .from(BATCHES_FROM)
          .select(BATCHES_SELECT, { count: 'exact' })
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
