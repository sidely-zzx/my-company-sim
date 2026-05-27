import { CLIENT_COMPANIES } from '../data/clientCompanies'
import { clamp, nextRandom } from '../seed'
import type { ClientCompanyProfile, GameState } from '../types'

export const CLIENT_BLACKLIST_TRUST_THRESHOLD = 20

const BASE_DAILY_CONTRACT_REFRESH_COUNT = 3
const INITIAL_CLIENT_TRUST_TOTAL = CLIENT_COMPANIES.reduce((total, client) => total + client.trust, 0)

export function clientTrust(state: GameState, client: ClientCompanyProfile): number {
  return state.clientRelations.find((relation) => relation.clientCompanyId === client.id)?.trust ?? client.trust
}

function clientWithCurrentTrust(state: GameState, client: ClientCompanyProfile): ClientCompanyProfile {
  return {
    ...client,
    trust: clientTrust(state, client),
  }
}

function availableClientsByTrust(state: GameState): ClientCompanyProfile[] {
  return CLIENT_COMPANIES.map((client) => clientWithCurrentTrust(state, client)).filter(
    (client) => client.trust >= CLIENT_BLACKLIST_TRUST_THRESHOLD,
  )
}

export function dynamicContractRefreshCount(state: GameState): number {
  if (availableClientsByTrust(state).length === 0) {
    return 0
  }

  const currentTrustTotal = CLIENT_COMPANIES.reduce((total, client) => total + clientTrust(state, client), 0)
  const marketHealth = INITIAL_CLIENT_TRUST_TOTAL > 0 ? currentTrustTotal / INITIAL_CLIENT_TRUST_TOTAL : 0
  // 每日市场机会数量受整体甲方信任度影响；信任度普遍走低会减少项目和人力外包刷新数量。
  return clamp(Math.round(BASE_DAILY_CONTRACT_REFRESH_COUNT * marketHealth), 1, BASE_DAILY_CONTRACT_REFRESH_COUNT)
}

export function randomClientByTrust(state: GameState): ClientCompanyProfile | undefined {
  const candidates = availableClientsByTrust(state)
  const totalWeight = candidates.reduce((total, client) => total + client.trust * client.trust, 0)
  if (candidates.length === 0 || totalWeight <= 0) {
    return undefined
  }

  const roll = nextRandom(state.rngSeed)
  state.rngSeed = roll.seed
  let cursor = roll.value * totalWeight
  for (const client of candidates) {
    cursor -= client.trust * client.trust
    if (cursor <= 0) {
      return client
    }
  }

  return candidates[candidates.length - 1]
}

export function updateClientTrust(
  state: GameState,
  clientCompanyId: number | undefined,
  fallbackTrust: number | undefined,
  delta: number,
): void {
  if (clientCompanyId === undefined) {
    return
  }

  const baseClient = CLIENT_COMPANIES.find((client) => client.id === clientCompanyId)
  const relation = state.clientRelations.find((item) => item.clientCompanyId === clientCompanyId)
  const nextTrust = clamp((relation?.trust ?? fallbackTrust ?? baseClient?.trust ?? 50) + delta, 0, 100)

  // trust 是动态客情属性：合作结果会影响后续甲方项目刷新概率，过低会让甲方进入黑名单不再出现。
  if (relation) {
    relation.trust = nextTrust
    return
  }

  state.clientRelations.push({
    clientCompanyId,
    trust: nextTrust,
  })
}
