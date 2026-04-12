'use client'
import { useState, useTransition } from 'react'
import { useKitchen } from '@/hooks/use-kitchen'
import { updateSourceFee } from '@/lib/actions/source-fees'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CalendarIcon } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import {
  Dialog, DialogClose, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Field, FieldDescription, FieldError, FieldGroup, FieldLabel,
} from '@/components/ui/field'
import {
  Select, SelectContent, SelectGroup, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select'

interface SourceFee {
  id: string
  source_id: string
  commission_rate: number
  commission_basis: 'before_discount' | 'after_discount'
  fixed_fee: number
  effective_from: string
}

export function EditFee({ fee, open, onOpenChange }: { fee: SourceFee; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { sources } = useKitchen()
  const [error, setError] = useState<string | null>(null)
  const [effectiveFrom, setEffectiveFrom] = useState<Date | undefined>(
    fee.effective_from ? new Date(fee.effective_from) : undefined
  )
  const [pending, startTransition] = useTransition()

  const sourceName = (sources as { id: string; name: string }[]).find((s) => s.id === fee.source_id)?.name ?? '—'

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const formData = new FormData(e.currentTarget)
    const commission_rate = parseFloat(formData.get('commission_rate') as string)
    const commission_basis = formData.get('commission_basis') as 'before_discount' | 'after_discount'
    const fixed_fee = parseFloat(formData.get('fixed_fee') as string) || 0

    startTransition(async () => {
      try {
        const result = await updateSourceFee(fee.id, {
          commission_rate,
          commission_basis,
          fixed_fee,
          effective_from: effectiveFrom ? effectiveFrom.toISOString() : fee.effective_from,
        })
        if (result instanceof Error) return setError(result.message)
        onOpenChange(false)
      } catch {
        setError('Something went wrong. Please try again.')
      }
    })
  }

  const blockClose = (e: { preventDefault(): void }) => { if (pending) e.preventDefault() }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!pending) { onOpenChange(v); if (!v) setError(null) } }}>
      <DialogContent className="sm:max-w-sm" onInteractOutside={blockClose} onEscapeKeyDown={blockClose}>
        <DialogHeader>
          <DialogTitle>Edit Fee</DialogTitle>
          <DialogDescription>Update the fee settings for {sourceName}.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="edit-commission-rate">Commission Rate (%)</FieldLabel>
              <Input
                id="edit-commission-rate"
                name="commission_rate"
                type="number"
                min="0"
                max="100"
                step="0.01"
                defaultValue={fee.commission_rate}
                required
              />
            </Field>
            <Field>
              <FieldLabel>Commission Basis</FieldLabel>
              <Select name="commission_basis" defaultValue={fee.commission_basis}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="before_discount">Before discount</SelectItem>
                    <SelectItem value="after_discount">After discount</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
              <FieldDescription>What amount the commission is calculated on.</FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="edit-fixed-fee">Fixed Fee</FieldLabel>
              <Input
                id="edit-fixed-fee"
                name="fixed_fee"
                type="number"
                min="0"
                step="0.001"
                defaultValue={fee.fixed_fee}
                required
              />
              <FieldDescription>A flat fee charged per order, if any.</FieldDescription>
            </Field>
            <Field>
              <FieldLabel>Effective From</FieldLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn('justify-start text-left font-normal', !effectiveFrom && 'text-muted-foreground')}
                  >
                    <CalendarIcon />
                    {effectiveFrom ? format(effectiveFrom, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto" align="start">
                  <Calendar mode="single" selected={effectiveFrom} onSelect={setEffectiveFrom} />
                </PopoverContent>
              </Popover>
            </Field>
          </FieldGroup>
          {error && <FieldError className="mt-2">{error}</FieldError>}
          <DialogFooter className="mt-4">
            <DialogClose asChild>
              <Button variant="outline" disabled={pending}>Cancel</Button>
            </DialogClose>
            <Button type="submit" disabled={pending} className="min-w-28">
              {pending && <Spinner data-icon="inline-start" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}