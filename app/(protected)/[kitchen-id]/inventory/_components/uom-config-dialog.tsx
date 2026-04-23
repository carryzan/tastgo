'use client'

import { useEffect, useState, useTransition } from 'react'
import { useKitchen } from '@/hooks/use-kitchen'
import { createClient } from '@/lib/supabase/client'
import { createUOMConfig, updateUOMConfig } from '../_lib/uom-config-actions'
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
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface UOM {
  id: string
  name: string
  abbreviation: string
}

interface UOMConfig {
  id: string
  purchase_uom_id: string | null
  storage_uom_id: string
  recipe_uom_id: string
  purchase_to_storage_factor: number | null
  storage_to_recipe_factor: number
}

interface UOMConfigDialogProps {
  itemId: string
  itemName: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function UOMConfigDialog({
  itemId,
  itemName,
  open,
  onOpenChange,
}: UOMConfigDialogProps) {
  const { kitchen, unitsOfMeasure } = useKitchen()
  const uoms = unitsOfMeasure as UOM[]

  const [loading, setLoading] = useState(true)
  const [existing, setExisting] = useState<UOMConfig | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const [purchaseUomId, setPurchaseUomId] = useState('__none__')
  const [storageUomId, setStorageUomId] = useState('')
  const [recipeUomId, setRecipeUomId] = useState('')
  const [purchaseToStorage, setPurchaseToStorage] = useState('')
  const [storageToRecipe, setStorageToRecipe] = useState('1')

  useEffect(() => {
    if (!open) return

    let cancelled = false
    const supabase = createClient()

    void Promise.resolve().then(async () => {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('inventory_item_uom_configurations')
        .select('*')
        .eq('inventory_item_id', itemId)
        .maybeSingle()

      if (cancelled) return

      if (fetchError) {
        setError(fetchError.message)
        setLoading(false)
        return
      }

      const config = data as UOMConfig | null
      setExisting(config)

      if (config) {
        setPurchaseUomId(config.purchase_uom_id ?? '__none__')
        setStorageUomId(config.storage_uom_id)
        setRecipeUomId(config.recipe_uom_id)
        setPurchaseToStorage(
          config.purchase_to_storage_factor != null
            ? String(config.purchase_to_storage_factor)
            : ''
        )
        setStorageToRecipe(String(config.storage_to_recipe_factor))
      } else {
        const defaultId = uoms[0]?.id ?? ''
        setPurchaseUomId('__none__')
        setStorageUomId(defaultId)
        setRecipeUomId(defaultId)
        setPurchaseToStorage('')
        setStorageToRecipe('1')
      }

      setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [open, itemId, uoms])

  function handleOpenChange(next: boolean) {
    if (pending) return
    onOpenChange(next)
    if (!next) {
      setError(null)
      setExisting(null)
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    if (!storageUomId || !recipeUomId) {
      return setError('Storage and Recipe UOM are required.')
    }

    const hasPurchase = purchaseUomId !== '__none__'
    const purchaseFactor = purchaseToStorage
      ? parseFloat(purchaseToStorage)
      : null

    if (hasPurchase && (purchaseFactor == null || purchaseFactor <= 0)) {
      return setError(
        'Purchase to storage factor is required when a purchase UOM is selected.'
      )
    }

    const recipeFactor = parseFloat(storageToRecipe)
    if (!recipeFactor || recipeFactor <= 0) {
      return setError('Storage to recipe factor must be greater than 0.')
    }

    startTransition(async () => {
      try {
        if (existing) {
          const updates: Record<string, unknown> = {}
          const newPurchaseId = hasPurchase ? purchaseUomId : null
          if (newPurchaseId !== existing.purchase_uom_id) {
            updates.purchase_uom_id = newPurchaseId
          }
          if (storageUomId !== existing.storage_uom_id) {
            updates.storage_uom_id = storageUomId
          }
          if (recipeUomId !== existing.recipe_uom_id) {
            updates.recipe_uom_id = recipeUomId
          }
          if (purchaseFactor !== existing.purchase_to_storage_factor) {
            updates.purchase_to_storage_factor = purchaseFactor
          }
          if (recipeFactor !== existing.storage_to_recipe_factor) {
            updates.storage_to_recipe_factor = recipeFactor
          }

          if (Object.keys(updates).length > 0) {
            const result = await updateUOMConfig(existing.id, updates)
            if (result instanceof Error) return setError(result.message)
          }
        } else {
          const result = await createUOMConfig({
            kitchen_id: kitchen.id,
            inventory_item_id: itemId,
            purchase_uom_id: hasPurchase ? purchaseUomId : null,
            storage_uom_id: storageUomId,
            recipe_uom_id: recipeUomId,
            purchase_to_storage_factor: purchaseFactor,
            storage_to_recipe_factor: recipeFactor,
          })
          if (result instanceof Error) return setError(result.message)
        }

        onOpenChange(false)
      } catch {
        setError('Something went wrong. Please try again.')
      }
    })
  }

  const isEdit = !!existing
  const disabled = loading || pending

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-md"
        onInteractOutside={(e) => {
          if (pending) e.preventDefault()
        }}
        onEscapeKeyDown={(e) => {
          if (pending) e.preventDefault()
        }}
      >
        <DialogHeader>
          <DialogTitle>UOM Configuration</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update' : 'Set up'} unit of measure conversions for{' '}
            {itemName}.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel>Purchase UOM</FieldLabel>
              <Select
                value={purchaseUomId}
                onValueChange={setPurchaseUomId}
                disabled={disabled}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select UOM" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="__none__">None</SelectItem>
                    {uoms.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name} ({u.abbreviation})
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <FieldDescription>
                The unit used when purchasing this item.
              </FieldDescription>
            </Field>

            <Field>
              <FieldLabel>Storage UOM</FieldLabel>
              <Select
                value={storageUomId}
                onValueChange={setStorageUomId}
                disabled={disabled}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select UOM" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {uoms.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name} ({u.abbreviation})
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <FieldDescription>
                The unit used when storing and counting this item.
              </FieldDescription>
            </Field>

            <Field>
              <FieldLabel>Recipe UOM</FieldLabel>
              <Select
                value={recipeUomId}
                onValueChange={setRecipeUomId}
                disabled={disabled}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select UOM" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {uoms.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name} ({u.abbreviation})
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <FieldDescription>
                The unit used in recipes for this item.
              </FieldDescription>
            </Field>

            {purchaseUomId !== '__none__' && (
              <Field>
                <FieldLabel htmlFor="uom-p2s">
                  Purchase to Storage Factor
                </FieldLabel>
                <Input
                  id="uom-p2s"
                  type="number"
                  min="0.000001"
                  step="0.000001"
                  value={purchaseToStorage}
                  onChange={(e) => setPurchaseToStorage(e.target.value)}
                  disabled={disabled}
                  required
                />
                <FieldDescription>
                  How many storage units per 1 purchase unit.
                </FieldDescription>
              </Field>
            )}

            <Field>
              <FieldLabel htmlFor="uom-s2r">
                Storage to Recipe Factor
              </FieldLabel>
              <Input
                id="uom-s2r"
                type="number"
                min="0.000001"
                step="0.000001"
                value={storageToRecipe}
                onChange={(e) => setStorageToRecipe(e.target.value)}
                disabled={disabled}
                required
              />
              <FieldDescription>
                How many recipe units per 1 storage unit.
              </FieldDescription>
            </Field>
          </FieldGroup>
          {error && <FieldError className="mt-2">{error}</FieldError>}
          <DialogFooter className="mt-4">
            <DialogClose asChild>
              <Button variant="outline" disabled={pending}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={disabled} className="min-w-28">
              {pending && <Spinner data-icon="inline-start" />}
              {isEdit ? 'Save Changes' : 'Add'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
