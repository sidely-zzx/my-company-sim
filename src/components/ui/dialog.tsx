import * as DialogPrimitive from '@radix-ui/react-dialog'
import type { ComponentPropsWithoutRef } from 'react'

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
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="dialog-overlay" />
      <DialogPrimitive.Content className={`dialog-content ${className}`} {...props}>
        {children}
        <DialogPrimitive.Close className="dialog-close" aria-label="关闭弹窗">
          ×
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}
