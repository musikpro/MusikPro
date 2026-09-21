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
