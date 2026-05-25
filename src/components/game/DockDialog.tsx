import type { ReactNode } from 'react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog'

interface DockDialogProps {
  icon: string
  label: string
  badge?: number
  title: string
  description: string
  children: ReactNode
}

export function DockDialog({ icon, label, badge, title, description, children }: DockDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button type="button" className="dock-button">
          <span className="dock-icon">{icon}</span>
          <span>{label}</span>
          {badge ? <em>{badge}</em> : null}
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <DialogDescription className="sr-only">{description}</DialogDescription>
        {children}
      </DialogContent>
    </Dialog>
  )
}
