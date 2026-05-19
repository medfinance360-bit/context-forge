// supabase/functions/validate-context/index.ts
// Recebe intent + package, calcula gap_score e decide accept | refine_partial | refine_full.
// Modelo: gpt-4o. Sem stream.
// Aplica penalidades estruturais em código antes de retornar o score final.

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM = `
Você é um validador de qualidade rigoroso para pacotes de contexto de IA.
Dado um intent e um pacote de contexto, avalie a qualidade subjetiva e retorne um JSON.

Critérios de avaliação (cada um vale 0.0 a 1.0, calcule a média ponderada):
1. completude (peso 2): todos os campos estão preenchidos de forma específica e não-genérica?
2. alinhamento (peso 2): o pacote reflete o OBJETIVO DO PRODUTO/DESAFIO real, não tarefas administrativas?
3. especificidade (peso 2): evita placeholders e frases que servem para qualquer input ("analisar o problema", "implementar solução")?
4. retrieval_qualidade (peso 1.5): retrieval.docs captura a estrutura real do input? exemplars concretos se EXTRACTION/CODE?
5. contrato_antihalucination (peso 2.5): stop_condition mensurável? fallback é ação concreta? self_check expõe falhas do domínio? acceptance_criteria verificáveis binariamente?

Penalidades subjetivas (aplique ao calcular sua nota):
- Se contract.objective menciona tarefas administrativas ("preencher", "inscrição", "submeter"): -0.3
- Se steps são genéricos sem verbos do domínio real: -0.2
- Se self_check contém apenas perguntas genéricas ("verificou tudo?", "está correto?"): -0.15

IMPORTANTE: O validador de infraestrutura já aplicou penalidades estruturais objetivas separadamente.
Você avalia apenas a QUALIDADE SUBJETIVA do conteúdo. Seja criterioso — gap_score alto só para pacotes realmente excelentes.

Retorne SOMENTE este JSON (sem markdown, sem texto extra):
{
  "gap_score": número de 0.0 a 1.0 (sua avaliação subjetiva de qualidade, SEM penalidades estruturais),
  "gaps": ["problema específico 1", "problema específico 2"],
  "decision": "accept | refine_partial | refine_full",
  "notes": "string opcional"
}

Regras de decision (baseadas no gap_score ANTES das penalidades estruturais):
- gap_score >= 0.9 → "accept"
- 0.5 <= gap_score < 0.9 → "refine_partial"
- gap_score < 0.5 → "refine_full"
`.trim();

async function callOpenAI(apiKey: string, system: string, userMsg: string, temperature: number): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
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

function computeStructuralPenalties(pkg: Record<string, unknown>): { penalty: number; issues: string[] } {
  const issues: string[] = [];
  let penalty = 0;

  const retrieval = pkg?.retrieval as Record<string, unknown> | undefined;
  const contract  = pkg?.contract  as Record<string, unknown> | undefined;

  const docCount        = Array.isArray(retrieval?.docs)                ? (retrieval.docs as unknown[]).length : 0;
  const stepsCount      = Array.isArray(contract?.steps)                ? (contract.steps as unknown[]).length : 0;
  const criteriaCount   = Array.isArray(contract?.acceptance_criteria)  ? (contract.acceptance_criteria as unknown[]).length : 0;
  const selfCheckCount  = Array.isArray(contract?.self_check)           ? (contract.self_check as unknown[]).length : 0;

  if (docCount === 0) {
    penalty -= 0.4;
    issues.push('retrieval.docs está vazio — nenhum contexto extraído do input (-0.4)');
  } else if (docCount < 3) {
    penalty -= 0.2;
    issues.push(`retrieval.docs tem apenas ${docCount} item(s); esperado ≥3 (-0.2)`);
  }

  if (stepsCount < 2) {
    penalty -= 0.2;
    issues.push(`contract.steps tem apenas ${stepsCount} passo(s); esperado ≥2 (-0.2)`);
  }

  if (criteriaCount < 2) {
    penalty -= 0.15;
    issues.push(`acceptance_criteria tem apenas ${criteriaCount} critério(s); esperado ≥2 (-0.15)`);
  }

  if (selfCheckCount === 0) {
    penalty -= 0.1;
    issues.push('contract.self_check está vazio (-0.1)');
  }

  const genericPattern = /você é um (especialista|expert|agente|assistente)\s+(em|para|de)/i;
  const systemImmutable  = typeof pkg?.system_immutable === 'string' ? pkg.system_immutable : '';
  const contractObjective = typeof contract?.objective === 'string' ? contract.objective : '';
  if (genericPattern.test(systemImmutable) || genericPattern.test(contractObjective)) {
    penalty -= 0.25;
    issues.push('system_immutable ou contract.objective contém frases genéricas de template (-0.25)');
  }

  return { penalty, issues };
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

    const { penalty: structuralPenalty, issues: structuralIssues } =
      computeStructuralPenalties(body.package as Record<string, unknown>);

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

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(clean);
    } catch {
      console.error('JSON parse failed:', clean.slice(0, 200));
      return new Response(
        JSON.stringify({ error: 'Modelo retornou JSON inválido', raw: clean.slice(0, 200) }),
        { status: 502, headers: { ...CORS, 'Content-Type': 'application/json' } },
      );
    }

    // Aplica penalidades estruturais ao score subjetivo do LLM
    const llmScore = typeof parsed.gap_score === 'number' ? parsed.gap_score : 0;
    const finalScore = Math.max(0, Math.min(1, llmScore + structuralPenalty));

    const allGaps = [
      ...structuralIssues,
      ...(Array.isArray(parsed.gaps) ? (parsed.gaps as string[]) : []),
    ];

    let decision: string;
    if (finalScore >= 0.9)      decision = 'accept';
    else if (finalScore >= 0.5) decision = 'refine_partial';
    else                        decision = 'refine_full';

    const result = {
      gap_score: Math.round(finalScore * 100) / 100,
      gaps: finalScore >= 0.9 ? [] : allGaps,
      decision,
      notes: parsed.notes ?? undefined,
    };

    return new Response(JSON.stringify(result), {
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
