// supabase/functions/infer-intent/index.ts
// Recebe raw_input + target_platform, retorna Intent em JSON estrito.
// Modelo: gpt-4o-mini (rápido, barato). Sem stream.

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM = `
Você é um analisador de intenção para um sistema de engenharia de contexto.
Dado um input bruto do usuário, extraia a intenção estruturada.

Retorne SOMENTE um objeto JSON válido com esta estrutura exata (sem markdown, sem texto extra):
{
  "role": "string — papel/persona que a IA deve assumir",
  "objective": "string — objetivo principal claro e específico",
  "public": "string — público-alvo ou destinatário do output",
  "constraints": ["array de strings — restrições explícitas ou implícitas"],
  "domain": "string — domínio da tarefa (ex: medicina, programação, marketing)",
  "task_type": "REASONING | EXTRACTION | AGENT | CODE",
  "target_platform": "gpt | claude | cursor | system-prompt | agente",
  "implicit_assumptions": ["array de strings — o que o usuário assume sem dizer"]
}

Regras para task_type:
- REASONING: análise, síntese, comparação, decisão, explicação
- EXTRACTION: extrair dados, classificar, transformar, parsear
- AGENT: tarefa multi-step com ferramentas, automação, workflow
- CODE: escrever, revisar, refatorar, debugar código

Se o target_platform vier no input, use-o. Senão, infira do contexto.
`.trim();

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS });
  }

  try {
    const body = await req.json().catch(() => null);
    if (!body?.raw_input || typeof body.raw_input !== 'string') {
      return new Response(
        JSON.stringify({ error: 'raw_input é obrigatório' }),
        { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } },
      );
    }

    const rawInput: string      = body.raw_input.trim();
    const platform: string      = body.target_platform ?? 'gpt';

    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'OPENAI_API_KEY não configurada' }),
        { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } },
      );
    }

    const userMessage = `Plataforma alvo: ${platform}\n\nInput do usuário:\n${rawInput}`;

    const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.2,
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

    // Remove possíveis ```json ... ``` se o modelo ignorar a instrução
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
