import { DEFAULT_SERVER_TABLE_PAGE_SIZE } from '@/lib/constants'
import { getQueryClient } from '@/lib/query-client'
import { createClient } from '@/lib/supabase/server'
import {
  MENU_ITEMS_QUERY_KEY,
  MENU_ITEMS_FROM,
  MENU_ITEMS_SELECT,
  MODIFIER_GROUPS_QUERY_KEY,
  MODIFIER_GROUPS_FROM,
  MODIFIER_GROUPS_SELECT,
  COMBOS_QUERY_KEY,
  COMBOS_FROM,
  COMBOS_SELECT,
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

export async function prefetchMenuTabs(kitchenId: string) {
  const queryClient = getQueryClient()
  const supabase = await createClient()

  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: [...MENU_ITEMS_QUERY_KEY, kitchenId, DEFAULT_STATE],
      queryFn: async () => {
        const { data, error, count } = await supabase
          .from(MENU_ITEMS_FROM)
          .select(MENU_ITEMS_SELECT, { count: 'exact' })
          .eq('kitchen_id', kitchenId)
          .order('created_at', { ascending: false })
          .range(0, DEFAULT_SERVER_TABLE_PAGE_SIZE - 1)

        if (error) throw error
        return { rows: data ?? [], rowCount: count ?? 0 }
      },
    }),

    queryClient.prefetchQuery({
      queryKey: [...MODIFIER_GROUPS_QUERY_KEY, kitchenId, DEFAULT_STATE],
      queryFn: async () => {
        const { data, error, count } = await supabase
          .from(MODIFIER_GROUPS_FROM)
          .select(MODIFIER_GROUPS_SELECT, { count: 'exact' })
          .eq('kitchen_id', kitchenId)
          .order('created_at', { ascending: false })
          .range(0, DEFAULT_SERVER_TABLE_PAGE_SIZE - 1)

        if (error) throw error
        return { rows: data ?? [], rowCount: count ?? 0 }
      },
    }),

    queryClient.prefetchQuery({
      queryKey: [...COMBOS_QUERY_KEY, kitchenId, DEFAULT_STATE],
      queryFn: async () => {
        const { data, error, count } = await supabase
          .from(COMBOS_FROM)
          .select(COMBOS_SELECT, { count: 'exact' })
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
