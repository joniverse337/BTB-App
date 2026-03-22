import { z } from 'zod'

export const projectFormSchema = z.object({
  name: z.string().min(1, 'Projektname ist erforderlich').max(200, 'Projektname darf maximal 200 Zeichen lang sein'),
  nr: z.string().max(100, 'Kostenstelle darf maximal 100 Zeichen lang sein'),
  ag: z.string().max(200, 'Auftraggeber darf maximal 200 Zeichen lang sein'),
  lz_von: z.string(),
  lz_bis: z.string(),
}).refine(
  (data) => {
    if (data.lz_von && data.lz_bis) {
      return new Date(data.lz_von) <= new Date(data.lz_bis)
    }
    return true
  },
  {
    message: 'Das Startdatum muss vor dem Enddatum liegen',
    path: ['lz_bis'],
  }
)

export type ProjectFormData = z.infer<typeof projectFormSchema>

export interface Project {
  id: string
  created_by: string
  company_id: string | null
  name: string
  nr: string | null
  ag: string | null
  firm: string | null
  adr: string | null
  lz_von: string | null
  lz_bis: string | null
  created_at: string
  btb_count?: number
}
