import {
  laborStatusLabels,
  roleLabels,
  urgencyLabels,
  levelLabels,
} from '../../game/ui'
import { isCurrentTutorialNode, isStarterLaborContract } from '../../game/systems/tutorialSystem'
import { useGameStore } from '../../store/gameStore'
import { LaborDetailDialog } from './LaborDetailDialog'
import {
  button,
  cn,
  dialogPanel,
  eyebrow,
  panel,
  panelHeader,
  panelTitle,
  inlineActions,
  table,
  tableWrap,
  tutorialBadge,
  tutorialRow,
  tutorialTarget,
} from '../../styles/tw'
import { money, levelFromAbility } from '../../utils'

export function LaborPanel() {
  const laborContracts = useGameStore((state) => state.laborContracts)
  const employees = useGameStore((state) => state.employees)
  const tutorial = useGameStore((state) => state.tutorial)
  const acceptLaborContract = useGameStore((state) => state.acceptLaborContract)

  return (
    <section className={`${panel} ${dialogPanel}`}>
      <div className={panelHeader}>
        <div>
          <p className={eyebrow}>人力外包</p>
          <h2 className={panelTitle}>驻场合同</h2>
        </div>
      </div>
      {isCurrentTutorialNode(tutorial, 'review_labor_contract', 'assign_employee') ? (
        <div className="mb-3 rounded-md border border-[#b59d65] bg-[#2d281f] p-3 text-sm text-[#ead7aa]">
          <strong className="block text-[#ffe0a3]">
            {isCurrentTutorialNode(tutorial, 'review_labor_contract') ? '当前指引：签下推荐第一单' : '当前指引：进入推荐合同详情安排员工'}
          </strong>
          <span className="mt-1 block text-xs leading-5 text-[#d8cfbb]">
            选择带有「推荐第一单」标记的合同。签约后在详情页右侧员工列表中安排驻场人员。
          </span>
        </div>
      ) : null}
      <div className={tableWrap}>
        <table className={table}>
          <thead>
            <tr>
              <th>合同</th>
              <th>需求</th>
              <th>预算</th>
              <th>服务期</th>
              <th>状态</th>
              <th>满意度</th>
              <th>分配员工</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {laborContracts.map((contract) => {
              const assigned = employees.find((employee) => employee.id === contract.assignedEmployeeId)
              const starterContract = isStarterLaborContract({ tutorial }, contract.id) && !tutorial.completed
              return (
                <tr
                  key={contract.id}
                  data-tutorial-anchor={starterContract ? 'starter-labor-row' : undefined}
                  className={starterContract ? tutorialRow : undefined}
                >
                  <td>
                    <strong>{contract.title}</strong>
                    {starterContract ? (
                      <small><span className={tutorialBadge}>推荐第一单</span></small>
                    ) : null}
                    <small>{contract.clientName}</small>
                  </td>
                  <td>{levelLabels[levelFromAbility(contract.requiredAbility)]} · {roleLabels[contract.requiredRole]}</td>
                  <td>{money(contract.dailyBudget)}/天</td>
                  <td>
                    {urgencyLabels[contract.urgency]} · {contract.durationDays} 天
                    <small>第 {contract.endDay} 天到期</small>
                  </td>
                  <td>{laborStatusLabels[contract.status]}</td>
                  <td>
                    {contract.satisfaction}
                    <small>
                      今日 {Math.round(contract.todayOutput)} / {Math.round(contract.todayRequiredOutput)}
                    </small>
                  </td>
                  <td>
                    {assigned ? (
                      <>
                        <strong>{assigned.nickname || assigned.name}</strong>
                        <small>
                          {roleLabels[contract.requiredRole]}能力 {assigned.realSkillAbilities[contract.requiredRole] ?? 0}
                          {' / '}
                          要求 {contract.requiredAbility}
                        </small>
                      </>
                    ) : '未分配'}
                  </td>
                  <td>
                    <div className={inlineActions}>
                      <LaborDetailDialog
                        contract={contract}
                        trigger={(
                          <button
                            type="button"
                            data-tutorial-anchor={starterContract ? 'starter-labor-detail-button' : undefined}
                            className={button}
                          >
                            详情
                          </button>
                        )}
                      />
                      {contract.status === 'available' && (
                        <button
                          type="button"
                          data-tutorial-anchor={starterContract ? 'starter-labor-sign-button' : undefined}
                          className={cn(button, starterContract && cn('animate-pulse', tutorialTarget))}
                          onClick={() => acceptLaborContract(contract.id)}
                        >
                          签约
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
