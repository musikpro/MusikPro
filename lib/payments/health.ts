export function providerIsDegraded(outcomes: string[], minimumAttempts = 5, successThreshold = 0.2) {
  if (outcomes.length < minimumAttempts) return false;
  const successes = outcomes.filter((outcome) => outcome === "checkout_created").length;
  return successes / outcomes.length < successThreshold;
}
