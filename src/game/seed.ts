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
export function randomChoiceName(seed: number, firstName: readonly string[], middleName: readonly string[], lastName: readonly string[]): { value: string; seed: number } {
  const result = randomInt(seed, 0, firstName.length - 1)
  const result2 = randomInt(seed, 0, middleName.length - 1)
  const result3 = randomInt(seed, 0, lastName.length - 1)
  return {
    value: firstName[result.value] + middleName[result2.value] + lastName[result3.value],
    seed: result.seed,
  }
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function cloneState<T>(state: T): T {
  return structuredClone(state) as T
}
