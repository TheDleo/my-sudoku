/**
 * Fisher-Yates in-place shuffle. Mutates `arr` and returns void.
 * Used by generator modules that need a randomized order driven by a seedable RNG.
 */
export function shuffleInPlace<T>(arr: T[], rng: () => number): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = tmp;
  }
}
