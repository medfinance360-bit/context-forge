// supabase/functions/infer-intent/index.ts
// Recebe raw_input + target_platform, retorna Intent em JSON estrito.
// Modelo: claude-3-5-sonnet. Sem stream.

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM = `
Você é um analisador de intenção para um sistema de engenharia de contexto.
Dado um input bruto do usuário, extraia a intenção estruturada.

SEPARAÇÃO OBRIGATÓRIA DE CAMADAS:
Antes de extrair, identifique e separe:
1. CAMADA ADMINISTRATIVA: instruções de processo que NÃO definem o produto ("preencha o formulário", "faça a inscrição", "envie sua candidatura", "clique aqui", datas-limite, regras de submissão). IGNORE para o campo "objective".
2. CAMADA DE PRODUTO/DESAFIO: o que realmente deve ser CONSTRUÍDO, DESENVOLVIDO ou ANALISADO ("construa um agente", "desenvolva um sistema", "arquitete uma solução", "analise X", "implemente Y").

O campo "objective" deve SEMPRE refletir a CAMADA DE PRODUTO/DESAFIO — nunca regras de submissão ou tarefas administrativas.
Exemplo ERRADO de objective: "Preencher o formulário de inscrição do hackathon"
Exemplo CORRETO de objective: "Desenvolver um agente autônomo com ADK que [objetivo real do desafio]"

EXPANSÃO DE INTENÇÃO:
Corrija erros de digitação silenciosamente (ex: "epssoa" → "pessoa").
Se o texto mencionar opções, trilhas ou variantes (ex: "Trilha 1", "Trilha 2"), registre-as em implicit_assumptions para uso posterior no retrieval.

Retorne SOMENTE um objeto JSON válido com esta estrutura exata (sem markdown, sem texto extra):
{
  "role": "string — papel/persona que a IA deve assumir",
  "objective": "string — objetivo do PRODUTO/DESAFIO, específico e claro",
  "public": "string — público-alvo ou destinatário do output",
  "constraints": ["array de strings — restrições explícitas ou implícitas do DESAFIO (não regras administrativas)"],
  "domain": "string — domínio da tarefa (ex: medicina, programação, marketing)",
  "task_type": "REASONING | EXTRACTION | AGENT | CODE",
  "target_platform": "gpt | claude | cursor | system-prompt | agente",
  "implicit_assumptions": ["array de strings — o que o usuário assume sem dizer, incluindo opções/trilhas identificadas"]
}

Regras para task_type:
- REASONING: análise, síntese, comparação, decisão, explicação
- EXTRACTION: extrair dados, classificar, transformar, parsear
- AGENT: tarefa multi-step com ferramentas, automação, workflow autônomo
- CODE: escrever, revisar, refatorar, debugar código

Se o target_platform vier no input, use-o. Senão, infira do contexto.
`.trim();

async function callClaude(apiKey: string, system: string, userMsg: string, temperature: number): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      temperature,
      system,
      messages: [{ role: 'user', content: userMsg }],
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic ${res.status}: ${err}`);
  }
  const data = await res.json();
  return data.content?.[0]?.text ?? '';
}

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

    const rawInput: string = body.raw_input.trim();
    const platform: string = body.target_platform ?? 'gpt';

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'ANTHROPIC_API_KEY não configurada' }),
        { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } },
      );
    }

    const userMessage = `Plataforma alvo: ${platform}\n\nInput do usuário:\n${rawInput}`;

    let content: string;
    try {
      content = await callClaude(apiKey, SYSTEM, userMessage, 0.2);
    } catch (err) {
      console.error('Anthropic error:', err);
      return new Response(
        JSON.stringify({ error: 'Erro ao chamar Claude' }),
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
