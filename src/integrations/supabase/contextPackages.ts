import type {
  ContextPackage,
  Intent,
  Platform,
  TaskType,
  Validation,
} from '../../lib/contract';
import { supabase } from './client';

export async function insertContextPackage(params: {
  rawInput: string;
  platform: Platform;
  intent: Intent | null;
  pkg: ContextPackage;
  validation: Validation | null;
  taskType: TaskType;
}): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Não autenticado');

  const { error } = await supabase.from('context_packages').insert({
    user_id: user.id,
    raw_input: params.rawInput,
    intent_json: params.intent,
    package_json: params.pkg,
    validation_json: params.validation,
    target_platform: params.platform,
    task_type: params.taskType,
  });

  if (error) throw new Error(error.message);
}
