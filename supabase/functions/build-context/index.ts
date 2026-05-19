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

RETRIEVAL — Extração ativa de contexto (OBRIGATÓRIO):
Analise o input do usuário e preencha ativamente:
- retrieval.docs: Extraia estruturas listadas no input (trilhas, opções, requisitos técnicos, especificações, frameworks mencionados). Se o texto citar "Trilha 1: X", "Opção A: Y", requisitos específicos ou referências técnicas, adicione cada item como string descritiva em docs. Não deixe vazio se houver qualquer estrutura no input.
- retrieval.exemplars: Se o task_type for EXTRACTION ou CODE, crie 1-2 exemplos few-shot sintéticos e concretos que ilustrem o padrão de entrada/saída esperado. Para outros tipos, deixe vazio.

CONTRATO — Campos críticos para evitar alucinação:
- contract.steps: passos ESPECÍFICOS do desafio real, não passos genéricos de processo
- contract.acceptance_criteria: critérios verificáveis objetivamente
- contract.stop_condition: condição clara e mensurável de encerramento
- contract.fallback: ação concreta a tomar se o objetivo principal não for atingível
- contract.self_check: perguntas que o modelo deve responder antes de entregar o output

Retorne SOMENTE o JSON abaixo, sem markdown, sem backticks, sem texto extra.
O primeiro caractere deve ser { e o último deve ser }:
{
  "system_immutable": "string — instruções permanentes incorporando a estratégia ${taskType}, específicas ao domínio",
  "task_routing": {
    "type": "${taskType}",
    "strategy": "string — nome das técnicas aplicadas"
  },
  "assumptions": ["array de strings — premissas explicitadas, específicas ao input"],
  "intent": {
    "role": "string",
    "objective": "string — objetivo do PRODUTO/DESAFIO (não tarefas administrativas)",
    "public": "string",
    "constraints": ["array"]
  },
  "user_data": {
    "delimiter": "<<<USER_DATA>>>",
    "content": "string — dados concretos do usuário isolados das instruções"
  },
  "retrieval": {
    "exemplars": ["array de strings — exemplos few-shot se relevante ao task_type, senão vazio"],
    "docs": ["array de strings — contexto extraído do input: trilhas, opções, specs técnicas, frameworks"]
  },
  "contract": {
    "role": "string",
    "objective": "string — objetivo específico e mensurável",
    "inputs": {"campo": "descrição do tipo e formato esperado"},
    "assumptions": ["array — premissas específicas do contrato"],
    "steps": ["array de strings — passos concretos e ordenados do desafio real"],
    "tools": ["array — ferramentas/APIs específicas se AGENT, senão vazio"],
    "output_format": "string — formato exato e detalhado esperado",
    "acceptance_criteria": ["array — critérios verificáveis objetivamente"],
    "stop_condition": "string — condição clara e mensurável de parada",
    "fallback": "string — ação concreta se objetivo principal não for atingível",
    "self_check": ["array — perguntas que o modelo responde antes de entregar"]
  }
}

Seja específico e concreto. Não use placeholders genéricos como "descrição aqui" ou "exemplo".
Adapte TUDO ao input e intent fornecidos.
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
      max_tokens: 2048,
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
    const rawInput: string = body.raw_input;
    const attempt: number  = body.attempt ?? 0;

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
      ? `\n\n[REFINAMENTO ${attempt}] Melhore o pacote anterior. Foque em preencher lacunas (especialmente retrieval.docs) e aumentar o gap_score.`
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
