'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { clearLastKitchen } from '@/lib/actions/kitchen'

export async function login(email: string, password: string) {
  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }

  await clearLastKitchen()

  redirect('/')
}
