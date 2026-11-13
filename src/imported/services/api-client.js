import { elovioApi } from '../../lib/elovio-api.functions';
export async function requestElovioApi(url, options = {}) {
  const parsed = new URL(url, window.location.origin);
  const action = parsed.pathname.split('/').at(-1);
  const body = options.body ? JSON.parse(options.body) : undefined;
  const result = await elovioApi({ data: { action, body, language: parsed.searchParams.get('language') || undefined } });
  return { ok: result.status >= 200 && result.status < 300, status: result.status, json: async () => JSON.parse(result.payloadJson) };
}