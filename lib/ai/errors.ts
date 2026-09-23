type OpenAiLikeError = {
  status?: number;
  code?: string;
  type?: string;
  message?: string;
  request_id?: string;
};

export type PublicAiError = {
  status: number;
  code: string;
  message: string;
  providerStatus?: number;
  providerRequestId?: string;
};

export class MusicfulApiError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "MusicfulApiError";
    this.status = status;
    this.body = body;
  }
}

export function classifyOpenAiError(error: unknown): PublicAiError {
  const provider = error && typeof error === "object" ? (error as OpenAiLikeError) : {};
  const code = provider.code || provider.type || "AI_REQUEST_FAILED";
  const message = provider.message || "";

  if (code === "credit_balance_exhausted" || code === "insufficient_quota" || /no credits|quota/i.test(message)) {
    return {
      status: 503,
      code: "OPENAI_CREDITS_EXHAUSTED",
      message: "Le compte OpenAI n’a plus de crédits API. Le propriétaire doit recharger le solde OpenAI.",
      providerStatus: provider.status,
      providerRequestId: provider.request_id,
    };
  }
  if (provider.status === 401 || code === "invalid_api_key") {
    return {
      status: 503,
      code: "OPENAI_KEY_INVALID",
      message: "La clé API OpenAI n’est plus valide. Le propriétaire doit la remplacer.",
      providerStatus: provider.status,
      providerRequestId: provider.request_id,
    };
  }
  if (provider.status === 403 || code === "model_not_found") {
    return {
      status: 503,
      code: "OPENAI_MODEL_UNAVAILABLE",
      message: "Le modèle OpenAI configuré n’est pas accessible avec cette clé.",
      providerStatus: provider.status,
      providerRequestId: provider.request_id,
    };
  }
  if (provider.status === 429 || code === "rate_limit_exceeded") {
    return {
      status: 429,
      code: "OPENAI_RATE_LIMITED",
      message: "OpenAI reçoit trop de demandes. Réessaie dans quelques instants.",
      providerStatus: provider.status,
      providerRequestId: provider.request_id,
    };
  }
  return {
    status: 502,
    code: "OPENAI_REQUEST_FAILED",
    message: "La génération des paroles a échoué. Vérifie la connexion OpenAI dans l’espace propriétaire.",
    providerStatus: provider.status,
    providerRequestId: provider.request_id,
  };
}

type MusicfulLikeError = {
  status?: number;
  code?: string;
  message?: string;
};

export function classifyMusicfulError(error: unknown): PublicAiError {
  const provider = error && typeof error === "object" ? (error as MusicfulLikeError) : {};
  const status = provider.status;
  if (status === 401 || status === 403) {
    return {
      status: 503,
      code: "MUSICFUL_INVALID_KEY",
      message: "La clé API Musicful n’est plus valide. Le propriétaire doit la remplacer.",
      providerStatus: status,
    };
  }
  if (status === 402) {
    return {
      status: 503,
      code: "MUSICFUL_NO_CREDITS",
      message: "Le compte Musicful n’a plus de crédits de génération musicale.",
      providerStatus: status,
    };
  }
  if (status === 429) {
    return {
      status: 429,
      code: "MUSICFUL_RATE_LIMITED",
      message: "Musicful reçoit trop de demandes. Réessaie dans quelques instants.",
      providerStatus: status,
    };
  }
  if (status === 400 || status === 422) {
    return {
      status: 502,
      code: "MUSICFUL_BAD_REQUEST",
      message: "Musicful a refusé les paramètres de génération envoyés.",
      providerStatus: status,
    };
  }
  if (status === 408 || provider.code === "ETIMEDOUT" || /timeout/i.test(provider.message || "")) {
    return {
      status: 504,
      code: "MUSICFUL_TIMEOUT",
      message: "Musicful n’a pas répondu à temps. Réessaie dans quelques instants.",
      providerStatus: status,
    };
  }
  return {
    status: 502,
    code: "MUSICFUL_PROVIDER_ERROR",
    message: "La génération audio Musicful a échoué. Vérifie la connexion dans l’espace propriétaire.",
    providerStatus: status,
  };
}

export function classifyAnthropicError(error: unknown): PublicAiError {
  const provider = error && typeof error === "object" ? (error as OpenAiLikeError) : {};
  if (provider.status === 401) return { status: 503, code: "CLAUDE_AUTHENTICATION_FAILED", message: "La clé API Claude n’est plus valide. Le propriétaire doit la remplacer.", providerStatus: provider.status, providerRequestId: provider.request_id };
  if (provider.status === 404) return { status: 503, code: "CLAUDE_MODEL_NOT_AVAILABLE", message: "Le modèle Claude configuré n’est pas accessible avec cette clé.", providerStatus: provider.status, providerRequestId: provider.request_id };
  if (provider.status === 429) return { status: 429, code: "CLAUDE_RATE_LIMITED", message: "Claude reçoit trop de demandes. Réessaie dans quelques instants.", providerStatus: provider.status, providerRequestId: provider.request_id };
  if (provider.status === 400) return { status: 502, code: "CLAUDE_BAD_REQUEST", message: "Claude a refusé les paramètres de génération configurés.", providerStatus: provider.status, providerRequestId: provider.request_id };
  return { status: 502, code: "CLAUDE_UPSTREAM_ERROR", message: "La génération Claude a échoué. Vérifie la connexion Anthropic dans l’espace propriétaire.", providerStatus: provider.status, providerRequestId: provider.request_id };
}
