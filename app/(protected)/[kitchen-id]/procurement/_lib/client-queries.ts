import { createClient } from '@/lib/supabase/client'

export interface SupplierPick {
  id: string
  name: string
  is_active: boolean
}

export interface InventoryItemPick {
  id: string
  name: string
  storage_uom_id: string | null
}

export interface CashAccountPick {
  id: string
  code: string
  name: string
  is_active: boolean
}

export interface CreditOffsetAccountPick {
  id: string
  code: string
  name: string
  account_type:
    | 'asset'
    | 'expense'
    | 'revenue'
    | 'contra_revenue'
    | 'cost_of_goods_sold'
  is_active: boolean
}

export interface PurchaseItemRow {
  id: string
  inventory_item_id: string
  ordered_quantity: string | number
  received_quantity: string | number | null
  storage_quantity: string | number | null
  unit_cost: string | number
  line_total: string | number
  batch_id: string | null
  inventory_items: { id: string; name: string; storage_uom_id: string | null } | null
}

export interface PurchasePaymentSettlementRow {
  id: string
  payment_id: string
  amount: string | number
  created_at: string
  payment: {
    id: string
    amount: string | number
    created_at: string
    reversed_at: string | null
    settlement_account: { id: string; code: string; name: string } | null
    paid_member: { id: string; profiles: { full_name: string } | null } | null
  } | null
}

export interface PurchaseCreditSettlementRow {
  id: string
  credit_note_id: string
  amount: string | number
  created_at: string
  credit_note: {
    id: string
    credit_value: string | number
    status: 'open' | 'partially_settled' | 'settled' | 'reversed'
    created_at: string
    reversed_at: string | null
  } | null
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

export interface SupplierLedgerEntry {
  id: string
  kitchen_id: string
  supplier_id: string
  entry_type: 'opening_balance' | 'purchase_received' | 'supplier_payment' | 'supplier_credit_note' | 'supplier_credit_refund' | 'manual_adjustment'
  amount_signed: string | number
  source_table: string
  source_id: string
  purchase_id: string | null
  created_by: string
  created_at: string
}

export interface SupplierCreditAllocation {
  id: string
  kitchen_id: string
  credit_note_id: string
  purchase_id: string
  amount: string | number
  allocated_by: string
  created_at: string
  voided_by: string | null
  voided_at: string | null
  void_reason: string | null
  purchases: { id: string; purchase_number: number } | null
}

export interface SupplierCreditRefund {
  id: string
  kitchen_id: string
  credit_note_id: string
  amount: string | number
  refunded_by: string
  created_at: string
  reversed_by: string | null
  reversed_at: string | null
  reversal_reason: string | null
  refund_account_id: string | null
  journal_entry_id: string | null
  refund_account: { id: string; code: string; name: string } | null
}

export interface SupplierPaymentAllocation {
  id: string
  kitchen_id: string
  payment_id: string
  purchase_id: string
  amount: string | number
  allocated_by: string
  created_at: string
  voided_by: string | null
  voided_at: string | null
  void_reason: string | null
  purchases: { id: string; purchase_number: number } | null
}

export interface InventoryItemSupplier {
  id: string
  inventory_item_id: string
  supplier_id: string
  current_unit_cost: string | number
  is_preferred: boolean
  is_active: boolean
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
    .select('id, name, storage_uom_id')
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

export async function fetchActiveCreditOffsetAccounts(
  kitchenId: string
): Promise<CreditOffsetAccountPick[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('chart_of_accounts')
    .select('id, code, name, account_type, is_active')
    .eq('kitchen_id', kitchenId)
    .eq('is_active', true)
    .in('account_type', ['asset', 'expense', 'revenue', 'contra_revenue', 'cost_of_goods_sold'])
    .order('code')
  if (error) throw new Error(error.message)
  return (data ?? []) as CreditOffsetAccountPick[]
}

export async function fetchPurchaseItems(purchaseId: string): Promise<PurchaseItemRow[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('purchase_items')
    .select('id, inventory_item_id, ordered_quantity, received_quantity, storage_quantity, unit_cost, line_total, batch_id, inventory_items!inventory_item_id(id, name, storage_uom_id)')
    .eq('purchase_id', purchaseId)
    .order('created_at', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as unknown as PurchaseItemRow[]
}

export async function fetchPurchasePaymentSettlements(
  purchaseId: string
): Promise<PurchasePaymentSettlementRow[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('supplier_payment_allocations')
    .select('id, payment_id, amount, created_at, payment:supplier_payments!payment_id(id, amount, created_at, reversed_at, settlement_account:chart_of_accounts!settlement_account_id(id, code, name), paid_member:kitchen_members!paid_by(id, profiles(full_name)))')
    .eq('purchase_id', purchaseId)
    .is('voided_at', null)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as unknown as PurchasePaymentSettlementRow[]
}

export async function fetchPurchaseCreditSettlements(
  purchaseId: string
): Promise<PurchaseCreditSettlementRow[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('supplier_credit_allocations')
    .select('id, credit_note_id, amount, created_at, credit_note:supplier_credit_notes!credit_note_id(id, credit_value, status, created_at, reversed_at)')
    .eq('purchase_id', purchaseId)
    .is('voided_at', null)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as unknown as PurchaseCreditSettlementRow[]
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

export async function fetchOpenCreditNotesForSupplier(
  kitchenId: string,
  supplierId: string
) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('supplier_credit_notes')
    .select('id, credit_value, status, created_at, supplier_returns!supplier_return_id(id)')
    .eq('kitchen_id', kitchenId)
    .eq('supplier_id', supplierId)
    .in('status', ['open', 'partially_settled'])
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function fetchSupplierLedger(
  kitchenId: string,
  supplierId: string
): Promise<SupplierLedgerEntry[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('supplier_ledger_entries')
    .select('id, kitchen_id, supplier_id, entry_type, amount_signed, source_table, source_id, purchase_id, created_by, created_at')
    .eq('kitchen_id', kitchenId)
    .eq('supplier_id', supplierId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as unknown as SupplierLedgerEntry[]
}

export async function fetchSupplierBalance(supplierId: string): Promise<number> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('current_supplier_balance', { p_supplier_id: supplierId })
  if (error) throw new Error(error.message)
  return (data as number) ?? 0
}

export async function fetchPurchaseOpenBalance(purchaseId: string): Promise<number> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('current_purchase_open_balance', { p_purchase_id: purchaseId })
  if (error) throw new Error(error.message)
  return (data as number) ?? 0
}

export async function fetchSupplierCreditOpenAmount(creditNoteId: string): Promise<number> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('current_supplier_credit_open_amount', {
    p_credit_note_id: creditNoteId,
  })
  if (error) throw new Error(error.message)
  return (data as number) ?? 0
}

export async function fetchSupplierPaymentUnallocatedAmount(
  paymentId: string
): Promise<number> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('current_supplier_payment_unallocated_amount', {
    p_payment_id: paymentId,
  })
  if (error) throw new Error(error.message)
  return (data as number) ?? 0
}

export async function fetchCreditNoteAllocations(creditNoteId: string): Promise<SupplierCreditAllocation[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('supplier_credit_allocations')
    .select('id, kitchen_id, credit_note_id, purchase_id, amount, allocated_by, created_at, voided_by, voided_at, void_reason, purchases!purchase_id(id, purchase_number)')
    .eq('credit_note_id', creditNoteId)
    .order('created_at', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as unknown as SupplierCreditAllocation[]
}

export async function fetchCreditNoteRefunds(creditNoteId: string): Promise<SupplierCreditRefund[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('supplier_credit_refunds')
    .select('id, kitchen_id, credit_note_id, amount, refunded_by, created_at, reversed_by, reversed_at, reversal_reason, refund_account_id, journal_entry_id, refund_account:chart_of_accounts!refund_account_id(id, code, name)')
    .eq('credit_note_id', creditNoteId)
    .order('created_at', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as unknown as SupplierCreditRefund[]
}

export async function fetchPaymentAllocations(paymentId: string): Promise<SupplierPaymentAllocation[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('supplier_payment_allocations')
    .select('id, kitchen_id, payment_id, purchase_id, amount, allocated_by, created_at, voided_by, voided_at, void_reason, purchases!purchase_id(id, purchase_number)')
    .eq('payment_id', paymentId)
    .order('created_at', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as unknown as SupplierPaymentAllocation[]
}

export async function fetchInventoryItemSuppliers(
  kitchenId: string,
  inventoryItemId: string
): Promise<InventoryItemSupplier[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('inventory_item_suppliers')
    .select('id, inventory_item_id, supplier_id, current_unit_cost, is_preferred, is_active')
    .eq('kitchen_id', kitchenId)
    .eq('inventory_item_id', inventoryItemId)
    .eq('is_active', true)
  if (error) throw new Error(error.message)
  return (data ?? []) as unknown as InventoryItemSupplier[]
}
