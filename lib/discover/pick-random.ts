/** Tirage aléatoire sans doublon (Fisher-Yates, `crypto.getRandomValues`) : `count` éléments au plus, ordre mélangé. */
export function pickRandom<T>(items: readonly T[], count: number): T[] {
  const pool = [...items];
  const random = new Uint32Array(pool.length);
  globalThis.crypto.getRandomValues(random);
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = random[i] % (i + 1);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}
