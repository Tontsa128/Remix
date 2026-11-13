import { createClient } from "@supabase/supabase-js";

export type RequestLike = {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
  query?: Record<string, string | string[] | undefined>;
};
export type ResponseLike = {
  status(code: number): ResponseLike;
  setHeader(name: string, value: string): void;
  json(value: unknown): void;
  end(): void;
};

export function requestHeader(req: RequestLike, name: string): string | undefined {
  const value = req.headers[name] ?? req.headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
}

export function sendJson(res: ResponseLike, status: number, payload: Record<string, unknown>): void {
  res.status(status).json(payload);
}

export type InterpreterSupabase = { rpc: (functionName: string) => Promise<{ data: unknown; error: unknown }> };

export async function authenticateInterpreterRequest(req: RequestLike): Promise<
  | { ok: true; userId: string; supabase: InterpreterSupabase }
  | { ok: false; status: 401 | 503; error: string }
> {
  const token = requestHeader(req, "authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!token || !supabaseUrl || !supabaseAnonKey) return { ok: false, status: 401, error: "authentication_required" };
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { Authorization: "Bearer " + token } },
  });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return { ok: false, status: 401, error: "invalid_session" };
  return { ok: true, userId: data.user.id, supabase: supabase as unknown as InterpreterSupabase };
}

export function isAllowedInterpreterOrigin(req: RequestLike, res: ResponseLike): boolean {
  const origin = requestHeader(req, "origin");
  if (!origin) return true;
  const allowedOrigins = (process.env.APP_ALLOWED_ORIGINS ?? "").split(",").map((item) => item.trim()).filter(Boolean);
  const host = requestHeader(req, "host");
  let parsed: URL;
  try { parsed = new URL(origin); } catch { return false; }
  if (parsed.origin !== origin || parsed.protocol !== "https:" && parsed.hostname !== "localhost") return false;
  const allowed = allowedOrigins.includes(origin) || (!!host && parsed.host.toLowerCase() === host.toLowerCase());
  if (allowed) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  return allowed;
}

export function handleInterpreterPreflight(
  req: RequestLike,
  res: ResponseLike,
  methods: "GET" | "POST",
): boolean {
  if (req.method !== "OPTIONS") return false;
  if (!isAllowedInterpreterOrigin(req, res) || !requestHeader(req, "origin")) {
    sendJson(res, 403, { error: "origin_not_allowed" });
    return true;
  }
  res.setHeader("Access-Control-Allow-Methods", methods + ", OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
  res.setHeader("Access-Control-Max-Age", "600");
  res.status(204).end();
  return true;
}
