import { dehydrate, HydrationBoundary } from '@tanstack/react-query'
import { OrdersMain } from './_components/orders-main'
import { prefetchOrders } from './_lib/prefetch'

export default async function OrdersPage({
  params,
}: {
  params: Promise<{ 'kitchen-id': string }>
}) {
  const { 'kitchen-id': kitchenId } = await params
  const queryClient = await prefetchOrders(kitchenId)

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <OrdersMain />
    </HydrationBoundary>
  )
}
