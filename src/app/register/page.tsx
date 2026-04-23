'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AuthLayout } from '@/components/auth-layout'
import { createClient } from '@/lib/supabase'

const registerSchema = z.object({
  email: z.string().email('Ungültige E-Mail-Adresse'),
  password: z.string().min(8, 'Passwort muss mindestens 8 Zeichen lang sein'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwörter stimmen nicht überein',
  path: ['confirmPassword'],
})

type RegisterFormData = z.infer<typeof registerSchema>

export default function RegisterPage() {
  const [serverError, setServerError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  })

  async function onSubmit(data: RegisterFormData) {
    setIsLoading(true)
    setServerError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      if (error.message.includes('fetch') || error.message.includes('network')) {
        setServerError('Verbindungsfehler, bitte später erneut versuchen.')
        setIsLoading(false)
        return
      }
      // For "already registered" and all other errors: show generic success message
      // to prevent user enumeration (attacker can't tell if email exists)
    }

    setSuccess(true)
    setIsLoading(false)
  }

  if (success) {
    return (
      <AuthLayout>
        <div className="text-center space-y-3">
          <h1 className="text-xl font-bold text-white">E-Mail bestätigen</h1>
          <p className="text-sm text-white/60">
            Wir haben dir eine Bestätigungs-E-Mail geschickt. Bitte klicke auf den Link darin, um dein Konto zu aktivieren.
          </p>
          <Link href="/login" className="text-sm text-primary hover:underline inline-block mt-2">
            Zurück zum Login
          </Link>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      {/* Logo */}
      <div className="mb-6 flex items-baseline justify-center gap-0.5" style={{ fontFamily: 'var(--font-inter), sans-serif' }}>
        <span className="text-2xl font-extrabold text-white">btb</span>
        <span className="text-2xl font-bold text-primary">.online</span>
      </div>

      <div className="space-y-1 text-center mb-6">
        <h1 className="text-xl font-bold text-white">Registrierung</h1>
        <p className="text-sm text-white/60">
          Erstelle dein kostenloses Konto
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {serverError && (
          <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
            {serverError}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="email" className="text-white/80">E-Mail</Label>
          <Input
            id="email"
            type="email"
            placeholder="name@firma.de"
            autoComplete="email"
            {...register('email')}
          />
          {errors.email && (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="text-white/80">Passwort</Label>
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
          {isLoading ? 'Wird registriert…' : 'Konto erstellen'}
        </Button>

        <p className="text-sm text-white/50 text-center">
          Bereits registriert?{' '}
          <Link href="/login" className="text-primary hover:underline">
            Einloggen
          </Link>
        </p>
      </form>
    </AuthLayout>
  )
}
