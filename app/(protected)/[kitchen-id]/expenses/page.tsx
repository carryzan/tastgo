import { dehydrate, HydrationBoundary } from '@tanstack/react-query'
import { ExpensesMain } from './_components/expenses-main'
import { prefetchExpenseTabs } from './_lib/prefetch'

export default async function ExpensesPage({
  params,
}: {
  params: Promise<{ 'kitchen-id': string }>
}) {
  const { 'kitchen-id': kitchenId } = await params
  const queryClient = await prefetchExpenseTabs(kitchenId)

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ExpensesMain />
    </HydrationBoundary>
  )
}
