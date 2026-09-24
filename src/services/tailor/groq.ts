import "server-only";

/**
 * Minimal Groq client (OpenAI-compatible Chat Completions API), tuned for the free tier.
 *
 * - Keys come from GROQ_API_KEYS (comma-separated) or GROQ_API_KEY and never reach the browser.
 *   On rate limits (429), auth errors (401/403), network or server errors (5xx) the next key is tried.
 * - Free-tier limits are per minute (e.g. 8,000 tokens/min). When every key is rate-limited and Groq's
 *   "try again in N s" is short, the request waits and retries instead of failing.
 * - Reasoning models get a low reasoning effort: their hidden reasoning tokens count against the limit.
 * - If the configured model has been retired (404), the best available model is picked automatically.
 */

const baseUrl = () => (process.env.GROQ_BASE_URL?.trim() || "https://api.groq.com/openai/v1").replace(/\/$/, "");
export const DEFAULT_MODEL = "openai/gpt-oss-120b";

/** Fallback order when the configured model is unavailable — JSON-mode capable chat models, best first. */
const PREFERRED_MODELS = ["openai/gpt-oss-120b", "qwen/qwen3.8-27b", "openai/gpt-oss-20b", "llama-3.3-70b-versatile"];
/** Model ids that can't do chat tailoring (speech, guards, tiny models). */
const NON_CHAT = /whisper|orpheus|guard|safeguard|tts|allam/i;
/** Longest rate-limit wait we absorb server-side (keeps the request well inside the 60 s function limit). */
const MAX_RATE_LIMIT_WAIT_S = 25;

export class GroqError extends Error {
  constructor(
    message: string,
    public status: number,
    /** Seconds until the rate limit resets, when known. */
    public retryAfter?: number,
  ) {
    super(message);
  }
}

export function groqKeys(): string[] {
  const raw = process.env.GROQ_API_KEYS || process.env.GROQ_API_KEY || "";
  return raw
    .split(/[,\s]+/)
    .map((k) => k.trim())
    .filter(Boolean);
}

const configuredModel = () => process.env.GROQ_MODEL?.trim() || DEFAULT_MODEL;
/** Replacement chosen after the configured model was reported missing (per warm instance). */
let resolvedModel: string | null = null;
export const groqModel = () => resolvedModel ?? configuredModel();

/** Lower reasoning effort for reasoning models — fewer hidden tokens, faster, same JSON quality. */
function reasoningParams(model: string): Record<string, string> {
  if (/gpt-oss/i.test(model)) return { reasoning_effort: "low" };
  if (/qwen3/i.test(model)) return { reasoning_effort: "none" };
  return {};
}

let cursor = 0; // round-robin start so load spreads across keys

type Message = { role: "system" | "user"; content: string };
export type GroqUsage = { prompt: number; completion: number; total: number };
type Attempt =
  | { ok: true; content: string; model: string; usage?: GroqUsage }
  | { ok: false; error: GroqError; retryWithOtherKey: boolean; modelMissing: boolean; rateLimited: boolean; paramRejected: boolean };

/** Seconds to wait, from Groq's message ("Please try again in 13.4025s" / "in 1m2.5s") or retry-after. */
function retryAfterSeconds(res: Response, message?: string): number | undefined {
  const m = message && /try again in (?:(\d+)m)?([\d.]+)s/i.exec(message);
  if (m) return Math.ceil((Number(m[1] ?? 0) * 60 + Number(m[2])) * 10) / 10;
  const h = Number(res.headers.get("retry-after"));
  return Number.isFinite(h) && h > 0 ? h : undefined;
}

async function attempt(key: string, model: string, messages: Message[], opts: { temperature: number; maxTokens: number; withReasoning: boolean }): Promise<Attempt> {
  let res: Response;
  try {
    res = await fetch(`${baseUrl()}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages,
        temperature: opts.temperature,
        // Reasoning models spend part of this budget on hidden reasoning.
        max_tokens: opts.maxTokens,
        response_format: { type: "json_object" },
        ...(opts.withReasoning ? reasoningParams(model) : {}),
      }),
      signal: AbortSignal.timeout(55_000),
    });
  } catch (e) {
    return {
      ok: false,
      error: new GroqError(`Could not reach Groq: ${(e as Error).message}`, 502),
      retryWithOtherKey: true,
      modelMissing: false,
      rateLimited: false,
      paramRejected: false,
    };
  }

  if (res.ok) {
    const json = (await res.json()) as {
      choices?: { message?: { content?: string }; finish_reason?: string }[];
      model?: string;
      usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
    };
    const choice = json.choices?.[0];
    const content = choice?.message?.content;
    if (!content) {
      const msg = choice?.finish_reason === "length" ? "The model ran out of output tokens. Try a shorter job description or prompt." : "Groq returned an empty response";
      return { ok: false, error: new GroqError(msg, 502), retryWithOtherKey: false, modelMissing: false, rateLimited: false, paramRejected: false };
    }
    const u = json.usage;
    return {
      ok: true,
      content,
      model: json.model ?? model,
      usage: u ? { prompt: u.prompt_tokens ?? 0, completion: u.completion_tokens ?? 0, total: u.total_tokens ?? 0 } : undefined,
    };
  }

  const detail = await res
    .json()
    .then((j: { error?: { message?: string; code?: string } }) => j.error)
    .catch(() => undefined);
  const rateLimited = res.status === 429;
  const retryAfter = rateLimited ? retryAfterSeconds(res, detail?.message) : undefined;
  const message = rateLimited
    ? `Groq free-tier rate limit reached for ${model}${retryAfter ? ` — try again in ${Math.ceil(retryAfter)}s` : ""}. ${detail?.message ?? ""}`.trim()
    : `Groq error ${res.status}${detail?.message ? `: ${detail.message}` : ""}`;
  return {
    ok: false,
    error: new GroqError(message, rateLimited ? 429 : 502, retryAfter),
    // Only rotate on errors another key could fix.
    retryWithOtherKey: [401, 403, 429].includes(res.status) || res.status >= 500,
    modelMissing: res.status === 404 || detail?.code === "model_not_found" || detail?.code === "model_decommissioned",
    rateLimited,
    paramRejected: res.status === 400 && /reasoning/i.test(detail?.message ?? ""),
  };
}

// ── Model catalogue ─────────────────────────────────────────────────────────

type ModelInfo = { id: string; active?: boolean; context_window?: number };
let modelCache: { at: number; ids: string[] } | null = null;

async function fetchModels(key: string): Promise<ModelInfo[]> {
  const res = await fetch(`${baseUrl()}/models`, { headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`models HTTP ${res.status}`);
  return ((await res.json()) as { data?: ModelInfo[] }).data ?? [];
}

/** Chat models the configured key can use (cached 10 minutes). */
export async function listChatModels(): Promise<string[]> {
  if (modelCache && Date.now() - modelCache.at < 600_000) return modelCache.ids;
  const key = groqKeys()[0];
  if (!key) return [];
  try {
    const ids = (await fetchModels(key))
      .filter((m) => m.active !== false && !NON_CHAT.test(m.id) && (m.context_window ?? 32_000) >= 32_000)
      .map((m) => m.id)
      .sort((a, b) => (PREFERRED_MODELS.indexOf(a) + 1 || 99) - (PREFERRED_MODELS.indexOf(b) + 1 || 99) || a.localeCompare(b));
    modelCache = { at: Date.now(), ids };
    return ids;
  } catch {
    return modelCache?.ids ?? [];
  }
}

/** Picks the best chat model this key can use. */
async function pickAvailableModel(key: string, exclude: string): Promise<string | null> {
  try {
    const data = await fetchModels(key);
    const ids = data.filter((m) => m.active !== false && m.id !== exclude).map((m) => m.id);
    return (
      PREFERRED_MODELS.find((m) => ids.includes(m)) ??
      // Otherwise the largest-context general chat model.
      data
        .filter((m) => ids.includes(m.id) && !NON_CHAT.test(m.id) && (m.context_window ?? 0) >= 32_000)
        .sort((a, b) => (b.context_window ?? 0) - (a.context_window ?? 0))[0]?.id ??
      null
    );
  } catch {
    return null;
  }
}

const sleep = (s: number) => new Promise((r) => setTimeout(r, s * 1000));

export async function groqJson(
  messages: Message[],
  opts: { temperature?: number; maxTokens?: number; model?: string } = {},
): Promise<{ content: string; model: string; usage?: GroqUsage }> {
  const keys = groqKeys();
  if (!keys.length) throw new GroqError("Groq is not configured. Add GROQ_API_KEYS to .env and restart the server.", 503);
  const started = Date.now();
  let model = opts.model || groqModel();
  let withReasoning = true;
  let switchedModel = false;
  let waitedForRateLimit = false;

  for (;;) {
    const start = cursor++ % keys.length;
    let lastError: GroqError | null = null;
    let shortestWait: number | undefined;
    let allRateLimited = true;

    for (let i = 0; i < keys.length; i++) {
      const key = keys[(start + i) % keys.length]!;
      let r = await attempt(key, model, messages, { temperature: opts.temperature ?? 0.3, maxTokens: opts.maxTokens ?? 8192, withReasoning });

      if (!r.ok && r.paramRejected && withReasoning) {
        withReasoning = false; // model doesn't support reasoning_effort — retry plainly
        r = await attempt(key, model, messages, { temperature: opts.temperature ?? 0.3, maxTokens: opts.maxTokens ?? 8192, withReasoning });
      }
      if (!r.ok && r.modelMissing && !switchedModel && !opts.model) {
        const replacement = await pickAvailableModel(key, model);
        if (replacement) {
          console.warn(`[groq] model "${model}" unavailable — switching to "${replacement}". Set GROQ_MODEL to silence this.`);
          model = resolvedModel = replacement;
          switchedModel = true;
          r = await attempt(key, model, messages, { temperature: opts.temperature ?? 0.3, maxTokens: opts.maxTokens ?? 8192, withReasoning });
        }
      }

      if (r.ok) return { content: r.content, model: r.model, usage: r.usage };
      lastError = r.error;
      if (r.rateLimited) {
        if (r.error.retryAfter !== undefined) shortestWait = Math.min(shortestWait ?? Infinity, r.error.retryAfter);
      } else allRateLimited = false;
      if (!r.retryWithOtherKey) break;
    }

    // Every key hit the per-minute limit: wait it out once if the wait is short and time allows.
    const elapsed = (Date.now() - started) / 1000;
    if (allRateLimited && !waitedForRateLimit && shortestWait !== undefined && shortestWait <= MAX_RATE_LIMIT_WAIT_S && elapsed + shortestWait < 30) {
      waitedForRateLimit = true;
      await sleep(shortestWait + 0.5);
      continue;
    }
    throw lastError ?? new GroqError("Groq request failed", 502);
  }
}
