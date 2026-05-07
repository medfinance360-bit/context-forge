import { z } from 'zod';

// ─── Plataformas suportadas ───────────────────────────────────────────────────
export const PLATFORMS = ['gpt', 'claude', 'cursor', 'system-prompt', 'agente'] as const;
export type Platform = typeof PLATFORMS[number];

// ─── Tipos de tarefa ──────────────────────────────────────────────────────────
export const TASK_TYPES = ['REASONING', 'EXTRACTION', 'AGENT', 'CODE'] as const;
export type TaskType = typeof TASK_TYPES[number];

// ─── Intent (infer-intent → client) ──────────────────────────────────────────
export const IntentSchema = z.object({
  role:                  z.string().min(1),
  objective:             z.string().min(1),
  public:                z.string().min(1),           // público-alvo / destinatário
  constraints:           z.array(z.string()),
  domain:                z.string(),
  task_type:             z.enum(TASK_TYPES),
  target_platform:       z.enum(PLATFORMS),
  implicit_assumptions:  z.array(z.string()),
});
export type Intent = z.infer<typeof IntentSchema>;

// ─── Pacote de contexto (build-context → client) ─────────────────────────────
export const ContextPackageSchema = z.object({
  system_immutable: z.string(),

  task_routing: z.object({
    type:     z.enum(TASK_TYPES),
    strategy: z.string(),
  }),

  assumptions: z.array(z.string()),

  intent: z.object({
    role:        z.string(),
    objective:   z.string(),
    public:      z.string(),
    constraints: z.array(z.string()),
  }),

  user_data: z.object({
    delimiter: z.string(),    // ex: "<<<USER_DATA>>>"
    content:   z.string(),
  }),

  retrieval: z.object({
    exemplars: z.array(z.string()),
    docs:      z.array(z.string()),
  }),

  contract: z.object({
    role:               z.string(),
    objective:          z.string(),
    inputs:             z.record(z.string(), z.string()),
    assumptions:        z.array(z.string()),
    steps:              z.array(z.string()),
    tools:              z.array(z.string()),
    output_format:      z.string(),
    acceptance_criteria: z.array(z.string()),
    stop_condition:     z.string(),
    fallback:           z.string(),
    self_check:         z.array(z.string()),
  }),
});
export type ContextPackage = z.infer<typeof ContextPackageSchema>;

// ─── Validação / gap score (validate-context → client) ───────────────────────
export const GapDecision = z.enum(['accept', 'refine_partial', 'refine_full']);
export type GapDecision = z.infer<typeof GapDecision>;

export const ValidationSchema = z.object({
  gap_score: z.number().min(0).max(1),
  gaps:      z.array(z.string()),
  decision:  GapDecision,
  notes:     z.string().optional(),
});
export type Validation = z.infer<typeof ValidationSchema>;

// ─── Thresholds ───────────────────────────────────────────────────────────────
export const GAP_THRESHOLDS = {
  ACCEPT:       0.9,   // gap_score >= 0.9 → accept
  REFINE_PARTIAL: 0.5, // 0.5 <= gap_score < 0.9 → refine_partial
  // gap_score < 0.5 → refine_full
} as const;

// ─── Evento SSE do pipeline (para o drawer de eventos) ───────────────────────
export const PipelineEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('intent_extracted'),  data: IntentSchema }),
  z.object({ type: z.literal('context_chunk'),     data: z.string() }),
  z.object({ type: z.literal('context_complete'),  data: ContextPackageSchema }),
  z.object({ type: z.literal('validation_result'), data: ValidationSchema }),
  z.object({ type: z.literal('refine_start'),      data: z.object({ attempt: z.number() }) }),
  z.object({ type: z.literal('pipeline_done'),     data: ContextPackageSchema }),
  z.object({ type: z.literal('pipeline_error'),    data: z.object({ message: z.string() }) }),
]);
export type PipelineEvent = z.infer<typeof PipelineEventSchema>;
