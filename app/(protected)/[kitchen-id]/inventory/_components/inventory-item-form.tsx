'use client'

import { useMemo, useState } from 'react'
import { XIcon } from 'lucide-react'
import type { InventoryCategory } from '../_lib/inventory-categories'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@/components/ui/combobox'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const CYCLE_COUNT_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: 'every_few_days', label: 'Every few days' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Biweekly' },
  { value: 'monthly', label: 'Monthly' },
]

export interface InventoryItemFormValues {
  name: string
  category_id: string | null
  image_url: string | null
  yield_percentage: number
  par_level: number | null
  min_level: number | null
  max_level: number | null
  cycle_count_frequency: string | null
  location_label: string | null
}

interface InventoryItemFormProps {
  categories: InventoryCategory[]
  defaultValues?: InventoryItemFormValues & { id?: string }
  file: File | null
  onFileChange: (file: File | null) => void
  removeImage: boolean
  onRemoveImageChange: (remove: boolean) => void
  error: string | null
  children: React.ReactNode
}

export function InventoryItemForm({
  categories,
  defaultValues,
  file,
  onFileChange,
  removeImage,
  onRemoveImageChange,
  error,
  children,
}: InventoryItemFormProps) {
  const selectableCategories = useMemo(() => {
    const active = categories.filter((c) => c.is_active)
    const currentId = defaultValues?.category_id
    if (!currentId) return active
    const current = categories.find((c) => c.id === currentId)
    if (!current || current.is_active) return active
    return [...active, current]
  }, [categories, defaultValues?.category_id])

  const categoryItems = useMemo(
    () => ['__none__', ...selectableCategories.map((c) => c.id)],
    [selectableCategories]
  )

  const categoryLabelById = useMemo(() => {
    const map = new Map<string, string>([['__none__', 'None']])
    for (const c of selectableCategories) {
      map.set(c.id, c.name)
    }
    return map
  }, [selectableCategories])

  const [categoryId, setCategoryId] = useState<string>(
    defaultValues?.category_id ?? '__none__'
  )
  const [cycleCount, setCycleCount] = useState<string>(
    defaultValues?.cycle_count_frequency ?? '__none__'
  )

  const isEdit = !!defaultValues?.id
  const currentImageUrl = defaultValues?.image_url
  const showCurrentImage = isEdit && currentImageUrl && !removeImage && !file

  const previewUrl = file ? URL.createObjectURL(file) : null

  return (
    <>
      <div className="grid flex-1 auto-rows-min gap-6 px-4">
        <div className="flex items-center gap-3">
          <Avatar size="lg">
            {(previewUrl || (showCurrentImage && currentImageUrl)) && (
              <AvatarImage
                src={previewUrl ?? currentImageUrl ?? undefined}
                alt={defaultValues?.name ?? 'Item'}
              />
            )}
            <AvatarFallback>
              {(defaultValues?.name ?? 'I').charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-1 flex-col gap-1">
            <Input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null
                onFileChange(f)
                if (f) onRemoveImageChange(false)
              }}
            />
            {isEdit && currentImageUrl && !removeImage && (
              <Button
                type="button"
                variant="link"
                size="sm"
                className="h-auto w-fit p-0 text-destructive"
                onClick={() => {
                  onRemoveImageChange(true)
                  onFileChange(null)
                }}
              >
                <XIcon className="size-3" />
                Remove image
              </Button>
            )}
          </div>
        </div>

        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="item-name">Name</FieldLabel>
            <Input
              id="item-name"
              name="name"
              placeholder="Item name"
              defaultValue={defaultValues?.name}
              required
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="item-category">Category</FieldLabel>
            <input type="hidden" name="category_id" value={categoryId === '__none__' ? '' : categoryId} />
            <div className="relative z-100">
              <Combobox
                items={categoryItems}
                value={categoryId}
                onValueChange={(next) => {
                  setCategoryId(next ?? '__none__')
                }}
                modal={true}
                itemToStringLabel={(id) => categoryLabelById.get(String(id)) ?? ''}
              >
                <ComboboxInput
                  id="item-category"
                  placeholder="Select a category"
                  className="w-full"
                />
                <ComboboxContent className="z-100 pointer-events-auto">
                  <ComboboxEmpty>No categories found.</ComboboxEmpty>
                  <ComboboxList>
                    {(item: string) => (
                      <ComboboxItem key={item} value={item}>
                        {categoryLabelById.get(item) ?? item}
                      </ComboboxItem>
                    )}
                  </ComboboxList>
                </ComboboxContent>
              </Combobox>
            </div>
          </Field>

          <Field>
            <FieldLabel htmlFor="item-yield">Yield %</FieldLabel>
            <Input
              id="item-yield"
              name="yield_percentage"
              type="number"
              min="0.01"
              max="100"
              step="0.01"
              defaultValue={defaultValues?.yield_percentage ?? 100}
              required
            />
            <FieldDescription>
              The usable percentage after trimming or waste (1–100).
            </FieldDescription>
          </Field>

          <div className="grid grid-cols-3 gap-3">
            <Field>
              <FieldLabel htmlFor="item-min">Min Level</FieldLabel>
              <Input
                id="item-min"
                name="min_level"
                type="number"
                min="0"
                step="0.0001"
                defaultValue={defaultValues?.min_level ?? ''}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="item-par">Par Level</FieldLabel>
              <Input
                id="item-par"
                name="par_level"
                type="number"
                min="0"
                step="0.0001"
                defaultValue={defaultValues?.par_level ?? ''}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="item-max">Max Level</FieldLabel>
              <Input
                id="item-max"
                name="max_level"
                type="number"
                min="0"
                step="0.0001"
                defaultValue={defaultValues?.max_level ?? ''}
              />
            </Field>
          </div>

          <Field>
            <FieldLabel htmlFor="item-cycle">Cycle Count Frequency</FieldLabel>
            <input type="hidden" name="cycle_count_frequency" value={cycleCount === '__none__' ? '' : cycleCount} />
            <Select value={cycleCount} onValueChange={setCycleCount}>
              <SelectTrigger id="item-cycle" className="w-full">
                <SelectValue placeholder="Select frequency" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="__none__">None</SelectItem>
                  {CYCLE_COUNT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <FieldLabel htmlFor="item-location">Location Label</FieldLabel>
            <Input
              id="item-location"
              name="location_label"
              placeholder="e.g. Walk-in cooler, Shelf A"
              defaultValue={defaultValues?.location_label ?? ''}
            />
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

export function parseFormValues(form: HTMLFormElement): Omit<InventoryItemFormValues, 'image_url'> {
  const fd = new FormData(form)
  const name = fd.get('name') as string
  const categoryRaw = fd.get('category_id') as string
  const category_id = categoryRaw || null
  const yield_percentage = parseFloat(fd.get('yield_percentage') as string) || 100
  const par_level = fd.get('par_level') ? parseFloat(fd.get('par_level') as string) : null
  const min_level = fd.get('min_level') ? parseFloat(fd.get('min_level') as string) : null
  const max_level = fd.get('max_level') ? parseFloat(fd.get('max_level') as string) : null
  const cycleRaw = fd.get('cycle_count_frequency') as string
  const cycle_count_frequency = cycleRaw || null
  const locationRaw = fd.get('location_label') as string
  const location_label = locationRaw.trim() || null

  return {
    name,
    category_id,
    yield_percentage,
    par_level,
    min_level,
    max_level,
    cycle_count_frequency,
    location_label,
  }
}
