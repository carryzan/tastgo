'use client'

import { useState, useTransition } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useKitchen } from '@/hooks/use-kitchen'
import { createManualSupplierCreditNote } from '../_lib/credit-note-actions'
import { CREDIT_NOTES_QUERY_KEY } from '../_lib/queries'
import {
  fetchActiveCreditOffsetAccounts,
  fetchActiveSuppliers,
} from '../_lib/client-queries'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'

interface AddCreditSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddCreditSheet({ open, onOpenChange }: AddCreditSheetProps) {
  const { kitchen } = useKitchen()
  const queryClient = useQueryClient()
  const [supplierId, setSupplierId] = useState('')
  const [offsetAccountId, setOffsetAccountId] = useState('')
  const [creditValue, setCreditValue] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const { data: suppliers } = useQuery({
    queryKey: ['active-suppliers', kitchen.id],
    queryFn: () => fetchActiveSuppliers(kitchen.id),
    enabled: open,
  })

  const { data: offsetAccounts } = useQuery({
    queryKey: ['active-credit-offset-accounts', kitchen.id],
    queryFn: () => fetchActiveCreditOffsetAccounts(kitchen.id),
    enabled: open,
  })

  function resetForm() {
    setSupplierId('')
    setOffsetAccountId('')
    setCreditValue('')
    setNote('')
    setError(null)
  }

  function handleOpenChange(next: boolean) {
    if (pending) return
    if (!next) resetForm()
    onOpenChange(next)
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    if (!supplierId) return setError('Select a supplier.')
    if (!offsetAccountId) return setError('Select an offset account.')

    const amount = Number(creditValue)
    if (!creditValue || Number.isNaN(amount) || amount <= 0) {
      return setError('Enter a valid credit value.')
    }

    if (!note.trim()) {
      return setError('Enter a note for this manual supplier credit.')
    }

    startTransition(async () => {
      try {
        const result = await createManualSupplierCreditNote({
          kitchen_id: kitchen.id,
          supplier_id: supplierId,
          credit_value: amount,
          offset_account_id: offsetAccountId,
          note: note.trim(),
        })
        if (result instanceof Error) return setError(result.message)
        resetForm()
        onOpenChange(false)
        queryClient.invalidateQueries({ queryKey: CREDIT_NOTES_QUERY_KEY })
      } catch {
        setError('Something went wrong. Please try again.')
      }
    })
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        className="flex flex-col gap-0 p-0 sm:max-w-xl"
        showCloseButton={!pending}
        onInteractOutside={(e) => {
          if (pending) e.preventDefault()
        }}
        onEscapeKeyDown={(e) => {
          if (pending) e.preventDefault()
        }}
      >
        <SheetHeader className="border-b px-4 py-4">
          <SheetTitle>Add credit</SheetTitle>
          <SheetDescription>
            Create a manual supplier credit note without a return. Allocate it to purchases or refund it later.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-y-auto">
          <div className="grid flex-1 auto-rows-min gap-6 px-4 py-4">
            <FieldGroup>
              <Field>
                <FieldLabel>Supplier</FieldLabel>
                <Select value={supplierId} onValueChange={setSupplierId} disabled={pending}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    {(suppliers ?? []).map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel>Offset account</FieldLabel>
                <Select value={offsetAccountId} onValueChange={setOffsetAccountId} disabled={pending}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    {(offsetAccounts ?? []).map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.code} · {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel htmlFor="add-credit-value">Credit value</FieldLabel>
                <Input
                  id="add-credit-value"
                  type="number"
                  inputMode="decimal"
                  min="0.01"
                  step="0.01"
                  placeholder="0.00"
                  value={creditValue}
                  onChange={(e) => setCreditValue(e.target.value)}
                  disabled={pending}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="add-credit-note">Note</FieldLabel>
                <Textarea
                  id="add-credit-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Describe why the supplier issued this credit"
                  rows={4}
                  disabled={pending}
                />
              </Field>
            </FieldGroup>

            {error && <FieldError>{error}</FieldError>}
          </div>

          <SheetFooter>
            <Button type="submit" disabled={pending} className="min-w-28">
              {pending && <Spinner data-icon="inline-start" />}
              Create credit
            </Button>
            <SheetClose asChild>
              <Button variant="outline" type="button" disabled={pending}>
                Cancel
              </Button>
            </SheetClose>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
