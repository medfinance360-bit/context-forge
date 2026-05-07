// supabase/functions/build-context/index.ts
// Recebe Intent + raw_input, monta o pacote de contexto canônico em JSON.
// Modelo: gpt-4o (qualidade). Stream SSE → client acumula e parseia.

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function buildSystem(taskType: string, strategy: string): string {
  return `
Você é um engenheiro de contexto especialista.
Sua tarefa é montar um pacote de contexto canônico em JSON estrito para a tarefa classificada como: ${taskType}.
Estratégia recomendada: ${strategy}

Retorne SOMENTE o JSON abaixo, sem markdown, sem texto extra:
{
  "system_immutable": "string — instruções permanentes que o modelo deve seguir, incorporando a estratégia ${taskType}",
  "task_routing": {
    "type": "${taskType}",
    "strategy": "string — nome das técnicas aplicadas"
  },
  "assumptions": ["array de strings — premissas explicitadas"],
  "intent": {
    "role": "string",
    "objective": "string",
    "public": "string",
    "constraints": ["array"]
  },
  "user_data": {
    "delimiter": "<<<USER_DATA>>>",
    "content": "string — seção delimitada com os dados do usuário isolados das instruções"
  },
  "retrieval": {
    "exemplars": ["array de strings — exemplos few-shot se relevante, senão vazio"],
    "docs": ["array — vazio em v1"]
  },
  "contract": {
    "role": "string",
    "objective": "string",
    "inputs": {"campo": "descrição"},
    "assumptions": ["array"],
    "steps": ["array de strings — passos enumerados"],
    "tools": ["array — vazio se não for AGENT"],
    "output_format": "string — formato exato esperado",
    "acceptance_criteria": ["array — critérios de aceite"],
    "stop_condition": "string",
    "fallback": "string",
    "self_check": ["array — checklist de auto-verificação"]
  }
}

Seja específico e concreto. Não use placeholders genéricos.
Adapte o conteúdo exatamente ao input e intent fornecidos.
`.trim();
}

const STRATEGY_MAP: Record<string, string> = {
  REASONING:  'Chain-of-Thought + Plan-and-Solve + Self-Refinement',
  EXTRACTION: 'Schema-first + Few-shot + Output Contract estrito',
  AGENT:      'ReAct + Tool whitelist + Stop condition',
  CODE:       'I/O tipado + Edge cases + Testes',
};

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

    const intent    = body.intent;
    const rawInput: string  = body.raw_input;
    const attempt: number   = body.attempt ?? 0;
    const stream: boolean   = body.stream === true;

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
      ? `\n\n[REFINAMENTO ${attempt}] Melhore o pacote anterior. Foque em preencher lacunas e aumentar o gap_score.`
      : '';

    const userMessage = `
Intent extraída:
${JSON.stringify(intent, null, 2)}

Input original do usuário:
${rawInput}
${attemptNote}
`.trim();

    const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model:       'gpt-4o',
        temperature: attempt === 0 ? 0.7 : 0.3,  // mais conservador no refinamento
        stream,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user',   content: userMessage },
        ],
      }),
    });

    if (!aiRes.ok) {
      const err = await aiRes.text();
      console.error('OpenAI error:', err);
      return new Response(
        JSON.stringify({ error: 'Erro ao chamar OpenAI' }),
        { status: 502, headers: { ...CORS, 'Content-Type': 'application/json' } },
      );
    }

    if (stream && aiRes.body) {
      return new Response(aiRes.body, {
        headers: { ...CORS, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
      });
    }

    // Non-stream fallback
    const data = await aiRes.json();
    const content = data.choices?.[0]?.message?.content ?? '';
    const clean = content.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();

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
