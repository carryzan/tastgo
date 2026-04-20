'use client'

import { useState, useTransition } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useKitchen } from '@/hooks/use-kitchen'
import { PlusIcon, TrashIcon } from 'lucide-react'
import { createManualJournal } from '../_lib/journal-actions'
import { JOURNAL_ENTRIES_QUERY_KEY } from '../_lib/queries'
import { fetchChartAccountsForPicker } from '../_lib/client-queries'
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

interface JournalLine {
  id: string
  account_id: string
  debit: string
  credit: string
  line_memo: string
}

function newLine(): JournalLine {
  return {
    id: crypto.randomUUID(),
    account_id: '',
    debit: '',
    credit: '',
    line_memo: '',
  }
}

interface AddManualJournalDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddManualJournalDialog({
  open,
  onOpenChange,
}: AddManualJournalDialogProps) {
  const { kitchen } = useKitchen()
  const queryClient = useQueryClient()
  const [lines, setLines] = useState<JournalLine[]>([newLine(), newLine()])
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const { data: accounts } = useQuery({
    queryKey: ['chart-accounts-picker', kitchen.id],
    queryFn: () => fetchChartAccountsForPicker(kitchen.id),
    enabled: open,
  })

  const today = new Date().toISOString().split('T')[0]

  const totalDebit = lines.reduce(
    (s, l) => s + (Number.parseFloat(l.debit) || 0),
    0
  )
  const totalCredit = lines.reduce(
    (s, l) => s + (Number.parseFloat(l.credit) || 0),
    0
  )
  const isBalanced =
    Math.abs(totalDebit - totalCredit) < 0.001 && totalDebit > 0

  function updateLine(id: string, field: keyof JournalLine, value: string) {
    setLines((prev) =>
      prev.map((l) => (l.id === id ? { ...l, [field]: value } : l))
    )
  }

  function addLine() {
    setLines((prev) => [...prev, newLine()])
  }

  function removeLine(id: string) {
    if (lines.length <= 2) return
    setLines((prev) => prev.filter((l) => l.id !== id))
  }

  function handleOpenChange(next: boolean) {
    if (pending) return
    onOpenChange(next)
    if (!next) {
      setLines([newLine(), newLine()])
      setError(null)
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const fd = new FormData(e.currentTarget)
    const entryDate = fd.get('entry_date') as string
    const memo = (fd.get('memo') as string)?.trim()

    if (!entryDate) return setError('Entry date is required.')
    if (!memo) return setError('Memo is required.')

    if (!isBalanced) {
      return setError(
        `Journal is not balanced. Debits: ${totalDebit.toFixed(3)}, Credits: ${totalCredit.toFixed(3)}.`
      )
    }

    const validLines = lines.filter((l) => l.account_id)
    if (validLines.length < 2) {
      return setError('At least two lines with accounts are required.')
    }

    const mappedLines = validLines.map((l) => ({
      account_id: l.account_id,
      debit: Number.parseFloat(l.debit) || 0,
      credit: Number.parseFloat(l.credit) || 0,
      line_memo: l.line_memo || undefined,
    }))

    startTransition(async () => {
      try {
        const result = await createManualJournal(kitchen.id, {
          entryDate,
          memo,
          lines: mappedLines,
        })
        if (result instanceof Error) return setError(result.message)

        setLines([newLine(), newLine()])
        onOpenChange(false)
        queryClient.invalidateQueries({ queryKey: JOURNAL_ENTRIES_QUERY_KEY })
      } catch {
        setError('Something went wrong. Please try again.')
      }
    })
  }

  function formatNum(n: number) {
    return n.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 3,
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-fit sm:max-w-[calc(100%-2rem)]">
        <DialogHeader>
          <DialogTitle>New manual journal</DialogTitle>
          <DialogDescription>
            Post a balanced double-entry journal. Debits must equal credits.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel htmlFor="mj-date">Entry Date</FieldLabel>
                <Input
                  id="mj-date"
                  name="entry_date"
                  type="date"
                  defaultValue={today}
                  required
                  disabled={pending}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="mj-memo">Memo</FieldLabel>
                <Input
                  id="mj-memo"
                  name="memo"
                  placeholder="Describe this entry"
                  required
                  disabled={pending}
                />
              </Field>
            </div>
          </FieldGroup>

          {/* Lines */}
          <div className="mt-4 space-y-2">
            <div className="grid grid-cols-[1fr_100px_100px_28px] gap-2 text-xs font-medium text-muted-foreground">
              <span>Account</span>
              <span className="text-right">Debit</span>
              <span className="text-right">Credit</span>
              <span />
            </div>
            {lines.map((line) => (
              <div
                key={line.id}
                className="grid grid-cols-[1fr_100px_100px_28px] gap-2 items-center"
              >
                <Select
                  value={line.account_id}
                  onValueChange={(v) =>
                    updateLine(line.id, 'account_id', v)
                  }
                  disabled={pending}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts?.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.code} · {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  value={line.debit}
                  onChange={(e) =>
                    updateLine(line.id, 'debit', e.target.value)
                  }
                  type="text"
                  inputMode="decimal"
                  placeholder="0.000"
                  className="text-right"
                  disabled={pending}
                />
                <Input
                  value={line.credit}
                  onChange={(e) =>
                    updateLine(line.id, 'credit', e.target.value)
                  }
                  type="text"
                  inputMode="decimal"
                  placeholder="0.000"
                  className="text-right"
                  disabled={pending}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => removeLine(line.id)}
                  disabled={pending || lines.length <= 2}
                >
                  <TrashIcon className="size-3.5" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-1 h-7 text-xs"
              onClick={addLine}
              disabled={pending}
            >
              <PlusIcon className="mr-1 size-3" />
              Add line
            </Button>

            {/* Balance summary */}
            <div className="mt-2 grid grid-cols-[1fr_100px_100px_28px] gap-2 border-t pt-2 text-sm font-medium">
              <span>Total</span>
              <span
                className={`text-right font-mono ${
                  !isBalanced && totalDebit > 0
                    ? 'text-destructive'
                    : ''
                }`}
              >
                {formatNum(totalDebit)}
              </span>
              <span
                className={`text-right font-mono ${
                  !isBalanced && totalCredit > 0
                    ? 'text-destructive'
                    : ''
                }`}
              >
                {formatNum(totalCredit)}
              </span>
              <span />
            </div>
            {totalDebit > 0 && !isBalanced && (
              <p className="text-xs text-destructive">
                Out of balance by{' '}
                {formatNum(Math.abs(totalDebit - totalCredit))}
              </p>
            )}
          </div>

          {error && <FieldError className="mt-2">{error}</FieldError>}

          <DialogFooter className="mt-4">
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={pending}>
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="submit"
              disabled={pending || !isBalanced}
              className="min-w-28"
            >
              {pending && <Spinner data-icon="inline-start" />}
              Post journal
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
