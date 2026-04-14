import OpenAI from "openai";

let instance: OpenAI | null = null;

/**
 * Singleton OpenAI client (server-only). Lazily created on first use.
 * @throws if OPENAI_API_KEY is missing when invoked
 */
export function getOpenAI(): OpenAI {
  if (instance) return instance;
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY environment variable");
  }
  instance = new OpenAI({
    apiKey,
    timeout: 60_000,
    maxRetries: 2,
  });
  return instance;
}

/** Proxy so `import { openai }` delegates to the singleton (first access initializes). */
export const openai = new Proxy({} as OpenAI, {
  get(_target, prop, receiver) {
    const client = getOpenAI();
    const v = Reflect.get(client, prop, receiver);
    if (typeof v === "function") {
      return (v as (...args: unknown[]) => unknown).bind(client);
    }
    return v;
  },
});

export function hasOpenAIApiKey(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

/** Optional health check (list models). */
export async function verifyOpenAIKey(): Promise<boolean> {
  if (!hasOpenAIApiKey()) return false;
  try {
    await getOpenAI().models.list();
    return true;
  } catch {
    return false;
  }
}
