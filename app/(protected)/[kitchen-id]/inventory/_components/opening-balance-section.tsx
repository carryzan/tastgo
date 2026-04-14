'use client'

import { useState } from 'react'
import { ChevronsUpDown, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field, FieldLabel } from '@/components/ui/field'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import type { OpeningBalance } from '../_lib/opening-balance-actions'

interface OpeningBalanceSectionProps {
  balance?: OpeningBalance | null
  removeBalance: boolean
  onRemoveBalanceChange: (remove: boolean) => void
}

export function OpeningBalanceSection({
  balance,
  removeBalance,
  onRemoveBalanceChange,
}: OpeningBalanceSectionProps) {
  const [isOpen, setIsOpen] = useState(false)
  const isEdit = !!balance

  if (isEdit && removeBalance) {
    return (
      <div className="rounded-md border border-dashed border-destructive/50 px-4 py-3">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Starting inventory will be removed on save
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
        <h4 className="text-sm font-semibold">Starting Inventory</h4>
        <div className="flex items-center gap-1">
          {isEdit && !balance?.has_ledger_entries && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 text-destructive hover:text-destructive"
              onClick={() => onRemoveBalanceChange(true)}
            >
              <Trash2 className="size-4" />
            </Button>
          )}
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8">
              <ChevronsUpDown className="size-4" />
            </Button>
          </CollapsibleTrigger>
        </div>
      </div>
      <CollapsibleContent className="flex flex-col gap-3 pt-2">
        <div className="grid grid-cols-2 gap-3">
          <Field>
            <FieldLabel htmlFor="ob-quantity">Quantity</FieldLabel>
            <Input
              id="ob-quantity"
              name="ob_quantity"
              type="number"
              min="0.0001"
              step="0.0001"
              defaultValue={balance?.quantity ?? ''}
              disabled={isEdit}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="ob-unit-cost">Unit Cost</FieldLabel>
            <Input
              id="ob-unit-cost"
              name="ob_unit_cost"
              type="number"
              min="0.000001"
              step="0.000001"
              defaultValue={balance?.unit_cost ?? ''}
              disabled={isEdit}
            />
          </Field>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
