'use client'

import { useState, useTransition } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useKitchen } from '@/hooks/use-kitchen'
import { createSupplierPayment } from '../_lib/payment-actions'
import { PAYMENTS_QUERY_KEY } from '../_lib/queries'
import {
  fetchActiveCashAccounts,
  fetchActiveSuppliers,
} from '../_lib/client-queries'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
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

interface AddPaymentSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddPaymentSheet({ open, onOpenChange }: AddPaymentSheetProps) {
  const { kitchen } = useKitchen()
  const queryClient = useQueryClient()
  const [supplierId, setSupplierId] = useState('')
  const [cashAccountId, setCashAccountId] = useState('')
  const [amount, setAmount] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const { data: suppliers } = useQuery({
    queryKey: ['active-suppliers', kitchen.id],
    queryFn: () => fetchActiveSuppliers(kitchen.id),
    enabled: open,
  })

  const { data: cashAccounts } = useQuery({
    queryKey: ['active-cash-accounts', kitchen.id],
    queryFn: () => fetchActiveCashAccounts(kitchen.id),
    enabled: open,
  })

  function resetForm() {
    setSupplierId('')
    setCashAccountId('')
    setAmount('')
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
    if (!cashAccountId) return setError('Select a settlement account.')

    const paymentAmount = Number(amount)
    if (!amount || Number.isNaN(paymentAmount) || paymentAmount <= 0) {
      return setError('Enter a valid payment amount.')
    }

    startTransition(async () => {
      try {
        const result = await createSupplierPayment({
          kitchen_id: kitchen.id,
          supplier_id: supplierId,
          amount: paymentAmount,
          settlement_account_id: cashAccountId,
        })
        if (result instanceof Error) return setError(result.message)
        resetForm()
        onOpenChange(false)
        queryClient.invalidateQueries({ queryKey: PAYMENTS_QUERY_KEY })
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
          <SheetTitle>Add payment</SheetTitle>
          <SheetDescription>
            Record a supplier payment. Allocate it to purchases from the payment detail view.
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
                <FieldLabel>Settlement account</FieldLabel>
                <Select value={cashAccountId} onValueChange={setCashAccountId} disabled={pending}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    {(cashAccounts ?? []).map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.code} · {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel htmlFor="add-payment-amount">Amount</FieldLabel>
                <Input
                  id="add-payment-amount"
                  type="number"
                  inputMode="decimal"
                  min="0.01"
                  step="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={pending}
                />
              </Field>
            </FieldGroup>

            {error && <FieldError>{error}</FieldError>}
          </div>

          <SheetFooter>
            <Button type="submit" disabled={pending} className="min-w-28">
              {pending && <Spinner data-icon="inline-start" />}
              Record payment
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
