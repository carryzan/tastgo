import { createClient } from '@/lib/supabase/server'

export interface ServicePeriod {
  id: string
  kitchen_id: string
  name: string
  is_active: boolean
  created_at: string
}

export async function getServicePeriods(
  kitchenId: string
): Promise<ServicePeriod[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('production_service_periods')
    .select('*')
    .eq('kitchen_id', kitchenId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as ServicePeriod[]
}
