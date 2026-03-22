'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CheckCircle2, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase'

const emailChangeSchema = z.object({
  newEmail: z.string().email('Bitte eine gültige E-Mail-Adresse eingeben'),
})

type EmailChangeData = z.infer<typeof emailChangeSchema>

export function EmailChangeForm() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [currentEmail, setCurrentEmail] = useState<string | null>(null)

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => {
      setCurrentEmail(data.user?.email ?? null)
    })
  }, [])

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EmailChangeData>({
    resolver: zodResolver(emailChangeSchema),
    defaultValues: { newEmail: '' },
  })

  async function onSubmit(data: EmailChangeData) {
    if (data.newEmail === currentEmail) {
      setErrorMessage('Das ist bereits deine aktuelle E-Mail-Adresse.')
      return
    }

    setIsSubmitting(true)
    setSuccessMessage(null)
    setErrorMessage(null)

    try {
      const { error } = await createClient().auth.updateUser({ email: data.newEmail })

      if (error) {
        setErrorMessage('E-Mail konnte nicht geändert werden. Bitte versuche es erneut.')
        return
      }

      setSuccessMessage(`Bestätigungsmail an ${data.newEmail} gesendet. Bitte bestätige die Änderung.`)
      reset()
    } catch {
      setErrorMessage('Ein unerwarteter Fehler ist aufgetreten.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-md">
      {successMessage && (
        <div className="flex items-center gap-2 rounded-md border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-400">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="new-email">Neue E-Mail-Adresse</Label>
        <Input
          id="new-email"
          type="email"
          autoComplete="email"
          placeholder={currentEmail ?? 'deine@email.de'}
          disabled={isSubmitting}
          {...register('newEmail')}
        />
        {errors.newEmail && (
          <p className="text-xs text-destructive">{errors.newEmail.message}</p>
        )}
      </div>

      <Button type="submit" disabled={isSubmitting} className="font-semibold">
        {isSubmitting ? 'Wird gesendet...' : 'E-Mail ändern'}
      </Button>
    </form>
  )
}
