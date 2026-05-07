// supabase/functions/validate-context/index.ts
// Recebe intent + package, calcula gap_score e decide accept | refine_partial | refine_full.
// Modelo: gpt-4o-mini (rápido). Sem stream.

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM = `
Você é um validador de qualidade para pacotes de contexto de IA.
Dado um intent e um pacote de contexto gerado, avalie a qualidade e retorne um JSON de validação.

Critérios de avaliação (cada um vale 0.0 a 1.0, calcule a média):
1. completude: todos os campos do contrato estão preenchidos de forma específica?
2. alinhamento: o pacote reflete fielmente a intent extraída?
3. especificidade: evita placeholders genéricos como "descrição aqui"?
4. separação_instrucao_dados: user_data usa delimitador e está isolado das instruções?
5. estrategia: a estratégia escolhida é adequada para o task_type?

Retorne SOMENTE este JSON (sem markdown, sem texto extra):
{
  "gap_score": número de 0.0 a 1.0 (média dos critérios),
  "gaps": ["array de strings — problemas específicos encontrados, vazio se gap_score >= 0.9"],
  "decision": "accept | refine_partial | refine_full",
  "notes": "string opcional — observação geral"
}

Regras de decision:
- gap_score >= 0.9 → "accept"
- 0.5 <= gap_score < 0.9 → "refine_partial"
- gap_score < 0.5 → "refine_full"

Seja criterioso. Um gap_score alto exige que o pacote seja realmente completo e específico.
`.trim();

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

    const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model:       'gpt-4o-mini',
        temperature: 0.1,
        messages: [
          { role: 'system', content: SYSTEM },
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

    const data = await aiRes.json();
    const content: string = data.choices?.[0]?.message?.content ?? '';
    const clean = content.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();

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
