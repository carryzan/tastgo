import { notFound } from 'next/navigation'
import { StockCountDetail } from '../../_components/stock-count-detail'
import { getStockCountDetail } from '../../_lib/detail-queries'

export default async function StockCountPage({
  params,
}: {
  params: Promise<{ 'kitchen-id': string; 'session-id': string }>
}) {
  const { 'kitchen-id': kitchenId, 'session-id': sessionId } = await params

  let detail: Awaited<ReturnType<typeof getStockCountDetail>>
  try {
    detail = await getStockCountDetail(kitchenId, sessionId)
  } catch {
    notFound()
  }

  return (
    <StockCountDetail
      kitchenId={kitchenId}
      session={detail.session}
      items={detail.items}
    />
  )
}
