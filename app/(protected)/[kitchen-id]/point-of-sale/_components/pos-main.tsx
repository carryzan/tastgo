'use client'

import { useMemo, useState, useTransition } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CheckCircle2Icon,
  MinusIcon,
  MoreHorizontalIcon,
  NotebookPenIcon,
  PercentIcon,
  PlusIcon,
  PrinterIcon,
  ReceiptTextIcon,
  TrashIcon,
  WalletCardsIcon,
} from 'lucide-react'
import { SiteHeader } from '@/components/layout/site-header'
import { Badge } from '@/components/ui/badge'
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { FieldError } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { useKitchen } from '@/hooks/use-kitchen'
import {
  addDrawerCashIn,
  addDrawerCashOut,
  closeDrawerSession,
  openDrawerSession,
  reopenDrawerSession,
  undoDrawerTransaction,
} from '@/lib/actions/drawer'
import { createPosOrder, updateOrderStatus } from '@/lib/actions/orders'
import { fetchOrderDetail } from '@/lib/supabase/queries/order-details'
import type {
  DrawerSessionSummary,
  DrawerTransactionRow,
  OrderActionType,
  OrderDetail,
  OrderRow,
  PosCartCombo,
  PosCartLine,
  PosCatalogCombo,
  PosCatalogItem,
  PosModifierGroup,
  PosModifierOption,
} from '@/lib/types/orders'
import {
  formatAmount,
  formatDateTime,
  orderActionLabel,
  paymentStatusLabel,
} from '@/lib/order-format'
import { cn } from '@/lib/utils'
import { DiscountDialog, OrderActionDialog } from '../../orders/_components/order-action-dialog'
import { CartDiscountDialog, type CartDiscount } from './cart-discount-dialog'
import { OrderCard, OrderPanelHeader } from './order-card'
import { printOrderReceipt } from '../_lib/print/printer'
import {
  fetchActiveAssetAccounts,
  fetchDrawerSessions,
  fetchDrawerTransactions,
  fetchPosCatalog,
  fetchPosOrders,
  getBrowserLocalDayBounds,
  type PosCatalog,
} from '../_lib/client-queries'

type PosView = 'new' | 'orders' | 'drawer'
type PosOrderFilter = 'all' | 'online' | 'offline'
type DrawerDialogType = 'open' | 'cash_in' | 'cash_out' | 'close' | 'reopen'

const POS_CATALOG_KEY = ['pos-catalog']
const POS_ORDERS_KEY = ['pos-orders']
const POS_DRAWERS_KEY = ['pos-drawer-sessions']

function numeric(value: string | number | null | undefined) {
  if (value === null || value === undefined) return 0
  const n = typeof value === 'string' ? Number(value) : value
  return Number.isFinite(n) ? n : 0
}

function makeKey(prefix: string) {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function lineUnitTotal(line: PosCartLine) {
  return (
    line.unit_price +
    line.modifiers.reduce((sum, modifier) => sum + modifier.price_impact, 0)
  )
}

function cartTotal(lines: PosCartLine[], combos: PosCartCombo[]) {
  const lineTotal = lines.reduce(
    (sum, line) => sum + line.quantity * lineUnitTotal(line),
    0
  )
  const comboTotal = combos.reduce(
    (sum, combo) => sum + combo.quantity * combo.unit_price,
    0
  )
  return lineTotal + comboTotal
}

function matchesOrderFilter(order: OrderRow, filter: PosOrderFilter) {
  if (filter === 'all') return true
  const sourceType = order.sources?.type?.toLowerCase()
  if (sourceType === 'online' || sourceType === 'offline') {
    return sourceType === filter
  }
  if (filter === 'online') {
    return order.sources?.settlement_mode === 'marketplace_receivable'
  }
  return order.sources?.settlement_mode === 'cash_now'
}

function isPosOrderFilter(value: string): value is PosOrderFilter {
  return value === 'all' || value === 'online' || value === 'offline'
}

type CardButtonTone = 'default' | 'primary' | 'destructive' | 'destructive-strong'

function CardButton({
  active,
  tone = 'default',
  title,
  subtitle,
  meta,
  onClick,
  disabled,
}: {
  active?: boolean
  tone?: CardButtonTone
  title: string
  subtitle?: string
  meta?: string
  onClick: () => void
  disabled?: boolean
}) {
  const surfaceClass =
    tone === 'primary'
      ? 'border-primary bg-primary/5 hover:bg-primary/10'
      : tone === 'destructive'
        ? 'border-destructive/70 bg-destructive/5 text-destructive hover:bg-destructive/10'
        : tone === 'destructive-strong'
          ? 'border-destructive bg-destructive/15 text-destructive hover:bg-destructive/20'
          : active
            ? 'border-primary bg-primary/5'
            : 'border-border bg-background hover:bg-muted/50'

  const subtitleMuted =
    tone === 'destructive' || tone === 'destructive-strong'
      ? 'text-destructive/75'
      : 'text-muted-foreground'

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex min-h-20 w-full flex-col items-start justify-between rounded-lg border p-3 text-left text-sm transition-colors disabled:opacity-50',
        surfaceClass
      )}
    >
      <span className="font-medium">{title}</span>
      {subtitle ? <span className={cn('text-xs', subtitleMuted)}>{subtitle}</span> : null}
      {meta ? (
        <span
          className={cn(
            'mt-2 text-xs font-medium',
            tone === 'destructive' || tone === 'destructive-strong' ? 'text-destructive' : undefined
          )}
        >
          {meta}
        </span>
      ) : null}
    </button>
  )
}

function CatalogChipPick({
  active,
  label,
  logoUrl,
  onClick,
}: {
  active: boolean
  label: string
  logoUrl: string | null | undefined
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'flex max-w-44 shrink-0 items-center gap-2 rounded-md border px-2 py-1.5 text-left text-xs transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
        active
          ? 'border-primary bg-primary/5'
          : 'border-border bg-background hover:bg-muted/50'
      )}
    >
      <Avatar size="sm">
        <AvatarImage src={logoUrl ?? undefined} alt="" />
        <AvatarFallback className="text-[10px]">
          {label.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <span className="min-w-0 truncate font-medium">{label}</span>
    </button>
  )
}

function DetailPanel({
  title,
  subtitle,
  header,
  children,
  footer,
}: {
  title?: string
  subtitle?: React.ReactNode
  header?: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
}) {
  return (
    <aside className="flex min-h-0 min-w-0 flex-col border-t bg-background lg:border-t-0 lg:border-l">
      <div className="shrink-0 border-b px-4 py-3">
        {header ?? (
          <>
            <h2 className="text-sm font-medium">{title}</h2>
            {subtitle ? <div className="mt-1 text-xs text-muted-foreground">{subtitle}</div> : null}
          </>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">{children}</div>
      {footer ? <div className="shrink-0 border-t px-4 py-3">{footer}</div> : null}
    </aside>
  )
}

function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex h-full min-h-48 flex-col items-center justify-center gap-3 text-center">
      <p className="text-sm font-medium">{title}</p>
      <p className="max-w-xs text-sm text-muted-foreground">{description}</p>
      {action}
    </div>
  )
}

function ModifierDialog({
  item,
  open,
  onOpenChange,
  onAdd,
}: {
  item: PosCatalogItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdd: (item: PosCatalogItem, modifiers: PosCartLine['modifiers']) => void
}) {
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [error, setError] = useState<string | null>(null)

  function optionQty(optionId: string) {
    return quantities[optionId] ?? 0
  }

  function groupCount(group: PosModifierGroup) {
    return group.modifier_options.reduce(
      (sum, option) => sum + optionQty(option.id),
      0
    )
  }

  function updateOption(group: PosModifierGroup, option: PosModifierOption, delta: number) {
    const current = optionQty(option.id)
    const groupCurrent = groupCount(group)
    const max = group.max_selections ?? Number.POSITIVE_INFINITY
    if (delta > 0 && groupCurrent >= max) return
    const next = Math.max(0, current + delta)
    setQuantities((prev) => ({ ...prev, [option.id]: next }))
  }

  function submit() {
    if (!item) return
    for (const group of item.modifier_groups) {
      const count = groupCount(group)
      if (count < group.min_selections) {
        setError(`Select at least ${group.min_selections} option(s) for ${group.name}.`)
        return
      }
      if (group.max_selections !== null && count > group.max_selections) {
        setError(`Select at most ${group.max_selections} option(s) for ${group.name}.`)
        return
      }
    }

    const modifiers = item.modifier_groups.flatMap((group) =>
      group.modifier_options.flatMap((option) => {
        const quantity = optionQty(option.id)
        if (quantity <= 0) return []
        return [
          {
            modifier_option_id: option.id,
            name: option.name,
            quantity,
            price_impact: numeric(option.price_charge) * quantity,
          },
        ]
      })
    )

    onAdd(item, modifiers)
    setQuantities({})
    setError(null)
    onOpenChange(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next)
        if (!next) {
          setQuantities({})
          setError(null)
        }
      }}
    >
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{item?.name ?? 'Customize item'}</DialogTitle>
          <DialogDescription>Select modifiers before adding this item.</DialogDescription>
        </DialogHeader>

        <div className="max-h-[55vh] space-y-4 overflow-y-auto pr-1">
          {item?.modifier_groups.map((group) => (
            <section key={group.id} className="rounded-lg border">
              <div className="flex items-center justify-between border-b px-3 py-2">
                <div>
                  <p className="text-sm font-medium">{group.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Min {group.min_selections}
                    {group.max_selections !== null ? ` · Max ${group.max_selections}` : ''}
                  </p>
                </div>
                <Badge variant="outline">{groupCount(group)}</Badge>
              </div>
              <div className="divide-y">
                {group.modifier_options.map((option) => (
                  <div key={option.id} className="flex items-center justify-between gap-3 px-3 py-2">
                    <div>
                      <p className="text-sm">{option.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatAmount(option.price_charge)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        onClick={() => updateOption(group, option, -1)}
                      >
                        <MinusIcon />
                      </Button>
                      <span className="w-8 text-center text-sm tabular-nums">
                        {optionQty(option.id)}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        onClick={() => updateOption(group, option, 1)}
                      >
                        <PlusIcon />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        {error ? <FieldError>{error}</FieldError> : null}

        <DialogFooter>
          <Button type="button" onClick={submit}>
            Add item
          </Button>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function PosMain() {
  const { kitchen, permissions } = useKitchen()
  const queryClient = useQueryClient()
  const [view, setView] = useState<PosView>('orders')
  const [orderFilter, setOrderFilter] = useState<PosOrderFilter>('all')
  const [brandId, setBrandId] = useState('')
  const [sourceId, setSourceId] = useState('')
  const [menuId, setMenuId] = useState('')
  const [cartLines, setCartLines] = useState<PosCartLine[]>([])
  const [cartCombos, setCartCombos] = useState<PosCartCombo[]>([])
  const [notes, setNotes] = useState('')
  const [sourceOrderCode, setSourceOrderCode] = useState('')
  const [cartError, setCartError] = useState<string | null>(null)
  const [modifierItem, setModifierItem] = useState<PosCatalogItem | null>(null)
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [drawerDialog, setDrawerDialog] = useState<DrawerDialogType | null>(null)
  const [orderAction, setOrderAction] = useState<{
    type: OrderActionType
    itemMode?: boolean
    title?: string
  } | null>(null)
  const [discountOpen, setDiscountOpen] = useState(false)
  const [cartDiscount, setCartDiscount] = useState<CartDiscount | null>(null)
  const [cartDiscountOpen, setCartDiscountOpen] = useState(false)
  const [statusError, setStatusError] = useState<string | null>(null)
  const [printError, setPrintError] = useState<string | null>(null)
  const [printing, setPrinting] = useState(false)
  const [submitting, startSubmitTransition] = useTransition()
  const [statusPending, startStatusTransition] = useTransition()

  const canCreateOrder = permissions.has('orders.create')
  const canUpdateOrder = permissions.has('orders.update')
  const canApplyDiscount = permissions.has('orders.update')
  const canActionOrder = permissions.has('orders.action')
  const canCreateDrawer = permissions.has('drawer.create')
  const canUpdateDrawer = permissions.has('drawer.update')

  const posDay = getBrowserLocalDayBounds()

  const { data: catalog, isLoading: catalogLoading } = useQuery({
    queryKey: [...POS_CATALOG_KEY, kitchen.id],
    queryFn: () => fetchPosCatalog(kitchen.id),
  })

  const { data: orders } = useQuery({
    queryKey: [...POS_ORDERS_KEY, kitchen.id, posDay.dayKey],
    queryFn: () => fetchPosOrders(kitchen.id, posDay),
  })

  const { data: drawerSessions } = useQuery({
    queryKey: [...POS_DRAWERS_KEY, kitchen.id, posDay.dayKey],
    queryFn: () => fetchDrawerSessions(kitchen.id, posDay),
  })

  const selectedBrand = useMemo(
    () => catalog?.brands.find((brand) => brand.id === brandId) ?? catalog?.brands[0] ?? null,
    [brandId, catalog]
  )
  const selectedSource = useMemo(
    () => catalog?.sources.find((source) => source.id === sourceId) ?? catalog?.sources[0] ?? null,
    [sourceId, catalog]
  )
  const menusForBrand = useMemo(
    () => catalog?.menus.filter((menu) => menu.brand_id === selectedBrand?.id) ?? [],
    [catalog, selectedBrand]
  )
  const selectedMenu = useMemo(
    () => menusForBrand.find((menu) => menu.id === menuId) ?? menusForBrand[0] ?? null,
    [menuId, menusForBrand]
  )
  const itemsForMenu = useMemo(
    () => catalog?.items.filter((item) => item.menu_id === selectedMenu?.id) ?? [],
    [catalog, selectedMenu]
  )
  const combosForBrand = useMemo(
    () => catalog?.combos.filter((combo) => combo.brand_id === selectedBrand?.id) ?? [],
    [catalog, selectedBrand]
  )
  const openDrawer = useMemo(
    () => drawerSessions?.find((session) => session.status === 'open') ?? null,
    [drawerSessions]
  )
  const selectedDrawer = useMemo(
    () => openDrawer ?? drawerSessions?.[0] ?? null,
    [drawerSessions, openDrawer]
  )
  const filteredOrders = useMemo(
    () => orders?.filter((order) => matchesOrderFilter(order, orderFilter)) ?? [],
    [orders, orderFilter]
  )
  const selectedOrder = useMemo(
    () =>
      filteredOrders.find((order) => order.id === selectedOrderId) ??
      filteredOrders[0] ??
      null,
    [filteredOrders, selectedOrderId]
  )
  const { data: selectedOrderDetail } = useQuery({
    queryKey: ['order-detail', selectedOrder?.id],
    queryFn: () => fetchOrderDetail(selectedOrder?.id ?? ''),
    enabled: !!selectedOrder?.id,
  })

  function resetCart() {
    setCartLines([])
    setCartCombos([])
    setNotes('')
    setSourceOrderCode('')
    setCartDiscount(null)
    setCartError(null)
  }

  function startNewCart() {
    if ((cartLines.length > 0 || cartCombos.length > 0) && !window.confirm('Clear the current cart?')) {
      return
    }
    resetCart()
    setView('new')
  }

  function addItem(item: PosCatalogItem, modifiers: PosCartLine['modifiers'] = []) {
    setCartLines((prev) => [
      ...prev,
      {
        key: makeKey('line'),
        menu_item_id: item.id,
        recipe_version_id: item.current_recipe_version_id,
        name: item.name,
        quantity: 1,
        unit_price: numeric(item.price),
        modifiers,
      },
    ])
    setCartError(null)
  }

  function addCombo(combo: PosCatalogCombo) {
    setCartCombos((prev) => [
      ...prev,
      {
        key: makeKey('combo'),
        combo_id: combo.id,
        name: combo.name,
        quantity: 1,
        unit_price: numeric(combo.price),
      },
    ])
    setCartError(null)
  }

  function updateLineQty(key: string, delta: number) {
    setCartLines((prev) =>
      prev.flatMap((line) => {
        if (line.key !== key) return [line]
        const quantity = Math.max(0, line.quantity + delta)
        return quantity > 0 ? [{ ...line, quantity }] : []
      })
    )
  }

  function updateComboQty(key: string, delta: number) {
    setCartCombos((prev) =>
      prev.flatMap((combo) => {
        if (combo.key !== key) return [combo]
        const quantity = Math.max(0, combo.quantity + delta)
        return quantity > 0 ? [{ ...combo, quantity }] : []
      })
    )
  }

  function submitOrder() {
    setCartError(null)
    if (!selectedBrand) return setCartError('Select a brand.')
    if (!selectedSource) return setCartError('Select a source.')
    if (cartLines.length === 0 && cartCombos.length === 0) {
      return setCartError('Add at least one item or combo.')
    }
    if (selectedSource.settlement_mode === 'cash_now') {
      const hasDrawer = drawerSessions?.some(
        (session) =>
          session.status === 'open' &&
          session.drawer_account_id === selectedSource.settlement_account_id
      )
      if (!hasDrawer) {
        return setCartError('Open a matching cash drawer before creating this cash order.')
      }
    }

    startSubmitTransition(async () => {
      const result = await createPosOrder(kitchen.id, {
        brandId: selectedBrand.id,
        sourceId: selectedSource.id,
        notes: notes.trim() || null,
        sourceOrderCode: sourceOrderCode.trim() || null,
        items: cartLines.map((line) => ({
          menu_item_id: line.menu_item_id,
          recipe_version_id: line.recipe_version_id,
          quantity: line.quantity,
          unit_price: line.unit_price,
          modifiers: line.modifiers.map((modifier) => ({
            modifier_option_id: modifier.modifier_option_id,
            quantity: modifier.quantity,
          })),
        })),
        combos: cartCombos.map((combo) => ({
          combo_id: combo.combo_id,
          quantity: combo.quantity,
        })),
        discount: cartDiscount
          ? {
              type: cartDiscount.type,
              amount: cartDiscount.type === 'fixed' ? cartDiscount.value : null,
              percentage: cartDiscount.type === 'percentage' ? cartDiscount.value : null,
              reason: cartDiscount.reason,
            }
          : null,
      })
      if (result instanceof Error) {
        setCartError(result.message)
        return
      }
      resetCart()
      await queryClient.invalidateQueries({ queryKey: POS_ORDERS_KEY })
      await queryClient.invalidateQueries({ queryKey: POS_DRAWERS_KEY })
      setSelectedOrderId(result)
      setView('orders')

      try {
        const order = await fetchOrderDetail(result)
        await printOrderReceipt({
          order,
          kitchen: { name: kitchen.name, location: kitchen.location },
        })
      } catch {
        // silent — print failures should not block the order flow
      }
    })
  }

  async function printReceipt(order: OrderDetail) {
    setPrintError(null)
    setPrinting(true)
    try {
      await printOrderReceipt({
        order,
        kitchen: { name: kitchen.name, location: kitchen.location },
      })
    } catch (error) {
      setPrintError(error instanceof Error ? error.message : 'Failed to print.')
    } finally {
      setPrinting(false)
    }
  }

  function moveOrderStatus(order: OrderDetail, nextStatus: 'ready' | 'completed') {
    setStatusError(null)
    startStatusTransition(async () => {
      const result = await updateOrderStatus(kitchen.id, order.id, nextStatus)
      if (result instanceof Error) {
        setStatusError(result.message)
        return
      }
      await queryClient.invalidateQueries({ queryKey: POS_ORDERS_KEY })
      await queryClient.invalidateQueries({ queryKey: ['order-detail', order.id] })
      await queryClient.invalidateQueries({ queryKey: POS_DRAWERS_KEY })
    })
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <SiteHeader title="Point of Sale">
        {view === 'new' ? (
          <div className="flex flex-1 justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setView('orders')}
            >
              Back
            </Button>
          </div>
        ) : (
          <div className="relative flex min-w-0 flex-1 items-center justify-end">
            <Tabs
              value={orderFilter}
              onValueChange={(value) => {
                if (!isPosOrderFilter(value)) return
                setOrderFilter(value)
                setView('orders')
              }}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            >
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="online">Online</TabsTrigger>
                <TabsTrigger value="offline">Offline</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="secondary"
                size="icon-sm"
                onClick={startNewCart}
                aria-label="Start new order"
              >
                <PlusIcon />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="POS options"
                  >
                    <MoreHorizontalIcon />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setView('drawer')}>
                    <WalletCardsIcon />
                    Cash Drawer
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        )}
      </SiteHeader>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1.5fr)_minmax(20rem,1fr)]">
        {view === 'new' ? (
          <>
            <main className="min-h-0 overflow-y-auto px-4 py-4">
              {catalogLoading || !catalog ? (
                <div className="flex h-40 items-center justify-center">
                  <Spinner />
                </div>
              ) : (
                <NewOrderWorkspace
                  catalog={catalog}
                  selectedBrandId={selectedBrand?.id ?? ''}
                  selectedSourceId={selectedSource?.id ?? ''}
                  selectedMenuId={selectedMenu?.id ?? ''}
                  menusForBrand={menusForBrand}
                  itemsForMenu={itemsForMenu}
                  combosForBrand={combosForBrand}
                  onBrand={setBrandId}
                  onSource={setSourceId}
                  onMenu={setMenuId}
                  onItem={(item) => {
                    if (item.modifier_groups.length > 0) setModifierItem(item)
                    else addItem(item)
                  }}
                  onCombo={addCombo}
                />
              )}
            </main>
            <CartPanel
              lines={cartLines}
              combos={cartCombos}
              notes={notes}
              sourceOrderCode={sourceOrderCode}
              discount={cartDiscount}
              error={cartError}
              pending={submitting}
              canSubmit={canCreateOrder}
              canDiscount={canApplyDiscount}
              onNotes={setNotes}
              onSourceOrderCode={setSourceOrderCode}
              onSubmit={submitOrder}
              onLineQty={updateLineQty}
              onComboQty={updateComboQty}
              onRemoveLine={(key) => setCartLines((prev) => prev.filter((line) => line.key !== key))}
              onRemoveCombo={(key) => setCartCombos((prev) => prev.filter((combo) => combo.key !== key))}
              onOpenDiscount={() => setCartDiscountOpen(true)}
            />
          </>
        ) : view === 'orders' ? (
          <>
            <OrderCards
              orders={filteredOrders}
              selectedId={selectedOrder?.id ?? null}
              onSelect={setSelectedOrderId}
            />
            <PosOrderPanel
              order={selectedOrderDetail ?? null}
              fallback={selectedOrder}
              canUpdate={canUpdateOrder}
              canAction={canActionOrder}
              statusError={statusError}
              statusPending={statusPending}
              printError={printError}
              printing={printing}
              onStatus={moveOrderStatus}
              onAction={setOrderAction}
              onDiscount={() => setDiscountOpen(true)}
              onPrint={printReceipt}
            />
          </>
        ) : (
          <>
            <CashDrawerActions
              session={selectedDrawer}
              canCreate={canCreateDrawer}
              canUpdate={canUpdateDrawer}
              onDialog={setDrawerDialog}
            />
            <DrawerPanel
              kitchenId={kitchen.id}
              session={selectedDrawer}
              canCreate={canCreateDrawer}
              canUpdate={canUpdateDrawer}
              dialog={drawerDialog}
              onDialog={setDrawerDialog}
            />
          </>
        )}
      </div>

      <ModifierDialog
        item={modifierItem}
        open={modifierItem !== null}
        onOpenChange={(next) => {
          if (!next) setModifierItem(null)
        }}
        onAdd={addItem}
      />

      <CartDiscountDialog
        open={cartDiscountOpen}
        onOpenChange={setCartDiscountOpen}
        value={cartDiscount}
        onApply={setCartDiscount}
      />

      {selectedOrderDetail && orderAction ? (
        <OrderActionDialog
          open={orderAction !== null}
          onOpenChange={async (next) => {
            if (!next) {
              setOrderAction(null)
              await queryClient.invalidateQueries({ queryKey: POS_ORDERS_KEY })
            }
          }}
          kitchenId={kitchen.id}
          order={selectedOrderDetail}
          type={orderAction.type}
          itemMode={orderAction.itemMode}
          title={orderAction.title}
        />
      ) : null}

      {selectedOrderDetail ? (
        <DiscountDialog
          open={discountOpen}
          onOpenChange={async (next) => {
            setDiscountOpen(next)
            if (!next) await queryClient.invalidateQueries({ queryKey: POS_ORDERS_KEY })
          }}
          kitchenId={kitchen.id}
          order={selectedOrderDetail}
        />
      ) : null}
    </div>
  )
}

function NewOrderWorkspace({
  catalog,
  selectedBrandId,
  selectedSourceId,
  selectedMenuId,
  menusForBrand,
  itemsForMenu,
  combosForBrand,
  onBrand,
  onSource,
  onMenu,
  onItem,
  onCombo,
}: {
  catalog: PosCatalog
  selectedBrandId: string
  selectedSourceId: string
  selectedMenuId: string
  menusForBrand: PosCatalog['menus']
  itemsForMenu: PosCatalogItem[]
  combosForBrand: PosCatalogCombo[]
  onBrand: (id: string) => void
  onSource: (id: string) => void
  onMenu: (id: string) => void
  onItem: (item: PosCatalogItem) => void
  onCombo: (combo: PosCatalogCombo) => void
}) {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <section>
          <h2 className="mb-2 text-sm font-medium">Brands</h2>
          <div className="flex min-w-0 flex-nowrap items-center gap-2 overflow-x-auto pb-0.5">
            {catalog.brands.map((brand) => (
              <CatalogChipPick
                key={brand.id}
                active={brand.id === selectedBrandId}
                label={brand.name}
                logoUrl={brand.logo_url}
                onClick={() => onBrand(brand.id)}
              />
            ))}
          </div>
        </section>
        <section>
          <h2 className="mb-2 text-sm font-medium">Sources</h2>
          <div className="flex min-w-0 flex-nowrap items-center gap-2 overflow-x-auto pb-0.5">
            {catalog.sources.map((source) => (
              <CatalogChipPick
                key={source.id}
                active={source.id === selectedSourceId}
                label={source.name}
                logoUrl={source.logo_url}
                onClick={() => onSource(source.id)}
              />
            ))}
          </div>
        </section>
      </div>

      <CatalogSection title="Menus">
        {menusForBrand.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active menus for this brand.</p>
        ) : (
          menusForBrand.map((menu) => (
            <CardButton
              key={menu.id}
              active={menu.id === selectedMenuId}
              title={menu.name}
              onClick={() => onMenu(menu.id)}
            />
          ))
        )}
      </CatalogSection>

      <CatalogSection title="Menu Items">
        {itemsForMenu.length === 0 ? (
          <p className="text-sm text-muted-foreground">No available items.</p>
        ) : (
          itemsForMenu.map((item) => (
            <CardButton
              key={item.id}
              title={item.name}
              subtitle={
                item.modifier_groups.length > 0
                  ? `${item.modifier_groups.length} modifier group(s)`
                  : 'No modifiers'
              }
              meta={formatAmount(item.price)}
              onClick={() => onItem(item)}
            />
          ))
        )}
      </CatalogSection>

      <CatalogSection title="Combos">
        {combosForBrand.length === 0 ? (
          <p className="text-sm text-muted-foreground">No available combos.</p>
        ) : (
          combosForBrand.map((combo) => (
            <CardButton
              key={combo.id}
              title={combo.name}
              subtitle={`${combo.combo_items.length} item(s)`}
              meta={formatAmount(combo.price)}
              onClick={() => onCombo(combo)}
            />
          ))
        )}
      </CatalogSection>
    </div>
  )
}

function CatalogSection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section>
      <h2 className="mb-2 text-sm font-medium">{title}</h2>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">{children}</div>
    </section>
  )
}

function formatCartDiscountDisplay(discount: CartDiscount, subtotal: number): string {
  if (discount.type === 'percentage') {
    const amount = (subtotal * discount.value) / 100
    return `-${formatAmount(amount)} (${discount.value}%)`
  }
  return `-${formatAmount(discount.value)}`
}

function cartDiscountAmount(discount: CartDiscount | null, subtotal: number): number {
  if (!discount) return 0
  if (discount.type === 'percentage') return (subtotal * discount.value) / 100
  return discount.value
}

function CartPanel({
  lines,
  combos,
  notes,
  sourceOrderCode,
  discount,
  error,
  pending,
  canSubmit,
  canDiscount,
  onNotes,
  onSourceOrderCode,
  onSubmit,
  onLineQty,
  onComboQty,
  onRemoveLine,
  onRemoveCombo,
  onOpenDiscount,
}: {
  lines: PosCartLine[]
  combos: PosCartCombo[]
  notes: string
  sourceOrderCode: string
  discount: CartDiscount | null
  error: string | null
  pending: boolean
  canSubmit: boolean
  canDiscount: boolean
  onNotes: (value: string) => void
  onSourceOrderCode: (value: string) => void
  onSubmit: () => void
  onLineQty: (key: string, delta: number) => void
  onComboQty: (key: string, delta: number) => void
  onRemoveLine: (key: string) => void
  onRemoveCombo: (key: string) => void
  onOpenDiscount: () => void
}) {
  const subtotal = cartTotal(lines, combos)
  const discountAmt = cartDiscountAmount(discount, subtotal)
  const total = subtotal - discountAmt
  const empty = lines.length === 0 && combos.length === 0

  return (
    <DetailPanel
      title="Cart"
      subtitle={`${lines.length + combos.length} line(s)`}
      footer={
        <div className="space-y-3">
          {error ? <FieldError>{error}</FieldError> : null}
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Total</span>
            <span className="text-sm font-medium text-muted-foreground tabular-nums">{formatAmount(total)}</span>
          </div>
          <div className="flex items-center gap-2">
            {canDiscount ? (
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="shrink-0"
                onClick={onOpenDiscount}
                aria-label="Add discount"
              >
                <PercentIcon />
              </Button>
            ) : null}
            <Button
              type="button"
              className="min-w-0 flex-1"
              onClick={onSubmit}
              disabled={pending || !canSubmit || empty}
            >
              {pending ? <Spinner data-icon="inline-start" /> : <ReceiptTextIcon />}
              Submit order
            </Button>
          </div>
        </div>
      }
    >
      {empty ? (
        <EmptyState title="No items" description="Add items or combos from the left panel." />
      ) : (
        <div className="space-y-3">
          {lines.map((line) => (
            <CartLineRow
              key={line.key}
              title={line.name}
              subtitle={
                line.modifiers.length > 0
                  ? line.modifiers.map((m) => `${m.name} x ${m.quantity}`).join(', ')
                  : undefined
              }
              quantity={line.quantity}
              amount={line.quantity * lineUnitTotal(line)}
              onDecrease={() => onLineQty(line.key, -1)}
              onIncrease={() => onLineQty(line.key, 1)}
              onRemove={() => onRemoveLine(line.key)}
            />
          ))}
          {combos.map((combo) => (
            <CartLineRow
              key={combo.key}
              title={combo.name}
              subtitle="Combo"
              quantity={combo.quantity}
              amount={combo.quantity * combo.unit_price}
              onDecrease={() => onComboQty(combo.key, -1)}
              onIncrease={() => onComboQty(combo.key, 1)}
              onRemove={() => onRemoveCombo(combo.key)}
            />
          ))}
          <div className="grid gap-2 pt-2">
            <Label htmlFor="pos-notes">Notes</Label>
            <Textarea
              id="pos-notes"
              value={notes}
              onChange={(event) => onNotes(event.target.value)}
              placeholder="Optional"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="pos-source-order-code">Source order code</Label>
            <Input
              id="pos-source-order-code"
              value={sourceOrderCode}
              onChange={(event) => onSourceOrderCode(event.target.value)}
              placeholder="Optional"
            />
          </div>
          {discount ? (
            <div className="space-y-2 pt-1">
              <h3 className="text-sm font-medium text-muted-foreground">Transaction summary</h3>
              <div className="grid gap-2 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium">Subtotal</span>
                  <span className="font-medium tabular-nums text-muted-foreground">{formatAmount(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium">Discount</span>
                  <span className="font-medium tabular-nums text-muted-foreground">
                    {formatCartDiscountDisplay(discount, subtotal)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium">Total</span>
                  <span className="font-medium tabular-nums text-muted-foreground">{formatAmount(total)}</span>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </DetailPanel>
  )
}

function CartLineRow({
  title,
  subtitle,
  quantity,
  amount,
  onDecrease,
  onIncrease,
  onRemove,
}: {
  title: string
  subtitle?: string
  quantity: number
  amount: number
  onDecrease: () => void
  onIncrease: () => void
  onRemove: () => void
}) {
  return (
    <div className="rounded-lg border px-3 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{title}</p>
          {subtitle ? <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{subtitle}</p> : null}
        </div>
        <p className="text-sm font-medium">{formatAmount(amount)}</p>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Button type="button" variant="outline" size="icon-sm" onClick={onDecrease}>
            <MinusIcon />
          </Button>
          <span className="w-8 text-center text-sm">{quantity}</span>
          <Button type="button" variant="outline" size="icon-sm" onClick={onIncrease}>
            <PlusIcon />
          </Button>
        </div>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onRemove}>
          <TrashIcon />
        </Button>
      </div>
    </div>
  )
}

function OrderCards({
  orders,
  selectedId,
  onSelect,
}: {
  orders: OrderRow[]
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  return (
    <main className="min-h-0 min-w-0 overflow-y-auto px-4 py-4">
      <div className="flex flex-col gap-2">
        {orders.length === 0 ? (
          <p className="text-sm text-muted-foreground">No orders yet.</p>
        ) : (
          orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              active={order.id === selectedId}
              onClick={() => onSelect(order.id)}
            />
          ))
        )}
      </div>
    </main>
  )
}

/** Tag / pill row: no track, selected = secondary pill, unselected = text only (matches segmented “Guests / Members” style). */
const posOrderDetailTagTabListClassName = cn(
  'h-auto min-h-0 w-full flex-wrap justify-start gap-2 !bg-transparent p-0 !shadow-none',
  'group-data-horizontal/tabs:h-auto'
)

/** `text-sm`; no shadow (including active). */
const posOrderDetailTagTabTriggerClassName = cn(
  'relative !h-auto min-h-0 !flex-none shrink-0 rounded-full border-0 px-2.5 py-1 text-sm font-medium',
  '!shadow-none data-active:!shadow-none',
  'bg-transparent text-muted-foreground hover:text-foreground',
  'data-active:bg-secondary data-active:text-secondary-foreground',
  'dark:data-active:bg-secondary dark:data-active:text-secondary-foreground',
  'after:hidden'
)

/** Qty chips: normal radius, fixed min width so columns align with modifier rows. */
const posOrderDetailQtyBadgeClassName = cn(
  'rounded-md min-h-5 min-w-[2.25rem] justify-center px-2 py-0.5 text-xs font-medium tabular-nums shadow-none'
)

function formatQtyInteger(value: string | number): string {
  const n = typeof value === 'string' ? Number(value) : value
  if (Number.isNaN(n)) return '-'
  return Math.round(n).toLocaleString('en-US', { maximumFractionDigits: 0 })
}

function formatOrderTabDiscountDisplay(detail: OrderDetail): string {
  const n = Number(detail.discount_amount)
  if (Number.isNaN(n)) return '-'
  const magnitude = Math.abs(n)
  const formattedAbs = formatAmount(magnitude)
  const amountText = magnitude === 0 ? formattedAbs : `-${formattedAbs}`

  const pctRows = detail.order_discounts.filter(
    (row) => row.type === 'percentage' && row.percentage != null
  )
  if (pctRows.length === 0 || magnitude === 0) return amountText

  const pctPart = pctRows.map((row) => `${formatAmount(row.percentage!)}%`).join(', ')
  return `${amountText} (${pctPart})`
}

function PosOrderPanel({
  order,
  fallback,
  canUpdate,
  canAction,
  statusError,
  statusPending,
  printError,
  printing,
  onStatus,
  onAction,
  onDiscount,
  onPrint,
}: {
  order: OrderDetail | null
  fallback: OrderRow | null
  canUpdate: boolean
  canAction: boolean
  statusError: string | null
  statusPending: boolean
  printError: string | null
  printing: boolean
  onStatus: (order: OrderDetail, next: 'ready' | 'completed') => void
  onAction: (state: { type: OrderActionType; itemMode?: boolean; title?: string }) => void
  onDiscount: () => void
  onPrint: (order: OrderDetail) => void
}) {
  const detail = order
  const display = order ?? fallback
  const isCompleted = display?.kitchen_status === 'completed'
  const canRefund =
    Boolean(detail && canAction && isCompleted && detail.payment_status === 'paid' && detail.sources?.settlement_mode === 'cash_now')
  const canComp =
    Boolean(detail && canAction && isCompleted && detail.sources?.settlement_mode === 'marketplace_receivable')

  const hasMoreMenuActions = Boolean(
    (canUpdate && !isCompleted) ||
      (canAction && !isCompleted) ||
      canRefund ||
      canComp
  )

  const hasLeadMenuActions =
    (canUpdate && !isCompleted) || (canAction && !isCompleted)

  return (
    <DetailPanel
      header={display ? <OrderPanelHeader order={display} /> : undefined}
      title={display ? undefined : 'Order details'}
      footer={
        detail ? (
          <div className="space-y-2">
            {statusError ? <FieldError>{statusError}</FieldError> : null}
            {printError ? <FieldError>{printError}</FieldError> : null}
            <div className="flex items-center gap-2">
              {hasMoreMenuActions ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon"
                      className="shrink-0"
                      aria-label="More actions"
                    >
                      <MoreHorizontalIcon />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-max min-w-0">
                    {canUpdate && !isCompleted ? (
                      <DropdownMenuItem onClick={onDiscount}>Discount</DropdownMenuItem>
                    ) : null}
                    {canAction && !isCompleted ? (
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => onAction({ type: 'void' })}
                      >
                        Void
                      </DropdownMenuItem>
                    ) : null}
                    {canRefund ? (
                      <>
                        {hasLeadMenuActions ? <DropdownMenuSeparator /> : null}
                        <DropdownMenuItem
                          onClick={() => onAction({ type: 'refund', title: 'Full refund' })}
                        >
                          Full refund
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            onAction({ type: 'refund', itemMode: true, title: 'Partial refund' })
                          }
                        >
                          Partial refund
                        </DropdownMenuItem>
                      </>
                    ) : null}
                    {canComp ? (
                      <>
                        {hasLeadMenuActions || canRefund ? (
                          <DropdownMenuSeparator />
                        ) : null}
                        <DropdownMenuItem onClick={() => onAction({ type: 'full_comp' })}>
                          Full comp
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            onAction({
                              type: 'partial_comp',
                              itemMode: true,
                              title: 'Partial comp',
                            })
                          }
                        >
                          Partial comp
                        </DropdownMenuItem>
                      </>
                    ) : null}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="shrink-0"
                aria-label="Print receipt"
                onClick={() => onPrint(detail)}
                disabled={printing}
              >
                {printing ? <Spinner /> : <PrinterIcon />}
              </Button>
              {canUpdate && detail.kitchen_status === 'preparing' ? (
                <Button
                  type="button"
                  variant="default"
                  className="min-w-0 flex-1"
                  onClick={() => onStatus(detail, 'ready')}
                  disabled={statusPending}
                >
                  <CheckCircle2Icon />
                  Ready
                </Button>
              ) : null}
              {canUpdate && detail.kitchen_status === 'ready' ? (
                <Button
                  type="button"
                  variant="default"
                  className="min-w-0 flex-1"
                  onClick={() => onStatus(detail, 'completed')}
                  disabled={statusPending}
                >
                  <CheckCircle2Icon />
                  Complete
                </Button>
              ) : null}
            </div>
          </div>
        ) : null
      }
    >
      {!display ? (
        <EmptyState title="No order selected" description="Select an order from the left panel." />
      ) : !detail ? (
        <div className="flex h-40 items-center justify-center">
          <Spinner />
        </div>
      ) : (
        <Tabs defaultValue="order" className="w-full">
          <TabsList className={posOrderDetailTagTabListClassName}>
            <TabsTrigger value="order" className={posOrderDetailTagTabTriggerClassName}>
              Order
            </TabsTrigger>
            <TabsTrigger value="more" className={posOrderDetailTagTabTriggerClassName}>
              More
            </TabsTrigger>
          </TabsList>

          <TabsContent value="order" className="mt-3 space-y-4">
            {detail.notes ? (
              <div className="rounded-lg bg-secondary p-3 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <NotebookPenIcon className="size-3.5" />
                  Note
                </div>
                <p className="whitespace-pre-wrap text-sm">"{detail.notes}"</p>
              </div>
            ) : null}

            <div className="space-y-2">
              {detail.order_items.length === 0 && detail.order_combos.length === 0 ? (
                <p className="py-3 text-center text-sm text-muted-foreground">No line items.</p>
              ) : (
                <>
                  {detail.order_items.map((item) => (
                    <div key={item.id} className="flex gap-2 py-2">
                      <Badge variant="secondary" className={posOrderDetailQtyBadgeClassName}>
                        {formatQtyInteger(item.quantity)}
                      </Badge>
                      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm leading-snug">
                              {item.menu_item?.name ?? item.id.slice(0, 8)}
                            </p>
                            {item.pricing_source === 'combo_allocated' ? (
                              <p className="mt-0.5 text-xs text-muted-foreground">Combo allocated</p>
                            ) : null}
                          </div>
                          <p className="shrink-0 text-sm font-medium tabular-nums text-muted-foreground">
                            {formatAmount(item.line_total)}
                          </p>
                        </div>
                        {item.order_item_modifiers.map((modifier) => (
                          <div
                            key={modifier.id}
                            className="flex items-start justify-between gap-3"
                          >
                            <div className="flex min-w-0 items-start gap-2">
                              <Badge variant="secondary" className={posOrderDetailQtyBadgeClassName}>
                                {formatQtyInteger(modifier.quantity)}
                              </Badge>
                              <p className="min-w-0 flex-1 text-xs leading-snug text-muted-foreground">
                                {modifier.modifier_option?.name ?? modifier.modifier_option_id}
                              </p>
                            </div>
                            <p className="shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
                              {formatAmount(modifier.price_impact)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  {detail.order_combos.map((combo) => (
                    <div key={combo.id} className="py-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 flex-1 items-start gap-2">
                          <Badge variant="secondary" className={posOrderDetailQtyBadgeClassName}>
                            {formatQtyInteger(combo.quantity)}
                          </Badge>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm leading-snug">{combo.combo_name_snapshot}</p>
                            <p className="text-xs text-muted-foreground">Combo</p>
                          </div>
                        </div>
                        <p className="shrink-0 text-sm font-medium tabular-nums text-muted-foreground">
                          {formatAmount(combo.total_price)}
                        </p>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">Transaction summary</h3>
              <div className="grid gap-2 text-sm">
                <InfoLine tone="value-muted" label="Subtotal" value={formatAmount(detail.gross_amount)} />
                <InfoLine tone="value-muted" label="Discount" value={formatOrderTabDiscountDisplay(detail)} />
                <InfoLine tone="value-muted" label="Total" value={formatAmount(detail.net_amount)} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="more" className="mt-3 space-y-4">
            <div className="grid gap-2 text-sm">
              <InfoLine label="Brand" value={detail.brands?.name ?? '-'} />
              <InfoLine
                label="Source"
                value={
                  detail.sources ? (
                    <span>
                      {detail.sources.name}
                      {detail.sources.type ? (
                        <span className="text-muted-foreground"> · {detail.sources.type}</span>
                      ) : null}
                    </span>
                  ) : (
                    '-'
                  )
                }
              />
              {detail.sources?.settlement_mode ? (
                <InfoLine
                  label="Settlement"
                  value={
                    detail.sources.settlement_mode === 'cash_now'
                      ? 'Cash now'
                      : 'Marketplace receivable'
                  }
                />
              ) : null}
              {detail.source_order_code ? (
                <InfoLine label="Source order" value={detail.source_order_code} />
              ) : null}
              <InfoLine label="Payment" value={paymentStatusLabel(detail.payment_status)} />
              <InfoLine label="Created" value={formatDateTime(detail.created_at)} />
              {detail.created_member?.profiles?.full_name ? (
                <InfoLine label="Created by" value={detail.created_member.profiles.full_name} />
              ) : null}
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">Discounts</h3>
              <div className="divide-y rounded-lg border">
                {detail.order_discounts.length === 0 ? (
                  <p className="p-3 text-center text-sm text-muted-foreground">No discounts.</p>
                ) : (
                  detail.order_discounts.map((row) => {
                    const itemLabel =
                      row.order_item_id &&
                      detail.order_items.find((i) => i.id === row.order_item_id)?.menu_item?.name
                    const valueLabel =
                      row.type === 'percentage' && row.percentage != null
                        ? `${formatAmount(row.percentage)}%`
                        : formatAmount(row.amount)
                    return (
                      <div key={row.id} className="flex flex-col gap-0.5 px-3 py-2">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm">{row.reason ?? 'Discount'}</p>
                          <p className="text-sm font-medium">{valueLabel}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                          <span className="capitalize">{row.type}</span>
                          {itemLabel ? <span>· {itemLabel}</span> : null}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">Actions</h3>
              <div className="divide-y rounded-lg border">
                {detail.order_actions.length === 0 ? (
                  <p className="p-3 text-center text-sm text-muted-foreground">No actions.</p>
                ) : (
                  detail.order_actions.map((action) => (
                    <div key={action.id} className="flex items-center justify-between gap-3 px-3 py-2">
                      <p className="text-sm">{orderActionLabel(action.type)}</p>
                      <p className="text-sm font-medium">{formatAmount(action.action_amount)}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </DetailPanel>
  )
}

function InfoLine({
  label,
  value,
  tone = 'muted',
}: {
  label: string
  value: React.ReactNode
  tone?: 'muted' | 'primary' | 'value-muted'
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className={tone === 'primary' ? 'text-primary' : tone === 'value-muted' ? undefined : 'text-muted-foreground'}>
        {label}
      </span>
      <span
        className={cn(
          'text-right font-medium tabular-nums',
          tone === 'primary' ? 'text-primary' : tone === 'value-muted' ? 'text-muted-foreground' : undefined
        )}
      >
        {value}
      </span>
    </div>
  )
}

function CashDrawerActions({
  session,
  canCreate,
  canUpdate,
  onDialog,
}: {
  session: DrawerSessionSummary | null
  canCreate: boolean
  canUpdate: boolean
  onDialog: (dialog: DrawerDialogType | null) => void
}) {
  return (
    <main className="min-h-0 overflow-y-auto px-4 py-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-medium">Cash Drawer</h2>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {session?.status === 'open' && canUpdate ? (
          <>
            <CardButton tone="primary" title="Cash in" onClick={() => onDialog('cash_in')} />
            <CardButton tone="destructive" title="Cash out" onClick={() => onDialog('cash_out')} />
            <CardButton tone="destructive-strong" title="Close drawer" onClick={() => onDialog('close')} />
          </>
        ) : session?.status === 'closed' && canUpdate ? (
          <div className="col-span-2">
            <CardButton title="Reopen drawer" onClick={() => onDialog('reopen')} />
          </div>
        ) : !session && canCreate ? (
          <div className="col-span-2">
            <CardButton tone="primary" title="Open drawer" onClick={() => onDialog('open')} />
          </div>
        ) : (
          <p className="col-span-2 text-sm text-muted-foreground">No actions available.</p>
        )}
      </div>
    </main>
  )
}

function DrawerPanel({
  kitchenId,
  session,
  canCreate,
  canUpdate,
  dialog,
  onDialog,
}: {
  kitchenId: string
  session: DrawerSessionSummary | null
  canCreate: boolean
  canUpdate: boolean
  dialog: DrawerDialogType | null
  onDialog: (dialog: DrawerDialogType | null) => void
}) {
  const queryClient = useQueryClient()
  const { data: transactions, isLoading } = useQuery({
    queryKey: ['drawer-transactions', session?.id],
    queryFn: () => fetchDrawerTransactions(session?.id ?? ''),
    enabled: !!session?.id,
  })
  const [undoError, setUndoError] = useState<string | null>(null)
  const [undoPending, startUndoTransition] = useTransition()

  function undo(tx: DrawerTransactionRow) {
    setUndoError(null)
    startUndoTransition(async () => {
      const result = await undoDrawerTransaction(kitchenId, tx.id)
      if (result instanceof Error) {
        setUndoError(result.message)
        return
      }
      await queryClient.invalidateQueries({ queryKey: POS_DRAWERS_KEY })
      await queryClient.invalidateQueries({ queryKey: ['drawer-transactions', session?.id] })
    })
  }

  return (
    <>
      <DetailPanel
        title={session ? 'Drawer session' : 'Cash drawer'}
        subtitle={session ? `${session.status} · ${formatDateTime(session.opened_at)}` : undefined}
      >
        {!session ? (
          <EmptyState
            title="No drawer session"
            description="Open a drawer before taking cash orders."
            action={
              canCreate ? (
                <Button type="button" onClick={() => onDialog('open')}>
                  Open drawer
                </Button>
              ) : null
            }
          />
        ) : (
          <div className="space-y-4">
            <div className="grid gap-2 text-sm">
              <InfoLine
                label="Account"
                value={session.drawer_account ? `${session.drawer_account.code} · ${session.drawer_account.name}` : '-'}
              />
              <InfoLine label="Opening" value={formatAmount(session.opening_balance)} />
              <InfoLine label="Expected" value={formatAmount(session.expected_closing_balance)} />
              <InfoLine label="Actual" value={formatAmount(session.actual_closing_balance)} />
              <InfoLine label="Variance" value={formatAmount(session.variance)} />
            </div>
            {undoError ? <FieldError>{undoError}</FieldError> : null}
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Transactions</h3>
              {isLoading ? (
                <div className="flex h-24 items-center justify-center">
                  <Spinner />
                </div>
              ) : !transactions || transactions.length === 0 ? (
                <p className="rounded-lg border p-4 text-center text-sm text-muted-foreground">
                  No transactions.
                </p>
              ) : (
                <div className="divide-y rounded-lg border">
                  {transactions.map((tx) => (
                    <div key={tx.id} className="flex items-start justify-between gap-3 px-3 py-3">
                      <div>
                        <p className="text-sm font-medium">{tx.type}</p>
                        <p className="text-xs text-muted-foreground">
                          {tx.reason ?? formatDateTime(tx.created_at)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <p className="text-sm font-medium">{formatAmount(tx.amount)}</p>
                        {canUpdate &&
                        session.status === 'open' &&
                        (tx.type === 'cash_in' || tx.type === 'cash_out') &&
                        tx.undone_by_transaction_id === null ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => undo(tx)}
                            disabled={undoPending}
                          >
                            <TrashIcon />
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </DetailPanel>
      <DrawerSessionDialog
        kitchenId={kitchenId}
        session={session}
        type={dialog}
        open={dialog !== null}
        onOpenChange={(next) => {
          if (!next) onDialog(null)
        }}
      />
    </>
  )
}

function DrawerSessionDialog({
  kitchenId,
  session,
  type,
  open,
  onOpenChange,
}: {
  kitchenId: string
  session: DrawerSessionSummary | null
  type: DrawerDialogType | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const queryClient = useQueryClient()
  const [accountId, setAccountId] = useState('')
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const needsAccount = type === 'open' || type === 'cash_in' || type === 'cash_out'
  const { data: accounts } = useQuery({
    queryKey: ['pos-active-asset-accounts', kitchenId],
    queryFn: () => fetchActiveAssetAccounts(kitchenId),
    enabled: open && needsAccount,
  })

  function reset() {
    setAccountId('')
    setAmount('')
    setReason('')
    setError(null)
  }

  function submit() {
    setError(null)
    startTransition(async () => {
      let result: string | void | Error
      if (type === 'open') {
        if (!accountId) {
          setError('Select a drawer account.')
          return
        }
        result = await openDrawerSession(kitchenId, accountId)
      } else if (type === 'cash_in') {
        if (!session) return
        const value = Number(amount)
        if (!Number.isFinite(value) || value <= 0 || !accountId) {
          setError('Enter an amount and source account.')
          return
        }
        result = await addDrawerCashIn(kitchenId, {
          sessionId: session.id,
          amount: value,
          sourceAccountId: accountId,
          reason: reason.trim() || null,
        })
      } else if (type === 'cash_out') {
        if (!session) return
        const value = Number(amount)
        if (!Number.isFinite(value) || value <= 0 || !accountId) {
          setError('Enter an amount and destination account.')
          return
        }
        result = await addDrawerCashOut(kitchenId, {
          sessionId: session.id,
          amount: value,
          destinationAccountId: accountId,
          reason: reason.trim() || null,
        })
      } else if (type === 'close') {
        if (!session) return
        const value = Number(amount)
        if (!Number.isFinite(value) || value < 0) {
          setError('Enter an actual closing amount.')
          return
        }
        result = await closeDrawerSession(kitchenId, {
          sessionId: session.id,
          actualCloseAmount: value,
          closeDate: new Date().toISOString().slice(0, 10),
          reason: reason.trim() || null,
        })
      } else if (type === 'reopen') {
        if (!session) return
        if (!reason.trim()) {
          setError('Enter a reopen reason.')
          return
        }
        result = await reopenDrawerSession(kitchenId, session.id, reason.trim())
      } else {
        return
      }

      if (result instanceof Error) {
        setError(result.message)
        return
      }
      await queryClient.invalidateQueries({ queryKey: POS_DRAWERS_KEY })
      if (session) {
        await queryClient.invalidateQueries({ queryKey: ['drawer-transactions', session.id] })
      }
      reset()
      onOpenChange(false)
    })
  }

  const title =
    type === 'open'
      ? 'Open drawer'
      : type === 'cash_in'
        ? 'Cash in'
        : type === 'cash_out'
          ? 'Cash out'
          : type === 'close'
            ? 'Close drawer'
            : 'Reopen drawer'

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (pending) return
        onOpenChange(next)
        if (!next) reset()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Record the drawer action through accounting.</DialogDescription>
        </DialogHeader>

        {needsAccount ? (
          <div className="grid gap-2">
            <Label>Account</Label>
            <Select value={accountId} onValueChange={setAccountId} disabled={pending}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent>
                {(accounts ?? [])
                  .filter((account) => account.id !== session?.drawer_account_id)
                  .map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.code} · {account.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        {type !== 'open' && type !== 'reopen' ? (
          <div className="grid gap-2">
            <Label htmlFor="drawer-amount">
              {type === 'close' ? 'Actual close amount' : 'Amount'}
            </Label>
            <Input
              id="drawer-amount"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              inputMode="decimal"
              placeholder="0.00"
              disabled={pending}
            />
          </div>
        ) : null}

        {type !== 'open' ? (
          <div className="grid gap-2">
            <Label htmlFor="drawer-reason">Reason</Label>
            <Textarea
              id="drawer-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder={type === 'reopen' ? 'Required' : 'Optional'}
              disabled={pending}
            />
          </div>
        ) : null}

        {error ? <FieldError>{error}</FieldError> : null}

        <DialogFooter>
          <Button type="button" onClick={submit} disabled={pending}>
            {pending ? <Spinner data-icon="inline-start" /> : null}
            Save
          </Button>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={pending}>
              Cancel
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
