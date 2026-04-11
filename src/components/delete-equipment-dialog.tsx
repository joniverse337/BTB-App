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
import type { EquipmentItem } from '@/lib/validations/equipment'

interface DeleteEquipmentDialogProps {
  item: EquipmentItem | null
  onConfirm: () => void
  onCancel: () => void
}

export function DeleteEquipmentDialog({
  item,
  onConfirm,
  onCancel,
}: DeleteEquipmentDialogProps) {
  return (
    <AlertDialog open={!!item} onOpenChange={(open) => { if (!open) onCancel() }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Gerät löschen?</AlertDialogTitle>
          <AlertDialogDescription>
            {item?.name
              ? `Das Gerät "${item.name}" wird unwiderruflich gelöscht.`
              : 'Dieses Gerät wird unwiderruflich gelöscht.'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Abbrechen</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            Löschen
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
