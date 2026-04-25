import { createClient } from '@/lib/supabase/client'

export interface SettlementAccountPick {
  id: string
  code: string
  name: string
  account_type: string
}

export async function fetchSettlementAccounts(
  kitchenId: string
): Promise<SettlementAccountPick[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('chart_of_accounts')
    .select('id, code, name, account_type')
    .eq('kitchen_id', kitchenId)
    .eq('is_active', true)
    .eq('account_type', 'asset')
    .order('code', { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []) as SettlementAccountPick[]
}
