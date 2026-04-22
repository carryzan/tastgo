'use client'

import { useState, useTransition } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useKitchen } from '@/hooks/use-kitchen'
import { Button } from '@/components/ui/button'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Spinner } from '@/components/ui/spinner'
import {
  fetchActiveExpenseCategories,
  fetchActiveSettlementAccounts,
} from '../_lib/client-queries'
import {
  createExpenseRecurrenceSchedule,
  updateExpenseRecurrenceSchedule,
} from '../_lib/recurrence-actions'
import { DatePickerInput } from './date-picker-input'
import {
  EXPENSE_RECURRING_QUERY_KEY,
  type ExpenseRecurrenceSchedule,
} from '../_lib/queries'

interface ExpenseRecurringDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  schedule?: ExpenseRecurrenceSchedule | null
}

export function ExpenseRecurringDialog({
  open,
  onOpenChange,
  schedule,
}: ExpenseRecurringDialogProps) {
  const { kitchen, membership } = useKitchen()
  const queryClient = useQueryClient()
  const [categoryId, setCategoryId] = useState(schedule?.category_id ?? '')
  const [name, setName] = useState(schedule?.name ?? '')
  const [amount, setAmount] = useState(schedule ? String(schedule.amount) : '')
  const [settlementAccountId, setSettlementAccountId] = useState(
    schedule?.settlement_account_id ?? ''
  )
  const [frequency, setFrequency] = useState<'weekly' | 'monthly'>(
    schedule?.frequency ?? 'monthly'
  )
  const [nextDueDate, setNextDueDate] = useState(
    schedule?.next_due_date ?? new Date().toISOString().split('T')[0]
  )
  const [isActive, setIsActive] = useState<'true' | 'false'>(
    schedule?.is_active === false ? 'false' : 'true'
  )
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const { data: categories = [] } = useQuery({
    queryKey: ['expense-recurring-categories', kitchen.id],
    queryFn: () => fetchActiveExpenseCategories(kitchen.id),
    enabled: open,
  })
  const { data: settlementAccounts = [] } = useQuery({
    queryKey: ['expense-recurring-settlement-accounts', kitchen.id],
    queryFn: () => fetchActiveSettlementAccounts(kitchen.id),
    enabled: open,
  })

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (!categoryId) return setError('Select a category.')
    if (!name.trim()) return setError('Enter a schedule name.')
    if (!settlementAccountId) return setError('Select a settlement account.')

    const parsedAmount = Number(amount)
    if (!amount || Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      return setError('Enter a valid amount greater than zero.')
    }

    startTransition(async () => {
      const payload = {
        category_id: categoryId,
        name: name.trim(),
        amount: parsedAmount,
        settlement_account_id: settlementAccountId,
        frequency,
        next_due_date: nextDueDate,
        is_active: isActive === 'true',
        created_by: (membership as unknown as { id: string }).id,
      }

      const result = schedule
        ? await updateExpenseRecurrenceSchedule(kitchen.id, schedule.id, payload)
        : await createExpenseRecurrenceSchedule(kitchen.id, payload)

      if (result instanceof Error) {
        setError(result.message)
        return
      }

      queryClient.invalidateQueries({ queryKey: EXPENSE_RECURRING_QUERY_KEY })
      onOpenChange(false)
    })
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!pending) onOpenChange(next)
      }}
    >
      <SheetContent
        className="flex flex-col gap-0"
        showCloseButton={!pending}
        onInteractOutside={(event) => {
          if (pending) event.preventDefault()
        }}
        onEscapeKeyDown={(event) => {
          if (pending) event.preventDefault()
        }}
      >
        <SheetHeader>
          <SheetTitle>
            {schedule ? 'Edit recurring schedule' : 'Add recurring schedule'}
          </SheetTitle>
          <SheetDescription>
            Track recurring costs and record them directly from the schedule.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-y-auto">
          <div className="grid flex-1 auto-rows-min gap-6 px-4 pb-4">
            <FieldGroup>
              <Field>
                <FieldLabel>Category</FieldLabel>
                <Select value={categoryId} onValueChange={setCategoryId} disabled={pending}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel htmlFor="expense-recurring-name">Name</FieldLabel>
                <Input
                  id="expense-recurring-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="e.g. Weekly waste collection"
                  disabled={pending}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="expense-recurring-amount">Amount</FieldLabel>
                <Input
                  id="expense-recurring-amount"
                  type="number"
                  inputMode="decimal"
                  min="0.01"
                  step="0.01"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="0.00"
                  disabled={pending}
                />
              </Field>

              <Field>
                <FieldLabel>Settlement Account</FieldLabel>
                <Select
                  value={settlementAccountId}
                  onValueChange={setSettlementAccountId}
                  disabled={pending}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    {settlementAccounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.code} · {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel>Frequency</FieldLabel>
                <Select
                  value={frequency}
                  onValueChange={(value) => setFrequency(value as 'weekly' | 'monthly')}
                  disabled={pending}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel>Next Due Date</FieldLabel>
                <DatePickerInput
                  value={nextDueDate}
                  onChange={setNextDueDate}
                  placeholder="Pick a date"
                  disabled={pending}
                />
              </Field>

              {schedule ? (
                <Field>
                  <FieldLabel>Status</FieldLabel>
                  <Select
                    value={isActive}
                    onValueChange={(value) => setIsActive(value as 'true' | 'false')}
                    disabled={pending}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Active</SelectItem>
                      <SelectItem value="false">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              ) : null}
            </FieldGroup>

            {error ? <FieldError>{error}</FieldError> : null}
          </div>

          <SheetFooter>
            <Button type="submit" disabled={pending} className="min-w-28">
              {pending ? <Spinner data-icon="inline-start" /> : null}
              {schedule ? 'Save Changes' : 'Add Schedule'}
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
