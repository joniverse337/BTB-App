import { createClient } from '@/lib/supabase'
import { csrfHeaders } from '@/hooks/use-csrf-token'

export interface Company {
  id: string
  name: string
  adr: string | null
  logo_url: string | null
  code: string
  is_active: boolean
}

/**
 * Fetch the company associated with the current user.
 * Returns null if the user has no company.
 */
export async function fetchUserCompany(): Promise<Company | null> {
  const supabase = createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) return null

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('user_id', userData.user.id)
    .single()

  if (profileError || !profile?.company_id) return null

  const { data: companyData, error: companyError } = await supabase
    .from('companies')
    .select('id, name, adr, logo_url, code, is_active')
    .eq('id', profile.company_id)
    .single()

  if (companyError || !companyData) return null

  return companyData as Company
}

/**
 * Update company fields via API.
 * Throws on failure.
 */
export async function updateCompanyFields(
  fields: Record<string, string | number | null>
): Promise<void> {
  const response = await fetch('/api/companies/update', {
    method: 'POST',
    headers: csrfHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(fields),
  })

  if (!response.ok) {
    const result = await response.json().catch(() => ({}))
    throw new Error(result.error || 'Firmendaten konnten nicht gespeichert werden.')
  }
}

/**
 * Upload a company logo to Supabase Storage.
 * Returns the public URL of the uploaded logo.
 */
const ALLOWED_LOGO_EXTENSIONS = ['png', 'jpg', 'jpeg']
const ALLOWED_LOGO_MIME_TYPES = ['image/png', 'image/jpeg']
const MAX_LOGO_SIZE = 2 * 1024 * 1024 // 2MB

export async function uploadCompanyLogo(
  companyId: string,
  file: File,
  existingLogoUrl?: string | null
): Promise<string> {
  // Server-side validation (defense in depth — don't rely on client-side only)
  const ext = file.name.split('.').pop()?.toLowerCase() || ''
  if (!ALLOWED_LOGO_EXTENSIONS.includes(ext)) {
    throw new Error('Nur PNG und JPG Dateien sind erlaubt.')
  }
  if (!ALLOWED_LOGO_MIME_TYPES.includes(file.type)) {
    throw new Error('Ungültiger Dateityp. Nur PNG und JPG erlaubt.')
  }
  if (file.size > MAX_LOGO_SIZE) {
    throw new Error('Maximale Dateigröße: 2MB.')
  }

  const supabase = createClient()
  const filePath = `${companyId}/logo.${ext}`

  // Delete old logo if exists
  if (existingLogoUrl) {
    const oldPath = existingLogoUrl.split('/company-logos/')[1]
    if (oldPath) {
      await supabase.storage.from('company-logos').remove([oldPath])
    }
  }

  const { error: uploadError } = await supabase.storage
    .from('company-logos')
    .upload(filePath, file, { upsert: true })

  if (uploadError) {
    throw new Error('Logo-Upload fehlgeschlagen.')
  }

  const { data: urlData } = supabase.storage
    .from('company-logos')
    .getPublicUrl(filePath)

  return urlData.publicUrl
}

/**
 * Delete a company logo from Supabase Storage.
 */
export async function deleteCompanyLogo(logoUrl: string): Promise<void> {
  const supabase = createClient()
  const path = logoUrl.split('/company-logos/')[1]
  if (path) {
    await supabase.storage.from('company-logos').remove([path])
  }
  await updateCompanyFields({ logo_url: null })
}
