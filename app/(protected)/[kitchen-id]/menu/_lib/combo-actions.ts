'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function createCombo(data: {
  kitchen_id: string
  brand_id: string
  name: string
  image_url?: string | null
  pricing_type: 'fixed' | 'discounted'
  price: number
  items: { menu_item_id: string; quantity: number }[]
}) {
  const supabase = await createClient()
  const { data: comboId, error } = await supabase.rpc(
    'create_combo_with_items',
    {
      p_kitchen_id: data.kitchen_id,
      p_brand_id: data.brand_id,
      p_name: data.name,
      p_pricing_type: data.pricing_type,
      p_price: data.price,
      p_image_url: data.image_url ?? null,
      p_items: data.items.map((item) => ({
        menu_item_id: item.menu_item_id,
        quantity: item.quantity,
      })),
    }
  )

  if (error) return new Error(error.message)
  revalidatePath(`/${data.kitchen_id}/menu`)
  return comboId as string
}

export async function updateCombo(
  id: string,
  kitchenId: string,
  updates: {
    name?: string
    brand_id?: string
    image_url?: string | null
    pricing_type?: 'fixed' | 'discounted'
    price?: number
    is_active?: boolean
  }
) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('combos')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('kitchen_id', kitchenId)
  if (error) return new Error(error.message)
  revalidatePath(`/${kitchenId}/menu`)
}

export async function deleteCombo(id: string, kitchenId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('combos')
    .delete()
    .eq('id', id)
    .eq('kitchen_id', kitchenId)
  if (error) return new Error(error.message)
  revalidatePath(`/${kitchenId}/menu`)
}

export async function replaceComboItems(
  comboId: string,
  kitchenId: string,
  rows: { menu_item_id: string; quantity: number }[]
) {
  const supabase = await createClient()
  const { error: delError } = await supabase
    .from('combo_items')
    .delete()
    .eq('combo_id', comboId)
    .eq('kitchen_id', kitchenId)
  if (delError) return new Error(delError.message)

  if (rows.length > 0) {
    const { error: insError } = await supabase.from('combo_items').insert(
      rows.map((r) => ({
        kitchen_id: kitchenId,
        combo_id: comboId,
        menu_item_id: r.menu_item_id,
        quantity: r.quantity,
      }))
    )
    if (insError) return new Error(insError.message)
  }

  revalidatePath(`/${kitchenId}/menu`)
}
