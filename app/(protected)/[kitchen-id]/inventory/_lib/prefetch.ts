import { DEFAULT_SERVER_TABLE_PAGE_SIZE } from '@/lib/constants'
import { getQueryClient } from '@/lib/query-client'
import { createClient } from '@/lib/supabase/server'
import {
  INVENTORY_QUERY_KEY,
  INVENTORY_FROM,
  INVENTORY_SELECT,
} from './queries'

export async function prefetchInventoryItems(kitchenId: string) {
  const queryClient = getQueryClient()
  const supabase = await createClient()

  await queryClient.prefetchQuery({
    queryKey: [
      ...INVENTORY_QUERY_KEY,
      kitchenId,
      {
        sorting: [{ id: 'created_at', desc: true }],
        filters: [],
        search: '',
        pagination: {
          pageIndex: 0,
          pageSize: DEFAULT_SERVER_TABLE_PAGE_SIZE,
        },
      },
    ],
    queryFn: async () => {
      const { data, error, count } = await supabase
        .from(INVENTORY_FROM)
        .select(INVENTORY_SELECT, { count: 'exact' })
        .eq('kitchen_id', kitchenId)
        .order('created_at', { ascending: false })
        .range(0, DEFAULT_SERVER_TABLE_PAGE_SIZE - 1)

      if (error) throw error
      return { rows: data ?? [], rowCount: count ?? 0 }
    },
  })

  return queryClient
}