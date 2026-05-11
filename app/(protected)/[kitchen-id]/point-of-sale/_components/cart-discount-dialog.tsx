'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { FieldError } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { DiscountType } from '@/lib/types/orders'

export interface CartDiscount {
  type: DiscountType
  value: number
  reason: string | null
}

interface CartDiscountDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  value: CartDiscount | null
  onApply: (discount: CartDiscount | null) => void
}

export function CartDiscountDialog({
  open,
  onOpenChange,
  value,
  onApply,
}: CartDiscountDialogProps) {
  const [type, setType] = useState<DiscountType>(value?.type ?? 'fixed')
  const [amount, setAmount] = useState(value ? String(value.value) : '')
  const [reason, setReason] = useState(value?.reason ?? '')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setType(value?.type ?? 'fixed')
      setAmount(value ? String(value.value) : '')
      setReason(value?.reason ?? '')
      setError(null)
    }
  }, [open, value])

  function submit() {
    setError(null)
    const numeric = Number(amount)
    if (!Number.isFinite(numeric) || numeric <= 0) {
      setError('Enter a discount greater than zero.')
      return
    }
    if (type === 'percentage' && numeric > 100) {
      setError('Percentage discount cannot exceed 100.')
      return
    }
    onApply({ type, value: numeric, reason: reason.trim() || null })
    onOpenChange(false)
  }

  function remove() {
    onApply(null)
    onOpenChange(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setError(null)
        onOpenChange(next)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Apply discount</DialogTitle>
          <DialogDescription>
            Discount will be applied when the order is created.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant={type === 'fixed' ? 'default' : 'outline'}
            onClick={() => setType('fixed')}
          >
            Fixed
          </Button>
          <Button
            type="button"
            variant={type === 'percentage' ? 'default' : 'outline'}
            onClick={() => setType('percentage')}
          >
            Percentage
          </Button>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="cart-discount-amount">
            {type === 'fixed' ? 'Amount' : 'Percentage'}
          </Label>
          <Input
            id="cart-discount-amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="decimal"
            placeholder={type === 'fixed' ? '0.00' : '0'}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="cart-discount-reason">Reason</Label>
          <Textarea
            id="cart-discount-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Optional"
          />
        </div>

        {error ? <FieldError>{error}</FieldError> : null}

        <DialogFooter>
          <Button type="button" onClick={submit}>
            Apply discount
          </Button>
          {value ? (
            <Button type="button" variant="outline" onClick={remove}>
              Remove discount
            </Button>
          ) : (
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
