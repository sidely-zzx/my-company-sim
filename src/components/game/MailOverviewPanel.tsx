import { useMemo } from 'react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog'
import { formatTime } from '../../game/ui'
import { useGameStore } from '../../store/gameStore'
import { button, cn, emptyState, srOnly, surface, tutorialTarget } from '../../styles/tw'
import { MailPanel } from './MailPanel'

export function MailOverviewPanel() {
  const mailbox = useGameStore((state) => state.mailbox)
  const tutorial = useGameStore((state) => state.tutorial)
  const markAllMailRead = useGameStore((state) => state.markAllMailRead)
  const recentMail = useMemo(() => mailbox.slice(-3).reverse(), [mailbox])
  const unreadCount = mailbox.filter((mail) => !mail.read).length
  const shouldHighlightMail = tutorial.enabled && !tutorial.completed && tutorial.currentNodeId?.includes('mail')

  return (
    <section className={cn(surface, 'min-w-0 p-3.5')} data-tutorial-anchor="dock-mail">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h2 className="m-0 text-[17px] text-[#efe2c8]">邮件通知</h2>
          <p className="m-0 mt-1 text-xs font-extrabold text-[#aeb5ac]">
            未读 {unreadCount} / 共 {mailbox.length} 封
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-1.5">
          <button
            type="button"
            className={cn(button, 'min-h-7 px-2 text-xs')}
            disabled={unreadCount === 0}
            onClick={markAllMailRead}
          >
            全部已读
          </button>
          <Dialog>
            <DialogTrigger asChild>
              <button
                type="button"
                className={cn(
                  button,
                  'min-h-7 px-2 text-xs',
                  shouldHighlightMail && cn('animate-pulse', tutorialTarget),
                )}
              >
                查看全部
              </button>
            </DialogTrigger>
            <DialogContent>
              <DialogTitle className={srOnly}>邮箱通知</DialogTitle>
              <DialogDescription className={srOnly}>查看全部邮件通知</DialogDescription>
              <MailPanel />
            </DialogContent>
          </Dialog>
        </div>
      </div>
      {recentMail.length === 0 ? (
        <p className={emptyState}>暂无邮件。</p>
      ) : (
        <ol className="m-0 grid list-none gap-2 p-0">
          {recentMail.map((mail) => (
            <li
              key={mail.id}
              className={cn(
                'rounded-md border border-[#303834] bg-[rgba(12,15,15,0.56)] p-2.5',
                !mail.read && 'border-[#b59d65] bg-[rgba(181,157,101,0.16)] shadow-[inset_3px_0_0_#b59d65]',
              )}
            >
              {/* 邮件摘要只读取邮箱数据做预览，不在右侧直接改正文或业务状态；真正的邮件处理仍走完整邮箱。 */}
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-xs font-extrabold text-[#d5c4a1]">{mail.from}</span>
                <span className="shrink-0 text-xs text-[#9aa29a]">
                  第 {mail.day} 天 {formatTime(mail.minute)}
                </span>
              </div>
              <strong className="mt-1 block truncate text-sm text-[#efe2c8]">{mail.subject}</strong>
              <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#aeb5ac]">{mail.body}</p>
              {!mail.read ? <span className="mt-1 block text-xs font-black text-[#ffe0a3]">未读</span> : null}
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
