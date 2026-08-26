import type { AiProvider, CompletionRequest, CompletionResult } from "./types";
import { AiUnavailableError } from "./types";

/**
 * Ox Alpha provider (OpenAI-compatible chat completions).
 * Enabled automatically as the PRIMARY provider as soon as OX_ALPHA_API_KEY is
 * configured. Until then RankUp AI falls back to the built-in gateway provider.
 */
export const oxAlphaProvider: AiProvider = {
  name: "oxalpha",

  isConfigured() {
    return Boolean(process.env["OX_ALPHA_API_KEY"]);
  },

  async complete(request: CompletionRequest): Promise<CompletionResult> {
    const apiKey = process.env["OX_ALPHA_API_KEY"];
    if (!apiKey) throw new AiUnavailableError("Ox Alpha is not configured.");
    const baseUrl = (process.env["OX_ALPHA_BASE_URL"] ?? "https://api.oxalpha.ai/v1").replace(
      /\/$/,
      "",
    );
    const model = process.env["AI_MODEL"] ?? "ox-alpha-1";

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: request.messages,
        temperature: request.temperature ?? 0.4,
        max_tokens: request.maxTokens ?? 2000,
        ...(request.json ? { response_format: { type: "json_object" } } : {}),
      }),
    });

    if (!response.ok) {
      throw new AiUnavailableError(`Ox Alpha responded with status ${response.status}.`);
    }
    const payload = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
      usage?: { total_tokens?: number };
    };
    const text = payload.choices?.[0]?.message?.content ?? "";
    if (!text) throw new AiUnavailableError("Ox Alpha returned an empty response.");
    return { text, provider: "oxalpha", model, tokensUsed: payload.usage?.total_tokens ?? 0 };
  },
};
