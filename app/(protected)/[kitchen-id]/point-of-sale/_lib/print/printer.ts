import type { OrderDetail } from '@/lib/types/orders'
import { buildReceiptHtml, type ReceiptKitchen } from './receipt'
import { ensureQzConnection, findReceiptPrinter } from './qz'

export interface PrintOrderReceiptInput {
  order: OrderDetail
  kitchen: ReceiptKitchen
  printerName?: string | null
}

const MM_PER_INCH = 25.4
const CSS_DPI = 96

function pxToMm(px: number): number {
  return (px * MM_PER_INCH) / CSS_DPI
}

function mmToPx(mm: number): number {
  return (mm * CSS_DPI) / MM_PER_INCH
}

async function measureHtmlHeightMm(html: string, widthMm: number): Promise<number> {
  const widthPx = Math.round(mmToPx(widthMm))

  const iframe = document.createElement('iframe')
  iframe.setAttribute('aria-hidden', 'true')
  iframe.style.position = 'fixed'
  iframe.style.left = '-10000px'
  iframe.style.top = '0'
  iframe.style.width = `${widthPx}px`
  iframe.style.height = '0'
  iframe.style.border = '0'
  iframe.style.visibility = 'hidden'
  iframe.style.pointerEvents = 'none'

  document.body.appendChild(iframe)

  try {
    await new Promise<void>((resolve) => {
      iframe.addEventListener('load', () => resolve(), { once: true })
      iframe.srcdoc = html
    })

    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

    const doc = iframe.contentDocument
    if (!doc?.body) return 200

    const rect = doc.body.getBoundingClientRect()
    const heightPx = Math.max(doc.body.scrollHeight, Math.ceil(rect.height))

    return Math.ceil(pxToMm(heightPx)) + 4
  } finally {
    iframe.remove()
  }
}

export async function printOrderReceipt({
  order,
  kitchen,
  printerName,
}: PrintOrderReceiptInput): Promise<void> {
  const qz = await ensureQzConnection()
  const printer = await findReceiptPrinter(printerName ?? null)

  const html = buildReceiptHtml({ order, kitchen })
  const heightMm = await measureHtmlHeightMm(html, 72)

  const config = qz.configs.create(printer, {
    size: { width: 72, height: heightMm, custom: true },
    units: 'mm',
    margins: 0,
    scaleContent: true,
    rasterize: true,
    density: 203,
    colorType: 'blackwhite',
    orientation: 'portrait',
    interpolation: 'bicubic',
  })

  await qz.print(config, [
    {
      type: 'pixel',
      format: 'html',
      flavor: 'plain',
      data: html,
      options: { pageWidth: 72, pageHeight: heightMm },
    },
  ])
}
