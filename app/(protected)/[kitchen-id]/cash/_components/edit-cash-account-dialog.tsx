'use client'

import { useEffect, useState, useTransition } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { updateCashAccount } from '../_lib/cash-account-actions'
import { CASH_ACCOUNTS_QUERY_KEY } from '../_lib/queries'
import type { CashAccount } from './cash-account-columns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'

interface EditCashAccountDialogProps {
  account: CashAccount
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditCashAccountDialog({
  account,
  open,
  onOpenChange,
}: EditCashAccountDialogProps) {
  const queryClient = useQueryClient()
  const [isActive, setIsActive] = useState(account.is_active)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    if (!open) return
    setIsActive(account.is_active)
    setError(null)
  }, [open, account.id, account.is_active])

  function handleOpenChange(next: boolean) {
    if (pending) return
    onOpenChange(next)
    if (!next) setError(null)
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const form = e.currentTarget
    const fd = new FormData(form)
    const name = (fd.get('name') as string)?.trim()
    if (!name) return

    const updates: { name?: string; is_active?: boolean } = {}
    if (name !== account.name) updates.name = name
    if (isActive !== account.is_active) updates.is_active = isActive

    if (Object.keys(updates).length === 0) {
      onOpenChange(false)
      return
    }

    startTransition(async () => {
      try {
        const result = await updateCashAccount(
          account.kitchen_id,
          account.id,
          updates
        )
        if (result instanceof Error) return setError(result.message)

        onOpenChange(false)
        queryClient.invalidateQueries({ queryKey: CASH_ACCOUNTS_QUERY_KEY })
      } catch {
        setError('Something went wrong. Please try again.')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        onInteractOutside={(e) => {
          if (pending) e.preventDefault()
        }}
        onEscapeKeyDown={(e) => {
          if (pending) e.preventDefault()
        }}
      >
        <DialogHeader>
          <DialogTitle>Edit cash account</DialogTitle>
          <DialogDescription>Update details for this cash account.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="edit-ca-name">Name</FieldLabel>
              <Input
                id="edit-ca-name"
                name="name"
                defaultValue={account.name}
                required
                disabled={pending}
              />
            </Field>
            <Field>
              <div className="flex items-center justify-between">
                <FieldLabel htmlFor="edit-ca-active">Active</FieldLabel>
                <Switch
                  id="edit-ca-active"
                  checked={isActive}
                  onCheckedChange={setIsActive}
                  disabled={pending}
                />
              </div>
            </Field>
          </FieldGroup>
          {error && <FieldError className="mt-2">{error}</FieldError>}
          <DialogFooter className="mt-4">
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={pending}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={pending} className="min-w-28">
              {pending && <Spinner data-icon="inline-start" />}
              Save changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
