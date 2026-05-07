import { useMemo, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import { toast } from 'sonner';
import { BrandMark } from '../components/BrandMark';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { supabase } from '../integrations/supabase/client';
import {
  evaluatePasswordRules,
  isPasswordPolicyMet,
  PASSWORD_MIN_LENGTH,
} from '../lib/passwordPolicy';
import { cn } from '../lib/utils';

type Mode = 'signin' | 'signup';
type Lang = 'pt' | 'en';

const COPY = {
  pt: {
    tagline: 'Cofre técnico de prompts com engenharia de contexto.',
    welcomeBack: 'Bem-vindo de volta',
    createAccount: 'Crie sua conta',
    emailPh: 'Email',
    passwordPh: 'Senha',
    submitSignin: 'Entrar',
    submitSignup: 'Cadastrar',
    confirmPasswordPh: 'Confirmar senha',
    passwordMismatch: 'As senhas não coincidem.',
    passwordPolicyTitle: 'A senha deve incluir:',
    ruleLength: `Pelo menos ${PASSWORD_MIN_LENGTH} caracteres`,
    ruleDigit: 'Pelo menos um número',
    ruleLetter: 'Pelo menos uma letra',
    passwordPolicyFail: 'A senha não cumpre os requisitos mínimos.',
    noAccount: 'Não tem uma conta?',
    createLink: 'Criar conta',
    hasAccount: 'Já tem uma conta?',
    signinLink: 'Entrar',
    backHome: 'Voltar ao início',
  },
  en: {
    tagline: 'Technical prompt vault with context engineering.',
    welcomeBack: 'Welcome back',
    createAccount: 'Create your account',
    emailPh: 'Email',
    passwordPh: 'Password',
    submitSignin: 'Sign in',
    submitSignup: 'Sign up',
    confirmPasswordPh: 'Confirm password',
    passwordMismatch: "Passwords don't match.",
    passwordPolicyTitle: 'Password must include:',
    ruleLength: `At least ${PASSWORD_MIN_LENGTH} characters`,
    ruleDigit: 'At least one number',
    ruleLetter: 'At least one letter',
    passwordPolicyFail: 'Password does not meet the minimum requirements.',
    noAccount: "Don't have an account?",
    createLink: 'Create account',
    hasAccount: 'Already have an account?',
    signinLink: 'Sign in',
    backHome: 'Back to home',
  },
} as const;

const RULE_ORDER: Array<{ id: keyof typeof COPY.pt; key: 'length' | 'digit' | 'letter' }> = [
  { id: 'ruleLength', key: 'length' },
  { id: 'ruleDigit', key: 'digit' },
  { id: 'ruleLetter', key: 'letter' },
];

function getAuthErrorMessage(message: string, lang: Lang) {
  if (message.includes('Invalid login credentials')) {
    return lang === 'pt' ? 'Email ou senha incorretos.' : 'Invalid email or password.';
  }
  if (message.includes('User already registered')) {
    return lang === 'pt' ? 'Este email já está cadastrado.' : 'This email is already registered.';
  }
  if (message.includes('Password')) {
    return lang === 'pt'
      ? `Senha inválida. Use pelo menos ${PASSWORD_MIN_LENGTH} caracteres e siga as regras indicadas.`
      : `Invalid password. Use at least ${PASSWORD_MIN_LENGTH} characters and follow the rules shown.`;
  }
  return message || (lang === 'pt' ? 'Não foi possível concluir.' : 'Something went wrong.');
}

export function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? '/forge';

  const [mode, setMode] = useState<Mode>('signin');
  const [lang, setLang] = useState<Lang>('pt');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const t = COPY[lang];

  const passwordRules = useMemo(() => evaluatePasswordRules(password), [password]);
  const policyMet = useMemo(() => isPasswordPolicyMet(password), [password]);

  const signupCanSubmit =
    policyMet && confirmPassword.length > 0 && password === confirmPassword;

  function goToMode(next: Mode) {
    setMode(next);
    setConfirmPassword('');
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (mode === 'signup') {
      if (!isPasswordPolicyMet(password)) {
        toast.error(t.passwordPolicyFail);
        return;
      }
      if (password !== confirmPassword) {
        toast.error(t.passwordMismatch);
        return;
      }
    }
    setBusy(true);
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          toast.error(getAuthErrorMessage(error.message, lang));
          return;
        }
        toast.success(lang === 'pt' ? 'Bem-vindo de volta.' : 'Welcome back.');
        navigate(from, { replace: true });
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) {
          toast.error(getAuthErrorMessage(error.message, lang));
          return;
        }
        toast.success(
          lang === 'pt'
            ? 'Conta criada. Verifique seu email se necessário.'
            : 'Account created. Check your email if required.',
        );
        navigate(from, { replace: true });
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-[400px]">
        <div className="flex flex-col items-center text-center">
          <BrandMark
            className="flex-col gap-2"
            iconClass="h-10 w-auto max-w-[200px]"
            wordmarkClassName="text-lg font-semibold tracking-tight text-foreground"
          />
          <p className="mt-2 text-sm text-muted-foreground">{t.tagline}</p>
        </div>

        <h1 className="mt-10 text-center text-lg font-semibold leading-none tracking-tight text-foreground">
          {mode === 'signin' ? t.welcomeBack : t.createAccount}
        </h1>

        <form onSubmit={(e) => void handleSubmit(e)} className="mt-8 space-y-3">
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder={t.emailPh}
            className="rounded-md py-3"
          />
          <Input
            id="password"
            type="password"
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={mode === 'signup' ? PASSWORD_MIN_LENGTH : undefined}
            placeholder={t.passwordPh}
            className="rounded-md py-3"
          />

          {mode === 'signup' ? (
            <>
              <div className="rounded-md border border-border bg-muted/40 px-3.5 py-3">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  {t.passwordPolicyTitle}
                </p>
                <ul className="mt-2 space-y-2">
                  {RULE_ORDER.map(({ id, key }) => {
                    const ok = passwordRules[key];
                    const label = t[id as keyof typeof t] as string;
                    return (
                      <li
                        key={key}
                        className={cn(
                          'flex items-center gap-2.5 text-xs transition-colors',
                          ok ? 'text-success-foreground' : 'text-muted-foreground',
                        )}
                      >
                        <span
                          className={cn(
                            'flex size-5 shrink-0 items-center justify-center rounded-full border text-[10px]',
                            ok
                              ? 'border-success/40 bg-success/15'
                              : 'border-border bg-transparent',
                          )}
                          aria-hidden
                        >
                          {ok ? <Check className="size-3" strokeWidth={2.5} /> : null}
                        </span>
                        {label}
                      </li>
                    );
                  })}
                </ul>
              </div>

              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={PASSWORD_MIN_LENGTH}
                placeholder={t.confirmPasswordPh}
                className="rounded-md py-3"
              />
            </>
          ) : null}

          <Button
            type="submit"
            disabled={busy || (mode === 'signup' && !signupCanSubmit)}
            className="mt-2 w-full rounded-md"
          >
            {busy ? '…' : mode === 'signin' ? t.submitSignin : t.submitSignup}
          </Button>
        </form>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          {mode === 'signin' ? (
            <>
              {t.noAccount}{' '}
              <button
                type="button"
                onClick={() => goToMode('signup')}
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                {t.createLink}
              </button>
            </>
          ) : (
            <>
              {t.hasAccount}{' '}
              <button
                type="button"
                onClick={() => goToMode('signin')}
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                {t.signinLink}
              </button>
            </>
          )}
        </p>

        <div className="mt-10 flex items-center justify-center gap-6 text-sm">
          <button
            type="button"
            onClick={() => setLang('en')}
            className={cn(
              'transition-colors',
              lang === 'en' ? 'font-medium text-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            EN
          </button>
          <button
            type="button"
            onClick={() => setLang('pt')}
            className={cn(
              'transition-colors',
              lang === 'pt' ? 'font-medium text-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            PT
          </button>
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">
            {t.backHome}
          </Link>
        </p>
      </div>
    </div>
  );
}
