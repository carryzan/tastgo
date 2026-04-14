'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export interface OpeningBalance {
  id: string
  quantity: number
  unit_cost: number
  batch_id: string
  as_of_date: string
  has_ledger_entries: boolean
}

export async function getItemOpeningBalance(
  kitchenId: string,
  inventoryItemId: string
) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('inventory_opening_balances')
    .select('id, quantity, unit_cost, batch_id, as_of_date')
    .eq('kitchen_id', kitchenId)
    .eq('inventory_item_id', inventoryItemId)
    .maybeSingle()
  if (error) return new Error(error.message)
  if (!data) return null

  const { count, error: le } = await supabase
    .from('inventory_batch_ledger_entries')
    .select('id', { count: 'exact', head: true })
    .eq('batch_id', data.batch_id)
  if (le) return new Error(le.message)

  return { ...data, has_ledger_entries: (count ?? 0) > 0 } as OpeningBalance
}

export async function createOpeningBalance(data: {
  kitchen_id: string
  inventory_item_id: string
  quantity: number
  unit_cost: number
  as_of_date: string
  created_by: string
}) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('inventory_opening_balances')
    .insert({ ...data, item_type: 'inventory_item' })
  if (error) return new Error(error.message)
  revalidatePath('/[kitchen-id]', 'layout')
}

export async function deleteOpeningBalance(id: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('inventory_opening_balances')
    .delete()
    .eq('id', id)
  if (error) return new Error(error.message)
  revalidatePath('/[kitchen-id]', 'layout')
}
