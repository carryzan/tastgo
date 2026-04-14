'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function applyCreditNote(
  kitchenId: string,
  creditNoteId: string,
  purchaseId: string
) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('supplier_credit_notes')
    .update({
      status: 'applied',
      applied_to_purchase_id: purchaseId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', creditNoteId)
    .eq('kitchen_id', kitchenId)
    .eq('status', 'pending')
  if (error) return new Error(error.message)
  revalidatePath(`/${kitchenId}/procurement`)
}
