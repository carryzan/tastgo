import { createClient } from '@/lib/supabase/client'

export async function getAuditLog(kitchenId: string) {
  const supabase = createClient()
  return supabase
    .from('audit_log_entries')
    .select(
      'id, action_type, table_name, record_id, created_at, performer:kitchen_members!performed_by(id, profiles(full_name))'
    )
    .eq('kitchen_id', kitchenId)
    .order('created_at', { ascending: false })
    .limit(100)
}
