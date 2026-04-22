import { createClient } from '@/lib/supabase/client'

export interface ExpenseCategoryPick {
  id: string
  name: string
  is_active: boolean
  expense_account_id: string | null
}

export interface StaffMemberPick {
  id: string
  full_name: string
  role: string | null
  is_active: boolean
}

export interface ChartAccountPick {
  id: string
  code: string
  name: string
  is_active: boolean
}

export async function fetchExpenseCategories(
  kitchenId: string
): Promise<ExpenseCategoryPick[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('expense_categories')
    .select('id, name, is_active, expense_account_id')
    .eq('kitchen_id', kitchenId)
    .order('name')
  if (error) throw new Error(error.message)
  return (data ?? []) as ExpenseCategoryPick[]
}

export async function fetchActiveExpenseCategories(
  kitchenId: string
): Promise<ExpenseCategoryPick[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('expense_categories')
    .select('id, name, is_active, expense_account_id')
    .eq('kitchen_id', kitchenId)
    .eq('is_active', true)
    .order('name')
  if (error) throw new Error(error.message)
  return (data ?? []) as ExpenseCategoryPick[]
}

export async function fetchActiveExpenseAccounts(
  kitchenId: string
): Promise<ChartAccountPick[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('chart_of_accounts')
    .select('id, code, name, is_active')
    .eq('kitchen_id', kitchenId)
    .eq('account_type', 'expense')
    .eq('is_active', true)
    .order('code')
  if (error) throw new Error(error.message)
  return (data ?? []) as ChartAccountPick[]
}

export async function fetchActiveSettlementAccounts(
  kitchenId: string
): Promise<ChartAccountPick[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('chart_of_accounts')
    .select('id, code, name, is_active')
    .eq('kitchen_id', kitchenId)
    .eq('account_type', 'asset')
    .eq('is_active', true)
    .order('code')
  if (error) throw new Error(error.message)
  return (data ?? []) as ChartAccountPick[]
}

export async function fetchActiveStaffMembers(
  kitchenId: string
): Promise<StaffMemberPick[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('staff_members')
    .select('id, full_name, role, is_active')
    .eq('kitchen_id', kitchenId)
    .eq('is_active', true)
    .order('full_name')
  if (error) throw new Error(error.message)
  return (data ?? []) as StaffMemberPick[]
}
