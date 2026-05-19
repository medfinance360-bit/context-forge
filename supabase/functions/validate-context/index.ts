// supabase/functions/validate-context/index.ts
// Recebe intent + package, calcula gap_score e decide accept | refine_partial | refine_full.
// Modelo: gpt-4o-mini. Sem stream.

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM = `
Você é um validador de qualidade para pacotes de contexto de IA.
Dado um intent e um pacote de contexto gerado, avalie a qualidade e retorne um JSON de validação.

Critérios de avaliação (cada um vale 0.0 a 1.0, calcule a média ponderada):
1. completude (peso 2): todos os campos do contrato estão preenchidos de forma específica e não-genérica?
2. alinhamento (peso 2): o pacote reflete o OBJETIVO DO PRODUTO/DESAFIO da intent, não tarefas administrativas?
3. especificidade (peso 2): evita placeholders como "descrição aqui", "exemplo", steps genéricos como "Preencher formulário"?
4. retrieval_qualidade (peso 1.5): retrieval.docs contém contexto extraído do input (trilhas, specs, opções)? retrieval.exemplars tem exemplos concretos se task_type for EXTRACTION ou CODE?
5. contrato_antihalucination (peso 2.5): stop_condition é mensurável? fallback é uma ação concreta? self_check tem perguntas verificáveis? acceptance_criteria são objetivos?

Penalidades automáticas (reduzem o gap_score):
- Se contract.objective mencionar "preencher formulário", "fazer inscrição" ou similares: -0.3
- Se retrieval.docs estiver vazio quando o input mencionar trilhas/opções/specs: -0.2
- Se steps contiver apenas passos genéricos sem especificidade ao domínio: -0.2

Retorne SOMENTE este JSON (sem markdown, sem texto extra):
{
  "gap_score": número de 0.0 a 1.0 (média ponderada com penalidades aplicadas),
  "gaps": ["array de strings — problemas específicos encontrados, vazio se gap_score >= 0.9"],
  "decision": "accept | refine_partial | refine_full",
  "notes": "string opcional — observação geral sobre a qualidade"
}

Regras de decision:
- gap_score >= 0.9 → "accept"
- 0.5 <= gap_score < 0.9 → "refine_partial"
- gap_score < 0.5 → "refine_full"

Seja criterioso. Um gap_score alto exige pacote realmente completo, específico e alinhado ao desafio real.
`.trim();

async function callOpenAI(apiKey: string, system: string, userMsg: string, temperature: number): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      max_tokens: 1024,
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
    if (!body?.intent || !body?.package) {
      return new Response(
        JSON.stringify({ error: 'intent e package são obrigatórios' }),
        { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } },
      );
    }

    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'OPENAI_API_KEY não configurada' }),
        { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } },
      );
    }

    const userMessage = `
Intent:
${JSON.stringify(body.intent, null, 2)}

Pacote de contexto gerado:
${JSON.stringify(body.package, null, 2)}
`.trim();

    let content: string;
    try {
      content = await callOpenAI(apiKey, SYSTEM, userMessage, 0.1);
    } catch (err) {
      console.error('OpenAI error:', err);
      return new Response(
        JSON.stringify({ error: 'Erro ao chamar OpenAI', detail: String(err) }),
        { status: 502, headers: { ...CORS, 'Content-Type': 'application/json' } },
      );
    }

    const clean = content.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();

    let parsed: unknown;
    try {
      parsed = JSON.parse(clean);
    } catch {
      console.error('JSON parse failed:', clean.slice(0, 200));
      return new Response(
        JSON.stringify({ error: 'Modelo retornou JSON inválido', raw: clean.slice(0, 200) }),
        { status: 502, headers: { ...CORS, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(JSON.stringify(parsed), {
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
