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

const resetSchema = z.object({
  email: z.string().email('Ungültige E-Mail-Adresse'),
})

type ResetFormData = z.infer<typeof resetSchema>

export default function ResetPasswordPage() {
  const [serverError, setServerError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<ResetFormData>({
    resolver: zodResolver(resetSchema),
  })

  async function onSubmit(data: ResetFormData) {
    setIsLoading(true)
    setServerError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
    })

    if (error) {
      if (error.message.includes('fetch') || error.message.includes('network')) {
        setServerError('Verbindungsfehler, bitte später erneut versuchen.')
      } else {
        setServerError('Es ist ein Fehler aufgetreten. Bitte versuche es erneut.')
      }
      setIsLoading(false)
      return
    }

    setSuccess(true)
    setIsLoading(false)
  }

  if (success) {
    return (
      <AuthLayout>
        <div className="text-center space-y-3">
          <h1 className="text-xl font-bold text-white">E-Mail versandt</h1>
          <p className="text-sm text-white/60">
            Falls diese E-Mail registriert ist, erhältst du in Kürze einen Link zum Zurücksetzen deines Passworts.
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
        <h1 className="text-xl font-bold text-white">Passwort zurücksetzen</h1>
        <p className="text-sm text-white/60">
          Gib deine E-Mail-Adresse ein. Du erhältst einen Link zum Zurücksetzen.
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

        <Button type="submit" className="w-full font-semibold" disabled={isLoading}>
          {isLoading ? 'Wird gesendet…' : 'Reset-Link senden'}
        </Button>

        <Link href="/login" className="text-sm text-white/50 hover:text-primary text-center block transition-colors">
          Zurück zum Login
        </Link>
      </form>
    </AuthLayout>
  )
}
