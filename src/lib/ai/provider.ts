import { gatewayProvider } from "./gateway";
import { openRouterProvider } from "./openrouter";
import { oxAlphaProvider } from "./oxalpha";
import type { AiProvider, CompletionRequest, CompletionResult } from "./types";
import { AiUnavailableError } from "./types";

/**
 * Provider chain: OpenRouter (free-model fallback chain) first, then Ox Alpha,
 * then the hosted gateway. Adding a vendor = implement AiProvider and push it
 * into this list — no other application code changes.
 */
const PROVIDERS: AiProvider[] = [openRouterProvider, oxAlphaProvider, gatewayProvider];

export function activeProviders(): AiProvider[] {
  return PROVIDERS.filter((p) => p.isConfigured());
}

/** Runs the request through the provider chain with automatic fallback. */
export async function runCompletion(request: CompletionRequest): Promise<CompletionResult> {
  const providers = activeProviders();
  if (providers.length === 0) {
    throw new AiUnavailableError("AI is not available right now. Please try again later.");
  }
  let lastError: unknown;
  for (const provider of providers) {
    try {
      return await provider.complete(request);
    } catch (error) {
      lastError = error;
      console.error(`[ai] provider "${provider.name}" failed:`, error);
    }
  }
  console.error("[ai] every provider failed", lastError);
  throw new AiUnavailableError();
}

/** Parses a JSON payload out of a model response, tolerating code fences. */
export function parseJsonResponse<T>(raw: string): T {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();
  const start = cleaned.search(/[[{]/);
  const end = Math.max(cleaned.lastIndexOf("]"), cleaned.lastIndexOf("}"));
  if (start === -1 || end === -1) throw new AiUnavailableError("AI returned an unreadable answer.");
  return JSON.parse(cleaned.slice(start, end + 1)) as T;
}
