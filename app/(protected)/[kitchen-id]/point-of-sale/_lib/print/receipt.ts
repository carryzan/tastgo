import { formatAmount, formatDateTime } from '@/lib/order-format'
import type { OrderDetail } from '@/lib/types/orders'

export interface ReceiptKitchen {
  name: string
  location: string | null
}

export interface BuildReceiptHtmlInput {
  order: OrderDetail
  kitchen: ReceiptKitchen
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function formatQty(value: string | number): string {
  const n = typeof value === 'string' ? Number(value) : value
  if (!Number.isFinite(n)) return '-'
  return Number.isInteger(n) ? String(n) : n.toLocaleString('en-US', { maximumFractionDigits: 3 })
}

function row(label: string, value: string, options?: { bold?: boolean; muted?: boolean }): string {
  const cls = [
    'row',
    options?.bold ? 'bold' : '',
    options?.muted ? 'muted' : '',
  ]
    .filter(Boolean)
    .join(' ')
  return `<div class="${cls}"><span>${escapeHtml(label)}</span><span>${escapeHtml(value)}</span></div>`
}

function renderItems(order: OrderDetail): string {
  const lines: string[] = []

  for (const item of order.order_items) {
    const name = item.menu_item?.name ?? 'Item'
    const qty = formatQty(item.quantity)
    const lineTotal = formatAmount(item.line_total)
    lines.push(`
      <div class="item">
        <div class="row">
          <span class="qty">${escapeHtml(qty)}× ${escapeHtml(name)}</span>
          <span>${escapeHtml(lineTotal)}</span>
        </div>
    `)
    for (const mod of item.order_item_modifiers) {
      const modName = mod.modifier_option?.name ?? '—'
      const modQty = formatQty(mod.quantity)
      const modPrice = formatAmount(mod.price_impact)
      lines.push(`
        <div class="modifier row muted">
          <span>+ ${escapeHtml(modQty)}× ${escapeHtml(modName)}</span>
          <span>${escapeHtml(modPrice)}</span>
        </div>
      `)
    }
    lines.push('</div>')
  }

  for (const combo of order.order_combos) {
    const qty = formatQty(combo.quantity)
    const total = formatAmount(combo.total_price)
    lines.push(`
      <div class="item">
        <div class="row">
          <span class="qty">${escapeHtml(qty)}× ${escapeHtml(combo.combo_name_snapshot)} <span class="muted">(combo)</span></span>
          <span>${escapeHtml(total)}</span>
        </div>
      </div>
    `)
  }

  if (lines.length === 0) {
    return '<p class="muted center">No items.</p>'
  }
  return lines.join('')
}

export function buildReceiptHtml({ order, kitchen }: BuildReceiptHtmlInput): string {
  const brand = order.brands
  const brandName = brand?.name ?? null
  const brandLogoUrl = brand?.logo_url?.trim() ? brand.logo_url.trim() : null
  const headerTitle = brandName ?? kitchen.name
  const showKitchenUnderBrand = Boolean(brandName)
  const sourceName = order.sources?.name ?? null
  const hasDiscount = Number(order.discount_amount) > 0
  const notes = order.notes?.trim() ? order.notes.trim() : null

  const logoBlock = brandLogoUrl
    ? `<div class="brand-logo-wrap"><img class="brand-logo" src="${escapeHtml(brandLogoUrl)}" alt="" width="100" height="100" /></div>`
    : ''

  return `<!DOCTYPE html>
<html dir="auto">
<head>
<meta charset="utf-8" />
<title>Order #${escapeHtml(String(order.order_number))}</title>
<style>
  * { box-sizing: border-box; }
  @page { margin: 0; size: 72mm auto; }
  html, body { margin: 0; padding: 0; }
  body {
    width: 72mm;
    padding: 4mm 3mm;
    font-family: 'Noto Sans Arabic', 'Noto Sans', 'Segoe UI', Tahoma, 'DejaVu Sans',
      'Liberation Sans', 'Menlo', 'Consolas', 'Courier New', monospace;
    font-size: 12px;
    font-weight: 500;
    line-height: 1.4;
    color: #000;
    -webkit-font-smoothing: none;
  }
  .center { text-align: center; }
  .bold { font-weight: 700; }
  .muted { color: #000; font-weight: 500; }
  .row { display: flex; justify-content: space-between; gap: 6px; align-items: baseline; font-weight: 500; }
  .row > span:last-child { white-space: nowrap; }
  .header { margin-bottom: 6px; }
  .brand-logo-wrap { display: flex; justify-content: center; margin-bottom: 6px; }
  .brand-logo { width: 100px; height: 100px; object-fit: contain; display: block; }
  .header .brand { font-size: 18px; font-weight: 700; }
  .header .sub { font-size: 11px; font-weight: 500; margin-top: 2px; }
  .divider { border: 0; border-top: 1px solid #000; margin: 8px 0; }
  .item { margin-bottom: 4px; }
  .item > .row {
    font-weight: 600;
    font-synthesis: weight;
  }
  .item .modifier.row {
    font-weight: 600;
    font-synthesis: weight;
  }
  .modifier { padding-left: 10px; font-size: 11px; }
  .qty { word-break: break-word; }
  .totals .row.bold { font-size: 13px; }
  .notes { margin: 6px 0; padding: 4px 6px; border: 1px solid #000; font-size: 11px; font-weight: 500; }
  .footer { margin-top: 8px; font-size: 11px; font-weight: 500; }
</style>
</head>
<body>
  <div class="header center">
    ${logoBlock}
    <div class="brand">${escapeHtml(headerTitle)}</div>
    ${showKitchenUnderBrand ? `<div class="sub">${escapeHtml(kitchen.name)}</div>` : ''}
    ${kitchen.location ? `<div class="sub">${escapeHtml(kitchen.location)}</div>` : ''}
  </div>

  <div class="divider"></div>

  <div class="row">
    <span>Order #${escapeHtml(String(order.order_number))}</span>
    <span>${escapeHtml(formatDateTime(order.created_at))}</span>
  </div>
  ${sourceName ? `<div class="row muted"><span>Source</span><span>${escapeHtml(sourceName)}</span></div>` : ''}
  ${order.source_order_code ? `<div class="row muted"><span>Code</span><span>${escapeHtml(order.source_order_code)}</span></div>` : ''}

  <div class="divider"></div>

  ${renderItems(order)}

  <div class="divider"></div>

  <div class="totals">
    ${row('Subtotal', formatAmount(order.gross_amount))}
    ${hasDiscount ? row('Discount', `-${formatAmount(order.discount_amount)}`) : ''}
    ${row('Total', formatAmount(order.net_amount), { bold: true })}
  </div>

  ${notes ? `<div class="notes"><div>Note</div>${escapeHtml(notes)}</div>` : ''}

  <div class="divider"></div>

  <div class="footer center muted">
    Thank you for your order
  </div>
</body>
</html>`
}
