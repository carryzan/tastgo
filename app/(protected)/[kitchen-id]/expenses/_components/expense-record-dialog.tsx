'use client'

import { useState, useTransition } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useKitchen } from '@/hooks/use-kitchen'
import { Button } from '@/components/ui/button'
import {
  Field,
  FieldDescription,
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
  fetchActiveStaffMembers,
} from '../_lib/client-queries'
import { createExpenseRecord } from '../_lib/expense-actions'
import { DatePickerInput } from './date-picker-input'
import {
  EXPENSE_RECORDS_QUERY_KEY,
  EXPENSE_RECURRING_QUERY_KEY,
  type ExpenseRecurrenceSchedule,
} from '../_lib/queries'

interface ExpenseRecordDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialSchedule?: ExpenseRecurrenceSchedule | null
}

function getTodayDate() {
  return new Date().toISOString().split('T')[0]
}

function getInitialRecordState(initialSchedule?: ExpenseRecurrenceSchedule | null) {
  return {
    categoryId: initialSchedule?.category_id ?? '',
    name: initialSchedule?.name ?? '',
    amount: initialSchedule ? String(initialSchedule.amount) : '',
    billingPeriodType: (initialSchedule ? 'recurring' : 'one_time') as
      | 'one_time'
      | 'recurring',
    expenseDate: initialSchedule?.next_due_date ?? getTodayDate(),
    settlementAccountId: initialSchedule?.settlement_account_id ?? '',
    staffMemberId: '',
  }
}

export function ExpenseRecordDialog({
  open,
  onOpenChange,
  initialSchedule,
}: ExpenseRecordDialogProps) {
  const { kitchen } = useKitchen()
  const queryClient = useQueryClient()
  const initialState = getInitialRecordState(initialSchedule)
  const [categoryId, setCategoryId] = useState(initialState.categoryId)
  const [name, setName] = useState(initialState.name)
  const [amount, setAmount] = useState(initialState.amount)
  const [billingPeriodType, setBillingPeriodType] = useState(initialState.billingPeriodType)
  const [expenseDate, setExpenseDate] = useState(initialState.expenseDate)
  const [settlementAccountId, setSettlementAccountId] = useState(initialState.settlementAccountId)
  const [staffMemberId, setStaffMemberId] = useState(initialState.staffMemberId)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const { data: categories = [] } = useQuery({
    queryKey: ['expense-categories-picker', kitchen.id],
    queryFn: () => fetchActiveExpenseCategories(kitchen.id),
    enabled: open,
  })
  const { data: settlementAccounts = [] } = useQuery({
    queryKey: ['expense-settlement-accounts-picker', kitchen.id],
    queryFn: () => fetchActiveSettlementAccounts(kitchen.id),
    enabled: open,
  })
  const { data: staffMembers = [] } = useQuery({
    queryKey: ['expense-staff-members-picker', kitchen.id],
    queryFn: () => fetchActiveStaffMembers(kitchen.id),
    enabled: open,
  })

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (!categoryId) return setError('Select an expense category.')
    if (!name.trim()) return setError('Enter an expense name.')
    if (!settlementAccountId) return setError('Select a settlement account.')

    const parsedAmount = Number(amount)
    if (!amount || Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      return setError('Enter a valid amount greater than zero.')
    }

    startTransition(async () => {
      const result = await createExpenseRecord(kitchen.id, {
        category_id: categoryId,
        name: name.trim(),
        amount: parsedAmount,
        billing_period_type: billingPeriodType,
        expense_date: expenseDate,
        settlement_account_id: settlementAccountId,
        staff_member_id: staffMemberId || null,
        recurrence_schedule_id: initialSchedule?.id ?? null,
      })

      if (result instanceof Error) {
        setError(result.message)
        return
      }

      queryClient.invalidateQueries({ queryKey: EXPENSE_RECORDS_QUERY_KEY })
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
            {initialSchedule ? 'Record scheduled expense' : 'Record expense'}
          </SheetTitle>
          <SheetDescription>
            Create an expense record and post its journal entry automatically.
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
                <FieldLabel htmlFor="expense-record-name">Name</FieldLabel>
                <Input
                  id="expense-record-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="e.g. Electricity bill"
                  disabled={pending}
                />
              </Field>

              <Field>
                <FieldLabel>Billing Type</FieldLabel>
                <Select
                  value={billingPeriodType}
                  onValueChange={(value) =>
                    setBillingPeriodType(value as 'one_time' | 'recurring')
                  }
                  disabled={pending || Boolean(initialSchedule)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="one_time">One Time</SelectItem>
                    <SelectItem value="recurring">Recurring</SelectItem>
                  </SelectContent>
                </Select>
                {initialSchedule ? (
                  <FieldDescription>
                    This record is linked to the selected recurring schedule.
                  </FieldDescription>
                ) : null}
              </Field>

              <Field>
                <FieldLabel htmlFor="expense-record-amount">Amount</FieldLabel>
                <Input
                  id="expense-record-amount"
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
                <FieldLabel>Expense Date</FieldLabel>
                <DatePickerInput
                  value={expenseDate}
                  onChange={setExpenseDate}
                  placeholder="Pick a date"
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
                    <SelectValue placeholder="Select settlement account" />
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
                <FieldLabel>Staff Member (optional)</FieldLabel>
                <Select
                  value={staffMemberId || '__none__'}
                  onValueChange={(value) =>
                    setStaffMemberId(value === '__none__' ? '' : value)
                  }
                  disabled={pending}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="No staff member" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No staff member</SelectItem>
                    {staffMembers.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </FieldGroup>

            {error ? <FieldError>{error}</FieldError> : null}
          </div>

          <SheetFooter>
            <Button type="submit" disabled={pending} className="min-w-28">
              {pending ? <Spinner data-icon="inline-start" /> : null}
              Record Expense
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
