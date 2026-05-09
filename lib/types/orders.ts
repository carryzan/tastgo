export type OrderKitchenStatus = 'preparing' | 'ready' | 'completed'
export type OrderPaymentStatus = 'unpaid' | 'paid'
export type OrderActionType = 'void' | 'full_comp' | 'partial_comp' | 'refund'
export type DiscountType = 'fixed' | 'percentage'
export type SourceSettlementMode = 'cash_now' | 'marketplace_receivable'

export interface NamedReference {
  id: string
  name: string
}

export interface AccountReference {
  id: string
  code: string
  name: string
}

export interface MemberReference {
  id: string
  profiles: { full_name: string | null } | null
}

export interface OrderRow {
  id: string
  kitchen_id: string
  brand_id: string
  source_id: string
  created_by: string
  order_number: number
  notes: string | null
  source_order_code: string | null
  payment_status: OrderPaymentStatus
  kitchen_status: OrderKitchenStatus
  gross_amount: string | number
  discount_amount: string | number
  net_amount: string | number
  commission_basis_amount: string | number | null
  commission_rate: string | number | null
  commission_amount: string | number | null
  fixed_fee_amount: string | number | null
  total_platform_deductions: string | number | null
  net_revenue_to_kitchen: string | number | null
  online_settlement_id: string | null
  created_at: string
  updated_at: string
  brands: NamedReference | null
  sources: {
    id: string
    name: string
    type: string
    settlement_mode: SourceSettlementMode | null
  } | null
  created_member?: MemberReference | null
}

export interface OrderModifierLine {
  id: string
  modifier_option_id: string
  quantity: string | number
  price_impact: string | number
  cogs_impact: string | number
  type: string
  modifier_option: {
    id: string
    name: string
    type: string
    price_charge: string | number
  } | null
}

export interface OrderLine {
  id: string
  kitchen_id: string
  order_id: string
  order_combo_id: string | null
  menu_item_id: string
  recipe_version_id: string
  quantity: string | number
  unit_price: string | number
  base_unit_price: string | number
  line_total: string | number
  fifo_cogs: string | number
  allocated_platform_fee: string | number
  pricing_source: 'standalone' | 'combo_allocated'
  created_at: string
  menu_item: NamedReference | null
  order_item_modifiers: OrderModifierLine[]
}

export interface OrderComboLine {
  id: string
  combo_id: string
  combo_name_snapshot: string
  quantity: string | number
  base_combo_price: string | number
  total_price: string | number
  combo: NamedReference | null
}

export interface OrderDiscountLine {
  id: string
  order_item_id: string | null
  type: DiscountType
  amount: string | number
  percentage: string | number | null
  reason: string | null
  created_at: string
}

export interface OrderActionItemLine {
  id: string
  order_item_id: string
  quantity: string | number | null
  prorated_discount: string | number
  revised_commission_basis: string | number | null
  revised_commission_amount: string | number | null
  revised_net_revenue: string | number | null
  order_item: {
    id: string
    menu_item: NamedReference | null
  } | null
}

export interface OrderActionRow {
  id: string
  kitchen_id: string
  order_id: string
  type: OrderActionType
  reason: string | null
  applied_by: string
  action_amount: string | number
  revised_gross_amount: string | number | null
  revised_commission_amount: string | number | null
  revised_net_revenue: string | number | null
  created_at: string
  applied_member: MemberReference | null
  order_action_items: OrderActionItemLine[]
}

export interface OrderDetail extends OrderRow {
  order_items: OrderLine[]
  order_combos: OrderComboLine[]
  order_discounts: OrderDiscountLine[]
  order_actions: OrderActionRow[]
}

export interface PosCartModifier {
  modifier_option_id: string
  name: string
  quantity: number
  price_impact: number
}

export interface PosCartLine {
  key: string
  menu_item_id: string
  recipe_version_id: string
  name: string
  quantity: number
  unit_price: number
  modifiers: PosCartModifier[]
}

export interface PosCartCombo {
  key: string
  combo_id: string
  name: string
  quantity: number
  unit_price: number
}

export interface PosCatalogBrand {
  id: string
  name: string
}

export interface PosCatalogSource {
  id: string
  name: string
  type: string
  settlement_mode: SourceSettlementMode | null
  settlement_account_id: string | null
}

export interface PosCatalogMenu {
  id: string
  brand_id: string
  name: string
  sort_order: number
}

export interface PosModifierOption {
  id: string
  name: string
  type: string
  price_charge: string | number
  is_active: boolean
}

export interface PosModifierGroup {
  id: string
  name: string
  min_selections: number
  max_selections: number | null
  is_active: boolean
  sort_order: number
  modifier_options: PosModifierOption[]
}

export interface PosCatalogItem {
  id: string
  brand_id: string
  menu_id: string
  name: string
  price: string | number
  current_recipe_version_id: string
  modifier_groups: PosModifierGroup[]
}

export interface PosCatalogComboItem {
  id: string
  menu_item_id: string
  quantity: string | number
  sort_order: number
  menu_item: NamedReference | null
}

export interface PosCatalogCombo {
  id: string
  brand_id: string
  name: string
  pricing_type: 'fixed' | 'discounted'
  price: string | number
  combo_items: PosCatalogComboItem[]
}

export interface DrawerSessionSummary {
  id: string
  kitchen_id: string
  status: 'open' | 'closed'
  drawer_account_id: string
  opening_balance: string | number
  expected_closing_balance: string | number
  actual_closing_balance: string | number | null
  variance: string | number | null
  variance_type: 'overage' | 'shortage' | 'exact' | null
  opened_at: string
  closed_at: string | null
  reopen_reason: string | null
  drawer_account: AccountReference | null
  opened_member: MemberReference | null
  closed_member: MemberReference | null
  reopened_member: MemberReference | null
}

export interface DrawerTransactionRow {
  id: string
  type: 'cash_in' | 'cash_out' | 'cash_payment' | 'cash_refund'
  amount: string | number
  reason: string | null
  order_id: string | null
  journal_entry_id: string | null
  undone_by_transaction_id: string | null
  created_at: string
  source_account: AccountReference | null
  destination_account: AccountReference | null
  created_member: MemberReference | null
}
