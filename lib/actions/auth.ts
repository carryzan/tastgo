'use server'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { clearLastKitchen } from '@/lib/actions/kitchen'

export async function logout() {
  const supabase = await createClient()
  await clearLastKitchen()
  await supabase.auth.signOut()
  redirect('/login')
}

export async function changePassword(currentPassword: string, newPassword: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return new Error('Not authenticated.')

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  })
  if (signInError) return new Error('Current password is incorrect.')

  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword,
  })
  if (updateError) return new Error(updateError.message)
}