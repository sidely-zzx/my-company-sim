import * as React from 'react'

import { cn } from '@/lib/utils'

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      data-slot="input"
      type={type}
      className={cn(
        'min-h-8 w-24 rounded-md border border-[#4b514d] bg-[#171c1b] px-2 text-[#e8ddc7] outline-none transition-colors placeholder:text-[#777f78] file:border-0 file:bg-transparent file:text-[#e8ddc7] file:font-extrabold hover:border-[#8b7f63] focus-visible:border-[#8b7f63] focus-visible:ring-2 focus-visible:ring-[#b59d65]/35 disabled:cursor-not-allowed disabled:bg-[#303633] disabled:text-[#777f78]',
        className,
      )}
      {...props}
    />
  )
}

export { Input }
