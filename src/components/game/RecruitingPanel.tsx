import { useState } from 'react'

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog'
import type { LaborContract, Resume, SkillRole } from '../../game/types'
import { roleLabels, schoolLabels, skillClaimsText } from '../../game/ui'
import {
  TUTORIAL_OFFER_LIMITS,
  getStarterLaborContract,
  isCurrentTutorialNode,
  isStarterLaborResume,
  isStarterProjectResume,
  isStarterResume,
  type TutorialAnchorId,
} from '../../game/systems/tutorialSystem'
import { useGameStore } from '../../store/gameStore'
import { CompensationSettings, getCompensationSummary, type CompensationFormState } from './CompensationSettings'
import {
  button,
  cn,
  dialogPanel,
  eyebrow,
  inlineActions,
  panel,
  panelHeader,
  panelTitle,
  table,
  tableWrap,
  tutorialBadge,
  tutorialRow,
  tutorialTarget,
} from '../../styles/tw'
import { money } from '../../utils'

type OfferFormState = CompensationFormState

interface OfferDialogProps {
  resume: Resume
  form: OfferFormState
  starterContract?: LaborContract
  starterResume: boolean
  starterProjectResume: boolean
  tutorialAnchor?: TutorialAnchorId
  confirmTutorialAnchor?: TutorialAnchorId
  onUpdateForm: (resumeId: string, patch: Partial<OfferFormState>) => void
  onSendOffer: (resumeId: string, salaryPerDay: number, socialInsuranceRatio: number) => void
}

function OfferDialog({ resume, form, starterContract, starterResume, starterProjectResume, tutorialAnchor, confirmTutorialAnchor, onUpdateForm, onSendOffer }: OfferDialogProps) {
  const offerLimits = starterResume ? TUTORIAL_OFFER_LIMITS : undefined
  const compensationSummary = getCompensationSummary(form, resume.expectedSalaryPerDay, offerLimits)
  const estimatedDailyCost = compensationSummary.totalCost
  const starterSkill = starterContract
    ? resume.resumeSkills.find((skill) => skill.role === starterContract.requiredRole)
    : undefined
  const starterGrossProfit = starterContract ? starterContract.dailyBudget - estimatedDailyCost : 0

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          data-tutorial-anchor={tutorialAnchor}
          className={cn(button, starterResume && cn('animate-pulse', tutorialTarget))}
        >
          发 Offer
        </button>
      </DialogTrigger>
      <DialogContent className="w-[min(calc(100vw-32px),640px)]">
        <DialogTitle>发送 Offer：{resume.name}</DialogTitle>
        <DialogDescription className="mb-4 mt-1 text-[#aab0a8]">
          核对候选人信息并设置入职成本。
        </DialogDescription>

        <div className="grid gap-3 text-[13px] text-[#d8cfbb]">
          <div className="grid grid-cols-2 gap-2.5 max-[560px]:grid-cols-1">
            <div className="rounded-md border border-[#303834] bg-[#171c1b] p-3">
              <span className="block text-xs font-extrabold text-[#aaa48f]">背景</span>
              <strong className="mt-1 block text-[#efe2c8]">
                {schoolLabels[resume.school]} · {resume.workYears} 年
              </strong>
            </div>
            <div className="rounded-md border border-[#303834] bg-[#171c1b] p-3">
              <span className="block text-xs font-extrabold text-[#aaa48f]">期望日薪</span>
              <strong className="mt-1 block text-[#efe2c8]">{money(resume.expectedSalaryPerDay)}</strong>
            </div>
          </div>

          <div className="rounded-md border border-[#303834] bg-[#171c1b] p-3">
            <span className="block text-xs font-extrabold text-[#aaa48f]">简历技能</span>
            <strong className="mt-1 block text-[#efe2c8]">
              {skillClaimsText(resume.resumeSkills as { role: SkillRole; level: string }[])}
            </strong>
          </div>

          <p className="m-0 rounded-md border border-[#303834] bg-[#171c1b] p-3 text-[#d8cfbb]">
            {resume.introduction}
          </p>

          {starterContract ? (
            <div className={cn(
              'grid gap-2 rounded-md border bg-[#171c1b] p-3',
              starterResume ? 'border-[#7f6840]' : 'border-[#303834]',
            )}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <strong className="text-[#efe2c8]">推荐合同匹配</strong>
                {starterResume ? <span className="text-xs font-extrabold text-[#e4b45b]">保底候选人 · Offer 必定接受</span> : null}
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-[#d8cfbb] max-[560px]:grid-cols-1">
                <span>岗位：{starterSkill ? `匹配 ${roleLabels[starterContract.requiredRole]}` : `不匹配 ${roleLabels[starterContract.requiredRole]}`}</span>
                <span>简历等级：{starterSkill?.level ?? '无对应技能'} / 要求能力 {starterContract.requiredAbility}</span>
                <span>预计日成本：{money(estimatedDailyCost)}</span>
                <span className={cn(starterGrossProfit >= 0 ? 'text-[#92d16e]' : 'text-[#ff7968]')}>
                  预计毛利：{starterGrossProfit >= 0 ? '+' : ''}{money(starterGrossProfit)}
                </span>
              </div>
            </div>
          ) : null}

          {starterProjectResume ? (
            <div className="grid gap-2 rounded-md border border-[#7f6840] bg-[#171c1b] p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <strong className="text-[#efe2c8]">项目教学候选人</strong>
                <span className="text-xs font-extrabold text-[#e4b45b]">Offer 必定接受</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-[#d8cfbb] max-[560px]:grid-cols-1">
                <span>覆盖岗位：{skillClaimsText(resume.resumeSkills as { role: SkillRole; level: string }[])}</span>
                <span>预计日成本：{money(estimatedDailyCost)}</span>
              </div>
            </div>
          ) : null}
        </div>

        <CompensationSettings
          id={`offer-${resume.id}`}
          personName={resume.name}
          value={form}
          salaryBase={resume.expectedSalaryPerDay}
          salaryLabel="Offer 日薪"
          costLabel="总支出（工资 + 社保支出）"
          limits={offerLimits}
          limitHint={starterResume ? '教学期只允许小幅调整推荐候选人的日薪和社保；确认发送后候选人会接受 Offer。' : undefined}
          className="mt-5 border-t border-[#303834] pt-4"
          onChange={(patch) => onUpdateForm(resume.id, patch)}
          footer={(summary) => (
            <div className="flex flex-wrap justify-end gap-2">
              <DialogClose asChild>
                <button type="button" className={button}>取消</button>
              </DialogClose>
              <DialogClose asChild>
                <button
                  type="button"
                  data-tutorial-anchor={confirmTutorialAnchor}
                  className={cn(button, confirmTutorialAnchor && tutorialTarget)}
                  onClick={() => onSendOffer(resume.id, summary.salaryPerDay, summary.socialInsuranceRatio)}
                >
                  确认发送
                </button>
              </DialogClose>
            </div>
          )}
        />
      </DialogContent>
    </Dialog>
  )
}

export function RecruitingPanel() {
  const resumes = useGameStore((state) => state.resumes)
  const market = useGameStore((state) => state.market)
  const laborContracts = useGameStore((state) => state.laborContracts)
  const tutorial = useGameStore((state) => state.tutorial)
  const refreshResumes = useGameStore((state) => state.refreshResumes)
  const sendOffer = useGameStore((state) => state.sendOffer)
  const [forms, setForms] = useState<Record<string, OfferFormState>>({})
  const starterContract = tutorial.enabled && !tutorial.completed
    ? getStarterLaborContract({ laborContracts, tutorial })
    : undefined

  function getForm(resume: Resume): OfferFormState {
    return forms[resume.id] ?? {
      salary: String(resume.expectedSalaryPerDay),
      socialPercent: 100,
    }
  }

  function updateForm(resumeId: string, patch: Partial<OfferFormState>) {
    setForms((current) => ({
      ...current,
      [resumeId]: {
        salary: current[resumeId]?.salary ?? '',
        socialPercent: current[resumeId]?.socialPercent ?? 100,
        ...patch,
      },
    }))
  }

  return (
    <section className={`${panel} ${dialogPanel}`}>
        <div className={panelHeader}>
          <div>
            <p className={eyebrow}>招聘</p>
            <h2 className={panelTitle}>简历市场</h2>
          </div>
          <div className={inlineActions}>
            <span>{market.resumeRefreshesUsed}/{market.resumeRefreshLimit} 次</span>
            <button type="button" className={button} onClick={refreshResumes}>刷新简历</button>
          </div>
        </div>
        {isCurrentTutorialNode(tutorial, 'send_offer') ? (
          <div className="mb-3 rounded-md border border-[#b59d65] bg-[#2d281f] p-3 text-sm text-[#ead7aa]">
            <strong className="block text-[#ffe0a3]">当前指引：给推荐候选人发 Offer</strong>
            <span className="mt-1 block text-xs leading-5 text-[#d8cfbb]">
              推荐候选人会 100% 接受教学 Offer；工资和社保只能小范围调整，用来观察成本和毛利变化。
            </span>
          </div>
        ) : null}
        {isCurrentTutorialNode(tutorial, 'hire_project_team') ? (
          <div className="mb-3 rounded-md border border-[#b59d65] bg-[#2d281f] p-3 text-sm text-[#ead7aa]">
            <strong className="block text-[#ffe0a3]">当前指引：招齐项目小队</strong>
            <span className="mt-1 block text-xs leading-5 text-[#d8cfbb]">
              5 个项目推荐候选人分别覆盖产品、设计、前端、后端和测试；教学期 Offer 会 100% 成功，并限制在小范围调薪。
            </span>
          </div>
        ) : null}
        <div className={tableWrap}>
          <table className={table}>
            <thead>
              <tr>
                <th>候选人</th>
                <th>背景</th>
                <th>技能</th>
                <th>期望日薪</th>
                <th>简介</th>
                <th>Offer</th>
              </tr>
            </thead>
            <tbody>
              {resumes.map((resume) => {
                const form = getForm(resume)
                const starterResume = isStarterResume({ tutorial }, resume.id) && !tutorial.completed
                const starterProjectResume = isStarterProjectResume({ tutorial }, resume.id) && !tutorial.completed
                const starterLaborResume = isStarterLaborResume(tutorial, resume.id) && !tutorial.completed
                const offerAnchor = starterProjectResume
                  ? 'starter-project-resume-offer-button'
                  : starterLaborResume
                    ? 'starter-resume-offer-button'
                    : undefined
                const confirmOfferAnchor = starterProjectResume
                  ? 'starter-project-resume-confirm-offer-button'
                  : starterLaborResume
                    ? 'starter-resume-confirm-offer-button'
                    : undefined
                return (
                  <tr key={resume.id} className={starterResume ? tutorialRow : undefined}>
                    <td>
                      {resume.name}
                      {starterResume ? (
                        <small>
                          <span className={tutorialBadge}>
                          {starterProjectResume ? '项目推荐候选人' : '推荐候选人'}
                          </span>
                        </small>
                      ) : null}
                    </td>
                    <td>{schoolLabels[resume.school]} · {resume.workYears} 年</td>
                    <td>{skillClaimsText(resume.resumeSkills as { role: SkillRole; level: string }[])}</td>
                    <td>{money(resume.expectedSalaryPerDay)}</td>
                    <td>{resume.introduction}</td>
                    <td>
                      {resume.offerRejected ? (
                        <strong className="block rounded-md border border-[#8f3d34] bg-[#321d1a] px-2.5 py-1.5 text-[#ff9a8d]">
                          Offer 已被拒绝
                        </strong>
                      ) : (
                        <OfferDialog
                          resume={resume}
                          form={form}
                          starterContract={starterLaborResume ? starterContract : undefined}
                          starterResume={starterResume}
                          starterProjectResume={starterProjectResume}
                          tutorialAnchor={offerAnchor}
                          confirmTutorialAnchor={confirmOfferAnchor}
                          onUpdateForm={updateForm}
                          onSendOffer={sendOffer}
                        />
                      )}
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
