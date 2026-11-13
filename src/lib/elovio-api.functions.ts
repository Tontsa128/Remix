import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { getRequest } from '@tanstack/react-start/server';
import { z } from 'zod';

export const elovioApi = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({
    action: z.enum(['tutor', 'translate', 'voices', 'synthesize', 'transcribe', 'understand']),
    body: z.unknown().optional(),
    language: z.enum(['fi', 'es', 'en']).optional(),
  }))
  .handler(async ({ data }) => {
    const { runElovioApi } = await import('./elovio-api.server');
    const result = await runElovioApi(getRequest(), data.action, data.body, data.language);
    return { status: result.status, payloadJson: JSON.stringify(result.payload) };
  });