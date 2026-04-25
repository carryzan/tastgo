import { notFound } from 'next/navigation'
import { OnlineSettlementDetail } from '../../_components/online-settlement-detail'
import { getOnlineSettlementDetail } from '../../_lib/detail-queries'

export default async function OnlineSettlementPage({
  params,
}: {
  params: Promise<{ 'kitchen-id': string; 'settlement-id': string }>
}) {
  const { 'kitchen-id': kitchenId, 'settlement-id': settlementId } = await params

  let detail: Awaited<ReturnType<typeof getOnlineSettlementDetail>>
  try {
    detail = await getOnlineSettlementDetail(kitchenId, settlementId)
  } catch {
    notFound()
  }

  return (
    <OnlineSettlementDetail
      kitchenId={kitchenId}
      settlement={detail.settlement}
      orders={detail.orders}
      eligibleOrders={detail.eligibleOrders}
    />
  )
}
