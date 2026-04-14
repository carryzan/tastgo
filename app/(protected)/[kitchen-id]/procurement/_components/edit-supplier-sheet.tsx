'use client'

import { useEffect, useState, useTransition } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useKitchen } from '@/hooks/use-kitchen'
import {
  updateSupplier,
  createSupplierOpeningBalance,
  deleteSupplierOpeningBalance,
} from '../_lib/supplier-actions'
import { fetchSupplierOpeningBalance } from '../_lib/client-queries'
import { SUPPLIERS_QUERY_KEY } from '../_lib/queries'
import type { Supplier } from './supplier-columns'
import {
  SupplierOpeningBalanceSection,
  type SupplierBalance,
} from './supplier-opening-balance-section'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
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

interface EditSupplierSheetProps {
  supplier: Supplier
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditSupplierSheet({
  supplier,
  open,
  onOpenChange,
}: EditSupplierSheetProps) {
  const { kitchen, kitchenSettings, membership } = useKitchen()
  const queryClient = useQueryClient()
  const [isActive, setIsActive] = useState(supplier.is_active)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const balanceDate =
    typeof kitchenSettings?.balance_date === 'string'
      ? kitchenSettings.balance_date
      : null
  const showOB = kitchenSettings?.balance_completed !== true && !!balanceDate

  const [balance, setBalance] = useState<SupplierBalance | null>(null)
  const [balanceLoaded, setBalanceLoaded] = useState(false)
  const [removeBalance, setRemoveBalance] = useState(false)

  useEffect(() => {
    if (!open) {
      setIsActive(supplier.is_active)
      setError(null)
      setBalance(null)
      setBalanceLoaded(false)
      setRemoveBalance(false)
      return
    }
    if (!showOB) return
    setBalanceLoaded(false)
    fetchSupplierOpeningBalance(kitchen.id, supplier.id)
      .then((result) => {
        setBalance(result as SupplierBalance | null)
        setBalanceLoaded(true)
      })
      .catch(() => {
        setBalanceLoaded(true)
      })
  }, [open, supplier.id, supplier.is_active, kitchen.id, showOB])

  function handleOpenChange(next: boolean) {
    if (pending) return
    onOpenChange(next)
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const form = e.currentTarget
    const fd = new FormData(form)
    const name = (fd.get('name') as string)?.trim()
    if (!name) return

    const contact_name = (fd.get('contact_name') as string)?.trim() || null
    const phone = (fd.get('phone') as string)?.trim() || null
    const email = (fd.get('email') as string)?.trim() || null

    startTransition(async () => {
      try {
        const result = await updateSupplier(supplier.kitchen_id, supplier.id, {
          name,
          contact_name,
          phone,
          email,
          is_active: isActive,
        })
        if (result instanceof Error) return setError(result.message)

        if (removeBalance && balance?.id) {
          const delResult = await deleteSupplierOpeningBalance(kitchen.id, balance.id)
          if (delResult instanceof Error) return setError(delResult.message)
        } else if (!balance && showOB && balanceDate) {
          const obAmount = parseFloat((fd.get('ob_outstanding_balance') as string) ?? '')
          if (obAmount > 0) {
            const obResult = await createSupplierOpeningBalance({
              kitchen_id: kitchen.id,
              supplier_id: supplier.id,
              outstanding_balance: obAmount,
              as_of_date: balanceDate,
              created_by: (membership as unknown as { id: string }).id,
            })
            if (obResult instanceof Error) return setError(obResult.message)
          }
        }

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
          <SheetTitle>Edit supplier</SheetTitle>
          <SheetDescription>Update details for this supplier.</SheetDescription>
        </SheetHeader>

        <form
          onSubmit={handleSubmit}
          className="flex flex-1 flex-col overflow-y-auto"
        >
          <div className="grid flex-1 auto-rows-min gap-6 px-4">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="edit-sup-name">Name</FieldLabel>
                <Input
                  id="edit-sup-name"
                  name="name"
                  defaultValue={supplier.name}
                  required
                  disabled={pending}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="edit-sup-contact">Contact name</FieldLabel>
                <Input
                  id="edit-sup-contact"
                  name="contact_name"
                  defaultValue={supplier.contact_name ?? ''}
                  disabled={pending}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="edit-sup-phone">Phone</FieldLabel>
                <Input
                  id="edit-sup-phone"
                  name="phone"
                  type="tel"
                  defaultValue={supplier.phone ?? ''}
                  disabled={pending}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="edit-sup-email">Email</FieldLabel>
                <Input
                  id="edit-sup-email"
                  name="email"
                  type="email"
                  defaultValue={supplier.email ?? ''}
                  disabled={pending}
                />
              </Field>
              <Field>
                <div className="flex items-center justify-between">
                  <FieldLabel htmlFor="edit-sup-active">Active</FieldLabel>
                  <Switch
                    id="edit-sup-active"
                    checked={isActive}
                    onCheckedChange={setIsActive}
                    disabled={pending}
                  />
                </div>
              </Field>
            </FieldGroup>

            {showOB && balanceLoaded && (
              <SupplierOpeningBalanceSection
                balance={balance}
                removeBalance={removeBalance}
                onRemoveBalanceChange={setRemoveBalance}
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
              Save changes
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
