'use client'

import { useState, useTransition } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useKitchen } from '@/hooks/use-kitchen'
import { createSupplier, createSupplierOpeningBalance } from '../_lib/supplier-actions'
import { SUPPLIERS_QUERY_KEY } from '../_lib/queries'
import { SupplierOpeningBalanceSection } from './supplier-opening-balance-section'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { Input } from '@/components/ui/input'
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
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'

interface AddSupplierSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddSupplierSheet({ open, onOpenChange }: AddSupplierSheetProps) {
  const { kitchen, kitchenSettings, membership } = useKitchen()
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const balanceDate =
    typeof kitchenSettings?.balance_date === 'string'
      ? kitchenSettings.balance_date
      : null
  const showOB = kitchenSettings?.balance_completed !== true && !!balanceDate

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

    const contact_name = (fd.get('contact_name') as string)?.trim() || undefined
    const phone = (fd.get('phone') as string)?.trim() || undefined
    const email = (fd.get('email') as string)?.trim() || undefined

    startTransition(async () => {
      try {
        const result = await createSupplier(kitchen.id, { name, contact_name, phone, email })
        if (result instanceof Error) return setError(result.message)

        const supplierId = result as string
        if (showOB && balanceDate) {
          const obAmount = parseFloat((fd.get('ob_outstanding_balance') as string) ?? '')
          if (obAmount > 0) {
            const obResult = await createSupplierOpeningBalance({
              kitchen_id: kitchen.id,
              supplier_id: supplierId,
              outstanding_balance: obAmount,
              as_of_date: balanceDate,
              created_by: (membership as unknown as { id: string }).id,
            })
            if (obResult instanceof Error) return setError(obResult.message)
          }
        }

        form.reset()
        onOpenChange(false)
        queryClient.invalidateQueries({ queryKey: SUPPLIERS_QUERY_KEY })
      } catch {
        setError('Something went wrong. Please try again.')
      }
    })
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        showCloseButton={!pending}
        onInteractOutside={(e) => {
          if (pending) e.preventDefault()
        }}
        onEscapeKeyDown={(e) => {
          if (pending) e.preventDefault()
        }}
      >
        <SheetHeader>
          <SheetTitle>Add supplier</SheetTitle>
          <SheetDescription>
            Create a new supplier for your kitchen.
          </SheetDescription>
        </SheetHeader>

        <form
          onSubmit={handleSubmit}
          className="flex flex-1 flex-col overflow-y-auto"
        >
          <div className="grid flex-1 auto-rows-min gap-6 px-4">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="add-sup-name">Name</FieldLabel>
                <Input
                  id="add-sup-name"
                  name="name"
                  placeholder="e.g. Fresh Foods Ltd"
                  required
                  disabled={pending}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="add-sup-contact">Contact name</FieldLabel>
                <Input
                  id="add-sup-contact"
                  name="contact_name"
                  placeholder="e.g. John Smith"
                  disabled={pending}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="add-sup-phone">Phone</FieldLabel>
                <Input
                  id="add-sup-phone"
                  name="phone"
                  type="tel"
                  placeholder="e.g. +1 555 0100"
                  disabled={pending}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="add-sup-email">Email</FieldLabel>
                <Input
                  id="add-sup-email"
                  name="email"
                  type="email"
                  placeholder="e.g. orders@freshfoods.com"
                  disabled={pending}
                />
              </Field>
            </FieldGroup>

            {showOB && (
              <SupplierOpeningBalanceSection
                removeBalance={false}
                onRemoveBalanceChange={() => {}}
              />
            )}
          </div>

          {error && (
            <div className="px-4 pt-2">
              <FieldError>{error}</FieldError>
            </div>
          )}

          <SheetFooter>
            <Button type="submit" disabled={pending} className="min-w-28">
              {pending && <Spinner data-icon="inline-start" />}
              Add supplier
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
