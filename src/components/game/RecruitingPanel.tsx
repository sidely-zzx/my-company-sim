import { useState } from 'react'

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog'
import type { Resume, SkillRole } from '../../game/types'
import { schoolLabels, skillClaimsText } from '../../game/ui'
import { useGameStore } from '../../store/gameStore'
import { CompensationSettings, type CompensationFormState } from './CompensationSettings'
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

type OfferFormState = CompensationFormState

interface OfferDialogProps {
  resume: Resume
  form: OfferFormState
  onUpdateForm: (resumeId: string, patch: Partial<OfferFormState>) => void
  onSendOffer: (resumeId: string, salaryPerDay: number, socialInsuranceRatio: number) => void
}

function OfferDialog({ resume, form, onUpdateForm, onSendOffer }: OfferDialogProps) {
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

        <CompensationSettings
          id={`offer-${resume.id}`}
          personName={resume.name}
          value={form}
          salaryBase={resume.expectedSalaryPerDay}
          salaryLabel="Offer 日薪"
          costLabel="总支出（工资 + 社保支出）"
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
                  className={button}
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
  )
}
