'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FormAlert } from '@/components/form-alert'
import { useFormSubmit } from '@/hooks/use-form-submit'
import { createClient } from '@/lib/supabase'

const emailChangeSchema = z.object({
  newEmail: z.string().email('Bitte eine gültige E-Mail-Adresse eingeben'),
})

type EmailChangeData = z.infer<typeof emailChangeSchema>

export function EmailChangeForm() {
  const [currentEmail, setCurrentEmail] = useState<string | null>(null)
  const { isSubmitting, successMessage, errorMessage, setErrorMessage, execute } = useFormSubmit()

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

    await execute(async () => {
      const { error } = await createClient().auth.updateUser({ email: data.newEmail })

      if (error) {
        throw new Error('E-Mail konnte nicht geändert werden. Bitte versuche es erneut.')
      }

      reset()
      return `Bestätigungsmail an ${data.newEmail} gesendet. Bitte bestätige die Änderung.`
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-md">
      <FormAlert type="success" message={successMessage} />
      <FormAlert type="error" message={errorMessage} />

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
