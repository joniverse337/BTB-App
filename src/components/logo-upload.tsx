'use client'

import { useRef, useState } from 'react'
import { Upload, Trash2, ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MAX_LOGO_SIZE_BYTES, ALLOWED_LOGO_TYPES } from '@/lib/validations/project-settings'

interface LogoUploadProps {
  logoUrl: string | null
  isUploading: boolean
  onUpload: (file: File) => void
  onDelete: () => void
}

export function LogoUpload({ logoUrl, isUploading, onUpload, onDelete }: LogoUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null)
    const file = e.target.files?.[0]
    if (!file) return

    if (!ALLOWED_LOGO_TYPES.includes(file.type)) {
      setError('Nur PNG und JPG erlaubt')
      return
    }

    if (file.size > MAX_LOGO_SIZE_BYTES) {
      setError('Maximale Dateigröße: 2MB')
      return
    }

    onUpload(file)

    // Reset input so same file can be re-selected
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium">Logo (Wasserzeichen)</label>

      {logoUrl ? (
        <div className="flex items-center gap-4">
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded border bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoUrl}
              alt="Projekt-Logo"
              className="h-full w-full object-contain"
            />
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={onDelete}
            disabled={isUploading}
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            Logo löschen
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          {isUploading ? (
            <>
              <Upload className="mr-2 h-4 w-4 animate-pulse" />
              Wird hochgeladen...
            </>
          ) : (
            <>
              <ImageIcon className="mr-2 h-4 w-4" />
              Dateien durchsuchen
            </>
          )}
        </Button>
      )}

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg"
        onChange={handleFileChange}
        className="hidden"
        aria-hidden="true"
      />
    </div>
  )
}
