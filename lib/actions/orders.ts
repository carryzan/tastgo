'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type {
  DiscountType,
  OrderActionType,
  OrderKitchenStatus,
} from '@/lib/types/orders'

interface CreatePosOrderItemInput {
  menu_item_id: string
  recipe_version_id: string
  quantity: number
  unit_price: number
  modifiers: {
    modifier_option_id: string
    quantity: number
  }[]
}

interface CreatePosOrderComboInput {
  combo_id: string
  quantity: number
}

interface CreatePosOrderInput {
  brandId: string
  sourceId: string
  notes?: string | null
  items: CreatePosOrderItemInput[]
  combos: CreatePosOrderComboInput[]
}

interface OrderActionItemInput {
  order_item_id: string
  quantity?: number | null
}

interface OrderDiscountInput {
  orderId: string
  type: DiscountType
  amount?: number | null
  percentage?: number | null
  orderItemId?: string | null
  reason?: string | null
}

function revalidateOrderRoutes(kitchenId: string) {
  revalidatePath(`/${kitchenId}/orders`)
  revalidatePath(`/${kitchenId}/point-of-sale`)
  revalidatePath(`/${kitchenId}/settlement`)
  revalidatePath(`/${kitchenId}/finance`)
}

export async function createPosOrder(
  kitchenId: string,
  input: CreatePosOrderInput
): Promise<string | Error> {
  if (input.items.length === 0 && input.combos.length === 0) {
    return new Error('Add at least one item or combo.')
  }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('create_order', {
    p_kitchen_id: kitchenId,
    p_brand_id: input.brandId,
    p_source_id: input.sourceId,
    p_notes: input.notes ?? null,
    p_items: input.items.map((item) => ({
      menu_item_id: item.menu_item_id,
      recipe_version_id: item.recipe_version_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      modifiers: item.modifiers.map((modifier) => ({
        modifier_option_id: modifier.modifier_option_id,
        quantity: modifier.quantity,
      })),
    })),
    p_combos: input.combos.map((combo) => ({
      combo_id: combo.combo_id,
      quantity: combo.quantity,
    })),
  })

  if (error) return new Error(error.message)
  revalidateOrderRoutes(kitchenId)
  return typeof data === 'string' ? data : String(data)
}

export async function updateOrderStatus(
  kitchenId: string,
  orderId: string,
  nextStatus: OrderKitchenStatus
): Promise<void | Error> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('orders')
    .update({ kitchen_status: nextStatus })
    .eq('kitchen_id', kitchenId)
    .eq('id', orderId)

  if (error) return new Error(error.message)
  revalidateOrderRoutes(kitchenId)
}

export async function applyOrderAction(
  kitchenId: string,
  orderId: string,
  type: OrderActionType,
  reason: string | null,
  items: OrderActionItemInput[] = []
): Promise<string | Error> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('apply_order_action', {
    p_kitchen_id: kitchenId,
    p_order_id: orderId,
    p_type: type,
    p_reason: reason,
    p_items: items.map((item) => ({
      order_item_id: item.order_item_id,
      quantity: item.quantity ?? null,
    })),
  })

  if (error) return new Error(error.message)
  revalidateOrderRoutes(kitchenId)
  return typeof data === 'string' ? data : String(data)
}

export async function applyOrderDiscount(
  kitchenId: string,
  input: OrderDiscountInput
): Promise<string | Error> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('apply_order_discount', {
    p_kitchen_id: kitchenId,
    p_order_id: input.orderId,
    p_type: input.type,
    p_amount: input.amount ?? null,
    p_percentage: input.percentage ?? null,
    p_order_item_id: input.orderItemId ?? null,
    p_reason: input.reason ?? null,
  })

  if (error) return new Error(error.message)
  revalidateOrderRoutes(kitchenId)
  return typeof data === 'string' ? data : String(data)
}
