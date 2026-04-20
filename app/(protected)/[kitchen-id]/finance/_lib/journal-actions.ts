'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

interface JournalLine {
  account_id: string
  debit: number
  credit: number
  line_memo?: string
}

interface CreateManualJournalData {
  entryDate: string
  memo: string
  lines: JournalLine[]
}

interface ReverseManualJournalData {
  journalEntryId: string
  reversalDate: string
  reason: string
}

export async function createManualJournal(
  kitchenId: string,
  data: CreateManualJournalData
) {
  const supabase = await createClient()
  const { error } = await supabase.rpc('create_manual_journal', {
    p_kitchen_id: kitchenId,
    p_entry_date: data.entryDate,
    p_memo: data.memo,
    p_lines: data.lines,
  })
  if (error) return new Error(error.message)
  revalidatePath(`/${kitchenId}/cash`)
}

export async function reverseManualJournal(
  kitchenId: string,
  data: ReverseManualJournalData
) {
  const supabase = await createClient()
  const { error } = await supabase.rpc('reverse_manual_journal', {
    p_journal_entry_id: data.journalEntryId,
    p_reversal_date: data.reversalDate,
    p_reason: data.reason,
  })
  if (error) return new Error(error.message)
  revalidatePath(`/${kitchenId}/cash`)
}
