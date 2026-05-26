export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ')
}

export const surface =
  'border border-[#3a403d] rounded-lg bg-[linear-gradient(180deg,rgba(43,48,46,0.96),rgba(18,22,21,0.98))] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_12px_30px_rgba(0,0,0,0.38)]'

export const eyebrow = 'm-0 text-xs font-extrabold text-[#aaa48f]'

export const button =
  'min-h-8 cursor-pointer rounded-md border border-[#4b514d] bg-[#171c1b] px-2.5 font-extrabold text-[#e8ddc7] disabled:cursor-not-allowed disabled:bg-[#303633] disabled:text-[#777f78]'

export const secondaryButton =
  'min-h-8 cursor-pointer rounded-md border border-[#4b514d] bg-[#242a28] px-2.5 font-extrabold text-[#e8ddc7] hover:border-[#8b7f63] hover:bg-[#2d3431] focus-visible:border-[#8b7f63] focus-visible:bg-[#2d3431] focus-visible:outline-none'

export const menuAction =
  'flex min-h-12 w-full cursor-pointer items-center justify-start rounded-md border border-[#3d4642] bg-[#1d2322] px-4 text-left text-base font-extrabold text-[#efe2c8] hover:border-[#8b7f63] hover:bg-[#28302d] focus-visible:border-[#8b7f63] focus-visible:bg-[#28302d] focus-visible:outline-none max-[560px]:min-h-11 max-[560px]:text-[15px]'

export const select =
  'min-h-8 w-24 rounded-md border border-[#4b514d] bg-[#171c1b] px-2 text-[#e8ddc7]'

export const panel = cn(surface, 'min-w-0 p-[18px]')

export const dialogPanel = 'min-w-0 bg-transparent p-0 shadow-none'

export const panelHeader =
  'mb-3.5 flex items-center justify-between gap-3 max-[900px]:flex-col max-[900px]:items-start  pr-10'

export const panelTitle = 'm-0 text-[17px] text-[#efe2c8]'

export const tableWrap = 'overflow-x-auto'

export const table =
  'w-full min-w-[920px] border-collapse [&_td]:border-b [&_td]:border-[#303834] [&_td]:px-2 [&_td]:py-2.5 [&_td]:text-left [&_td]:align-top [&_td]:text-[13px] [&_td]:text-[#d8cfbb] [&_td_small]:mt-1 [&_td_small]:block [&_td_small]:text-[#9aa29a] [&_td_strong]:block [&_th]:border-b [&_th]:border-[#303834] [&_th]:bg-[#171c1b] [&_th]:px-2 [&_th]:py-2.5 [&_th]:text-left [&_th]:align-top [&_th]:text-xs [&_th]:font-extrabold [&_th]:text-[#aaa48f]'

export const formGrid = 'flex max-w-80 flex-wrap items-center gap-2'

export const inlineActions = 'flex flex-wrap items-center gap-2'

export const emptyState =
  'rounded-lg border border-dashed border-[#4b514d] bg-[rgba(12,15,15,0.5)] p-4 text-[#9aa29a]'

export const amountPositive = 'font-black text-[#8ed96a]'
export const amountNegative = 'font-black text-[#ff7968]'

export const progressTrack =
  'h-2.5 overflow-hidden rounded-[5px] border border-[#0c0f0f] bg-[#111514]'

export const progressFill = 'block h-full border-r border-r-white/20'

export const progressToneClass = {
  success: 'bg-[linear-gradient(90deg,#4b8f35,#8fd45d)]',
  warning: 'bg-[linear-gradient(90deg,#9f6f25,#e0aa43)]',
  danger: 'bg-[linear-gradient(90deg,#8f3d34,#df6d5d)]',
} as const

export const riskToneClass = {
  success: 'text-[#92d16e]',
  warning: 'text-[#e4b45b]',
  danger: 'text-[#ff7968]',
} as const

export const eventTokenToneClass = {
  success: 'bg-[#82c85f]',
  warning: 'bg-[#e0aa43]',
  danger: 'bg-[#dd6d5e]',
  info: 'bg-[#69a2d4]',
} as const

export const eventBorderToneClass = {
  success: 'border-l-[#82c85f]',
  warning: 'border-l-[#e0aa43]',
  danger: 'border-l-[#dd6d5e]',
  info: 'border-l-[#69736d]',
} as const

export const srOnly =
  'absolute h-px w-px overflow-hidden whitespace-nowrap border-0 p-0 [clip:rect(0,0,0,0)]'
