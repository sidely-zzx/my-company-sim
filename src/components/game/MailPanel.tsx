import { useMemo } from 'react'

import { formatTime } from '../../game/ui'
import { getTutorialMailKind } from '../../game/systems/tutorialSystem'
import { useGameStore } from '../../store/gameStore'
import {
  button,
  cn,
  dialogPanel,
  emptyState,
  eyebrow,
  panel,
  panelHeader,
  panelTitle,
  table,
  tableWrap,
  tutorialRow,
  tutorialTarget,
} from '../../styles/tw'

export function MailPanel() {
  const mailbox = useGameStore((state) => state.mailbox)
  const tutorial = useGameStore((state) => state.tutorial)
  const markMailRead = useGameStore((state) => state.markMailRead)
  const markAllMailRead = useGameStore((state) => state.markAllMailRead)
  const openDailyBriefing = useGameStore((state) => state.openDailyBriefing)
  const recentMail = useMemo(() => mailbox.slice(-12).reverse(), [mailbox])

  return (
    <section className={cn(panel, dialogPanel)}>
      <div className={panelHeader}>
        <div>
          <p className={eyebrow}>邮件</p>
          <h2 className={panelTitle}>邮箱通知</h2>
        </div>
        <button type="button" className={button} onClick={markAllMailRead}>全部已读</button>
      </div>
      {recentMail.length === 0 ? (
        <p className={emptyState}>暂无邮件。</p>
      ) : (
        <div className={tableWrap}>
          <table className={table}>
            <thead>
              <tr>
                <th>时间</th>
                <th>发件方</th>
                <th>主题</th>
                <th>类型</th>
                <th>状态</th>
                <th>正文</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {recentMail.map((mail) => {
                const tutorialMailKind = getTutorialMailKind(tutorial, mail.id)
                const welcomeMail = tutorialMailKind === 'welcome'
                const projectMail = tutorialMailKind === 'project'
                const tutorialMail = welcomeMail || projectMail
                return (
                <tr
                  key={mail.id}
                  data-tutorial-anchor={welcomeMail ? 'welcome-mail-row' : projectMail ? 'project-mail-row' : undefined}
                  className={tutorialMail ? tutorialRow : mail.read ? undefined : 'bg-[rgba(180,81,70,0.12)]'}
                >
                  <td>第 {mail.day} 天 {formatTime(mail.minute)}</td>
                  <td>{mail.from}</td>
                  <td>
                    {mail.subject}
                    {welcomeMail ? <small className="mt-1 block font-extrabold text-[#e4b45b]">教学第一步：阅读后待办会推进</small> : null}
                    {projectMail ? <small className="mt-1 block font-extrabold text-[#e4b45b]">项目教学：阅读后解锁推荐项目目标</small> : null}
                  </td>
                  <td>{mail.type}</td>
                  <td>{mail.read ? '已读' : '未读'}</td>
                  <td>{mail.body}</td>
                  <td>
                    <div className="flex flex-wrap gap-2">
                      {mail.type === 'daily_finance_report' ? (
                        <button
                          type="button"
                          className={button}
                          onClick={() => {
                            openDailyBriefing(mail.day)
                            markMailRead(mail.id)
                          }}
                        >
                          查看日报
                        </button>
                      ) : null}
                      <button
                        type="button"
                        data-tutorial-anchor={welcomeMail ? 'welcome-mail-action' : projectMail ? 'project-mail-action' : undefined}
                        className={cn(button, tutorialMail && !mail.read && cn('animate-pulse', tutorialTarget))}
                        disabled={mail.read}
                        onClick={() => markMailRead(mail.id)}
                      >
                        已读
                      </button>
                    </div>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
