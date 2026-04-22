'use client'

import { useState, useTransition } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useKitchen } from '@/hooks/use-kitchen'
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
import { Spinner } from '@/components/ui/spinner'
import { fetchActiveExpenseAccounts } from '../_lib/client-queries'
import {
  createExpenseCategory,
  updateExpenseCategory,
} from '../_lib/category-actions'
import { EXPENSE_CATEGORIES_QUERY_KEY, type ExpenseCategory } from '../_lib/queries'

interface ExpenseCategoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  category?: ExpenseCategory | null
}

export function ExpenseCategoryDialog({
  open,
  onOpenChange,
  category,
}: ExpenseCategoryDialogProps) {
  const { kitchen } = useKitchen()
  const queryClient = useQueryClient()
  const [name, setName] = useState(category?.name ?? '')
  const [expenseAccountId, setExpenseAccountId] = useState(category?.expense_account_id ?? '')
  const [isActive, setIsActive] = useState<'true' | 'false'>(
    category?.is_active === false ? 'false' : 'true'
  )
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const { data: accounts = [] } = useQuery({
    queryKey: ['expense-account-options', kitchen.id],
    queryFn: () => fetchActiveExpenseAccounts(kitchen.id),
    enabled: open,
  })

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (!name.trim()) return setError('Enter a category name.')
    if (!expenseAccountId) return setError('Select an expense account.')

    startTransition(async () => {
      const payload = {
        name: name.trim(),
        expense_account_id: expenseAccountId,
        is_active: isActive === 'true',
      }

      const result = category
        ? await updateExpenseCategory(kitchen.id, category.id, payload)
        : await createExpenseCategory(kitchen.id, payload)

      if (result instanceof Error) {
        setError(result.message)
        return
      }

      queryClient.invalidateQueries({ queryKey: EXPENSE_CATEGORIES_QUERY_KEY })
      onOpenChange(false)
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!pending) onOpenChange(next)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{category ? 'Edit category' : 'Add category'}</DialogTitle>
          <DialogDescription>
            Map each expense category to its chart-of-accounts expense account.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="expense-category-name">Name</FieldLabel>
              <Input
                id="expense-category-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Utilities"
                disabled={pending}
              />
            </Field>

            <Field>
              <FieldLabel>Expense Account</FieldLabel>
              <Select
                value={expenseAccountId}
                onValueChange={setExpenseAccountId}
                disabled={pending}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.code} · {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            {category ? (
              <Field>
                <FieldLabel>Status</FieldLabel>
                <Select
                  value={isActive}
                  onValueChange={(value) => setIsActive(value as 'true' | 'false')}
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

          {error ? <FieldError className="mt-4">{error}</FieldError> : null}

          <DialogFooter className="mt-6">
            <DialogClose asChild>
              <Button variant="outline" type="button" disabled={pending}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={pending} className="min-w-28">
              {pending ? <Spinner data-icon="inline-start" /> : null}
              {category ? 'Save Changes' : 'Add Category'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
