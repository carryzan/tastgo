'use client'

import { useState, useTransition } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useKitchen } from '@/hooks/use-kitchen'
import { reassignPurchaseSupplier } from '../_lib/purchase-actions'
import {
  CREDIT_NOTES_QUERY_KEY,
  PAYMENTS_QUERY_KEY,
  PURCHASES_QUERY_KEY,
  RETURNS_QUERY_KEY,
  SUPPLIERS_QUERY_KEY,
} from '../_lib/queries'
import { fetchAllSuppliers } from '../_lib/client-queries'
import type { Purchase } from './purchase-columns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface ReassignPurchaseDialogProps {
  purchase: Purchase
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ReassignPurchaseDialog({
  purchase,
  open,
  onOpenChange,
}: ReassignPurchaseDialogProps) {
  const { kitchen } = useKitchen()
  const queryClient = useQueryClient()
  const [toSupplierId, setToSupplierId] = useState('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const { data: suppliers } = useQuery({
    queryKey: ['all-suppliers', kitchen.id],
    queryFn: () => fetchAllSuppliers(kitchen.id),
    enabled: open,
  })

  function resetForm() {
    setToSupplierId('')
    setReason('')
    setError(null)
  }

  function handleOpenChange(nextOpen: boolean) {
    if (pending) return
    if (!nextOpen) resetForm()
    onOpenChange(nextOpen)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!toSupplierId) return setError('Select the new supplier.')
    if (toSupplierId === purchase.supplier_id) return setError('Select a different supplier.')
    if (!reason.trim()) return setError('Enter a reason for reassignment.')

    startTransition(async () => {
      try {
        const res = await reassignPurchaseSupplier(kitchen.id, purchase.id, toSupplierId, reason)
        if (res instanceof Error) return setError(res.message)
        resetForm()
        onOpenChange(false)
        queryClient.invalidateQueries({ queryKey: PURCHASES_QUERY_KEY })
        queryClient.invalidateQueries({ queryKey: RETURNS_QUERY_KEY })
        queryClient.invalidateQueries({ queryKey: CREDIT_NOTES_QUERY_KEY })
        queryClient.invalidateQueries({ queryKey: PAYMENTS_QUERY_KEY })
        queryClient.invalidateQueries({ queryKey: SUPPLIERS_QUERY_KEY })
      } catch {
        setError('Something went wrong. Please try again.')
      }
    })
  }

  const availableSuppliers = (suppliers ?? []).filter((s) => s.id !== purchase.supplier_id)

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reassign supplier</DialogTitle>
          <DialogDescription>
            Reassign purchase #{purchase.purchase_number} from{' '}
            {purchase.suppliers?.name ?? 'current supplier'} to a different supplier. Related purchase records and supplier balances will be moved where possible, and shared settlements will block the reassignment until they are cleaned up.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field>
            <FieldLabel>New supplier</FieldLabel>
            <Select value={toSupplierId} onValueChange={setToSupplierId} disabled={pending}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select supplier" />
              </SelectTrigger>
              <SelectContent>
                {availableSuppliers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="reassign-reason">Reason</FieldLabel>
            <Input
              id="reassign-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter reason for reassignment"
              disabled={pending}
            />
          </Field>
          {error && <FieldError>{error}</FieldError>}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={pending}>Cancel</Button>
            </DialogClose>
            <Button type="submit" disabled={pending} className="min-w-28">
              {pending && <Spinner data-icon="inline-start" />}
              Reassign
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
