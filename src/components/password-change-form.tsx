'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FormAlert } from '@/components/form-alert'
import { useFormSubmit } from '@/hooks/use-form-submit'
import { createClient } from '@/lib/supabase'

const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, 'Aktuelles Passwort ist erforderlich'),
    newPassword: z.string().min(8, 'Neues Passwort muss mindestens 8 Zeichen haben'),
    confirmPassword: z.string().min(1, 'Passwort-Bestätigung ist erforderlich'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwörter stimmen nicht überein',
    path: ['confirmPassword'],
  })

type PasswordChangeData = z.infer<typeof passwordChangeSchema>

export function PasswordChangeForm() {
  const { isSubmitting, successMessage, errorMessage, execute } = useFormSubmit()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PasswordChangeData>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  })

  async function onSubmit(data: PasswordChangeData) {
    await execute(async () => {
      const supabase = createClient()

      // Verify current password by re-authenticating
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user?.email) {
        throw new Error('Benutzer konnte nicht ermittelt werden.')
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: userData.user.email,
        password: data.currentPassword,
      })

      if (signInError) {
        throw new Error('Aktuelles Passwort ist nicht korrekt.')
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: data.newPassword,
      })

      if (updateError) {
        throw new Error('Passwort konnte nicht geändert werden. Bitte versuche es erneut.')
      }

      reset()
      return 'Passwort wurde erfolgreich geändert.'
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-md">
      <FormAlert type="success" message={successMessage} />
      <FormAlert type="error" message={errorMessage} />

      <div className="space-y-2">
        <Label htmlFor="current-password">Aktuelles Passwort</Label>
        <Input
          id="current-password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          disabled={isSubmitting}
          {...register('currentPassword')}
        />
        {errors.currentPassword && (
          <p className="text-xs text-destructive">{errors.currentPassword.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="new-password">Neues Passwort</Label>
        <Input
          id="new-password"
          type="password"
          autoComplete="new-password"
          placeholder="Mindestens 8 Zeichen"
          disabled={isSubmitting}
          {...register('newPassword')}
        />
        {errors.newPassword && (
          <p className="text-xs text-destructive">{errors.newPassword.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirm-password">Neues Passwort bestätigen</Label>
        <Input
          id="confirm-password"
          type="password"
          autoComplete="new-password"
          placeholder="Mindestens 8 Zeichen"
          disabled={isSubmitting}
          {...register('confirmPassword')}
        />
        {errors.confirmPassword && (
          <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
        )}
      </div>

      <Button type="submit" disabled={isSubmitting} className="font-semibold">
        {isSubmitting ? 'Wird gespeichert...' : 'Passwort ändern'}
      </Button>
    </form>
  )
}
