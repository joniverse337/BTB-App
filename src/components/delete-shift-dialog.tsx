'use client'

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

interface DeleteShiftDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  shiftLabel: string
}

export function DeleteShiftDialog({
  open,
  onOpenChange,
  onConfirm,
  shiftLabel,
}: DeleteShiftDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Schicht löschen?</AlertDialogTitle>
          <AlertDialogDescription>
            Die <strong>{shiftLabel}</strong> wird dauerhaft gelöscht.
            Alle zugehörigen Mitarbeiter- und Gerätedaten werden ebenfalls entfernt.
            Diese Aktion kann nicht rückgängig gemacht werden.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Abbrechen</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={onConfirm}
          >
            Löschen
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
