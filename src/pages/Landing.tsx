import { Link } from 'react-router-dom';
import { BrandMark } from '../components/BrandMark';
import { Button } from '../components/ui/button';

export function Landing() {
  return (
    <div className="safe-x safe-bottom flex min-h-svh flex-col items-center justify-center bg-background px-4 py-12 sm:py-16">
      <div className="w-full max-w-lg text-center">
        <div className="flex justify-center">
          <BrandMark
            className="flex-col gap-3"
            iconClass="h-12 w-auto max-w-[220px]"
            wordmarkClassName="text-xl font-semibold tracking-tight text-foreground"
          />
        </div>
        <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
          Cofre técnico de prompts: cada item é um{' '}
          <strong className="font-medium text-foreground/90">pacote de contexto</strong> forjado com
          intent, contrato, validação e roteamento por plataforma — engenharia de contexto, não só
          texto copiado.
        </p>
        <Button size="lg" className="mt-10 rounded-full px-8" asChild>
          <Link to="/auth">Entrar</Link>
        </Button>
      </div>
    </div>
  );
}
