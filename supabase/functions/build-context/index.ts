// supabase/functions/build-context/index.ts
// Recebe Intent + raw_input, monta o pacote de contexto canônico em JSON.
// Modelo: gpt-4o. Resposta não-streaming (JSON completo).

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function buildSystem(taskType: string, strategy: string): string {
  return `
Você é um engenheiro de contexto especialista. Sua tarefa é montar um pacote de contexto canônico em JSON estrito.
Tarefa classificada como: ${taskType} | Estratégia: ${strategy}

REGRA FUNDAMENTAL — PROIBIDO SLOT-FILLING:
NÃO substitua placeholders com frases genéricas. Cada campo deve conter conteúdo SINTETIZADO e ESPECÍFICO ao input real.
Exemplos do que NÃO fazer:
- system_immutable: "Você é um especialista em ${taskType}..." → ERRADO, genérico
- user_data.content: copiar o input verbatim → ERRADO, não sintetiza
- steps: ["Analisar o problema", "Implementar solução"] → ERRADO, sem especificidade
O teste: se o campo faria sentido para QUALQUER outro input, está errado.

USER_DATA — Síntese estruturada (NÃO copie o input):
- user_data.content deve conter os dados concretos e factuais do input (nomes, valores, URLs, requisitos, restrições reais), reescritos de forma limpa e estruturada.
- PROIBIDO resumir ou descartar informação. Se o input tem 10 regras, o content deve preservar todas as 10. Perda de informação é um erro crítico.
- NÃO copie verbatim. Sintetize mantendo TODA a substância.

SYSTEM_IMMUTABLE — Instruções de domínio específico:
- Escreva instruções que só fariam sentido para ESTE domínio e ESTE objetivo específico.
- Inclua restrições do domínio real, tom adequado ao público-alvo, e o que o modelo NUNCA deve fazer neste contexto.

RETRIEVAL — Extração COMPLETA de contexto (OBRIGATÓRIO — PROIBIDO OMITIR):
- retrieval.docs: Extraia TODOS os itens estruturados do input — cada regra, requisito, opção, trilha, restrição, spec, formato ou referência técnica deve gerar pelo menos um item. Se o input tem 15 requisitos, retrieval.docs deve ter no mínimo 15 itens. Omitir informação do input é um erro crítico.
- retrieval.exemplars: Para EXTRACTION ou CODE, crie 1-2 exemplos few-shot concretos com input/output reais do domínio. Para outros tipos, array vazio.

CONTRATO — Anti-alucinação:
- contract.steps: passos com verbos de ação específicos ao domínio real (não "analisar o problema" mas "verificar se o ID do produto começa com letra minúscula e tem ≤40 caracteres")
- contract.acceptance_criteria: critérios com condições binárias verificáveis ("A assinatura aparece como ativa no Play Console", não "a assinatura está configurada")
- contract.stop_condition: condição mensurável e específica
- contract.fallback: ação concreta e específica ao domínio
- contract.self_check: perguntas que expõem falhas do domínio real

Retorne SOMENTE o JSON abaixo, sem markdown, sem backticks, sem texto extra.
O primeiro caractere deve ser { e o último deve ser }:
{
  "system_immutable": "string — instruções de domínio específicas que só fazem sentido para ESTE objetivo e ESTE público",
  "task_routing": {
    "type": "${taskType}",
    "strategy": "string — técnicas específicas aplicadas a este caso"
  },
  "assumptions": ["premissa específica 1 extraída do input real", "premissa específica 2"],
  "intent": {
    "role": "string — persona específica ao domínio",
    "objective": "string — objetivo do PRODUTO/DESAFIO com métricas ou critérios reais",
    "public": "string — público-alvo com nível de conhecimento e contexto",
    "constraints": ["restrição concreta 1", "restrição concreta 2"]
  },
  "user_data": {
    "delimiter": "<<<USER_DATA>>>",
    "content": "string — síntese estruturada dos dados concretos do usuário: fatos, valores, nomes, requisitos, restrições. NÃO copie verbatim. NÃO descarte informação. Preserve toda a substância do input."
  },
  "retrieval": {
    "exemplars": ["exemplo few-shot concreto se EXTRACTION/CODE, senão array vazio"],
    "docs": ["item concreto extraído do input 1", "item concreto extraído do input 2"]
  },
  "contract": {
    "role": "string — papel específico ao domínio",
    "objective": "string — objetivo com critério de sucesso mensurável",
    "inputs": {"campo_real": "tipo e formato esperado com exemplo concreto"},
    "assumptions": ["premissa do contrato específica ao domínio"],
    "steps": ["verbo + ação específica do domínio real 1", "verbo + ação específica 2"],
    "tools": ["ferramenta específica se AGENT, senão array vazio"],
    "output_format": "string — formato exato com estrutura detalhada e exemplo de campos",
    "acceptance_criteria": ["condição binária verificável 1", "condição binária verificável 2"],
    "stop_condition": "string — condição mensurável e específica com critério claro",
    "fallback": "string — ação concreta e específica ao domínio se objetivo principal falhar",
    "self_check": ["pergunta que expõe falha específica do domínio 1", "pergunta 2"]
  }
}
`.trim();
}

const STRATEGY_MAP: Record<string, string> = {
  REASONING:  'Chain-of-Thought + Plan-and-Solve + Self-Refinement',
  EXTRACTION: 'Schema-first + Few-shot + Output Contract estrito',
  AGENT:      'ReAct + Tool whitelist + Stop condition explícita',
  CODE:       'I/O tipado + Edge cases + Testes unitários',
};

async function callOpenAI(apiKey: string, system: string, userMsg: string, temperature: number): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      max_tokens: 4096,
      temperature,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userMsg },
      ],
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI ${res.status}: ${err}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS });
  }

  try {
    const body = await req.json().catch(() => null);
    if (!body?.intent || !body?.raw_input) {
      return new Response(
        JSON.stringify({ error: 'intent e raw_input são obrigatórios' }),
        { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } },
      );
    }

    const intent   = body.intent;
    const rawInput: string  = body.raw_input;
    const attempt: number   = body.attempt ?? 0;
    const previousGaps: string[] = Array.isArray(body.previous_gaps) ? body.previous_gaps : [];

    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'OPENAI_API_KEY não configurada' }),
        { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } },
      );
    }

    const taskType = intent.task_type ?? 'REASONING';
    const strategy = STRATEGY_MAP[taskType] ?? STRATEGY_MAP.REASONING;
    const systemPrompt = buildSystem(taskType, strategy);

    const attemptNote = attempt > 0
      ? `\n\n[REFINAMENTO ${attempt}] Corrija os problemas específicos abaixo (em ordem de prioridade):
${previousGaps.length > 0
  ? previousGaps.map((g, i) => `${i + 1}. ${g}`).join('\n')
  : '1. Aumente a especificidade de todos os campos\n2. Expanda retrieval.docs com mais itens do input\n3. Torne steps mais concretos e verificáveis'}

REGRA CRÍTICA: o pacote refinado deve conter NO MÍNIMO a mesma quantidade de informação da tentativa anterior. Nunca remova itens de retrieval.docs ou steps.`
      : '';

    const userMessage = `
Intent extraída:
${JSON.stringify(intent, null, 2)}

Input original do usuário:
${rawInput}
${attemptNote}
`.trim();

    let content: string;
    try {
      content = await callOpenAI(apiKey, systemPrompt, userMessage, attempt === 0 ? 0.7 : 0.3);
    } catch (err) {
      console.error('OpenAI error:', err);
      return new Response(
        JSON.stringify({ error: 'Erro ao chamar OpenAI', detail: String(err) }),
        { status: 502, headers: { ...CORS, 'Content-Type': 'application/json' } },
      );
    }

    const clean = content
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();

    return new Response(clean, {
      status: 200,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('Erro inesperado:', err);
    return new Response(
      JSON.stringify({ error: 'Erro interno' }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } },
    );
  }
});
