export interface RandomResult {
  value: number
  seed: number
}

export function nextRandom(seed: number): RandomResult {
  const nextSeed = (seed * 1664525 + 1013904223) >>> 0
  return {
    value: nextSeed / 0x100000000,
    seed: nextSeed,
  }
}

export function randomInt(seed: number, min: number, max: number): { value: number; seed: number } {
  const result = nextRandom(seed)
  return {
    value: Math.floor(result.value * (max - min + 1)) + min,
    seed: result.seed,
  }
}

export function randomChoice<T>(seed: number, items: readonly T[]): { value: T; seed: number } {
  const result = randomInt(seed, 0, items.length - 1)
  return {
    value: items[result.value],
    seed: result.seed,
  }
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function cloneState<T>(state: T): T {
  return structuredClone(state) as T
}
