'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function createOnlineSettlement(
  kitchenId: string,
  sourceId: string,
  periodStart: string,
  periodEnd: string
) {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('create_online_settlement', {
    p_kitchen_id: kitchenId,
    p_source_id: sourceId,
    p_period_start: periodStart,
    p_period_end: periodEnd,
  })

  if (error) return new Error(error.message)
  revalidatePath('/[kitchen-id]', 'layout')
  return data as string
}

export async function addOnlineSettlementOrder(
  kitchenId: string,
  settlementId: string,
  orderId: string
) {
  const supabase = await createClient()
  const { error } = await supabase.from('online_settlement_orders').insert({
    kitchen_id: kitchenId,
    online_settlement_id: settlementId,
    order_id: orderId,
  })

  if (error) return new Error(error.message)
  revalidatePath('/[kitchen-id]', 'layout')
}

export async function removeOnlineSettlementOrder(
  kitchenId: string,
  allocationId: string
) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('online_settlement_orders')
    .delete()
    .eq('kitchen_id', kitchenId)
    .eq('id', allocationId)

  if (error) return new Error(error.message)
  revalidatePath('/[kitchen-id]', 'layout')
}

export async function completeOnlineSettlement(
  kitchenId: string,
  settlementId: string,
  actualDeposit: number,
  settlementAccountId: string
) {
  const supabase = await createClient()
  const { error } = await supabase.rpc('complete_online_settlement', {
    p_kitchen_id: kitchenId,
    p_settlement_id: settlementId,
    p_actual_deposit: actualDeposit,
    p_settlement_account_id: settlementAccountId,
  })

  if (error) return new Error(error.message)
  revalidatePath('/[kitchen-id]', 'layout')
}

export async function reverseOnlineSettlement(
  kitchenId: string,
  settlementId: string,
  reason: string
) {
  const supabase = await createClient()
  const { error } = await supabase.rpc('reverse_online_settlement', {
    p_kitchen_id: kitchenId,
    p_settlement_id: settlementId,
    p_reason: reason,
  })

  if (error) return new Error(error.message)
  revalidatePath('/[kitchen-id]', 'layout')
}

export async function reverseOfflineSettlement(
  kitchenId: string,
  settlementId: string,
  reason: string
) {
  const supabase = await createClient()
  const { error } = await supabase.rpc('reverse_offline_settlement', {
    p_kitchen_id: kitchenId,
    p_settlement_id: settlementId,
    p_reason: reason,
  })

  if (error) return new Error(error.message)
  revalidatePath('/[kitchen-id]', 'layout')
}
