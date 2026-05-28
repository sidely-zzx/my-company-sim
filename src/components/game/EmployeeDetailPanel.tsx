import { useState } from 'react'

import {
  assignmentText,
  employeeStatusLabels,
  pendingAssignmentText,
  percent,
  progressTone,
  roleLabels,
  schoolLabels,
  skillClaimsText,
  skillRoles,
} from '../../game/ui'
import type { AssignmentMode, Employee, LaborContract, ProjectContract, SkillRole } from '../../game/types'
import { amountNegative, amountPositive, button, cn, emptyState, progressFill, progressToneClass, progressTrack } from '../../styles/tw'
import { money } from '../../utils'
import { Input } from '../ui/input'
import { CompensationSettings, type CompensationFormState } from './CompensationSettings'
import { EmployeeAssignmentControl } from './EmployeeAssignmentControl'
import { FireCompensationControl } from './FireCompensationControl'

export type EmployeeCompensationFormState = CompensationFormState

interface EmployeeDetailPanelProps {
  employee: Employee
  laborContracts: LaborContract[]
  projectContracts: ProjectContract[]
  nickname: string
  fireCompensationRatio: string
  compensationForm: EmployeeCompensationFormState
  onBack: () => void
  onNicknameChange: (value: string) => void
  onRename: () => void
  onFireCompensationRatioChange: (value: string) => void
  onFire: () => void
  onCompensationFormChange: (patch: Partial<EmployeeCompensationFormState>) => void
  onSaveCompensation: (salaryPerDay: number, socialInsuranceRatio: number) => void
  onAssignToLabor: (employeeId: string, contractId: string, mode: AssignmentMode) => void
  onAssignToProject: (employeeId: string, projectId: string, role: SkillRole, mode: AssignmentMode) => void
  backLabel?: string
}

function DetailStat({ label, value, tone }: { label: string; value: string; tone?: 'positive' | 'negative' }) {
  return (
    <div className="rounded-md border border-[#303834] bg-[#171c1b] p-3">
      <span className="block text-xs font-extrabold text-[#aaa48f]">{label}</span>
      <strong className={cn('mt-1 block text-[15px] text-[#efe2c8]', tone === 'positive' && amountPositive, tone === 'negative' && amountNegative)}>
        {value}
      </strong>
    </div>
  )
}

export function EmployeeDetailPanel({
  employee,
  laborContracts,
  projectContracts,
  nickname,
  fireCompensationRatio,
  compensationForm,
  onBack,
  onNicknameChange,
  onRename,
  onFireCompensationRatioChange,
  onFire,
  onCompensationFormChange,
  onSaveCompensation,
  onAssignToLabor,
  onAssignToProject,
  backLabel = '返回列表',
}: EmployeeDetailPanelProps) {
  const isFired = employee.status === 'fired'
  const [isEditingNickname, setIsEditingNickname] = useState(false)
  const displayNickname = employee.nickname || '未设置花名'

  function saveNickname() {
    onRename()
    setIsEditingNickname(false)
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3 pr-10">
        <div className="grid min-w-[320px] gap-2 max-[560px]:min-w-0">
          <p className="m-0 text-xs font-extrabold text-[#aaa48f]">员工详情</p>
          <div className="flex max-w-[760px] flex-wrap items-center gap-2">
            <h2 className="m-0 text-[22px] text-[#efe2c8]">{employee.name}</h2>
            {isEditingNickname ? (
              <>
                <label className="text-[13px] font-extrabold text-[#d4cbb6]" htmlFor={`detail-nickname-${employee.id}`}>
                  花名
                </label>
                <Input
                  id={`detail-nickname-${employee.id}`}
                  className="w-52 max-[560px]:w-full"
                  aria-label={`${employee.name} 花名`}
                  name={`detail-nickname-${employee.id}`}
                  value={nickname}
                  placeholder={employee.nickname || employee.name}
                  onChange={(event) => onNicknameChange(event.target.value)}
                />
                <button type="button" className={button} onClick={saveNickname}>
                  保存花名
                </button>
              </>
            ) : (
              <>
                <span className="rounded-md border border-[#303834] bg-[#171c1b] px-2.5 py-1 text-[13px] font-extrabold text-[#d4cbb6]">
                  花名：{displayNickname}
                </span>
                <button type="button" className={button} onClick={() => setIsEditingNickname(true)}>
                  修改花名
                </button>
              </>
            )}
          </div>
          <p className="m-0 mt-1 text-[13px] text-[#9aa29a]">
            {schoolLabels[employee.school]} · 入职 {employee.workDays} 天
          </p>
        </div>
        <button type="button" className={button} onClick={onBack}>
          {backLabel}
        </button>
      </div>

      <div className="grid grid-cols-4 gap-2.5 max-[900px]:grid-cols-2 max-[560px]:grid-cols-1">
        <DetailStat label="状态" value={employeeStatusLabels[employee.status]} />
        <DetailStat label="满意度" value={`${employee.satisfaction}`} tone={employee.satisfaction >= 60 ? 'positive' : 'negative'} />
        <DetailStat label="日薪" value={money(employee.salaryPerDay)} />
        <DetailStat label="社保公积金" value={percent(employee.socialInsuranceRatio)} />
      </div>

      {/* <div className="grid grid-cols-[1.2fr_0.8fr] gap-3 max-[900px]:grid-cols-1">
        <section className="grid gap-3 rounded-md border border-[#303834] bg-[rgba(12,15,15,0.5)] p-4">
          <div>
            <h3 className="m-0 text-[16px] text-[#efe2c8]">能力与安排</h3>
            <p className="m-0 mt-1 text-xs font-extrabold text-[#aaa48f]">{skillClaimsText(employee.resumeSkills)}</p>
          </div>
          <div className="grid gap-2">
            {skillRoles.map((role) => {
              const ability = employee.realSkillAbilities[role] ?? 0
              return (
                <div key={role} className="grid grid-cols-[64px_minmax(0,1fr)_42px] items-center gap-2 text-[13px]">
                  <span className="font-extrabold text-[#d8cfbb]">{roleLabels[role]}</span>
                  <div className={progressTrack}>
                    <i className={cn(progressFill, progressToneClass[progressTone(ability)])} style={{ width: `${Math.min(100, Math.max(0, ability))}%` }} />
                  </div>
                  <strong className="text-right text-[#efe2c8]">{ability}</strong>
                </div>
              )
            })}
          </div>
          <div className="grid gap-2 text-[13px] text-[#d8cfbb]">
            <p className="m-0 rounded-md border border-[#303834] bg-[#171c1b] p-3">
              当前分配：{assignmentText(employee, laborContracts, projectContracts)}
            </p>
            <p className="m-0 rounded-md border border-[#303834] bg-[#171c1b] p-3">
              后续安排：{pendingAssignmentText(employee, laborContracts, projectContracts)}
            </p>
          </div>
        </section>

        <section className="grid gap-3 rounded-md border border-[#303834] bg-[rgba(12,15,15,0.5)] p-4">
          <h3 className="m-0 text-[16px] text-[#efe2c8]">风险属性</h3>
          <div className="grid gap-2">
            <DetailStat label="精力" value={`${employee.energy}`} tone={employee.energy >= 60 ? 'positive' : 'negative'} />
            <DetailStat label="忠诚度" value={`${employee.loyalty}`} tone={employee.loyalty >= 60 ? 'positive' : 'negative'} />
            <DetailStat label="压力" value={`${employee.pressure}`} tone={employee.pressure >= 65 ? 'negative' : undefined} />
            <DetailStat label="自律" value={`${employee.discipline}`} tone={employee.discipline >= 60 ? 'positive' : 'negative'} />
            <DetailStat label="进取心" value={`${employee.ambition}`} />
            <DetailStat label="仲裁倾向" value={`${employee.arbitrationTendency}`} tone={employee.arbitrationTendency >= 60 ? 'negative' : undefined} />
            <DetailStat label="摸鱼倾向" value={percent(employee.slackingTendency)} tone={employee.slackingTendency >= 0.45 ? 'negative' : undefined} />
            <DetailStat label="行为种子" value={`${employee.behaviorSeed}`} />
          </div>
        </section>
      </div> */}

      <EmployeeAssignmentControl
        employee={employee}
        laborContracts={laborContracts}
        projectContracts={projectContracts}
        onAssignToLabor={onAssignToLabor}
        onAssignToProject={onAssignToProject}
      />

      <div className="grid grid-cols-2 gap-3 max-[900px]:grid-cols-1">
        <section className="grid gap-3 rounded-md border border-[#303834] bg-[rgba(12,15,15,0.5)] p-4">
          <h3 className="m-0 text-[16px] text-[#efe2c8]">离职操作</h3>
          <FireCompensationControl
            employee={employee}
            ratio={fireCompensationRatio}
            disabled={isFired}
            onRatioChange={onFireCompensationRatioChange}
            onFire={onFire}
          />
        </section>

        <section className="grid gap-4 rounded-md border border-[#303834] bg-[rgba(12,15,15,0.5)] p-4">
          <h3 className="m-0 text-[16px] text-[#efe2c8]">薪酬设置</h3>
          {isFired ? (
            <p className={emptyState}>已离职员工不能调整薪酬。</p>
          ) : (
            <CompensationSettings
              id={`detail-${employee.id}`}
              personName={employee.name}
              value={compensationForm}
              salaryBase={employee.salaryPerDay}
              salaryLabel="日薪"
              costLabel="每日总人工成本"
              onChange={onCompensationFormChange}
              footer={(summary) => (
                <div className="flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    className={button}
                    onClick={() => onSaveCompensation(summary.salaryPerDay, summary.socialInsuranceRatio)}
                  >
                    保存薪酬
                  </button>
                </div>
              )}
            />
          )}
        </section>
      </div>
    </div>
  )
}
