/** Alinhado ao mínimo recomendado no Supabase (Authentication → Password). Ajuste o dashboard para ≥ 8 caracteres se ainda não estiver. */

export const PASSWORD_MIN_LENGTH = 8;

export type PasswordRuleId = 'length' | 'digit' | 'letter';

/** Regras avaliadas em tempo real na UI de cadastro. */
export function evaluatePasswordRules(password: string): Record<PasswordRuleId, boolean> {
  return {
    length: password.length >= PASSWORD_MIN_LENGTH,
    digit: /\d/.test(password),
    letter: /[a-zA-ZÀ-ÿ]/.test(password),
  };
}

export function isPasswordPolicyMet(password: string): boolean {
  const r = evaluatePasswordRules(password);
  return r.length && r.digit && r.letter;
}
