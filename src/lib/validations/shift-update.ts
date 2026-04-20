import { z } from 'zod'

export const updateShiftSchema = z.object({
  temp: z.number().nullable().optional(),
  wit:  z.string().max(100).nullable().optional(),
  bod:  z.string().max(100).nullable().optional(),
  beg:  z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  end:  z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  pau:  z.number().int().min(0).max(480).nullable().optional(),
  gl:   z.string().max(500).nullable().optional(),
  kv:   z.string().max(100).nullable().optional(),
  kb:   z.string().max(100).nullable().optional(),
  arb:  z.string().max(10000).nullable().optional(),
  vor:  z.string().max(10000).nullable().optional(),
}).strict()

export const updateShiftWorkerSchema = z.object({
  beruf: z.string().max(500).optional(),
  anz:   z.number().int().min(1).max(9999).optional(),
  std:   z.number().min(0).max(24).optional(),
}).strict()

export const updateShiftEquipmentSchema = z.object({
  typ: z.string().max(500).optional(),
  anz: z.number().int().min(1).max(9999).optional(),
  std: z.number().min(0).max(24).optional(),
}).strict()

export type UpdateShiftInput          = z.infer<typeof updateShiftSchema>
export type UpdateShiftWorkerInput    = z.infer<typeof updateShiftWorkerSchema>
export type UpdateShiftEquipmentInput = z.infer<typeof updateShiftEquipmentSchema>
