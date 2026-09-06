export type AiCapability =
  | "askTutor"
  | "solveDoubt"
  | "generateNotes"
  | "generateQuestions"
  | "generateQuiz"
  | "generateStudyPlan"
  | "explainAnswer"
  | "analyzePerformance";

export type ChatRole = "system" | "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface CompletionRequest {
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  /** Ask the provider to return strict JSON. */
  json?: boolean;
}

export interface CompletionResult {
  text: string;
  provider: string;
  model: string;
  tokensUsed: number;
}

/**
 * Every AI vendor used by RankUp AI implements this interface.
 * Application code never imports a vendor module directly — it goes through
 * `runCompletion()` in ./provider.ts, which handles ordering and fallback.
 */
export interface AiProvider {
  name: string;
  /** False when the required credentials are not configured. */
  isConfigured(): boolean;
  complete(request: CompletionRequest): Promise<CompletionResult>;
}

export class AiUnavailableError extends Error {
  constructor(message = "The AI service is temporarily unavailable. Please try again shortly.") {
    super(message);
    this.name = "AiUnavailableError";
  }
}

export class AiLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiLimitError";
  }
}
