import type { ReactNode } from 'react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog'
import type { TutorialAnchorId } from '../../game/systems/tutorialSystem'
import { button, cn, srOnly, tutorialTarget } from '../../styles/tw'

interface DockDialogProps {
  icon: string
  label: string
  badge?: number
  highlighted?: boolean
  hint?: string
  tutorialAnchor?: TutorialAnchorId
  title: string
  description: string
  children: ReactNode
}

export function DockDialog({ icon, label, badge, highlighted = false, hint, tutorialAnchor, title, description, children }: DockDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          data-tutorial-anchor={tutorialAnchor}
          className={cn(
            button,
            'relative grid min-h-[74px] justify-items-center gap-1 border-[#2c3330] bg-[#171c1b] p-2.5 text-[#e7dcc3] hover:border-[#8b7f63] hover:bg-[#252b28] focus-visible:border-[#8b7f63] focus-visible:bg-[#252b28] focus-visible:outline-none max-[900px]:min-h-[62px]',
            highlighted && cn('animate-pulse', tutorialTarget),
          )}
        >
          {highlighted ? (
            <em className="absolute -top-6 left-1/2 w-max -translate-x-1/2 rounded-md border border-[#7f6840] bg-[#2d281f] px-2 py-1 text-[11px] font-extrabold not-italic text-[#ffe0a3]">
              {hint ?? '下一步'}
            </em>
          ) : null}
          <span className="text-lg font-black text-[#dac69c]">{icon}</span>
          <span>{label}</span>
          {badge ? <em className="absolute right-2.5 top-[7px] h-5 min-w-5 rounded-full bg-[#bf5146] text-xs not-italic leading-5 text-[#fff2df]">{badge}</em> : null}
        </button>
      </DialogTrigger>
      <DialogContent className='p-0'>
        <DialogTitle className={srOnly}>{title}</DialogTitle>
        <DialogDescription className={srOnly}>{description}</DialogDescription>
        {children}
      </DialogContent>
    </Dialog>
  )
}
