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
}) {
  const supabase = await createClient()
  const { error } = await supabase.from('combos').insert(data)
  if (error) return new Error(error.message)
  revalidatePath(`/${data.kitchen_id}/menu`)
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

export async function addComboItem(data: {
  kitchen_id: string
  combo_id: string
  menu_item_id: string
  sort_order?: number
}) {
  const supabase = await createClient()
  const { sort_order = 0, ...rest } = data
  const { error } = await supabase.from('combo_items').insert({
    ...rest,
    sort_order,
  })
  if (error) return new Error(error.message)
  revalidatePath(`/${data.kitchen_id}/menu`)
}

export async function removeComboItem(id: string, kitchenId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('combo_items')
    .delete()
    .eq('id', id)
    .eq('kitchen_id', kitchenId)
  if (error) return new Error(error.message)
  revalidatePath(`/${kitchenId}/menu`)
}

export async function replaceComboItems(
  comboId: string,
  kitchenId: string,
  rows: { menu_item_id: string; sort_order: number }[]
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
        sort_order: r.sort_order,
      }))
    )
    if (insError) return new Error(insError.message)
  }

  revalidatePath(`/${kitchenId}/menu`)
}
