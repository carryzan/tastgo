'use client'

import { useEffect, useState, useTransition } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useKitchen } from '@/hooks/use-kitchen'
import { applyCreditNote } from '../_lib/credit-note-actions'
import { CREDIT_NOTES_QUERY_KEY, PURCHASES_QUERY_KEY } from '../_lib/queries'
import { fetchPurchasesForSupplier } from '../_lib/client-queries'
import type { SupplierCreditNote } from './credit-note-columns'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'

interface ApplyCreditNoteDialogProps {
  creditNote: SupplierCreditNote
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ApplyCreditNoteDialog({
  creditNote,
  open,
  onOpenChange,
}: ApplyCreditNoteDialogProps) {
  const { kitchen } = useKitchen()
  const queryClient = useQueryClient()
  const [purchaseId, setPurchaseId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const { data: purchases } = useQuery({
    queryKey: ['purchases-for-supplier', kitchen.id, creditNote.supplier_id],
    queryFn: () => fetchPurchasesForSupplier(kitchen.id, creditNote.supplier_id),
    enabled: open,
  })

  useEffect(() => {
    if (!open) {
      setPurchaseId('')
      setError(null)
    }
  }, [open])

  function handleOpenChange(next: boolean) {
    if (pending) return
    onOpenChange(next)
    if (!next) setError(null)
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    if (!purchaseId) return setError('Select a purchase to apply this credit to.')

    startTransition(async () => {
      try {
        const result = await applyCreditNote(kitchen.id, creditNote.id, purchaseId)
        if (result instanceof Error) return setError(result.message)
        onOpenChange(false)
        queryClient.invalidateQueries({ queryKey: CREDIT_NOTES_QUERY_KEY })
        queryClient.invalidateQueries({ queryKey: PURCHASES_QUERY_KEY })
      } catch {
        setError('Something went wrong. Please try again.')
      }
    })
  }

  const formatAmount = (v: string | number) => {
    const n = typeof v === 'string' ? Number(v) : v
    return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
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
          <DialogTitle>Apply credit note</DialogTitle>
          <DialogDescription>
            Apply a credit of {formatAmount(creditNote.credit_value)} from{' '}
            {creditNote.suppliers?.name ?? 'this supplier'} to a purchase.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel>Purchase</FieldLabel>
              <Select value={purchaseId} onValueChange={setPurchaseId} disabled={pending}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select purchase" />
                </SelectTrigger>
                <SelectContent>
                  {(purchases ?? []).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      #{p.purchase_number}
                      {p.supplier_invoice_code ? ` — ${p.supplier_invoice_code}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              Apply
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
