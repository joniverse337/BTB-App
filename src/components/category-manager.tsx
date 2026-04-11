'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import type { ProjectCategory } from '@/lib/validations/project-settings'

interface CategoryManagerProps {
  categories: ProjectCategory[]
  onAdd: (typ: 'personal' | 'equipment', label: string) => void
  onDelete: (id: string) => void
  baustelleItems?: string[]
}

function CategoryList({
  typ,
  categories,
  onAdd,
  onDelete,
  autoItems = [],
}: {
  typ: 'personal' | 'equipment'
  categories: ProjectCategory[]
  onAdd: (label: string) => void
  onDelete: (id: string) => void
  autoItems?: string[]
}) {
  const [newLabel, setNewLabel] = useState('')

  const seen = new Set<string>()
  const filtered = categories
    .filter((c) => c.typ === typ)
    .filter((c) => {
      const key = c.label.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

  // Auto items deduplicated against manual categories
  const manualLabelsLower = new Set(filtered.map((c) => c.label.toLowerCase()))
  const uniqueAutoItems = autoItems.filter((name) => !manualLabelsLower.has(name.toLowerCase()))

  const handleAdd = () => {
    const trimmed = newLabel.trim()
    if (!trimmed) return
    const isDuplicate =
      filtered.some((c) => c.label.toLowerCase() === trimmed.toLowerCase()) ||
      uniqueAutoItems.some((name) => name.toLowerCase() === trimmed.toLowerCase())
    if (isDuplicate) {
      toast.error('Diese Kategorie existiert bereits.')
      return
    }
    onAdd(trimmed)
    setNewLabel('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAdd()
    }
  }

  const hasAny = filtered.length > 0 || uniqueAutoItems.length > 0

  return (
    <div className="space-y-4">
      {/* Auto items from Gerätebedarf (Auf der Baustelle) */}
      {uniqueAutoItems.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[11px] text-muted-foreground">Automatisch via Gerätebedarf</p>
          <div className="flex flex-wrap gap-1.5">
            {uniqueAutoItems.map((name) => (
              <Badge
                key={name}
                variant="outline"
                className="gap-1 text-xs border-[#e8c547]/60 text-[#e8c547]"
              >
                {name}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Flat list of manual categories */}
      {filtered.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {filtered.map((cat) => (
            <Badge
              key={cat.id}
              variant="secondary"
              className="gap-1 pr-1 text-xs"
            >
              {cat.label}
              <button
                type="button"
                onClick={() => onDelete(cat.id)}
                className="ml-0.5 rounded-full p-0.5 hover:bg-destructive/20 hover:text-destructive"
                aria-label={`${cat.label} entfernen`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {!hasAny && (
        <p className="text-xs italic text-muted-foreground">Noch keine Kategorien. Füge welche hinzu.</p>
      )}

      {/* Add new */}
      <div className="flex gap-2">
        <Input
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={typ === 'personal' ? 'z.B. Logistiker' : 'z.B. Bagger 20t'}
          className="h-8 text-sm"
          aria-label={`Neue ${typ === 'personal' ? 'Personal' : 'Geräte'}-Kategorie`}
        />
        <Button
          size="sm"
          variant="secondary"
          onClick={handleAdd}
          disabled={!newLabel.trim()}
          className="h-8 shrink-0"
        >
          <Plus className="mr-1 h-3.5 w-3.5" />
          Hinzufügen
        </Button>
      </div>
    </div>
  )
}

export function CategoryManager({ categories, onAdd, onDelete, baustelleItems }: CategoryManagerProps) {
  return (
    <div className="space-y-3">
      <label className="text-sm font-medium">Quick-Button Kategorien</label>
      <Tabs defaultValue="personal" className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="personal" className="flex-1">Personal</TabsTrigger>
          <TabsTrigger value="equipment" className="flex-1">Geräte</TabsTrigger>
        </TabsList>
        <TabsContent value="personal" className="mt-3">
          <CategoryList
            typ="personal"
            categories={categories}
            onAdd={(label) => onAdd('personal', label)}
            onDelete={onDelete}
          />
        </TabsContent>
        <TabsContent value="equipment" className="mt-3">
          <CategoryList
            typ="equipment"
            categories={categories}
            onAdd={(label) => onAdd('equipment', label)}
            onDelete={onDelete}
            autoItems={baustelleItems}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
