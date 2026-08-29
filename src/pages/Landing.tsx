import { Link } from 'react-router-dom';
import { BrandMark } from '../components/BrandMark';
import { Button } from '../components/ui/button';

export function Landing() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-background px-4 py-12 sm:py-16">
      <div className="w-full max-w-lg text-center">
        <div className="flex justify-center">
          <BrandMark
            className="flex-col gap-3"
            iconClass="h-12 w-auto max-w-[220px]"
            wordmarkClassName="text-xl font-semibold tracking-tight text-foreground"
          />
        </div>
        <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
          Crie, organize e reutilize seus melhores prompts.{' '}
          <strong className="font-medium text-foreground/90">PromptMaker AI</strong> gera prompts
          profissionais sob demanda — salve no cofre com pastas, tags e favoritos.
        </p>
        <Button size="lg" className="mt-10 rounded-full px-8" asChild>
          <Link to="/auth">Começar</Link>
        </Button>
      </div>
    </div>
  );
}
