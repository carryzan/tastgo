import { createClient } from '@/lib/supabase/client'

export interface SupplierPick {
  id: string
  name: string
  is_active: boolean
}

export interface InventoryItemPick {
  id: string
  name: string
}

export interface CashAccountPick {
  id: string
  code: string
  name: string
  is_active: boolean
}

export interface PurchaseItemRow {
  id: string
  inventory_item_id: string
  ordered_quantity: string | number
  received_quantity: string | number | null
  unit_cost: string | number
  line_total: string | number
  inventory_items: { id: string; name: string } | null
}

export interface SupplierPaymentRow {
  id: string
  amount: string | number
  created_at: string
  settlement_account: { id: string; code: string; name: string } | null
  paid_member: { id: string; profiles: { full_name: string } | null } | null
}

export interface ReturnItemRow {
  id: string
  inventory_item_id: string
  returned_quantity: string | number
  unit_cost: string | number
  line_credit_value: string | number
  inventory_items: { id: string; name: string } | null
}

export interface PriceHistoryRow {
  id: string
  previous_unit_cost: string | number
  new_unit_cost: string | number
  created_at: string
  inventory_items: { id: string; name: string } | null
  changed_by_member: { id: string; profiles: { full_name: string } | null } | null
}

export interface SupplierOpeningBalance {
  id: string
  outstanding_balance: string | number
  as_of_date: string
  created_by: string
  has_purchases: boolean
  has_payments: boolean
}

export interface ReceivedPurchasePick {
  id: string
  purchase_number: number
  supplier_invoice_code: string | null
  ordered_total: string | number
  received_at: string | null
}

export async function fetchActiveSuppliers(kitchenId: string): Promise<SupplierPick[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('suppliers')
    .select('id, name, is_active')
    .eq('kitchen_id', kitchenId)
    .eq('is_active', true)
    .order('name')
  if (error) throw new Error(error.message)
  return (data ?? []) as SupplierPick[]
}

export async function fetchAllSuppliers(kitchenId: string): Promise<SupplierPick[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('suppliers')
    .select('id, name, is_active')
    .eq('kitchen_id', kitchenId)
    .order('name')
  if (error) throw new Error(error.message)
  return (data ?? []) as SupplierPick[]
}

export async function fetchActiveInventoryItems(kitchenId: string): Promise<InventoryItemPick[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('inventory_items')
    .select('id, name')
    .eq('kitchen_id', kitchenId)
    .eq('is_active', true)
    .order('name')
  if (error) throw new Error(error.message)
  return (data ?? []) as InventoryItemPick[]
}

export async function fetchActiveCashAccounts(kitchenId: string): Promise<CashAccountPick[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('chart_of_accounts')
    .select('id, code, name, is_active')
    .eq('kitchen_id', kitchenId)
    .eq('is_active', true)
    .eq('account_type', 'asset')
    .order('code')
  if (error) throw new Error(error.message)
  return (data ?? []) as CashAccountPick[]
}

export async function fetchPurchaseItems(purchaseId: string): Promise<PurchaseItemRow[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('purchase_items')
    .select('id, inventory_item_id, ordered_quantity, received_quantity, unit_cost, line_total, inventory_items!inventory_item_id(id, name)')
    .eq('purchase_id', purchaseId)
    .order('created_at', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as unknown as PurchaseItemRow[]
}

export async function fetchPurchasePayments(purchaseId: string): Promise<SupplierPaymentRow[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('supplier_payments')
    .select('id, amount, created_at, settlement_account:chart_of_accounts!settlement_account_id(id, code, name), paid_member:kitchen_members!paid_by(id, profiles(full_name))')
    .eq('reference_purchase_id', purchaseId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as unknown as SupplierPaymentRow[]
}

export async function fetchReturnItems(returnId: string): Promise<ReturnItemRow[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('supplier_return_items')
    .select('id, inventory_item_id, returned_quantity, unit_cost, line_credit_value, inventory_items!inventory_item_id(id, name)')
    .eq('supplier_return_id', returnId)
    .order('created_at', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as unknown as ReturnItemRow[]
}

export async function fetchSupplierPriceHistory(
  kitchenId: string,
  supplierId: string
): Promise<PriceHistoryRow[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('supplier_price_history')
    .select('id, previous_unit_cost, new_unit_cost, created_at, inventory_items!inventory_item_id(id, name), changed_by_member:kitchen_members!changed_by(id, profiles(full_name))')
    .eq('kitchen_id', kitchenId)
    .eq('supplier_id', supplierId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as unknown as PriceHistoryRow[]
}

export async function fetchSupplierOpeningBalance(
  kitchenId: string,
  supplierId: string
): Promise<SupplierOpeningBalance | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('supplier_opening_balances')
    .select('id, outstanding_balance, as_of_date, created_by')
    .eq('kitchen_id', kitchenId)
    .eq('supplier_id', supplierId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) return null

  const [{ count: purchaseCount }, { count: paymentCount }] = await Promise.all([
    supabase
      .from('purchases')
      .select('id', { count: 'exact', head: true })
      .eq('kitchen_id', kitchenId)
      .eq('supplier_id', supplierId),
    supabase
      .from('supplier_payments')
      .select('id', { count: 'exact', head: true })
      .eq('kitchen_id', kitchenId)
      .eq('supplier_id', supplierId),
  ])

  return {
    ...data,
    has_purchases: (purchaseCount ?? 0) > 0,
    has_payments: (paymentCount ?? 0) > 0,
  } as SupplierOpeningBalance
}

export async function fetchReceivedPurchasesForSupplier(
  kitchenId: string,
  supplierId: string
): Promise<ReceivedPurchasePick[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('purchases')
    .select('id, purchase_number, supplier_invoice_code, ordered_total, received_at')
    .eq('kitchen_id', kitchenId)
    .eq('supplier_id', supplierId)
    .eq('status', 'received')
    .order('received_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as ReceivedPurchasePick[]
}

export async function fetchPurchasesForSupplier(
  kitchenId: string,
  supplierId: string
): Promise<ReceivedPurchasePick[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('purchases')
    .select('id, purchase_number, supplier_invoice_code, ordered_total, received_at')
    .eq('kitchen_id', kitchenId)
    .eq('supplier_id', supplierId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as ReceivedPurchasePick[]
}
