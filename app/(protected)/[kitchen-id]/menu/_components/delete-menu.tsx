'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { deleteMenu } from '../_lib/menu-actions'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { FieldError } from '@/components/ui/field'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface DeleteMenuProps {
  kitchenId: string
  menu: { id: string; name: string }
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DeleteMenu({
  kitchenId,
  menu,
  open,
  onOpenChange,
}: DeleteMenuProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleDelete() {
    setError(null)
    startTransition(async () => {
      try {
        const result = await deleteMenu(menu.id, kitchenId)
        if (result instanceof Error) {
          setError(result.message)
          return
        }
        onOpenChange(false)
        router.refresh()
      } catch {
        setError('Something went wrong. Please try again.')
      }
    })
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (pending) return
        onOpenChange(next)
        if (!next) setError(null)
      }}
    >
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {menu.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently deletes the menu. Menu items must be moved or
            deleted first if the database rejects the delete.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && (
          <div className="px-4">
            <FieldError>{error}</FieldError>
          </div>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={pending}
            className="min-w-20"
          >
            {pending && <Spinner data-icon="inline-start" />}
            Delete
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
