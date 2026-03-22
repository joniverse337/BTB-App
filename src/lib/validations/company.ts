import { z } from 'zod'

export const createCompanySchema = z.object({
  name: z
    .string()
    .min(1, 'Firmenname ist erforderlich')
    .max(100, 'Firmenname darf maximal 100 Zeichen lang sein')
    .trim(),
  adr: z
    .string()
    .max(200, 'Adresse darf maximal 200 Zeichen lang sein')
    .trim()
    .optional(),
})

export const joinCompanySchema = z.object({
  code: z
    .string()
    .transform((v) => v.toUpperCase().trim())
    .pipe(z.string().regex(/^BTB-[A-Z0-9]{6}$/, 'Ungültiges Code-Format. Erwartet: BTB-XXXXXX')),
})

export type CreateCompanyData = z.infer<typeof createCompanySchema>
export type JoinCompanyData = z.infer<typeof joinCompanySchema>
