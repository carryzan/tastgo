import { createClient } from '@/lib/supabase/client'

export interface CashAccountPick {
  id: string
  name: string
  current_balance: string | number
  is_active: boolean
}

export interface CashAccountTransaction {
  id: string
  type: 'deposit' | 'withdrawal' | 'transfer'
  amount: string | number
  reason: string | null
  source_type: string | null
  transfer_to_account_id: string | null
  transfer_to_account: { id: string; name: string } | null
  created_by: string
  created_member: { id: string; profiles: { full_name: string } | null } | null
  created_at: string
}

export interface DrawerTransaction {
  id: string
  type: 'cash_in' | 'cash_out' | 'payout' | 'cash_drop' | 'no_sale' | 'close'
  amount: string | number
  reason: string | null
  source_type: string | null
  created_by: string
  created_member: { id: string; profiles: { full_name: string } | null } | null
  created_at: string
}

export async function fetchActiveCashAccounts(
  kitchenId: string
): Promise<CashAccountPick[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('cash_accounts')
    .select('id, name, current_balance, is_active')
    .eq('kitchen_id', kitchenId)
    .eq('is_active', true)
    .order('name')
  if (error) throw new Error(error.message)
  return (data ?? []) as CashAccountPick[]
}

export async function fetchCashAccountTransactions(
  accountId: string
): Promise<CashAccountTransaction[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('cash_account_transactions')
    .select(
      'id, type, amount, reason, source_type, transfer_to_account_id, transfer_to_account:cash_accounts!transfer_to_account_id(id, name), created_by, created_member:kitchen_members!created_by(id, profiles(full_name)), created_at'
    )
    .eq('cash_account_id', accountId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as unknown as CashAccountTransaction[]
}

export async function fetchDrawerSessionTransactions(
  sessionId: string
): Promise<DrawerTransaction[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('cash_drawer_transactions')
    .select(
      'id, type, amount, reason, source_type, created_by, created_member:kitchen_members!created_by(id, profiles(full_name)), created_at'
    )
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as unknown as DrawerTransaction[]
}
