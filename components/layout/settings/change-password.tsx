'use client'
import { useState, useTransition } from 'react'
import { changePassword } from '@/lib/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import {
  Dialog, DialogClose, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import {
  Field, FieldError, FieldGroup, FieldLabel,
} from '@/components/ui/field'

export function ChangePassword() {
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const formData = new FormData(e.currentTarget)
    const currentPassword = formData.get('current_password') as string
    const newPassword = formData.get('new_password') as string
    const confirmPassword = formData.get('confirm_password') as string

    if (newPassword !== confirmPassword) return setError('New passwords do not match.')
    if (newPassword.length < 6) return setError('New password must be at least 6 characters.')

    startTransition(async () => {
      try {
        const result = await changePassword(currentPassword, newPassword)
        if (result instanceof Error) return setError(result.message)
        setOpen(false)
      } catch {
        setError('Something went wrong. Please try again.')
      }
    })
  }

  const blockClose = (e: { preventDefault(): void }) => { if (pending) e.preventDefault() }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!pending) { setOpen(v); if (!v) setError(null) } }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">Change Password</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm" onInteractOutside={blockClose} onEscapeKeyDown={blockClose}>
        <DialogHeader>
          <DialogTitle>Change Password</DialogTitle>
          <DialogDescription>Enter your current password and choose a new one.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="current-password">Current Password</FieldLabel>
              <Input id="current-password" name="current_password" type="password" required />
            </Field>
            <Field>
              <FieldLabel htmlFor="new-password">New Password</FieldLabel>
              <Input id="new-password" name="new_password" type="password" required />
            </Field>
            <Field>
              <FieldLabel htmlFor="confirm-password">Confirm New Password</FieldLabel>
              <Input id="confirm-password" name="confirm_password" type="password" required />
            </Field>
          </FieldGroup>
          {error && <FieldError className="mt-2">{error}</FieldError>}
          <DialogFooter className="mt-4">
            <DialogClose asChild>
              <Button variant="outline" disabled={pending}>Cancel</Button>
            </DialogClose>
            <Button type="submit" disabled={pending} className="min-w-28">
              {pending && <Spinner data-icon="inline-start" />}
              Change Password
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}