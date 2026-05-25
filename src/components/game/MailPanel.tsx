import { useMemo } from 'react'

import { formatTime } from '../../game/ui'
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
} from '../../styles/tw'

export function MailPanel() {
  const mailbox = useGameStore((state) => state.mailbox)
  const markMailRead = useGameStore((state) => state.markMailRead)
  const markAllMailRead = useGameStore((state) => state.markAllMailRead)
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
              {recentMail.map((mail) => (
                <tr key={mail.id} className={mail.read ? undefined : 'bg-[rgba(180,81,70,0.12)]'}>
                  <td>第 {mail.day} 天 {formatTime(mail.minute)}</td>
                  <td>{mail.from}</td>
                  <td>{mail.subject}</td>
                  <td>{mail.type}</td>
                  <td>{mail.read ? '已读' : '未读'}</td>
                  <td>{mail.body}</td>
                  <td>
                    <button type="button" className={button} disabled={mail.read} onClick={() => markMailRead(mail.id)}>
                      已读
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
