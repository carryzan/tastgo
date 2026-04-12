import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty'

export default function KitchenNotFound() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Empty className="flex-none border-0 p-0 shadow-none">
          <EmptyHeader>
            <EmptyTitle>404 — Not Found</EmptyTitle>
            <EmptyDescription className="max-w-xs text-pretty">
              This kitchen doesn&apos;t exist, or you don&apos;t have access to it.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    </div>
  )
}
