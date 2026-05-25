import { useState } from 'react'

import type { SkillRole } from '../../game/types'
import { clampNumber, schoolLabels, skillClaimsText } from '../../game/ui'
import { useGameStore } from '../../store/gameStore'
import {
  button,
  dialogPanel,
  eyebrow,
  formGrid,
  inlineActions,
  input,
  panel,
  panelHeader,
  panelTitle,
  table,
  tableWrap,
} from '../../styles/tw'
import { money } from '../../utils'

export function RecruitingPanel() {
  const resumes = useGameStore((state) => state.resumes)
  const market = useGameStore((state) => state.market)
  const refreshResumes = useGameStore((state) => state.refreshResumes)
  const sendOffer = useGameStore((state) => state.sendOffer)
  const [forms, setForms] = useState<Record<string, { salary: string; social: string }>>({})

  function updateForm(resumeId: string, patch: Partial<{ salary: string; social: string }>) {
    setForms((current) => ({
      ...current,
      [resumeId]: {
        salary: current[resumeId]?.salary ?? '',
        social: current[resumeId]?.social ?? '100',
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
              const form = forms[resume.id]
              const salary = form?.salary || String(resume.expectedSalaryPerDay)
              const social = form?.social || '100'
              return (
                <tr key={resume.id}>
                  <td>{resume.name}</td>
                  <td>{schoolLabels[resume.school]} · {resume.workYears} 年</td>
                  <td>{skillClaimsText(resume.resumeSkills as { role: SkillRole; level: string }[])}</td>
                  <td>{money(resume.expectedSalaryPerDay)}</td>
                  <td>{resume.introduction}</td>
                  <td>
                    <div className={formGrid}>
                      <input
                        className={input}
                        aria-label={`${resume.name} offer 日薪`}
                        name={`offer-salary-${resume.id}`}
                        type="number"
                        value={salary}
                        min={0}
                        onChange={(event) => updateForm(resume.id, { salary: event.target.value })}
                      />
                      <input
                        className={input}
                        aria-label={`${resume.name} 社保比例`}
                        name={`offer-social-${resume.id}`}
                        type="number"
                        value={social}
                        min={0}
                        max={100}
                        onChange={(event) => updateForm(resume.id, { social: event.target.value })}
                      />
                      <button
                        type="button"
                        className={button}
                        onClick={() =>
                          sendOffer(
                            resume.id,
                            clampNumber(salary, resume.expectedSalaryPerDay),
                            clampNumber(social, 100) / 100,
                          )
                        }
                      >
                        发 Offer
                      </button>
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
