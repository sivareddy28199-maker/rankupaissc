import { gatewayProvider } from "./gateway";
import { oxAlphaProvider } from "./oxalpha";
import type { AiProvider, CompletionRequest, CompletionResult } from "./types";
import { AiUnavailableError } from "./types";

/**
 * Provider chain: Ox Alpha first when configured, hosted gateway as fallback.
 * Adding a vendor = implement AiProvider and push it into this list.
 */
const PROVIDERS: AiProvider[] = [oxAlphaProvider, gatewayProvider];

export function activeProviders(): AiProvider[] {
  return PROVIDERS.filter((p) => p.isConfigured());
}

/** Runs the request through the provider chain with automatic fallback. */
export async function runCompletion(request: CompletionRequest): Promise<CompletionResult> {
  const providers = activeProviders();
  if (providers.length === 0) {
    throw new AiUnavailableError(
      "No AI provider is configured. Add OX_ALPHA_API_KEY or enable the built-in AI gateway.",
    );
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
  throw lastError instanceof AiUnavailableError ? lastError : new AiUnavailableError();
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
