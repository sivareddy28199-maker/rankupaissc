import type { AiProvider, CompletionRequest, CompletionResult } from "./types";
import { AiUnavailableError } from "./types";

/**
 * OpenRouter provider with a configurable FREE-model fallback chain.
 *
 * Model A -> Model B -> Model C -> Model D. If a model is rate limited (429),
 * out of quota, or fails temporarily, the next model in the chain is tried.
 * Override the chain with the OPENROUTER_MODELS env var (comma separated).
 */
const DEFAULT_MODELS = [
  "deepseek/deepseek-chat-v3-0324:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "google/gemma-3-27b-it:free",
  "qwen/qwen-2.5-72b-instruct:free",
];

export function openRouterModels(): string[] {
  const configured = process.env["OPENROUTER_MODELS"];
  const list = configured
    ? configured
        .split(",")
        .map((m) => m.trim())
        .filter(Boolean)
    : DEFAULT_MODELS;
  return list.length ? list : DEFAULT_MODELS;
}

/** Statuses worth retrying on the next model in the chain. */
function isRetryable(status: number) {
  return status === 429 || status === 402 || status === 403 || status === 404 || status >= 500;
}

export const openRouterProvider: AiProvider = {
  name: "openrouter",

  isConfigured() {
    return Boolean(process.env["OPENROUTER_API_KEY"]);
  },

  async complete(request: CompletionRequest): Promise<CompletionResult> {
    const apiKey = process.env["OPENROUTER_API_KEY"];
    if (!apiKey) throw new AiUnavailableError("AI is not configured yet.");

    const models = openRouterModels();
    let lastError: unknown;

    for (const model of models) {
      try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${apiKey}`,
            "HTTP-Referer": "https://rankupssc.lovable.app",
            "X-Title": "RankUp AI",
          },
          body: JSON.stringify({
            model,
            messages: request.messages,
            temperature: request.temperature ?? 0.4,
            max_tokens: request.maxTokens ?? 2000,
            ...(request.json ? { response_format: { type: "json_object" } } : {}),
          }),
        });

        if (!response.ok) {
          const detail = await response.text().catch(() => "");
          // Log technical detail server-side only; users never see it.
          console.error(`[openrouter] ${model} -> ${response.status} ${detail.slice(0, 300)}`);
          if (isRetryable(response.status)) {
            lastError = new Error(`status ${response.status}`);
            continue;
          }
          throw new AiUnavailableError();
        }

        const payload = (await response.json()) as {
          choices?: { message?: { content?: string } }[];
          usage?: { total_tokens?: number };
          error?: { message?: string };
        };
        const text = payload.choices?.[0]?.message?.content ?? "";
        if (!text) {
          console.error(`[openrouter] ${model} returned empty content`, payload.error?.message ?? "");
          lastError = new Error("empty response");
          continue;
        }
        return {
          text,
          provider: "openrouter",
          model,
          tokensUsed: payload.usage?.total_tokens ?? 0,
        };
      } catch (error) {
        if (error instanceof AiUnavailableError) throw error;
        console.error(`[openrouter] ${model} failed:`, error);
        lastError = error;
      }
    }

    console.error("[openrouter] all models failed", lastError);
    throw new AiUnavailableError("The AI is busy right now. Please try again in a moment.");
  },
};
