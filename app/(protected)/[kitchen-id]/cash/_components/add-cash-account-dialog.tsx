'use client'

import { useState, useTransition } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createCashAccount } from '../_lib/cash-account-actions'
import { CASH_ACCOUNTS_QUERY_KEY } from '../_lib/queries'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
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
import { Input } from '@/components/ui/input'

interface AddCashAccountDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  kitchenId: string
}

export function AddCashAccountDialog({
  open,
  onOpenChange,
  kitchenId,
}: AddCashAccountDialogProps) {
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

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

    startTransition(async () => {
      try {
        const result = await createCashAccount(kitchenId, { name })
        if (result instanceof Error) return setError(result.message)

        form.reset()
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
          <DialogTitle>Add cash account</DialogTitle>
          <DialogDescription>
            Create a new cash account such as a safe, register, or bank float.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="add-ca-name">Name</FieldLabel>
              <Input
                id="add-ca-name"
                name="name"
                placeholder="e.g. Main Safe"
                required
                disabled={pending}
              />
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
              Add account
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
