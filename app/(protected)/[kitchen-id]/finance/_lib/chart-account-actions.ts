'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

interface CreateChartAccountData {
  code: string
  name: string
  account_type:
    | 'asset'
    | 'liability'
    | 'equity'
    | 'revenue'
    | 'expense'
    | 'contra_revenue'
    | 'cost_of_goods_sold'
  normal_balance: 'debit' | 'credit'
  parent_account_id?: string | null
}

interface UpdateChartAccountData {
  name?: string
  parent_account_id?: string | null
  is_active?: boolean
}

export async function createChartAccount(
  kitchenId: string,
  data: CreateChartAccountData
) {
  const supabase = await createClient()
  const { error } = await supabase.from('chart_of_accounts').insert({
    kitchen_id: kitchenId,
    code: data.code,
    name: data.name,
    account_type: data.account_type,
    normal_balance: data.normal_balance,
    parent_account_id: data.parent_account_id ?? null,
  })
  if (error) return new Error(error.message)
  revalidatePath(`/${kitchenId}/cash`)
}

export async function updateChartAccount(
  kitchenId: string,
  accountId: string,
  data: UpdateChartAccountData
) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('chart_of_accounts')
    .update(data)
    .eq('id', accountId)
    .eq('kitchen_id', kitchenId)
  if (error) return new Error(error.message)
  revalidatePath(`/${kitchenId}/cash`)
}

export async function deleteChartAccount(
  kitchenId: string,
  accountId: string
) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('chart_of_accounts')
    .delete()
    .eq('id', accountId)
    .eq('kitchen_id', kitchenId)
  if (error) return new Error(error.message)
  revalidatePath(`/${kitchenId}/cash`)
}
