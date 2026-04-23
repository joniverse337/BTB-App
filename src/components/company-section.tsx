'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Building2,
  Copy,
  Check,
  AlertCircle,
  Loader2,
  ImageIcon,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { LogoUpload } from '@/components/logo-upload'
import {
  createCompanySchema,
  joinCompanySchema,
  type CreateCompanyData,
  type JoinCompanyData,
} from '@/lib/validations/company'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase'
import { FormAlert } from '@/components/form-alert'
import { csrfHeaders } from '@/hooks/use-csrf-token'

interface Company {
  id: string
  name: string
  adr: string | null
  logo_url: string | null
  code: string
  is_active: boolean
}

export function CompanySection() {
  const [company, setCompany] = useState<Company | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  // Editable fields (local state for instant feedback)
  const [localName, setLocalName] = useState('')
  const [localAdr, setLocalAdr] = useState('')

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [joinDialogOpen, setJoinDialogOpen] = useState(false)
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false)

  // Action states
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [copyFailed, setCopyFailed] = useState(false)

  const fetchCompany = useCallback(async () => {
    setIsLoading(true)
    setLoadError(null)

    try {
      const supabase = createClient()
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) return

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', userData.user.id)
        .single()

      if (profileError || !profile?.company_id) {
        setCompany(null)
        return
      }

      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('id, name, adr, logo_url, code, is_active')
        .eq('id', profile.company_id)
        .single()

      if (companyError) {
        setLoadError('Firmendaten konnten nicht geladen werden.')
        return
      }

      setCompany(companyData)
      setLocalName(companyData.name ?? '')
      setLocalAdr(companyData.adr ?? '')
    } catch {
      setLoadError('Firmendaten konnten nicht geladen werden.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCompany()
  }, [fetchCompany])

  // Save a company field via API
  const saveCompanyField = useCallback(async (fields: Record<string, string | null>) => {
    try {
      const response = await fetch('/api/companies/update', {
        method: 'POST',
        headers: csrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(fields),
      })
      if (!response.ok) {
        const result = await response.json().catch(() => ({}))
        toast.error(result.error || 'Firmendaten konnten nicht gespeichert werden.')
      }
    } catch {
      toast.error('Firmendaten konnten nicht gespeichert werden.')
    }
  }, [])

  // Logo upload to company-logos bucket
  const handleLogoUpload = useCallback(async (file: File) => {
    if (!company) return
    setIsUploading(true)

    try {
      const supabase = createClient()
      const ext = file.name.split('.').pop()?.toLowerCase() || 'png'
      const filePath = `${company.id}/logo.${ext}`

      // Delete old logo if exists
      if (company.logo_url) {
        const oldPath = company.logo_url.split('/company-logos/')[1]
        if (oldPath) {
          await supabase.storage.from('company-logos').remove([oldPath])
        }
      }

      const { error: uploadError } = await supabase.storage
        .from('company-logos')
        .upload(filePath, file, { upsert: true })

      if (uploadError) {
        toast.error('Logo-Upload fehlgeschlagen.')
        return
      }

      const { data: urlData } = supabase.storage
        .from('company-logos')
        .getPublicUrl(filePath)

      const logoUrl = urlData.publicUrl

      await saveCompanyField({ logo_url: logoUrl })
      setCompany((prev) => prev ? { ...prev, logo_url: logoUrl } : prev)
    } catch {
      toast.error('Logo-Upload fehlgeschlagen.')
    } finally {
      setIsUploading(false)
    }
  }, [company, saveCompanyField])

  // Logo delete
  const handleLogoDelete = useCallback(async () => {
    if (!company?.logo_url) return

    try {
      const supabase = createClient()
      const path = company.logo_url.split('/company-logos/')[1]
      if (path) {
        await supabase.storage.from('company-logos').remove([path])
      }
      await saveCompanyField({ logo_url: null })
      setCompany((prev) => prev ? { ...prev, logo_url: null } : prev)
    } catch {
      toast.error('Logo konnte nicht gelöscht werden.')
    }
  }, [company, saveCompanyField])

  // Logo file selected in create dialog (uploaded after company is created)
  const [createLogoFile, setCreateLogoFile] = useState<File | null>(null)
  const [createLogoPreview, setCreateLogoPreview] = useState<string | null>(null)
  const [createLogoError, setCreateLogoError] = useState<string | null>(null)
  const createLogoInputRef = useRef<HTMLInputElement>(null)

  function handleCreateLogoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    setCreateLogoError(null)
    const file = e.target.files?.[0]
    if (!file) return
    if (!['image/png', 'image/jpeg'].includes(file.type)) {
      setCreateLogoError('Nur PNG und JPG erlaubt')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setCreateLogoError('Maximale Dateigröße: 2MB')
      return
    }
    setCreateLogoFile(file)
    setCreateLogoPreview(URL.createObjectURL(file))
    if (createLogoInputRef.current) createLogoInputRef.current.value = ''
  }

  function clearCreateLogo() {
    setCreateLogoFile(null)
    if (createLogoPreview) URL.revokeObjectURL(createLogoPreview)
    setCreateLogoPreview(null)
    setCreateLogoError(null)
  }

  // Create company form
  const createForm = useForm<CreateCompanyData>({
    resolver: zodResolver(createCompanySchema),
    defaultValues: { name: '', adr: '' },
  })

  // Join company form
  const joinForm = useForm<JoinCompanyData>({
    resolver: zodResolver(joinCompanySchema),
    defaultValues: { code: '' },
  })

  async function handleCreate(data: CreateCompanyData) {
    setIsSubmitting(true)
    setActionError(null)
    setActionSuccess(null)

    try {
      const response = await fetch('/api/companies/create', {
        method: 'POST',
        headers: csrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const result = await response.json().catch(() => ({}))
        setActionError(result.error || 'Firma konnte nicht angelegt werden.')
        return
      }

      const result = await response.json()
      const companyId: string = result.company.id

      // Upload logo if selected
      if (createLogoFile && companyId) {
        const supabase = createClient()
        const ext = createLogoFile.name.split('.').pop()?.toLowerCase() || 'png'
        const filePath = `${companyId}/logo.${ext}`

        const { error: uploadError } = await supabase.storage
          .from('company-logos')
          .upload(filePath, createLogoFile, { upsert: true })

        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from('company-logos')
            .getPublicUrl(filePath)

          await fetch('/api/companies/update', {
            method: 'POST',
            headers: csrfHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ logo_url: urlData.publicUrl }),
          })
        }
      }

      setCreateDialogOpen(false)
      createForm.reset()
      clearCreateLogo()
      setActionSuccess('Firma wurde erfolgreich angelegt.')
      await fetchCompany()
    } catch {
      setActionError('Ein unerwarteter Fehler ist aufgetreten.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleJoin(data: JoinCompanyData) {
    setIsSubmitting(true)
    setActionError(null)
    setActionSuccess(null)

    try {
      const response = await fetch('/api/companies/join', {
        method: 'POST',
        headers: csrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const result = await response.json().catch(() => ({}))
        setActionError(result.error || 'Dieser Code ist nicht gültig.')
        return
      }

      setJoinDialogOpen(false)
      joinForm.reset()
      setActionSuccess('Du bist der Firma erfolgreich beigetreten.')
      await fetchCompany()
    } catch {
      setActionError('Ein unerwarteter Fehler ist aufgetreten.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleLeave() {
    setIsSubmitting(true)
    setActionError(null)
    setActionSuccess(null)

    try {
      const response = await fetch('/api/companies/leave', {
        method: 'POST',
        headers: csrfHeaders({ 'Content-Type': 'application/json' }),
      })

      if (!response.ok) {
        const result = await response.json().catch(() => ({}))
        setActionError(result.error || 'Firma konnte nicht verlassen werden.')
        return
      }

      setLeaveDialogOpen(false)
      setCompany(null)
      setActionSuccess('Du hast die Firma verlassen.')
    } catch {
      setActionError('Ein unerwarteter Fehler ist aufgetreten.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleCopyCode() {
    if (!company?.code) return
    try {
      await navigator.clipboard.writeText(company.code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopyFailed(true)
      setTimeout(() => setCopyFailed(false), 2000)
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-10 w-64" />
      </div>
    )
  }

  // Load error state
  if (loadError) {
    return (
      <div className="flex items-center gap-2 text-sm text-destructive">
        <AlertCircle className="h-4 w-4 shrink-0" />
        <span>{loadError}</span>
        <Button variant="ghost" size="sm" onClick={fetchCompany}>
          Erneut versuchen
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <FormAlert type="success" message={actionSuccess} />
      <FormAlert type="error" message={actionError} />

      {company ? (
        /* Connected to a company */
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <Building2 className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Verbunden mit</p>
              <p className="font-semibold">{company.name}</p>
            </div>
          </div>

          {/* Inactive warning */}
          {!company.is_active && (
            <div className="flex items-center gap-2 rounded-md border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>Diese Firma ist derzeit deaktiviert. Schreibzugriff ist eingeschränkt.</span>
            </div>
          )}

          {/* Firmendaten editierbar */}
          <div className="space-y-3 border-t pt-4">
            <p className="text-sm font-medium text-muted-foreground">Firmendaten</p>

            <div className="space-y-1.5">
              <Label htmlFor="company-name-edit">Firmenname</Label>
              <Input
                id="company-name-edit"
                value={localName}
                onChange={(e) => setLocalName(e.target.value)}
                onBlur={() => {
                  if (localName.trim() && localName !== company.name) {
                    setCompany((prev) => prev ? { ...prev, name: localName.trim() } : prev)
                    saveCompanyField({ name: localName.trim() })
                  }
                }}
                placeholder="Firmenname"
                maxLength={100}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="company-adr-edit">Adresse</Label>
              <Input
                id="company-adr-edit"
                value={localAdr}
                onChange={(e) => setLocalAdr(e.target.value)}
                onBlur={() => {
                  const val = localAdr.trim() || null
                  if (val !== company.adr) {
                    setCompany((prev) => prev ? { ...prev, adr: val } : prev)
                    saveCompanyField({ adr: val })
                  }
                }}
                placeholder="Straße, PLZ Ort"
                maxLength={200}
              />
            </div>

            <div className="space-y-1.5">
              <LogoUpload
                logoUrl={company.logo_url}
                isUploading={isUploading}
                onUpload={handleLogoUpload}
                onDelete={handleLogoDelete}
              />
            </div>
          </div>

          {/* Company code */}
          <div className="space-y-1 border-t pt-4">
            <p className="text-sm text-muted-foreground">Firmen-Code</p>
            <div className="flex items-center gap-2">
              <code className="rounded bg-muted px-3 py-2 text-sm font-mono tracking-wider">
                {company.code}
              </code>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCopyCode}
                aria-label="Code kopieren"
                className="h-9 w-9"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-400" />
                ) : copyFailed ? (
                  <AlertCircle className="h-4 w-4 text-destructive" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Teile diesen Code mit Kollegen, damit sie deiner Firma beitreten können.
            </p>
          </div>

          {/* Leave button */}
          <Button
            variant="outline"
            onClick={() => setLeaveDialogOpen(true)}
            className="text-destructive hover:text-destructive"
          >
            Firma verlassen
          </Button>
        </div>
      ) : (
        /* No company connected */
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Du bist noch keiner Firma zugeordnet. Lege eine neue Firma an oder trete
            einer bestehenden mit einem Code bei.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => {
                setActionError(null)
                setActionSuccess(null)
                setCreateDialogOpen(true)
              }}
              className="font-semibold"
            >
              <Building2 className="mr-2 h-4 w-4" />
              Firma anlegen
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setActionError(null)
                setActionSuccess(null)
                setJoinDialogOpen(true)
              }}
            >
              Firma beitreten
            </Button>
          </div>
        </div>
      )}

      {/* Create Company Dialog */}
      <Dialog
        open={createDialogOpen}
        onOpenChange={(open) => {
          setCreateDialogOpen(open)
          if (!open) {
            createForm.reset()
            clearCreateLogo()
            setActionError(null)
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Firma anlegen</DialogTitle>
            <DialogDescription>
              Gib den Namen deiner Firma ein. Adresse und Logo kannst du danach direkt hier eintragen.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={createForm.handleSubmit(handleCreate)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="company-name">
                Firmenname <span className="text-destructive">*</span>
              </Label>
              <Input
                id="company-name"
                placeholder="z.B. Mustermann Gleisbau GmbH"
                autoFocus
                disabled={isSubmitting}
                {...createForm.register('name')}
              />
              {createForm.formState.errors.name && (
                <p className="text-xs text-destructive">
                  {createForm.formState.errors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="company-adr">Adresse</Label>
              <Input
                id="company-adr"
                placeholder="Straße, PLZ Ort"
                disabled={isSubmitting}
                {...createForm.register('adr')}
              />
              {createForm.formState.errors.adr && (
                <p className="text-xs text-destructive">
                  {createForm.formState.errors.adr.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Logo <span className="text-muted-foreground font-normal">(optional)</span></Label>
              {createLogoPreview ? (
                <div className="flex items-center gap-3">
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded border bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={createLogoPreview} alt="Logo-Vorschau" className="h-full w-full object-contain" />
                  </div>
                  <button
                    type="button"
                    onClick={clearCreateLogo}
                    disabled={isSubmitting}
                    className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-3.5 w-3.5" />
                    Entfernen
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => createLogoInputRef.current?.click()}
                  disabled={isSubmitting}
                  className="flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                >
                  <ImageIcon className="h-4 w-4" />
                  Datei auswählen
                </button>
              )}
              {createLogoError && (
                <p className="text-xs text-destructive">{createLogoError}</p>
              )}
              <input
                ref={createLogoInputRef}
                type="file"
                accept="image/png,image/jpeg"
                onChange={handleCreateLogoSelect}
                className="hidden"
                aria-hidden="true"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateDialogOpen(false)}
                disabled={isSubmitting}
              >
                Abbrechen
              </Button>
              <Button type="submit" disabled={isSubmitting} className="font-semibold">
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Wird angelegt...
                  </>
                ) : (
                  'Firma anlegen'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Join Company Dialog */}
      <Dialog
        open={joinDialogOpen}
        onOpenChange={(open) => {
          setJoinDialogOpen(open)
          if (!open) {
            joinForm.reset()
            setActionError(null)
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Firma beitreten</DialogTitle>
            <DialogDescription>
              Gib den Firmen-Code ein, den du von einem Kollegen erhalten hast.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={joinForm.handleSubmit(handleJoin)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="company-code">
                Firmen-Code <span className="text-destructive">*</span>
              </Label>
              <Input
                id="company-code"
                placeholder="BTB-XXXXXX"
                autoFocus
                disabled={isSubmitting}
                className="font-mono tracking-wider uppercase"
                {...joinForm.register('code')}
              />
              {joinForm.formState.errors.code && (
                <p className="text-xs text-destructive">
                  {joinForm.formState.errors.code.message}
                </p>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setJoinDialogOpen(false)}
                disabled={isSubmitting}
              >
                Abbrechen
              </Button>
              <Button type="submit" disabled={isSubmitting} className="font-semibold">
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Wird geprüft...
                  </>
                ) : (
                  'Beitreten'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Leave Company AlertDialog */}
      <AlertDialog open={leaveDialogOpen} onOpenChange={setLeaveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Firma verlassen?</AlertDialogTitle>
            <AlertDialogDescription>
              Wenn du die Firma verlässt, hast du keinen Zugriff mehr auf die Projekte
              der Firma. Deine persönlichen Projekte ohne Firmenzuordnung bleiben erhalten.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLeave}
              disabled={isSubmitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Wird verlassen...
                </>
              ) : (
                'Firma verlassen'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
