import { DEFAULT_SERVER_TABLE_PAGE_SIZE } from '@/lib/constants'
import { getQueryClient } from '@/lib/query-client'
import { createClient } from '@/lib/supabase/server'
import {
  STAFF_MEMBERS_QUERY_KEY,
  STAFF_MEMBERS_FROM,
  STAFF_MEMBERS_SELECT,
  WORK_SHIFTS_QUERY_KEY,
  WORK_SHIFTS_FROM,
  WORK_SHIFTS_SELECT,
  SHIFT_ASSIGNMENTS_QUERY_KEY,
  SHIFT_ASSIGNMENTS_FROM,
  SHIFT_ASSIGNMENTS_SELECT,
} from './queries'

const STAFF_DEFAULT_STATE = {
  sorting: [{ id: 'full_name', desc: false }],
  filters: [],
  search: '',
  pagination: {
    pageIndex: 0,
    pageSize: DEFAULT_SERVER_TABLE_PAGE_SIZE,
  },
}

const SHIFTS_DEFAULT_STATE = {
  sorting: [{ id: 'start_time', desc: true }],
  filters: [],
  search: '',
  pagination: {
    pageIndex: 0,
    pageSize: DEFAULT_SERVER_TABLE_PAGE_SIZE,
  },
}

const ASSIGNMENTS_DEFAULT_STATE = {
  sorting: [{ id: 'created_at', desc: true }],
  filters: [],
  search: '',
  pagination: {
    pageIndex: 0,
    pageSize: DEFAULT_SERVER_TABLE_PAGE_SIZE,
  },
}

export async function prefetchStaffTabs(kitchenId: string) {
  const queryClient = getQueryClient()
  const supabase = await createClient()

  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: [...STAFF_MEMBERS_QUERY_KEY, kitchenId, STAFF_DEFAULT_STATE],
      queryFn: async () => {
        const { data, error, count } = await supabase
          .from(STAFF_MEMBERS_FROM)
          .select(STAFF_MEMBERS_SELECT, { count: 'exact' })
          .eq('kitchen_id', kitchenId)
          .order('full_name', { ascending: true })
          .range(0, DEFAULT_SERVER_TABLE_PAGE_SIZE - 1)
        if (error) throw error
        return { rows: data ?? [], rowCount: count ?? 0 }
      },
    }),
    queryClient.prefetchQuery({
      queryKey: [...WORK_SHIFTS_QUERY_KEY, kitchenId, SHIFTS_DEFAULT_STATE],
      queryFn: async () => {
        const { data, error, count } = await supabase
          .from(WORK_SHIFTS_FROM)
          .select(WORK_SHIFTS_SELECT, { count: 'exact' })
          .eq('kitchen_id', kitchenId)
          .order('start_time', { ascending: false })
          .range(0, DEFAULT_SERVER_TABLE_PAGE_SIZE - 1)
        if (error) throw error
        return { rows: data ?? [], rowCount: count ?? 0 }
      },
    }),
    queryClient.prefetchQuery({
      queryKey: [...SHIFT_ASSIGNMENTS_QUERY_KEY, kitchenId, ASSIGNMENTS_DEFAULT_STATE],
      queryFn: async () => {
        const { data, error, count } = await supabase
          .from(SHIFT_ASSIGNMENTS_FROM)
          .select(SHIFT_ASSIGNMENTS_SELECT, { count: 'exact' })
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
