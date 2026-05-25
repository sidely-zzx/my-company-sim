import * as DialogPrimitive from '@radix-ui/react-dialog'
import type { ComponentPropsWithoutRef } from 'react'

import { button, cn } from '../../styles/tw'

export function Dialog(props: ComponentPropsWithoutRef<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root {...props} />
}

export function DialogTrigger(props: ComponentPropsWithoutRef<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger {...props} />
}

export function DialogTitle(props: ComponentPropsWithoutRef<typeof DialogPrimitive.Title>) {
  return <DialogPrimitive.Title {...props} />
}

export function DialogDescription(
  props: ComponentPropsWithoutRef<typeof DialogPrimitive.Description>,
) {
  return <DialogPrimitive.Description {...props} />
}

export function DialogClose(props: ComponentPropsWithoutRef<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close {...props} />
}

export function DialogContent({
  children,
  className = '',
  ...props
}: ComponentPropsWithoutRef<typeof DialogPrimitive.Content>) {
  return (
    <>
      <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-[rgba(5,7,7,0.72)]" />
      <DialogPrimitive.Content
        className={cn(
          'fixed left-1/2 top-1/2 z-50 max-h-[calc(100vh-48px)] w-[min(calc(100vw-32px),1180px)] -translate-x-1/2 -translate-y-1/2 overflow-auto rounded-lg border border-[#4b514d] bg-[#1b201f] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.62)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b59d65] max-[900px]:max-h-[calc(100vh-16px)] max-[900px]:w-[calc(100vw-16px)] max-[900px]:p-3.5',
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close
          className={cn(
            button,
            'sticky top-0 float-right -mr-2 -mt-2 mb-2 ml-3 h-[34px] w-[34px] rounded-full bg-[#2c3330] p-0 text-[22px] leading-none text-[#efe2c8] hover:bg-[#3b453f] focus-visible:bg-[#3b453f]',
          )}
          aria-label="关闭弹窗"
        >
          ×
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </>
  )
}
