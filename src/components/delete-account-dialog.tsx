'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase'
import { FormAlert } from '@/components/form-alert'
import { useQueryClient } from '@tanstack/react-query'
import { csrfHeaders } from '@/hooks/use-csrf-token'

interface DeleteAccountDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DeleteAccountDialog({ open, onOpenChange }: DeleteAccountDialogProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [userEmail, setUserEmail] = useState<string>('')
  const [emailInput, setEmailInput] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? '')
    })
    setEmailInput('')
    setErrorMessage(null)
  }, [open])

  async function handleDelete() {
    setIsDeleting(true)
    setErrorMessage(null)

    try {
      const res = await fetch('/api/account/delete', { method: 'POST', headers: csrfHeaders() })

      if (res.status === 401) {
        router.push('/login')
        return
      }

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setErrorMessage(body.error ?? 'Account konnte nicht gelöscht werden. Bitte versuche es erneut.')
        return
      }

      // Clear local session and cache before redirecting
      const supabase = createClient()
      await supabase.auth.signOut()
      queryClient.clear()
      router.push('/login?deleted=true')
    } catch {
      setErrorMessage('Ein unerwarteter Fehler ist aufgetreten.')
    } finally {
      setIsDeleting(false)
    }
  }

  const canDelete = emailInput === userEmail && userEmail !== ''

  return (
    <Dialog open={open} onOpenChange={isDeleting ? undefined : onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Account dauerhaft löschen?</DialogTitle>
          <DialogDescription>
            Diese Aktion kann nicht rückgängig gemacht werden. Dein Account und alle
            zugehörigen Daten werden dauerhaft entfernt.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <FormAlert type="error" message={errorMessage} />

          <div className="space-y-2">
            <Label htmlFor="confirm-email">
              Gib deine E-Mail-Adresse ein, um zu bestätigen
            </Label>
            <p className="text-xs text-muted-foreground">{userEmail}</p>
            <Input
              id="confirm-email"
              type="email"
              placeholder={userEmail}
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              disabled={isDeleting}
              autoComplete="off"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            Abbrechen
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={!canDelete || isDeleting}
          >
            {isDeleting ? 'Wird gelöscht…' : 'Dauerhaft löschen'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
