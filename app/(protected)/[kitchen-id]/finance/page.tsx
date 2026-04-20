import { dehydrate, HydrationBoundary } from '@tanstack/react-query'
import { CashMain } from './_components/cash-main'
import { prefetchCashTabs } from './_lib/prefetch'

export default async function CashPage({
  params,
}: {
  params: Promise<{ 'kitchen-id': string }>
}) {
  const { 'kitchen-id': kitchenId } = await params
  const queryClient = await prefetchCashTabs(kitchenId)

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <CashMain />
    </HydrationBoundary>
  )
}
