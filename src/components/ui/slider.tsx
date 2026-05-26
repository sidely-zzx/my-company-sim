import * as React from 'react'
import { Slider as SliderPrimitive } from 'radix-ui'

import { cn } from '@/lib/utils'

function Slider({
  className,
  ...props
}: React.ComponentProps<typeof SliderPrimitive.Root>) {
  return (
    <SliderPrimitive.Root
      data-slot="slider"
      className={cn(
        'relative flex w-full touch-none select-none items-center data-[disabled]:opacity-50',
        className,
      )}
      {...props}
    >
      <SliderPrimitive.Track
        data-slot="slider-track"
        className="relative h-2 w-full grow overflow-hidden rounded-full border border-[#0c0f0f] bg-[#111514]"
      >
        <SliderPrimitive.Range
          data-slot="slider-range"
          className="absolute h-full bg-[linear-gradient(90deg,#4b8f35,#8fd45d)]"
        />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb
        data-slot="slider-thumb"
        className="block size-5 rounded-full border border-[#efe2c8] bg-[#1b201f] shadow-[0_2px_10px_rgba(0,0,0,0.45)] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#b59d65] disabled:pointer-events-none"
      />
    </SliderPrimitive.Root>
  )
}

export { Slider }
