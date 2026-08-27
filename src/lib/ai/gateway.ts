import type { AiProvider, CompletionRequest, CompletionResult } from "./types";
import { AiUnavailableError } from "./types";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const DEFAULT_MODEL = "openai/gpt-5.6-sol";

/** Built-in hosted provider. Used as primary until Ox Alpha credentials exist. */
export const gatewayProvider: AiProvider = {
  name: "gateway",

  isConfigured() {
    return Boolean(process.env["LOVABLE_API_KEY"]);
  },

  async complete(request: CompletionRequest): Promise<CompletionResult> {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new AiUnavailableError("No AI provider is configured.");
    const model = process.env["AI_FALLBACK_MODEL"] ?? DEFAULT_MODEL;

    const response = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: request.messages,
        reasoning_effort: "none",
        ...(request.json ? { response_format: { type: "json_object" } } : {}),
      }),
    });

    if (response.status === 429) {
      throw new AiUnavailableError("AI is busy right now. Please try again in a moment.");
    }
    if (response.status === 402 || response.status === 403) {
      throw new AiUnavailableError(
        "AI credits are exhausted for this workspace. Please top up to continue.",
      );
    }
    if (!response.ok) {
      throw new AiUnavailableError(`AI provider responded with status ${response.status}.`);
    }
    const payload = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
      usage?: { total_tokens?: number };
    };
    const text = payload.choices?.[0]?.message?.content ?? "";
    if (!text) throw new AiUnavailableError("The AI returned an empty response.");
    return { text, provider: "gateway", model, tokensUsed: payload.usage?.total_tokens ?? 0 };
  },
};
