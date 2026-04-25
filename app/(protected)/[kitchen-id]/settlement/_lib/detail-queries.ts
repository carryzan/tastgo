import { createClient } from '@/lib/supabase/server'

export interface MemberDisplay {
  id: string
  profiles: { full_name: string | null } | null
}

export interface SourceDisplay {
  id: string
  name: string
  type: string
  settlement_mode: string
}

export interface AccountDisplay {
  id: string
  code: string
  name: string
}

export interface OnlineSettlementDetail {
  id: string
  kitchen_id: string
  source_id: string
  period_start: string
  period_end: string
  expected_payout: string | number
  actual_deposit: string | number | null
  variance_amount: string | number | null
  status: 'in_progress' | 'completed' | 'reversed'
  created_by: string
  completed_by: string | null
  completed_at: string | null
  reversed_by: string | null
  reversed_at: string | null
  reversal_reason: string | null
  settlement_account_id: string | null
  journal_entry_id: string | null
  created_at: string
  source: SourceDisplay | null
  settlement_account: AccountDisplay | null
  created_member: MemberDisplay | null
  completed_member: MemberDisplay | null
  reversed_member: MemberDisplay | null
}

export interface SettlementOrderSummary {
  id: string
  order_number: number
  source_order_code: string | null
  created_at: string
  net_amount: string | number
  total_platform_deductions: string | number
  net_revenue_to_kitchen: string | number
  payment_status: 'unpaid' | 'paid'
  kitchen_status: string
}

export interface OnlineSettlementOrderRow {
  id: string
  kitchen_id: string
  online_settlement_id: string
  order_id: string
  effective_receivable_amount: string | number
  effective_platform_fee_amount: string | number
  effective_expected_payout: string | number
  created_at: string
  order: SettlementOrderSummary | null
}

export interface EligibleSettlementOrder {
  id: string
  order_number: number
  source_order_code: string | null
  created_at: string
  net_amount: string | number
  total_platform_deductions: string | number
  net_revenue_to_kitchen: string | number
  effective_receivable_amount: string | number
  effective_platform_fee_amount: string | number
  effective_expected_payout: string | number
}

export async function getOnlineSettlementDetail(
  kitchenId: string,
  settlementId: string
) {
  const supabase = await createClient()

  const [settlementResult, ordersResult, eligibleResult] = await Promise.all([
    supabase
      .from('online_settlements')
      .select(
        '*, source:sources!source_id(id, name, type, settlement_mode), settlement_account:chart_of_accounts!settlement_account_id(id, code, name), created_member:kitchen_members!created_by(id, profiles(full_name)), completed_member:kitchen_members!completed_by(id, profiles(full_name)), reversed_member:kitchen_members!reversed_by(id, profiles(full_name))'
      )
      .eq('kitchen_id', kitchenId)
      .eq('id', settlementId)
      .single(),
    supabase
      .from('online_settlement_orders')
      .select(
        'id, kitchen_id, online_settlement_id, order_id, effective_receivable_amount, effective_platform_fee_amount, effective_expected_payout, created_at, order:orders!order_id(id, order_number, source_order_code, created_at, net_amount, total_platform_deductions, net_revenue_to_kitchen, payment_status, kitchen_status)'
      )
      .eq('kitchen_id', kitchenId)
      .eq('online_settlement_id', settlementId)
      .order('created_at', { ascending: true }),
    supabase.rpc('get_eligible_online_settlement_orders', {
      p_kitchen_id: kitchenId,
      p_settlement_id: settlementId,
    }),
  ])

  if (settlementResult.error) throw new Error(settlementResult.error.message)
  if (ordersResult.error) throw new Error(ordersResult.error.message)
  if (eligibleResult.error) throw new Error(eligibleResult.error.message)

  return {
    settlement: settlementResult.data as OnlineSettlementDetail,
    orders: (ordersResult.data ?? []) as unknown as OnlineSettlementOrderRow[],
    eligibleOrders: (eligibleResult.data ?? []) as EligibleSettlementOrder[],
  }
}
