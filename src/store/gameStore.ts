import { create } from 'zustand'

import { createInitialGameState } from '../game/initialState'
import { createGameSaveFileName, createGameSaveJson, parseGameSaveJson } from '../game/save'
import {
  acceptLaborContract,
  assignEmployeeToLabor,
  resolveLaborClientNotice,
} from '../game/systems/contractSystem'
import { applyEmployeeDiscipline, fireEmployee, renameEmployee, updateEmployeeCompensation } from '../game/systems/employeeSystem'
import { getFinanceReport, getYesterdayFinanceReport } from '../game/systems/financeReportSystem'
import { markAllMailRead, markMailRead } from '../game/systems/mailSystem'
import { resolveProjectClientEvent } from '../game/systems/projectClientEventSystem'
import {
  acceptProjectContract,
  assignEmployeeToProject,
  breachProjectContract,
} from '../game/systems/projectSystem'
import { refreshResumes, sendOffer } from '../game/systems/recruitingSystem'
import { advanceGameTime, setOffWorkHour, setSpeed } from '../game/systems/timeSystem'
import { markTutorialEmployeeStatusHandled, syncTutorialProgress } from '../game/systems/tutorialSystem'
import type { AssignmentMode, EmployeeDisciplineAction, FinanceReport, GameSpeed, GameState, SkillRole, WorkHour } from '../game/types'

export interface GameStore extends GameState {
  /** 开始一局新游戏；会重置全部游戏状态和市场数据。 */
  startGame: (options?: { skipTutorial?: boolean }) => void
  /** 重置当前游戏；作用等同于重新创建初始状态。 */
  resetGame: () => void
  /** 设置游戏速度；0 为暂停，1 为正常，2 为二倍速。 */
  setSpeed: (speed: GameSpeed) => void
  /** 设置玩家选择的下班时间；如果当前时间已超过该时间会立即日结。 */
  setOffWorkHour: (hour: WorkHour) => void
  /** 推进游戏时间；UI 或主循环传入真实经过的毫秒数。 */
  tick: (realDeltaMs: number) => void
  /** 刷新招聘市场简历；会消耗当天刷新次数。 */
  refreshResumes: () => void
  /** 给候选人发 offer；薪资和社保比例会影响接受概率。 */
  sendOffer: (resumeId: string, salaryPerDay: number, socialInsuranceRatio: number) => void
  /** 接受一个人力外包合同，会生成签约邮件和事件。 */
  acceptLaborContract: (contractId: string) => void
  /** 把员工安排到人力外包合同中驻场。 */
  assignEmployeeToLabor: (employeeId: string, contractId: string, mode: AssignmentMode) => void
  /** 接受一个项目外包合同，会生成签约邮件和事件。 */
  acceptProjectContract: (projectId: string) => void
  /** 把员工按岗位分配到项目中，项目会按其真实能力推进。 */
  assignEmployeeToProject: (employeeId: string, projectId: string, role: SkillRole, mode: AssignmentMode) => void
  /** 主动毁约项目外包；会扣除项目金额 30% 的违约金，并释放项目员工、取消后续安排。 */
  breachProjectContract: (projectId: string) => void
  /** 处理一个待选择的甲方项目随机事件；会立即应用玩家选择的项目、员工和甲方关系效果。 */
  resolveProjectClientEvent: (eventId: string, optionId: string) => void
  /** 处理人力外包产出不达标通知；可仅关闭，也可直接换人后恢复时间。 */
  resolveLaborClientNotice: (noticeId: string, replacementEmployeeId?: string, mode?: AssignmentMode) => void
  /** 修改员工花名，用于玩家自定义员工显示名。 */
  renameEmployee: (employeeId: string, nickname: string) => void
  /** 调整员工日薪和社保公积金比例；会立即影响成本、满意度和后续劳动风险。 */
  updateEmployeeCompensation: (employeeId: string, salaryPerDay: number, socialInsuranceRatio: number) => void
  /** 辞退员工并按赔偿系数扣款；赔偿不足会提高后续风险。 */
  fireEmployee: (employeeId: string, compensationRatio: number) => void
  /** 对员工当前状态执行管理动作，例如提醒、警告或罚款。 */
  applyEmployeeDiscipline: (employeeId: string, action: EmployeeDisciplineAction, fineRatio?: number) => void
  /** 将指定邮件标记为已读。 */
  markMailRead: (mailId: string) => void
  /** 将全部邮件标记为已读。 */
  markAllMailRead: () => void
  /** 导出当前局面的 JSON 存档，只包含 GameState 数据，不包含 Zustand action 函数。 */
  exportSaveJson: () => string
  /** 生成当前局面的默认存档文件名，包含游戏日和导出时间。 */
  getSaveFileName: () => string
  /** 从 JSON 存档恢复 GameState；会保留 store action 函数并覆盖当前局面。 */
  loadSaveJson: (json: string) => void
  /** 获取指定游戏日的财务报表。 */
  getFinanceReport: (day: number) => FinanceReport | undefined
  /** 获取昨天的财务报表，供“查看昨日收支”入口使用。 */
  getYesterdayFinanceReport: () => FinanceReport | undefined
}

function toGameState(state: GameStore): GameState {
  return {
    settings: state.settings,
    time: state.time,
    money: state.money,
    employees: state.employees,
    resumes: state.resumes,
    laborContracts: state.laborContracts,
    projectContracts: state.projectContracts,
    clientRelations: state.clientRelations,
    pendingProjectClientEvents: state.pendingProjectClientEvents,
    pendingLaborClientNotices: state.pendingLaborClientNotices,
    events: state.events,
    financeRecords: state.financeRecords,
    financeReports: state.financeReports,
    mailbox: state.mailbox,
    pendingArbitrations: state.pendingArbitrations,
    market: state.market,
    tutorial: state.tutorial,
    rngSeed: state.rngSeed,
    nextId: state.nextId,
  }
}

export const useGameStore = create<GameStore>((set, get) => ({
  ...createInitialGameState(),
  startGame: (options) =>
    // skipTutorial 只影响新局生成：关闭教学保底资源和 UI 引导，不会改变普通合同/简历刷新规则。
    set(() => createInitialGameState(undefined, { tutorialEnabled: !options?.skipTutorial })),
  resetGame: () => set(() => createInitialGameState()),
  setSpeed: (speed) => set((state) => setSpeed(toGameState(state), speed)),
  setOffWorkHour: (hour) => set((state) => syncTutorialProgress(setOffWorkHour(toGameState(state), hour))),
  tick: (realDeltaMs) => set((state) => syncTutorialProgress(advanceGameTime(toGameState(state), realDeltaMs))),
  refreshResumes: () => set((state) => refreshResumes(toGameState(state))),
  sendOffer: (resumeId, salaryPerDay, socialInsuranceRatio) =>
    set((state) => syncTutorialProgress(sendOffer(toGameState(state), resumeId, salaryPerDay, socialInsuranceRatio))),
  acceptLaborContract: (contractId) =>
    set((state) => syncTutorialProgress(acceptLaborContract(toGameState(state), contractId))),
  assignEmployeeToLabor: (employeeId, contractId, mode) =>
    set((state) => syncTutorialProgress(assignEmployeeToLabor(toGameState(state), employeeId, contractId, mode))),
  acceptProjectContract: (projectId) =>
    set((state) => syncTutorialProgress(acceptProjectContract(toGameState(state), projectId))),
  assignEmployeeToProject: (employeeId, projectId, role, mode) =>
    set((state) => syncTutorialProgress(assignEmployeeToProject(toGameState(state), employeeId, projectId, role, mode))),
  breachProjectContract: (projectId) =>
    set((state) => breachProjectContract(toGameState(state), projectId)),
  resolveProjectClientEvent: (eventId, optionId) =>
    set((state) => syncTutorialProgress(resolveProjectClientEvent(toGameState(state), eventId, optionId))),
  resolveLaborClientNotice: (noticeId, replacementEmployeeId, mode) =>
    set((state) => syncTutorialProgress(resolveLaborClientNotice(toGameState(state), noticeId, replacementEmployeeId, mode))),
  renameEmployee: (employeeId, nickname) =>
    set((state) => renameEmployee(toGameState(state), employeeId, nickname)),
  updateEmployeeCompensation: (employeeId, salaryPerDay, socialInsuranceRatio) =>
    set((state) =>
      updateEmployeeCompensation(toGameState(state), employeeId, salaryPerDay, socialInsuranceRatio),
    ),
  fireEmployee: (employeeId, compensationRatio) =>
    set((state) => fireEmployee(toGameState(state), employeeId, compensationRatio)),
  applyEmployeeDiscipline: (employeeId, action, fineRatio) =>
    set((state) =>
      markTutorialEmployeeStatusHandled(
        applyEmployeeDiscipline(toGameState(state), employeeId, action, fineRatio),
        employeeId,
      ),
    ),
  markMailRead: (mailId) => set((state) => syncTutorialProgress(markMailRead(toGameState(state), mailId))),
  markAllMailRead: () => set((state) => syncTutorialProgress(markAllMailRead(toGameState(state)))),
  exportSaveJson: () => createGameSaveJson(toGameState(get())),
  getSaveFileName: () => createGameSaveFileName(toGameState(get())),
  loadSaveJson: (json) => set(() => syncTutorialProgress(parseGameSaveJson(json), false)),
  getFinanceReport: (day) => getFinanceReport(toGameState(get()), day),
  getYesterdayFinanceReport: () => getYesterdayFinanceReport(toGameState(get())),
}))
