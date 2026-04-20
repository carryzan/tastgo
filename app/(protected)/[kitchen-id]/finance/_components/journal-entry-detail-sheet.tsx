'use client'

import { useState, useTransition } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Spinner } from '@/components/ui/spinner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { fetchJournalEntryLines } from '../_lib/client-queries'
import { reverseManualJournal } from '../_lib/journal-actions'
import { JOURNAL_ENTRIES_QUERY_KEY } from '../_lib/queries'
import { type JournalEntry, ENTRY_TYPE_LABELS } from './journal-entry-columns'

interface JournalEntryDetailSheetProps {
  entry: JournalEntry
  open: boolean
  onOpenChange: (open: boolean) => void
  canReverse: boolean
  kitchenId: string
}

function formatAmount(value: string | number) {
  const n = typeof value === 'string' ? Number(value) : value
  if (Number.isNaN(n)) return '—'
  return n.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 3,
  })
}

export function JournalEntryDetailSheet({
  entry,
  open,
  onOpenChange,
  canReverse,
  kitchenId,
}: JournalEntryDetailSheetProps) {
  const queryClient = useQueryClient()
  const [reverseOpen, setReverseOpen] = useState(false)
  const [reverseError, setReverseError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const { data: lines, isLoading } = useQuery({
    queryKey: ['journal-entry-lines', entry.id],
    queryFn: () => fetchJournalEntryLines(entry.id),
    enabled: open,
  })

  const showReverseButton =
    canReverse &&
    entry.status === 'posted' &&
    entry.entry_type === 'manual_journal' &&
    !entry.reversal_of_id

  function handleReverse(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setReverseError(null)
    const fd = new FormData(e.currentTarget)
    const reversalDate = fd.get('reversal_date') as string
    const reason = (fd.get('reason') as string)?.trim()

    if (!reversalDate) return setReverseError('Reversal date is required.')
    if (!reason || reason.length < 3)
      return setReverseError('Enter a reason for the reversal.')

    startTransition(async () => {
      try {
        const result = await reverseManualJournal(kitchenId, {
          journalEntryId: entry.id,
          reversalDate,
          reason,
        })
        if (result instanceof Error) return setReverseError(result.message)

        setReverseOpen(false)
        onOpenChange(false)
        queryClient.invalidateQueries({ queryKey: JOURNAL_ENTRIES_QUERY_KEY })
      } catch {
        setReverseError('Something went wrong. Please try again.')
      }
    })
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="flex flex-col gap-0 p-0">
          <SheetHeader className="px-4 pt-4 pb-4">
            <SheetTitle>
              Journal #{entry.journal_number}
            </SheetTitle>
            <SheetDescription asChild>
              <span className="flex items-center gap-2">
                <Badge variant={entry.status === 'posted' ? 'secondary' : 'outline'}>
                  {entry.status}
                </Badge>
                <span className="text-muted-foreground">·</span>
                <span>
                  {ENTRY_TYPE_LABELS[entry.entry_type] ?? entry.entry_type}
                </span>
                <span className="text-muted-foreground">·</span>
                <span>
                  {new Date(entry.entry_date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              </span>
            </SheetDescription>
          </SheetHeader>

          {entry.memo && (
            <div className="px-4 pb-2 text-sm text-muted-foreground">
              {entry.memo}
            </div>
          )}

          {entry.period && (
            <div className="px-4 pb-2 text-sm">
              Period:{' '}
              <span className="font-medium">{entry.period.name}</span>
            </div>
          )}

          <Separator />

          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-4">
            <p className="pt-4 pb-2 text-sm font-medium">Lines</p>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Spinner />
              </div>
            ) : !lines || lines.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No lines found.
              </p>
            ) : (
              <div className="space-y-0 divide-y divide-border">
                {/* Header */}
                <div className="grid grid-cols-[1fr_auto_auto] gap-4 py-1.5 text-xs font-medium text-muted-foreground">
                  <span>Account</span>
                  <span className="w-24 text-right">Debit</span>
                  <span className="w-24 text-right">Credit</span>
                </div>
                {lines.map((line) => (
                  <div
                    key={line.id}
                    className="grid grid-cols-[1fr_auto_auto] gap-4 py-2.5"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {line.account
                          ? `${line.account.code} · ${line.account.name}`
                          : '—'}
                      </p>
                      {line.line_memo && (
                        <p className="text-xs text-muted-foreground">
                          {line.line_memo}
                        </p>
                      )}
                    </div>
                    <span className="w-24 text-right text-sm font-mono">
                      {Number(line.debit) !== 0
                        ? formatAmount(line.debit)
                        : '—'}
                    </span>
                    <span className="w-24 text-right text-sm font-mono">
                      {Number(line.credit) !== 0
                        ? formatAmount(line.credit)
                        : '—'}
                    </span>
                  </div>
                ))}
                {/* Totals */}
                <div className="grid grid-cols-[1fr_auto_auto] gap-4 py-2.5 font-medium">
                  <span className="text-sm">Total</span>
                  <span className="w-24 text-right text-sm font-mono">
                    {formatAmount(entry.total_debit)}
                  </span>
                  <span className="w-24 text-right text-sm font-mono">
                    {formatAmount(entry.total_credit)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {showReverseButton && (
            <>
              <Separator />
              <div className="px-4 py-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setReverseOpen(true)}
                >
                  Reverse Entry
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Reverse dialog */}
      <Dialog
        open={reverseOpen}
        onOpenChange={(next) => {
          if (pending) return
          setReverseOpen(next)
          if (!next) setReverseError(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reverse journal entry</DialogTitle>
            <DialogDescription>
              A reversing entry will be posted on the specified date.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleReverse}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="rev-date">Reversal Date</FieldLabel>
                <Input
                  id="rev-date"
                  name="reversal_date"
                  type="date"
                  defaultValue={today}
                  required
                  disabled={pending}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="rev-reason">Reason</FieldLabel>
                <Input
                  id="rev-reason"
                  name="reason"
                  placeholder="e.g. Incorrect entry"
                  required
                  disabled={pending}
                />
              </Field>
            </FieldGroup>
            {reverseError && (
              <FieldError className="mt-2">{reverseError}</FieldError>
            )}
            <DialogFooter className="mt-4">
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={pending}>
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={pending} className="min-w-28">
                {pending && <Spinner data-icon="inline-start" />}
                Reverse
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
