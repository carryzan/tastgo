'use client'

import { useState } from 'react'
import { ChevronsUpDownIcon, Trash2Icon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field, FieldLabel } from '@/components/ui/field'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'

export interface SupplierBalance {
  id: string
  outstanding_balance: string | number
  has_purchases: boolean
  has_payments: boolean
}

interface SupplierOpeningBalanceSectionProps {
  balance?: SupplierBalance | null
  removeBalance: boolean
  onRemoveBalanceChange: (remove: boolean) => void
}

export function SupplierOpeningBalanceSection({
  balance,
  removeBalance,
  onRemoveBalanceChange,
}: SupplierOpeningBalanceSectionProps) {
  const [isOpen, setIsOpen] = useState(false)
  const isEdit = !!balance
  const isGuarded = isEdit && (balance.has_purchases || balance.has_payments)

  if (isEdit && removeBalance) {
    return (
      <div className="rounded-md border border-dashed border-destructive/50 px-4 py-3">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Opening balance will be removed on save
          </p>
          <Button
            type="button"
            variant="link"
            size="sm"
            className="h-auto p-0"
            onClick={() => onRemoveBalanceChange(false)}
          >
            Undo
          </Button>
        </div>
      </div>
    )
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Opening Balance</h4>
        <div className="flex items-center gap-1">
          {isEdit && !isGuarded && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 text-destructive hover:text-destructive"
              onClick={() => onRemoveBalanceChange(true)}
            >
              <Trash2Icon className="size-4" />
            </Button>
          )}
          <CollapsibleTrigger asChild>
            <Button type="button" variant="ghost" size="icon" className="size-8">
              <ChevronsUpDownIcon className="size-4" />
            </Button>
          </CollapsibleTrigger>
        </div>
      </div>
      <CollapsibleContent className="flex flex-col gap-3 pt-2">
        {isGuarded ? (
          <p className="text-sm text-muted-foreground">
            Opening balance cannot be changed after purchases or payments exist for this supplier.
          </p>
        ) : (
          <Field>
            <FieldLabel htmlFor="ob-amount">Outstanding balance</FieldLabel>
            <Input
              id="ob-amount"
              name="ob_outstanding_balance"
              type="number"
              min="0"
              step="0.01"
              defaultValue={isEdit ? String(balance.outstanding_balance) : ''}
              disabled={isEdit}
              placeholder="0.00"
            />
          </Field>
        )}
      </CollapsibleContent>
    </Collapsible>
  )
}
