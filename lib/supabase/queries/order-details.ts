import { createClient } from '@/lib/supabase/client'
import type { OrderDetail } from '@/lib/types/orders'

export async function fetchOrderDetail(orderId: string): Promise<OrderDetail> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('orders')
    .select(
      `*,
      brands!brand_id(id, name, logo_url),
      sources!source_id(id, name, type, settlement_mode, logo_url),
      created_member:kitchen_members!created_by(id, profiles(full_name)),
      order_items(
        *,
        menu_item:menu_items!menu_item_id(id, name),
        order_item_modifiers(
          *,
          modifier_option:modifier_options!modifier_option_id(id, name, type, price_charge)
        )
      ),
      order_combos(
        *,
        combo:combos!combo_id(id, name)
      ),
      order_discounts(*),
      order_actions(
        *,
        applied_member:kitchen_members!applied_by(id, profiles(full_name)),
        order_action_items(
          *,
          order_item:order_items!order_item_id(
            id,
            menu_item:menu_items!menu_item_id(id, name)
          )
        )
      )`
    )
    .eq('id', orderId)
    .single()

  if (error) throw new Error(error.message)
  return data as unknown as OrderDetail
}
