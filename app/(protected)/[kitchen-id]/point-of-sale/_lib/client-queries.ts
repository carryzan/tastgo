import { createClient } from '@/lib/supabase/client'
import type {
  AccountReference,
  DrawerSessionSummary,
  DrawerTransactionRow,
  OrderRow,
  PosCatalogBrand,
  PosCatalogCombo,
  PosCatalogItem,
  PosCatalogMenu,
  PosCatalogSource,
  PosModifierGroup,
} from '@/lib/types/orders'

interface RawMenuItem {
  id: string
  brand_id: string
  menu_id: string
  name: string
  price: string | number
  current_recipe_version_id: string | null
  menu_item_modifier_groups: {
    sort_order: number
    modifier_group: {
      id: string
      name: string
      min_selections: number
      max_selections: number | null
      is_active: boolean
      modifier_options: {
        id: string
        name: string
        type: string
        price_charge: string | number
        is_active: boolean
      }[]
    } | null
  }[]
}

interface RawCombo {
  id: string
  brand_id: string
  name: string
  pricing_type: 'fixed' | 'discounted'
  price: string | number
  combo_items: {
    id: string
    menu_item_id: string
    quantity: string | number
    sort_order: number
    menu_item: { id: string; name: string } | null
  }[]
}

export interface PosCatalog {
  brands: PosCatalogBrand[]
  sources: PosCatalogSource[]
  menus: PosCatalogMenu[]
  items: PosCatalogItem[]
  combos: PosCatalogCombo[]
}

export async function fetchPosCatalog(kitchenId: string): Promise<PosCatalog> {
  const supabase = createClient()
  const [brandsResult, sourcesResult, menusResult, itemsResult, combosResult] =
    await Promise.all([
      supabase
        .from('brands')
        .select('id, name')
        .eq('kitchen_id', kitchenId)
        .eq('is_active', true)
        .order('name'),
      supabase
        .from('sources')
        .select('id, name, type, settlement_mode, settlement_account_id')
        .eq('kitchen_id', kitchenId)
        .eq('is_active', true)
        .in('settlement_mode', ['cash_now', 'marketplace_receivable'])
        .order('name'),
      supabase
        .from('menus')
        .select('id, brand_id, name, sort_order')
        .eq('kitchen_id', kitchenId)
        .eq('is_active', true)
        .order('sort_order', { ascending: true }),
      supabase
        .from('menu_items')
        .select(
          `id, brand_id, menu_id, name, price, current_recipe_version_id,
          menu_item_modifier_groups(
            sort_order,
            modifier_group:modifier_groups!modifier_group_id(
              id,
              name,
              min_selections,
              max_selections,
              is_active,
              modifier_options(id, name, type, price_charge, is_active)
            )
          )`
        )
        .eq('kitchen_id', kitchenId)
        .eq('is_active', true)
        .not('current_recipe_version_id', 'is', null)
        .order('name'),
      supabase
        .from('combos')
        .select(
          `id, brand_id, name, pricing_type, price,
          combo_items(
            id,
            menu_item_id,
            quantity,
            sort_order,
            menu_item:menu_items!menu_item_id(id, name)
          )`
        )
        .eq('kitchen_id', kitchenId)
        .eq('is_active', true)
        .order('name'),
    ])

  for (const result of [
    brandsResult,
    sourcesResult,
    menusResult,
    itemsResult,
    combosResult,
  ]) {
    if (result.error) throw new Error(result.error.message)
  }

  const items = ((itemsResult.data ?? []) as unknown as RawMenuItem[]).flatMap(
    (item) => {
      if (!item.current_recipe_version_id) return []
      const groups: PosModifierGroup[] = item.menu_item_modifier_groups
        .flatMap((link) => {
          if (!link.modifier_group || !link.modifier_group.is_active) return []
          return [
            {
              ...link.modifier_group,
              sort_order: link.sort_order,
              modifier_options: link.modifier_group.modifier_options.filter(
                (option) => option.is_active
              ),
            },
          ]
        })
        .sort((a, b) => a.sort_order - b.sort_order)

      return [
        {
          id: item.id,
          brand_id: item.brand_id,
          menu_id: item.menu_id,
          name: item.name,
          price: item.price,
          current_recipe_version_id: item.current_recipe_version_id,
          modifier_groups: groups,
        },
      ]
    }
  )

  return {
    brands: (brandsResult.data ?? []) as PosCatalogBrand[],
    sources: (sourcesResult.data ?? []) as PosCatalogSource[],
    menus: (menusResult.data ?? []) as PosCatalogMenu[],
    items,
    combos: (combosResult.data ?? []) as unknown as RawCombo[],
  }
}

const ORDER_CARD_SELECT =
  '*, brands!brand_id(id, name), sources!source_id(id, name, type, settlement_mode), created_member:kitchen_members!created_by(id, profiles(full_name))'

export async function fetchPosOrders(kitchenId: string): Promise<OrderRow[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('orders')
    .select(ORDER_CARD_SELECT)
    .eq('kitchen_id', kitchenId)
    .order('created_at', { ascending: false })
    .limit(80)

  if (error) throw new Error(error.message)
  return (data ?? []) as unknown as OrderRow[]
}

export async function fetchDrawerSessions(
  kitchenId: string
): Promise<DrawerSessionSummary[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('cash_drawer_sessions')
    .select(
      '*, opened_member:kitchen_members!opened_by(id, profiles(full_name)), closed_member:kitchen_members!closed_by(id, profiles(full_name)), reopened_member:kitchen_members!reopened_by(id, profiles(full_name)), drawer_account:chart_of_accounts!drawer_account_id(id, code, name)'
    )
    .eq('kitchen_id', kitchenId)
    .order('status', { ascending: false })
    .order('opened_at', { ascending: false })
    .limit(50)

  if (error) throw new Error(error.message)
  return (data ?? []) as unknown as DrawerSessionSummary[]
}

export async function fetchDrawerTransactions(
  sessionId: string
): Promise<DrawerTransactionRow[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('cash_drawer_transactions')
    .select(
      'id, type, amount, reason, order_id, journal_entry_id, undone_by_transaction_id, created_at, source_account:chart_of_accounts!source_account_id(id, code, name), destination_account:chart_of_accounts!destination_account_id(id, code, name), created_member:kitchen_members!created_by(id, profiles(full_name))'
    )
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []) as unknown as DrawerTransactionRow[]
}

export async function fetchActiveAssetAccounts(
  kitchenId: string
): Promise<AccountReference[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('chart_of_accounts')
    .select('id, code, name')
    .eq('kitchen_id', kitchenId)
    .eq('is_active', true)
    .eq('account_type', 'asset')
    .order('code', { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []) as AccountReference[]
}
