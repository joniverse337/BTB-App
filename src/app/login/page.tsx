'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AuthLayout } from '@/components/auth-layout'
import { createClient } from '@/lib/supabase'

const loginSchema = z.object({
  email: z.string().email('Ungültige E-Mail-Adresse'),
  password: z.string().min(1, 'Passwort ist erforderlich'),
})

type LoginFormData = z.infer<typeof loginSchema>

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackError = searchParams.get('error') === 'auth_callback_failed'
    ? 'Der Bestätigungslink ist ungültig oder abgelaufen. Bitte neu einloggen.'
    : null
  const accountDeleted = searchParams.get('deleted') === 'true'
  const [serverError, setServerError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  async function onSubmit(data: LoginFormData) {
    setIsLoading(true)
    setServerError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })

    if (error) {
      if (error.message.includes('fetch') || error.message.includes('network')) {
        setServerError('Verbindungsfehler, bitte später erneut versuchen.')
      } else {
        setServerError('E-Mail oder Passwort ist falsch.')
      }
      setIsLoading(false)
      return
    }

    router.push('/projekte')
    router.refresh()
  }

  return (
    <AuthLayout>
      {/* Logo */}
      <div className="mb-6 flex items-baseline justify-center gap-0.5" style={{ fontFamily: 'var(--font-inter), sans-serif' }}>
        <span className="text-2xl font-extrabold text-white">btb</span>
        <span className="text-2xl font-bold text-primary">.online</span>
      </div>

      <div className="space-y-1 text-center mb-6">
        <h1 className="text-xl font-bold text-white">Login</h1>
        <p className="text-sm text-white/60">
          Melde dich mit deiner E-Mail-Adresse an
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {accountDeleted && (
          <div className="text-sm text-green-400 bg-green-500/10 border border-green-500/30 px-3 py-2 rounded-md">
            Dein Account wurde gelöscht.
          </div>
        )}
        {(callbackError || serverError) && (
          <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
            {callbackError ?? serverError}
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
            autoComplete="current-password"
            {...register('password')}
          />
          {errors.password && (
            <p className="text-xs text-destructive">{errors.password.message}</p>
          )}
          <div className="text-right">
            <Link href="/reset-password" className="text-xs text-white/50 hover:text-primary transition-colors">
              Passwort vergessen?
            </Link>
          </div>
        </div>

        <Button type="submit" className="w-full font-semibold" disabled={isLoading}>
          {isLoading ? 'Wird angemeldet…' : 'Einloggen'}
        </Button>

        <p className="text-sm text-white/50 text-center">
          Noch kein Konto?{' '}
          <Link href="/register" className="text-primary hover:underline">
            Jetzt registrieren
          </Link>
        </p>
      </form>
    </AuthLayout>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center" />}>
      <LoginForm />
    </Suspense>
  )
}
