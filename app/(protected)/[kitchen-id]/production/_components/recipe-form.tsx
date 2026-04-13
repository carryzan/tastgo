'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'

export interface RecipeFormValues {
  name: string
  track_stock: boolean
  variance_tolerance_percentage: number | null
}

interface RecipeFormProps {
  defaultValues?: RecipeFormValues
  disableTrackStock?: boolean
  error: string | null
  children: React.ReactNode
}

export function RecipeForm({
  defaultValues,
  disableTrackStock = false,
  error,
  children,
}: RecipeFormProps) {
  const [trackStock, setTrackStock] = useState(
    defaultValues?.track_stock ?? false
  )

  return (
    <>
      <div className="grid flex-1 auto-rows-min gap-6 px-4">
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="recipe-name">Name</FieldLabel>
            <Input
              id="recipe-name"
              name="name"
              placeholder="Recipe name"
              defaultValue={defaultValues?.name}
              required
            />
          </Field>

          <Field>
            <div className="flex items-center justify-between">
              <FieldLabel htmlFor="recipe-track-stock">Track Stock</FieldLabel>
              <input type="hidden" name="track_stock" value={trackStock ? 'true' : 'false'} />
              <Switch
                id="recipe-track-stock"
                checked={trackStock}
                onCheckedChange={setTrackStock}
                disabled={disableTrackStock}
              />
            </div>
            <FieldDescription>
              When enabled, batches will deduct from inventory.
            </FieldDescription>
          </Field>

          <Field>
            <FieldLabel htmlFor="recipe-variance">
              Variance Tolerance %
            </FieldLabel>
            <Input
              id="recipe-variance"
              name="variance_tolerance_percentage"
              type="number"
              min="0"
              max="100"
              step="0.01"
              placeholder="e.g. 5.00"
              defaultValue={
                defaultValues?.variance_tolerance_percentage ?? ''
              }
            />
            <FieldDescription>
              Acceptable variance between theoretical and actual usage.
            </FieldDescription>
          </Field>
        </FieldGroup>
      </div>
      {error && (
        <div className="px-4">
          <FieldError>{error}</FieldError>
        </div>
      )}
      {children}
    </>
  )
}

export function parseRecipeFormValues(
  form: HTMLFormElement
): RecipeFormValues {
  const fd = new FormData(form)
  const name = (fd.get('name') as string).trim()
  const track_stock = fd.get('track_stock') === 'true'
  const varianceRaw = fd.get('variance_tolerance_percentage') as string
  const variance_tolerance_percentage = varianceRaw
    ? parseFloat(varianceRaw)
    : null

  return { name, track_stock, variance_tolerance_percentage }
}
