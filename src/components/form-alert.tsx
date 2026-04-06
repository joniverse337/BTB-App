import { CheckCircle2, AlertCircle } from 'lucide-react'

interface FormAlertProps {
  type: 'success' | 'error'
  message: string | null
}

/**
 * Reusable alert banner for form success/error messages.
 * Renders nothing when message is null.
 */
export function FormAlert({ type, message }: FormAlertProps) {
  if (!message) return null

  if (type === 'success') {
    return (
      <div className="flex items-center gap-2 rounded-md border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-400">
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        <span>{message}</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
      <AlertCircle className="h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  )
}
