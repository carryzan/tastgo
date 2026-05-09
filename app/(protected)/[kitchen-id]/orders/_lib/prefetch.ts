import { QueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/server'
import {
  ORDERS_FROM,
  ORDERS_QUERY_KEY,
  ORDERS_SELECT,
} from './queries'

export async function prefetchOrders(kitchenId: string) {
  const queryClient = new QueryClient()
  const supabase = await createClient()

  await queryClient.prefetchQuery({
    queryKey: [
      ...ORDERS_QUERY_KEY,
      kitchenId,
      {
        sorting: [{ id: 'created_at', desc: true }],
        filters: [],
        search: '',
        pagination: { pageIndex: 0, pageSize: 50 },
      },
    ],
    queryFn: async () => {
      const { data, count, error } = await supabase
        .from(ORDERS_FROM)
        .select(ORDERS_SELECT, { count: 'exact' })
        .eq('kitchen_id', kitchenId)
        .order('created_at', { ascending: false })
        .range(0, 49)

      if (error) throw error
      return { rows: data ?? [], rowCount: count ?? 0 }
    },
  })

  return queryClient
}
