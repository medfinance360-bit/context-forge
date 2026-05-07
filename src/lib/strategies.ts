import type { TaskType } from './contract';

export interface TaskStrategy {
  label:       string;
  description: string;
  techniques:  string[];
  system_hint: string;  // injetado no system_immutable
}

export const STRATEGIES: Record<TaskType, TaskStrategy> = {
  REASONING: {
    label: 'Raciocínio',
    description: 'Tarefas que exigem análise, síntese ou tomada de decisão estruturada.',
    techniques: ['Chain-of-Thought (CoT)', 'Plan-and-Solve', 'Self-Refinement'],
    system_hint: `
Você é um agente de raciocínio estruturado.
Sempre raciocine passo a passo antes de concluir.
Use o formato:
  ANÁLISE: <decomposição do problema>
  PLANO: <etapas de resolução>
  EXECUÇÃO: <raciocínio detalhado>
  CONCLUSÃO: <resposta final>
Se sua conclusão parecer incorreta, revise internamente antes de responder.
`.trim(),
  },

  EXTRACTION: {
    label: 'Extração',
    description: 'Tarefas de extração, classificação ou transformação de dados em schema definido.',
    techniques: ['Schema-first', 'Few-shot com exemplos canônicos', 'Output Contract estrito'],
    system_hint: `
Você é um agente de extração precisa.
Retorne SOMENTE JSON válido conforme o schema fornecido.
Não adicione texto antes ou depois do JSON.
Se um campo não puder ser extraído, use null (nunca omita o campo).
Valide mentalmente o output antes de responder.
`.trim(),
  },

  AGENT: {
    label: 'Agente',
    description: 'Tarefas que requerem uso de ferramentas, múltiplos passos e decisão autônoma.',
    techniques: ['ReAct (Reason + Act)', 'Tool whitelist explícita', 'Stop condition obrigatória'],
    system_hint: `
Você é um agente autônomo orientado a tarefas.
Siga o ciclo: PENSAR → AGIR → OBSERVAR → repetir até atingir a stop condition.
Use SOMENTE as ferramentas listadas na seção [FERRAMENTAS].
Nunca invente resultados de ferramentas.
Declare explicitamente quando a stop condition for atingida.
`.trim(),
  },

  CODE: {
    label: 'Código',
    description: 'Geração, revisão ou refatoração de código com contratos de I/O tipados.',
    techniques: ['I/O tipado explícito', 'Edge cases obrigatórios', 'Bloco de testes'],
    system_hint: `
Você é um engenheiro de software sênior.
Para cada função ou módulo, entregue:
  1. Assinatura tipada (inputs e outputs)
  2. Implementação limpa e comentada
  3. Edge cases tratados
  4. Testes unitários mínimos (sem framework externo obrigatório)
Prefira clareza a cleverness. Aponte trade-offs quando relevante.
`.trim(),
  },
};

export function getStrategy(type: TaskType): TaskStrategy {
  return STRATEGIES[type];
}
