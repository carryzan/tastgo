import { dehydrate, HydrationBoundary } from '@tanstack/react-query'
import { SettlementMain } from './_components/settlement-main'
import { prefetchSettlementTabs } from './_lib/prefetch'

export default async function SettlementPage({
  params,
}: {
  params: Promise<{ 'kitchen-id': string }>
}) {
  const { 'kitchen-id': kitchenId } = await params
  const queryClient = await prefetchSettlementTabs(kitchenId)

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <SettlementMain />
    </HydrationBoundary>
  )
}
