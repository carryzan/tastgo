import { LogOutIcon } from 'lucide-react'
import { logout } from '@/lib/actions/auth'
import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty'

export default function NoKitchenPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Empty className="flex-none border-0 p-0 shadow-none">
          <EmptyHeader>
            <EmptyTitle>No Kitchen Found</EmptyTitle>
            <EmptyDescription className="max-w-xs text-pretty">
              You don&apos;t belong to any kitchen yet. Ask your kitchen owner to
              invite you, or check back later.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <form action={logout}>
              <Button variant="outline">
                <LogOutIcon />
                Log out
              </Button>
            </form>
          </EmptyContent>
        </Empty>
      </div>
    </div>
  )
}
