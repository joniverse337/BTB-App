'use client'

import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { ProjectContact } from '@/lib/validations/project-settings'

interface ContactManagerProps {
  contacts: ProjectContact[]
  onAdd: (funktion: string | null, name: string, phone: string | null) => void
  onDelete: (id: string) => void
}

export function ContactManager({ contacts, onAdd, onDelete }: ContactManagerProps) {
  const [newFunktion, setNewFunktion] = useState('')
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')

  const handleAdd = () => {
    const trimmedName = newName.trim()
    if (!trimmedName) return

    const duplicate = contacts.some(
      (c) => c.name.toLowerCase() === trimmedName.toLowerCase()
    )
    if (duplicate) return

    onAdd(newFunktion.trim() || null, trimmedName, newPhone.trim() || null)
    setNewFunktion('')
    setNewName('')
    setNewPhone('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAdd()
  }

  return (
    <div className="space-y-3">
      {contacts.length > 0 && (
        <div className="space-y-1">
          {contacts.map((contact) => (
            <div
              key={contact.id}
              className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
            >
              <div className="flex items-center gap-4">
                {contact.funktion && (
                  <span className="text-muted-foreground">{contact.funktion}</span>
                )}
                <span className="font-medium">{contact.name}</span>
                {contact.phone && (
                  <span className="text-muted-foreground">{contact.phone}</span>
                )}
              </div>
              <button
                onClick={() => onDelete(contact.id)}
                className="text-muted-foreground hover:text-destructive transition-colors"
                aria-label="Kontakt löschen"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Input
          placeholder="Funktion (optional)"
          value={newFunktion}
          onChange={(e) => setNewFunktion(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1"
        />
        <Input
          placeholder="Name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1"
        />
        <Input
          placeholder="Telefon (optional)"
          value={newPhone}
          onChange={(e) => setNewPhone(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1"
        />
        <Button
          variant="outline"
          size="icon"
          onClick={handleAdd}
          disabled={!newName.trim()}
          aria-label="Kontakt hinzufügen"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
