import { createClient } from '@/lib/supabase/client'

export interface ChartAccountPick {
  id: string
  code: string
  name: string
  account_type: string
  is_active: boolean
  is_system: boolean
  parent_account_id: string | null
}

export interface AccountLedgerLine {
  id: string
  journal_entry_id: string
  line_number: number
  debit: string | number
  credit: string | number
  line_memo: string | null
  entry_date: string
  journal_number: number
  memo: string | null
  entry_type: string
}

export interface DrawerTransaction {
  id: string
  type: 'cash_in' | 'cash_out' | 'cash_payment' | 'cash_refund'
  amount: string | number
  reason: string | null
  source_account: { id: string; code: string; name: string } | null
  destination_account: { id: string; code: string; name: string } | null
  order_id: string | null
  journal_entry_id: string | null
  undone_by_transaction_id: string | null
  created_by: string | null
  created_member: { id: string; profiles: { full_name: string } | null } | null
  created_at: string
}

export interface JournalEntryLine {
  id: string
  line_number: number
  debit: string | number
  credit: string | number
  line_memo: string | null
  account: { id: string; code: string; name: string } | null
}

/** Fetch all active COA accounts for picker/combobox use */
export async function fetchChartAccountsForPicker(
  kitchenId: string,
  accountType?: string
): Promise<ChartAccountPick[]> {
  const supabase = createClient()
  let query = supabase
    .from('chart_of_accounts')
    .select('id, code, name, account_type, is_active, is_system, parent_account_id')
    .eq('kitchen_id', kitchenId)
    .eq('is_active', true)
    .order('code', { ascending: true })

  if (accountType) {
    query = query.eq('account_type', accountType)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []) as ChartAccountPick[]
}

/** Fetch active asset accounts (for cash/bank pickers in drawer and transfer dialogs) */
export async function fetchActiveCashAccounts(
  kitchenId: string
): Promise<ChartAccountPick[]> {
  return fetchChartAccountsForPicker(kitchenId, 'asset')
}

/** Fetch balance for a single account from the direct-balances view */
export async function fetchAccountBalance(
  accountId: string
): Promise<number | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('v_chart_account_direct_balances')
    .select('balance')
    .eq('account_id', accountId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data ? Number(data.balance) : null
}

/** Fetch all journal_entry_lines for a given account (account ledger view) */
export async function fetchAccountLedger(
  accountId: string
): Promise<AccountLedgerLine[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('journal_entry_lines')
    .select(
      'id, journal_entry_id, line_number, debit, credit, line_memo, journal_entry:journal_entries!journal_entry_id(journal_number, entry_date, memo, entry_type)'
    )
    .eq('account_id', accountId)
    .order('journal_entry_id', { ascending: false })
  if (error) throw new Error(error.message)

  // Flatten the nested join
  return ((data ?? []) as unknown as Array<{
    id: string
    journal_entry_id: string
    line_number: number
    debit: string | number
    credit: string | number
    line_memo: string | null
    journal_entry: {
      journal_number: number
      entry_date: string
      memo: string | null
      entry_type: string
    } | null
  }>).map((row) => ({
    id: row.id,
    journal_entry_id: row.journal_entry_id,
    line_number: row.line_number,
    debit: row.debit,
    credit: row.credit,
    line_memo: row.line_memo,
    entry_date: row.journal_entry?.entry_date ?? '',
    journal_number: row.journal_entry?.journal_number ?? 0,
    memo: row.journal_entry?.memo ?? null,
    entry_type: row.journal_entry?.entry_type ?? '',
  }))
}

export async function fetchDrawerSessionTransactions(
  sessionId: string
): Promise<DrawerTransaction[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('cash_drawer_transactions')
    .select(
      'id, type, amount, reason, order_id, journal_entry_id, undone_by_transaction_id, created_by, created_member:kitchen_members!created_by(id, profiles(full_name)), source_account:chart_of_accounts!source_account_id(id, code, name), destination_account:chart_of_accounts!destination_account_id(id, code, name), created_at'
    )
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as unknown as DrawerTransaction[]
}

export async function fetchJournalEntryLines(
  journalEntryId: string
): Promise<JournalEntryLine[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('journal_entry_lines')
    .select(
      'id, line_number, debit, credit, line_memo, account:chart_of_accounts!account_id(id, code, name)'
    )
    .eq('journal_entry_id', journalEntryId)
    .order('line_number', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as unknown as JournalEntryLine[]
}
