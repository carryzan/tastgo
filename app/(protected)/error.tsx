'use client'

import { RefreshCcwIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty'

export default function KitchenError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Empty className="flex-none border-0 p-0 shadow-none">
          <EmptyHeader>
            <EmptyTitle>Something Went Wrong</EmptyTitle>
            <EmptyDescription className="max-w-xs text-pretty">
              We couldn&apos;t load this kitchen. This might be a temporary issue.
              {error.digest != null ? (
                <span className="mt-2 block font-mono text-[10px] text-muted-foreground">
                  Reference: {error.digest}
                </span>
              ) : null}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button variant="outline" onClick={() => reset()}>
              <RefreshCcwIcon />
              Try again
            </Button>
          </EmptyContent>
        </Empty>
      </div>
    </div>
  )
}
