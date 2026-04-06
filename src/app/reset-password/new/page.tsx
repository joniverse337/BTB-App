'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AuthLayout } from '@/components/auth-layout'
import { createClient } from '@/lib/supabase'

const newPasswordSchema = z.object({
  password: z.string().min(8, 'Passwort muss mindestens 8 Zeichen lang sein'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwörter stimmen nicht überein',
  path: ['confirmPassword'],
})

type NewPasswordFormData = z.infer<typeof newPasswordSchema>

export default function NewPasswordPage() {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<NewPasswordFormData>({
    resolver: zodResolver(newPasswordSchema),
  })

  async function onSubmit(data: NewPasswordFormData) {
    setIsLoading(true)
    setServerError(null)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({
        password: data.password,
      })

      if (error) {
        if (error.message.includes('same password')) {
          setServerError('Das neue Passwort darf nicht mit dem alten übereinstimmen.')
        } else if (error.message.includes('expired') || error.message.includes('invalid')) {
          setServerError('Der Reset-Link ist abgelaufen. Bitte fordere einen neuen an.')
        } else {
          setServerError('Fehler beim Setzen des Passworts. Bitte versuche es erneut.')
        }
        return
      }

      router.push('/projekte')
      router.refresh()
    } catch {
      setServerError('Fehler beim Setzen des Passworts. Bitte versuche es erneut.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthLayout>
      {/* Logo */}
      <div className="mb-6 flex items-baseline justify-center gap-0.5" style={{ fontFamily: 'var(--font-inter), sans-serif' }}>
        <span className="text-2xl font-extrabold text-white">btb</span>
        <span className="text-2xl font-bold text-primary">.online</span>
      </div>

      <div className="space-y-1 text-center mb-6">
        <h1 className="text-xl font-bold text-white">Neues Passwort</h1>
        <p className="text-sm text-white/60">
          Gib dein neues Passwort ein
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {serverError && (
          <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
            {serverError}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="password" className="text-white/80">Neues Passwort</Label>
          <Input
            id="password"
            type="password"
            placeholder="Mindestens 8 Zeichen"
            autoComplete="new-password"
            {...register('password')}
          />
          {errors.password && (
            <p className="text-xs text-destructive">{errors.password.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword" className="text-white/80">Passwort bestätigen</Label>
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            {...register('confirmPassword')}
          />
          {errors.confirmPassword && (
            <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
          )}
        </div>

        <Button type="submit" className="w-full font-semibold" disabled={isLoading}>
          {isLoading ? 'Wird gespeichert…' : 'Passwort speichern'}
        </Button>
      </form>
    </AuthLayout>
  )
}
