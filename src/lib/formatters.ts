import type { ContextPackage, Platform } from './contract';

export function formatForPlatform(pkg: ContextPackage, platform: Platform): string {
  switch (platform) {
    case 'claude':        return formatForClaude(pkg);
    case 'gpt':           return formatForGPT(pkg);
    case 'cursor':        return formatForCursor(pkg);
    case 'system-prompt': return formatAsSystemPrompt(pkg);
    case 'agente':        return formatForAgent(pkg);
  }
}

export const PLATFORM_FORMAT_LABELS: Record<Platform, string> = {
  claude:          'Copiar como XML',
  gpt:             'Copiar como Markdown',
  cursor:          'Copiar .cursorrules',
  'system-prompt': 'Copiar System Prompt',
  agente:          'Copiar para Agente',
};

function formatForClaude(pkg: ContextPackage): string {
  const { system_immutable, task_routing, intent, assumptions, user_data, retrieval, contract } = pkg;
  const lines: string[] = [];

  lines.push('<system>');
  lines.push(`  <role>${intent.role}</role>`);
  lines.push(`  <strategy type="${task_routing.type}">${task_routing.strategy}</strategy>`);
  lines.push('</system>', '');

  lines.push('<instructions>');
  lines.push(system_immutable);
  lines.push('</instructions>', '');

  const hasContext = assumptions.length > 0 || retrieval.docs.length > 0 || retrieval.exemplars.length > 0;
  if (hasContext) {
    lines.push('<context>');
    if (assumptions.length > 0) {
      lines.push('  <assumptions>');
      assumptions.forEach(a => lines.push(`    - ${a}`));
      lines.push('  </assumptions>');
    }
    if (retrieval.docs.length > 0) {
      lines.push('  <docs>');
      retrieval.docs.forEach(d => lines.push(`    ${d}`));
      lines.push('  </docs>');
    }
    if (retrieval.exemplars.length > 0) {
      lines.push('  <exemplars>');
      retrieval.exemplars.forEach(e => lines.push(`    ${e}`));
      lines.push('  </exemplars>');
    }
    lines.push('</context>', '');
  }

  lines.push('<contract>');
  lines.push(`  <objective>${contract.objective}</objective>`);
  lines.push('  <inputs>');
  Object.entries(contract.inputs).forEach(([k, v]) => lines.push(`    <${k}>${v}</${k}>`));
  lines.push('  </inputs>');
  if (contract.assumptions.length > 0) {
    lines.push('  <assumptions>');
    contract.assumptions.forEach(a => lines.push(`    - ${a}`));
    lines.push('  </assumptions>');
  }
  lines.push('  <steps>');
  contract.steps.forEach((s, i) => lines.push(`    ${i + 1}. ${s}`));
  lines.push('  </steps>');
  if (contract.tools.length > 0) {
    lines.push('  <tools>');
    contract.tools.forEach(t => lines.push(`    - ${t}`));
    lines.push('  </tools>');
  }
  lines.push(`  <output_format>${contract.output_format}</output_format>`);
  lines.push('  <acceptance_criteria>');
  contract.acceptance_criteria.forEach(c => lines.push(`    - ${c}`));
  lines.push('  </acceptance_criteria>');
  lines.push(`  <stop_condition>${contract.stop_condition}</stop_condition>`);
  lines.push(`  <fallback>${contract.fallback}</fallback>`);
  if (contract.self_check.length > 0) {
    lines.push('  <self_check>');
    contract.self_check.forEach(c => lines.push(`    - [ ] ${c}`));
    lines.push('  </self_check>');
  }
  lines.push('</contract>');

  if (user_data.content) {
    lines.push('', '<user_data>');
    lines.push(user_data.delimiter);
    lines.push(user_data.content);
    lines.push(user_data.delimiter);
    lines.push('</user_data>');
  }

  return lines.join('\n');
}

function formatForGPT(pkg: ContextPackage): string {
  const { system_immutable, task_routing, intent, assumptions, user_data, retrieval, contract } = pkg;
  const lines: string[] = [];

  lines.push(`### Papel\n${intent.role}`, '');
  lines.push(`### Objetivo\n${contract.objective}`, '');
  lines.push(`### Estratégia\n**Tipo:** ${task_routing.type} | **Técnica:** ${task_routing.strategy}`, '');
  lines.push(`### Instruções do Sistema\n${system_immutable}`);

  if (assumptions.length > 0) {
    lines.push('', '### Premissas');
    assumptions.forEach(a => lines.push(`- ${a}`));
  }

  if (retrieval.docs.length > 0) {
    lines.push('', '### Contexto de Referência');
    retrieval.docs.forEach(d => lines.push(`- ${d}`));
  }

  if (retrieval.exemplars.length > 0) {
    lines.push('', '### Exemplos (Few-Shot)');
    retrieval.exemplars.forEach(e => lines.push(e));
  }

  if (user_data.content) {
    lines.push('', '### Dados do Usuário', '```');
    lines.push(user_data.content);
    lines.push('```');
  }

  lines.push('', '---', '## Contrato de Execução', '');
  lines.push('**Inputs esperados:**');
  Object.entries(contract.inputs).forEach(([k, v]) => lines.push(`- \`${k}\`: ${v}`));

  if (contract.assumptions.length > 0) {
    lines.push('', '**Premissas do contrato:**');
    contract.assumptions.forEach(a => lines.push(`- ${a}`));
  }

  lines.push('', '**Passos:**');
  contract.steps.forEach((s, i) => lines.push(`${i + 1}. ${s}`));

  if (contract.tools.length > 0) {
    lines.push('', '**Ferramentas:**');
    contract.tools.forEach(t => lines.push(`- ${t}`));
  }

  lines.push('', `**Formato de saída:** ${contract.output_format}`);
  lines.push('', '**Critérios de aceite:**');
  contract.acceptance_criteria.forEach(c => lines.push(`- ${c}`));
  lines.push('', `**Condição de parada:** ${contract.stop_condition}`);
  lines.push('', `**Fallback:** ${contract.fallback}`);

  if (contract.self_check.length > 0) {
    lines.push('', '**Checklist de auto-verificação:**');
    contract.self_check.forEach(c => lines.push(`- [ ] ${c}`));
  }

  return lines.join('\n');
}

function formatForCursor(pkg: ContextPackage): string {
  const { system_immutable, task_routing, intent, assumptions, contract } = pkg;
  const lines: string[] = [];

  lines.push('# .cursorrules', '');
  lines.push('## Context');
  lines.push(`role: ${intent.role}`);
  lines.push(`objective: ${contract.objective}`);
  lines.push(`type: ${task_routing.type}`);
  lines.push(`strategy: ${task_routing.strategy}`, '');

  lines.push('## System Rules');
  lines.push(system_immutable);

  const constraints = [...intent.constraints, ...assumptions];
  if (constraints.length > 0) {
    lines.push('', '## Constraints');
    constraints.forEach(c => lines.push(`- ${c}`));
  }

  lines.push('', '## Steps');
  contract.steps.forEach((s, i) => lines.push(`${i + 1}. ${s}`));

  lines.push('', `## Output Format\n${contract.output_format}`);

  lines.push('', '## Acceptance Criteria');
  contract.acceptance_criteria.forEach(c => lines.push(`- ${c}`));

  if (contract.self_check.length > 0) {
    lines.push('', '## Self-Check');
    contract.self_check.forEach(c => lines.push(`- [ ] ${c}`));
  }

  return lines.join('\n');
}

function formatAsSystemPrompt(pkg: ContextPackage): string {
  const { system_immutable, task_routing, intent, assumptions, contract, user_data } = pkg;
  const lines: string[] = [];

  lines.push(`Você é ${intent.role}.`, '');
  lines.push(system_immutable);

  if (assumptions.length > 0) {
    lines.push('', 'Premissas importantes:');
    assumptions.forEach(a => lines.push(`• ${a}`));
  }

  if (intent.constraints.length > 0) {
    lines.push('', 'Restrições:');
    intent.constraints.forEach(c => lines.push(`• ${c}`));
  }

  lines.push('', `Estratégia: ${task_routing.strategy} (${task_routing.type}).`);
  lines.push('', 'Siga os passos abaixo:');
  contract.steps.forEach((s, i) => lines.push(`${i + 1}. ${s}`));

  lines.push('', `Formato de saída esperado: ${contract.output_format}`);
  lines.push('', `Condição de parada: ${contract.stop_condition}`);
  lines.push(`Fallback: ${contract.fallback}`);

  if (user_data.content) {
    lines.push('', user_data.delimiter);
    lines.push(user_data.content);
    lines.push(user_data.delimiter);
  }

  return lines.join('\n');
}

function formatForAgent(pkg: ContextPackage): string {
  const { system_immutable, task_routing, intent, assumptions, contract, retrieval } = pkg;
  const lines: string[] = [];

  lines.push('=== AGENTE AUTÔNOMO ===', '');
  lines.push(`PERSONA: ${intent.role}`);
  lines.push(`MISSÃO: ${contract.objective}`);
  lines.push(`ESTRATÉGIA: ${task_routing.strategy}`, '');

  lines.push('--- SISTEMA ---');
  lines.push(system_immutable);

  if (assumptions.length > 0) {
    lines.push('', '--- PREMISSAS ---');
    assumptions.forEach(a => lines.push(`• ${a}`));
  }

  if (retrieval.docs.length > 0) {
    lines.push('', '--- CONTEXTO DE REFERÊNCIA ---');
    retrieval.docs.forEach(d => lines.push(d));
  }

  if (contract.tools.length > 0) {
    lines.push('', '--- FERRAMENTAS DISPONÍVEIS ---');
    contract.tools.forEach(t => lines.push(`[TOOL] ${t}`));
  }

  lines.push('', '--- PLANO DE EXECUÇÃO (ReAct) ---');
  contract.steps.forEach((s, i) => {
    lines.push(`Thought ${i + 1}: ${s}`);
    lines.push(`Action  ${i + 1}: [execute]`);
    lines.push(`Obs     ${i + 1}: [avaliar resultado e decidir próximo passo]`);
    if (i < contract.steps.length - 1) lines.push('');
  });

  lines.push('', `--- CONDIÇÃO DE PARADA ---\n${contract.stop_condition}`);
  lines.push('', `--- FALLBACK ---\n${contract.fallback}`);

  lines.push('', '--- CRITÉRIOS DE ACEITE ---');
  contract.acceptance_criteria.forEach(c => lines.push(`✓ ${c}`));

  if (contract.self_check.length > 0) {
    lines.push('', '--- AUTO-VERIFICAÇÃO (antes de entregar) ---');
    contract.self_check.forEach(c => lines.push(`☐ ${c}`));
  }

  return lines.join('\n');
}
