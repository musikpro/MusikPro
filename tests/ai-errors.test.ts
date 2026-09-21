import { describe, expect, it } from "vitest";
import { classifyOpenAiError } from "@/lib/ai/errors";

describe("OpenAI public error classification", () => {
  it("explains exhausted API credits without exposing provider details", () => {
    expect(classifyOpenAiError({ status: 429, code: "credit_balance_exhausted", type: "insufficient_quota" })).toMatchObject({
      status: 503,
      code: "OPENAI_CREDITS_EXHAUSTED",
      message: "Le compte OpenAI n’a plus de crédits API. Le propriétaire doit recharger le solde OpenAI.",
    });
  });

  it("keeps ordinary rate limits distinct from exhausted credits", () => {
    expect(classifyOpenAiError({ status: 429, code: "rate_limit_exceeded" })).toMatchObject({
      status: 429,
      code: "OPENAI_RATE_LIMITED",
    });
  });
});
