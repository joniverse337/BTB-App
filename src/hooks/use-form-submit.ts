'use client'

import { useCallback, useState } from 'react'

interface UseFormSubmitOptions {
  /** Generische Fehlermeldung bei unerwarteten Fehlern */
  fallbackError?: string
}

interface UseFormSubmitReturn {
  isSubmitting: boolean
  successMessage: string | null
  errorMessage: string | null
  setErrorMessage: (msg: string | null) => void
  setSuccessMessage: (msg: string | null) => void
  /** Wraps an async handler with loading/success/error state management */
  execute: (fn: () => Promise<string | void>) => Promise<void>
  /** Resets all messages */
  resetMessages: () => void
}

/**
 * Hook to manage form submission state (loading, success, error).
 * The async function passed to `execute` should:
 * - Return a success message string on success
 * - Throw an Error with message on failure
 * - Or return void (no success message shown)
 */
export function useFormSubmit(
  options: UseFormSubmitOptions = {}
): UseFormSubmitReturn {
  const { fallbackError = 'Ein unerwarteter Fehler ist aufgetreten.' } = options

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const resetMessages = useCallback(() => {
    setSuccessMessage(null)
    setErrorMessage(null)
  }, [])

  const execute = useCallback(
    async (fn: () => Promise<string | void>) => {
      setIsSubmitting(true)
      setSuccessMessage(null)
      setErrorMessage(null)

      try {
        const result = await fn()
        if (typeof result === 'string') {
          setSuccessMessage(result)
        }
      } catch (err) {
        const message =
          err instanceof Error && err.message ? err.message : fallbackError
        setErrorMessage(message)
      } finally {
        setIsSubmitting(false)
      }
    },
    [fallbackError]
  )

  return {
    isSubmitting,
    successMessage,
    errorMessage,
    setErrorMessage,
    setSuccessMessage,
    execute,
    resetMessages,
  }
}
