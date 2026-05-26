import { useState } from 'react'
import { CircleHelp } from 'lucide-react'

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog'
import { Slider } from '../ui/slider'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip'
import { SOCIAL_INSURANCE_COMPANY_RATE } from '../../game/constants'
import type { Resume, SkillRole } from '../../game/types'
import { clampNumber, schoolLabels, skillClaimsText } from '../../game/ui'
import { useGameStore } from '../../store/gameStore'
import {
  button,
  dialogPanel,
  eyebrow,
  inlineActions,
  panel,
  panelHeader,
  panelTitle,
  table,
  tableWrap,
} from '../../styles/tw'
import { money } from '../../utils'

const SOCIAL_INSURANCE_TIP =
  '法律规定社保基数为实际工资，实际工资*26%社保+实际工资*12%公积金。如果未足额缴纳员工投诉举报后要双倍补缴'

interface OfferFormState {
  salary: string
  socialPercent: number
}

interface OfferDialogProps {
  resume: Resume
  form: OfferFormState
  onUpdateForm: (resumeId: string, patch: Partial<OfferFormState>) => void
  onSendOffer: (resumeId: string, salaryPerDay: number, socialInsuranceRatio: number) => void
}

function OfferDialog({ resume, form, onUpdateForm, onSendOffer }: OfferDialogProps) {
  const salaryPerDay = Math.max(0, clampNumber(form.salary, resume.expectedSalaryPerDay))
  const socialPercent = form.socialPercent
  const socialInsuranceCost = Math.round(
    // 社保公积金支出受工资和缴纳比例影响，并会影响入职后的每日现金流。
    salaryPerDay * (socialPercent / 100) * SOCIAL_INSURANCE_COMPANY_RATE,
  )
  const totalCost = salaryPerDay + socialInsuranceCost

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button type="button" className={button}>发 Offer</button>
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
        </div>

        <div className="mt-5 grid gap-4 border-t border-[#303834] pt-4">
          <label className="grid gap-1.5 text-[13px] font-extrabold text-[#d4cbb6]">
            Offer 日薪
            <input
              className="min-h-8 w-full rounded-md border border-[#4b514d] bg-[#171c1b] px-2 text-[#e8ddc7]"
              aria-label={`${resume.name} offer 日薪`}
              name={`offer-salary-${resume.id}`}
              type="number"
              value={form.salary}
              min={0}
              onChange={(event) => onUpdateForm(resume.id, { salary: event.target.value })}
            />
          </label>

          <div className="grid gap-2">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 text-[13px] font-extrabold text-[#d4cbb6]">
                <span>社保公积金 {socialPercent}%</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      aria-label="社保公积金说明"
                    >
                      <CircleHelp className="size-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>{SOCIAL_INSURANCE_TIP}</TooltipContent>
                </Tooltip>
              </div>
              <strong className="text-[#efe2c8]">{socialPercent}%</strong>
            </div>
            <Slider
              aria-label={`${resume.name} 社保比例`}
              name={`offer-social-${resume.id}`}
              min={0}
              max={100}
              step={1}
              value={[socialPercent]}
              onValueChange={(value) =>
                onUpdateForm(resume.id, {
                  salary: form.salary,
                  socialPercent: value[0] ?? 0,
                })
              }
            />
          </div>

          <div className="grid gap-1.5 rounded-md border border-[#303834] bg-[#171c1b] p-3 text-[13px]">
            <span className="text-[#d8cfbb]">
              社保支出：{socialPercent * Number(form.salary) / 100} * 38% = {money(socialInsuranceCost)}
            </span>
            <strong className="text-[#efe2c8]">总支出（工资 + 社保支出）：{money(totalCost)}</strong>
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <DialogClose asChild>
              <button type="button" className={button}>取消</button>
            </DialogClose>
            <DialogClose asChild>
              <button
                type="button"
                className={button}
                onClick={() => onSendOffer(resume.id, salaryPerDay, socialPercent / 100)}
              >
                确认发送
              </button>
            </DialogClose>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function RecruitingPanel() {
  const resumes = useGameStore((state) => state.resumes)
  const market = useGameStore((state) => state.market)
  const refreshResumes = useGameStore((state) => state.refreshResumes)
  const sendOffer = useGameStore((state) => state.sendOffer)
  const [forms, setForms] = useState<Record<string, OfferFormState>>({})

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
    <TooltipProvider>
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
                return (
                  <tr key={resume.id}>
                    <td>{resume.name}</td>
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
    </TooltipProvider>
  )
}
