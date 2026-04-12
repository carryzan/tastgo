'use client'
import { useState, useTransition } from 'react'
import { useKitchen } from '@/hooks/use-kitchen'
import { createSourceFee } from '@/lib/actions/source-fees'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CalendarIcon } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import {
  Dialog, DialogClose, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import {
  Field, FieldDescription, FieldError, FieldGroup, FieldLabel,
} from '@/components/ui/field'
import {
  Select, SelectContent, SelectGroup, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'

export function AddFee() {
  const { kitchen, sources } = useKitchen()
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [effectiveFrom, setEffectiveFrom] = useState<Date | undefined>(undefined)
  const [pending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const formData = new FormData(e.currentTarget)
    const source_id = formData.get('source_id') as string
    const commission_rate = parseFloat(formData.get('commission_rate') as string)
    const commission_basis = formData.get('commission_basis') as 'before_discount' | 'after_discount'
    const fixed_fee = parseFloat(formData.get('fixed_fee') as string) || 0

    if (!source_id) return setError('Please select a source.')

    startTransition(async () => {
      try {
        const result = await createSourceFee({
          kitchen_id: kitchen.id,
          source_id,
          commission_rate,
          commission_basis,
          fixed_fee,
          effective_from: effectiveFrom ? effectiveFrom.toISOString() : new Date().toISOString(),
        })
        if (result instanceof Error) return setError(result.message)
        setEffectiveFrom(undefined)
        setOpen(false)
      } catch {
        setError('Something went wrong. Please try again.')
      }
    })
  }

  const blockClose = (e: { preventDefault(): void }) => { if (pending) e.preventDefault() }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!pending) { setOpen(v); if (!v) { setError(null); setEffectiveFrom(undefined) } } }}>
      <DialogTrigger asChild>
        <Button>Add Fee</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm" onInteractOutside={blockClose} onEscapeKeyDown={blockClose}>
        <DialogHeader>
          <DialogTitle>Add Fee</DialogTitle>
          <DialogDescription>Set a commission or fixed fee for a source.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel>Source</FieldLabel>
              <Select name="source_id" required>
                <SelectTrigger>
                  <SelectValue placeholder="Select a source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {(sources as { id: string; name: string }[]).map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="commission-rate">Commission Rate (%)</FieldLabel>
              <Input id="commission-rate" name="commission_rate" type="number" min="0" max="100" step="0.01" defaultValue="0" required />
            </Field>
            <Field>
              <FieldLabel>Commission Basis</FieldLabel>
              <Select name="commission_basis" defaultValue="after_discount">
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
              <FieldLabel htmlFor="fixed-fee">Fixed Fee</FieldLabel>
              <Input id="fixed-fee" name="fixed_fee" type="number" min="0" step="0.001" defaultValue="0" required />
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
              <FieldDescription>Leave blank to use today.</FieldDescription>
            </Field>
          </FieldGroup>
          {error && <FieldError className="mt-2">{error}</FieldError>}
          <DialogFooter className="mt-4">
            <DialogClose asChild>
              <Button variant="outline" disabled={pending}>Cancel</Button>
            </DialogClose>
            <Button type="submit" disabled={pending} className="min-w-28">
              {pending && <Spinner data-icon="inline-start" />}
              Add Fee
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}