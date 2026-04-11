'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { SettingsSection } from '@/components/settings-section'
import { PasswordChangeForm } from '@/components/password-change-form'
import { EmailChangeForm } from '@/components/email-change-form'
import { CompanySection } from '@/components/company-section'
import { DeleteAccountDialog } from '@/components/delete-account-dialog'

export default function EinstellungenPage() {
  const router = useRouter()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  return (
    <div className="min-h-screen relative">
      {/* Background image */}
      <div className="fixed inset-0 -z-20" aria-hidden="true">
        <Image src="/images/hero-1.jpg" alt="" fill className="object-cover" priority sizes="100vw" />
      </div>
      {/* Dark overlay */}
      <div className="fixed inset-0 -z-10" aria-hidden="true" style={{ background: 'rgba(14, 17, 24, 0.65)' }} />

      {/* Header */}
      <header className="border-b border-white/10 bg-white/5 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto flex items-center gap-4 px-4 py-4 md:px-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/projekte')}
            aria-label="Zurück zu Projekte"
            className="text-white/70 hover:text-white hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <a href="/projekte" className="btb-logo-link">
              <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontWeight: 800, color: '#e8c547', letterSpacing: '-1px' }}>BTB</span>
            </a>
            <span className="text-white">Einstellungen</span>
          </h1>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-6 md:px-6 md:py-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
          {/* Account Section */}
          <SettingsSection
            title="Account"
            description="Ändere deine E-Mail-Adresse oder dein Passwort."
          >
            <EmailChangeForm />
            <hr className="border-border my-6" />
            <PasswordChangeForm />
            <hr className="border-destructive/30 my-6" />
            <div className="space-y-3 max-w-md">
              <p className="text-sm font-medium">Account löschen</p>
              <p className="text-xs text-muted-foreground">
                Löscht deinen Account und alle zugehörigen Daten dauerhaft.
              </p>
              <Button
                variant="destructive"
                onClick={() => setDeleteDialogOpen(true)}
              >
                Account löschen
              </Button>
            </div>
          </SettingsSection>

          {/* Company Section */}
          <SettingsSection
            title="Firma"
            description="Verwalte deine Firmenzugehörigkeit. Projekte einer Firma sind für alle Mitglieder sichtbar."
          >
            <CompanySection />
          </SettingsSection>
        </div>

      </main>

      <DeleteAccountDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
      />
    </div>
  )
}
