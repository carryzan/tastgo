'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentKitchenMemberId } from '@/lib/supabase/queries/membership'

export interface OpeningBalance {
  id: string
  quantity: number
  unit_cost: number
  batch_id: string
  as_of_date: string
  has_ledger_entries: boolean
}

type OpeningBalanceTarget =
  | {
      itemType: 'inventory_item'
      inventoryItemId: string
    }
  | {
      itemType: 'production_recipe'
      productionRecipeId: string
    }

async function getOpeningBalance(
  kitchenId: string,
  target: OpeningBalanceTarget
) {
  const supabase = await createClient()
  let query = supabase
    .from('inventory_opening_balances')
    .select('id, quantity, unit_cost, batch_id, as_of_date')
    .eq('kitchen_id', kitchenId)
    .eq('item_type', target.itemType)

  query =
    target.itemType === 'inventory_item'
      ? query.eq('inventory_item_id', target.inventoryItemId)
      : query.eq('production_recipe_id', target.productionRecipeId)

  const { data, error } = await query.maybeSingle()
  if (error) return new Error(error.message)
  if (!data) return null

  const { count, error: ledgerError } = await supabase
    .from('inventory_batch_ledger_entries')
    .select('id', { count: 'exact', head: true })
    .eq('batch_id', data.batch_id)
  if (ledgerError) return new Error(ledgerError.message)

  return { ...data, has_ledger_entries: (count ?? 0) > 0 } as OpeningBalance
}

export async function getItemOpeningBalance(
  kitchenId: string,
  inventoryItemId: string
) {
  return getOpeningBalance(kitchenId, {
    itemType: 'inventory_item',
    inventoryItemId,
  })
}

export async function getProductionRecipeOpeningBalance(
  kitchenId: string,
  productionRecipeId: string
) {
  return getOpeningBalance(kitchenId, {
    itemType: 'production_recipe',
    productionRecipeId,
  })
}

export async function createOpeningBalance(data: {
  kitchen_id: string
  inventory_item_id?: string
  production_recipe_id?: string
  quantity: number
  unit_cost: number
  as_of_date: string
  created_by?: string
}) {
  const supabase = await createClient()
  const createdBy = await getCurrentKitchenMemberId(data.kitchen_id)
  const itemType = data.production_recipe_id
    ? 'production_recipe'
    : 'inventory_item'

  const { error } = await supabase.from('inventory_opening_balances').insert({
    kitchen_id: data.kitchen_id,
    item_type: itemType,
    inventory_item_id: data.inventory_item_id ?? null,
    production_recipe_id: data.production_recipe_id ?? null,
    quantity: data.quantity,
    unit_cost: data.unit_cost,
    as_of_date: data.as_of_date,
    created_by: createdBy,
  })
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
