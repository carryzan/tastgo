'use client'

import { useMemo, useState, useTransition } from 'react'
import { MoreHorizontal, PlusIcon } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useKitchen } from '@/hooks/use-kitchen'
import { createClient } from '@/lib/supabase/client'
import {
  createPackagingItem,
  deletePackagingItem,
  updatePackagingItem,
  type PackagingSourceScope,
} from '@/lib/actions/packaging'
import { Button } from '@/components/ui/button'
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@/components/ui/combobox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Spinner } from '@/components/ui/spinner'

interface InventoryPick {
  id: string
  name: string
}

export interface PackagingItem {
  id: string
  kitchen_id: string
  inventory_item_id: string
  name: string
  default_quantity: string | number
  auto_add: boolean
  source_type_scope: PackagingSourceScope
  sort_order: number
  is_active: boolean
  created_at: string
  inventory_items: InventoryPick | null
}

interface PackagingFormState {
  name: string
  inventoryItemId: string
  defaultQuantity: string
  autoAdd: boolean
  sourceTypeScope: PackagingSourceScope
  sortOrder: string
  isActive: boolean
}

const emptyForm: PackagingFormState = {
  name: '',
  inventoryItemId: '',
  defaultQuantity: '1',
  autoAdd: true,
  sourceTypeScope: 'online',
  sortOrder: '0',
  isActive: true,
}

function scopeLabel(scope: PackagingSourceScope) {
  if (scope === 'all') return 'All sources'
  if (scope === 'online') return 'Online'
  return 'Offline'
}

export function PackagingSettings() {
  const { kitchen, permissions } = useKitchen()
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<PackagingItem | null>(null)
  const [form, setForm] = useState<PackagingFormState>(emptyForm)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const canManage = permissions.has('inventory.update') || permissions.has('settings.update')

  const queryKey = ['packaging-items', kitchen.id]
  const inventoryQueryKey = ['packaging-inventory-items', kitchen.id]

  const { data: packagingItems = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const supabase = createClient()
      const { data, error: queryError } = await supabase
        .from('packaging_items')
        .select('*, inventory_items!inventory_item_id(id, name)')
        .eq('kitchen_id', kitchen.id)
        .order('sort_order', { ascending: true })
        .order('name')
      if (queryError) throw new Error(queryError.message)
      return (data ?? []) as unknown as PackagingItem[]
    },
  })

  const { data: inventoryItems = [] } = useQuery({
    queryKey: inventoryQueryKey,
    queryFn: async () => {
      const supabase = createClient()
      const { data, error: queryError } = await supabase
        .from('inventory_items')
        .select('id, name')
        .eq('kitchen_id', kitchen.id)
        .eq('is_active', true)
        .order('name')
      if (queryError) throw new Error(queryError.message)
      return (data ?? []) as InventoryPick[]
    },
  })

  const inventoryIds = useMemo(
    () => inventoryItems.map((item) => item.id),
    [inventoryItems]
  )
  const inventoryLabelById = useMemo(() => {
    const map = new Map<string, string>()
    for (const item of inventoryItems) map.set(item.id, item.name)
    return map
  }, [inventoryItems])

  function openAddDialog() {
    setEditingItem(null)
    setForm(emptyForm)
    setError(null)
    setDialogOpen(true)
  }

  function openEditDialog(item: PackagingItem) {
    setEditingItem(item)
    setForm({
      name: item.name,
      inventoryItemId: item.inventory_item_id,
      defaultQuantity: String(item.default_quantity ?? '0'),
      autoAdd: item.auto_add,
      sourceTypeScope: item.source_type_scope,
      sortOrder: String(item.sort_order ?? 0),
      isActive: item.is_active,
    })
    setError(null)
    setDialogOpen(true)
  }

  function handleSave() {
    setError(null)
    const name = form.name.trim()
    const defaultQuantity = Number.parseFloat(form.defaultQuantity)
    const sortOrder = Number.parseInt(form.sortOrder, 10)

    if (!name) return setError('Name is required.')
    if (!form.inventoryItemId) return setError('Select an inventory item.')
    if (Number.isNaN(defaultQuantity) || defaultQuantity < 0) {
      return setError('Default quantity must be 0 or greater.')
    }
    if (Number.isNaN(sortOrder)) return setError('Sort order must be a whole number.')

    startTransition(async () => {
      const payload = {
        name,
        inventory_item_id: form.inventoryItemId,
        default_quantity: defaultQuantity,
        auto_add: form.autoAdd,
        source_type_scope: form.sourceTypeScope,
        sort_order: sortOrder,
        is_active: form.isActive,
      }
      const result = editingItem
        ? await updatePackagingItem(kitchen.id, editingItem.id, payload)
        : await createPackagingItem(kitchen.id, payload)

      if (result instanceof Error) {
        setError(result.message)
        return
      }

      setDialogOpen(false)
      await queryClient.invalidateQueries({ queryKey })
    })
  }

  function handleDelete(item: PackagingItem) {
    if (!window.confirm(`Delete ${item.name}?`)) return

    startTransition(async () => {
      const result = await deletePackagingItem(kitchen.id, item.id)
      if (result instanceof Error) {
        setError(result.message)
        return
      }
      await queryClient.invalidateQueries({ queryKey })
    })
  }

  function toggleActive(item: PackagingItem, value: boolean) {
    startTransition(async () => {
      const result = await updatePackagingItem(kitchen.id, item.id, {
        is_active: value,
      })
      if (result instanceof Error) {
        setError(result.message)
        return
      }
      await queryClient.invalidateQueries({ queryKey })
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <Button type="button" size="sm" onClick={openAddDialog} disabled={!canManage}>
          <PlusIcon />
          Add packaging
        </Button>
      </div>

      {error ? <FieldError>{error}</FieldError> : null}

      <div className="rounded-xl border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-muted-foreground">Name</TableHead>
              <TableHead className="text-muted-foreground">Inventory item</TableHead>
              <TableHead className="text-muted-foreground">Default</TableHead>
              <TableHead className="text-muted-foreground">Auto</TableHead>
              <TableHead className="text-muted-foreground">Scope</TableHead>
              <TableHead className="text-muted-foreground">Status</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <div className="flex h-16 items-center justify-center">
                    <Spinner />
                  </div>
                </TableCell>
              </TableRow>
            ) : packagingItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-muted-foreground">
                  No packaging configured.
                </TableCell>
              </TableRow>
            ) : (
              packagingItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>{item.inventory_items?.name ?? '-'}</TableCell>
                  <TableCell>{Number(item.default_quantity).toLocaleString()}</TableCell>
                  <TableCell>{item.auto_add ? 'Yes' : 'No'}</TableCell>
                  <TableCell>{scopeLabel(item.source_type_scope)}</TableCell>
                  <TableCell>
                    <Switch
                      checked={item.is_active}
                      onCheckedChange={(value) => toggleActive(item, value)}
                      disabled={!canManage || pending}
                    />
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          disabled={!canManage}
                        >
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuGroup>
                          <DropdownMenuItem onSelect={() => openEditDialog(item)}>
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            onSelect={() => handleDelete(item)}
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => !pending && setDialogOpen(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit packaging' : 'Add packaging'}</DialogTitle>
            <DialogDescription>
              Configure inventory items that can be attached to orders.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="packaging-name">Name</FieldLabel>
              <Input
                id="packaging-name"
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, name: event.target.value }))
                }
                disabled={pending}
              />
            </Field>
            <Field>
              <FieldLabel>Inventory item</FieldLabel>
              <Combobox
                items={inventoryIds}
                value={form.inventoryItemId || null}
                onValueChange={(nextValue) =>
                  setForm((current) => ({
                    ...current,
                    inventoryItemId: nextValue ?? '',
                    name:
                      current.name.trim() || !nextValue
                        ? current.name
                        : inventoryLabelById.get(nextValue) ?? current.name,
                  }))
                }
                modal
                itemToStringLabel={(id) => inventoryLabelById.get(String(id)) ?? ''}
              >
                <ComboboxInput placeholder="Inventory item" className="w-full" />
                <ComboboxContent className="z-100 pointer-events-auto">
                  <ComboboxEmpty>No inventory items.</ComboboxEmpty>
                  <ComboboxList>
                    {(id: string) => (
                      <ComboboxItem key={id} value={id}>
                        {inventoryLabelById.get(id) ?? id}
                      </ComboboxItem>
                    )}
                  </ComboboxList>
                </ComboboxContent>
              </Combobox>
            </Field>
            <div className="grid gap-4 md:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="packaging-default">Default quantity</FieldLabel>
                <Input
                  id="packaging-default"
                  inputMode="decimal"
                  value={form.defaultQuantity}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      defaultQuantity: event.target.value,
                    }))
                  }
                  disabled={pending}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="packaging-sort">Sort order</FieldLabel>
                <Input
                  id="packaging-sort"
                  inputMode="numeric"
                  value={form.sortOrder}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, sortOrder: event.target.value }))
                  }
                  disabled={pending}
                />
              </Field>
            </div>
            <Field>
              <FieldLabel>Source scope</FieldLabel>
              <Select
                value={form.sourceTypeScope}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    sourceTypeScope: value as PackagingSourceScope,
                  }))
                }
                disabled={pending}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="offline">Offline</SelectItem>
                  <SelectItem value="all">All sources</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <label className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
              <span>Auto-add default quantity</span>
              <Switch
                checked={form.autoAdd}
                onCheckedChange={(value) =>
                  setForm((current) => ({ ...current, autoAdd: value }))
                }
                disabled={pending}
              />
            </label>
            <label className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
              <span>Active</span>
              <Switch
                checked={form.isActive}
                onCheckedChange={(value) =>
                  setForm((current) => ({ ...current, isActive: value }))
                }
                disabled={pending}
              />
            </label>
          </FieldGroup>
          {error ? <FieldError>{error}</FieldError> : null}
          <DialogFooter>
            <Button type="button" onClick={handleSave} disabled={pending || !canManage}>
              {pending ? <Spinner data-icon="inline-start" /> : null}
              Save
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={pending}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
