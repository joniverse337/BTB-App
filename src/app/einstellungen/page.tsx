'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
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
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto flex items-center gap-4 px-4 py-4 md:px-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/projekte')}
            aria-label="Zurück zu Projekte"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-bold">
            <span className="text-primary">BTB</span> Einstellungen
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
