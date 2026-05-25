import type { ChangeEvent } from 'react'

import { ContinueGameDialog } from '../components/save/ContinueGameDialog'
import { HomeSettingsDialog } from '../components/setting'
import { useGameStore } from '../store/gameStore'
import { cn, eyebrow, menuAction, surface } from '../styles/tw'
import type { ImportedSave, VisualSettings } from '../type'
import { money } from '../utils'

interface HomePageProps {
  importedSaves: ImportedSave[]
  importStatus: string
  exitStatus: string
  visualSettings: VisualSettings
  onStartNewGame: () => void
  onImportSaves: (event: ChangeEvent<HTMLInputElement>) => Promise<void>
  onLoadImportedSave: (save: ImportedSave) => void
  onUpdateVisualSettings: (patch: Partial<VisualSettings>) => void
  onExit: () => void
}

function HomePage({
  importedSaves,
  importStatus,
  exitStatus,
  visualSettings,
  onStartNewGame,
  onImportSaves,
  onLoadImportedSave,
  onUpdateVisualSettings,
  onExit,
}: HomePageProps) {
  const day = useGameStore((state) => state.time.day)
  const moneyValue = useGameStore((state) => state.money)
  const employees = useGameStore((state) => state.employees)
  const laborContracts = useGameStore((state) => state.laborContracts)
  const projectContracts = useGameStore((state) => state.projectContracts)

  return (
    <section className="grid w-[min(1040px,100%)] grid-cols-[minmax(0,1.05fr)_minmax(280px,0.95fr)] gap-[18px] mx-auto max-[900px]:grid-cols-1">
      <div className={cn(surface, 'grid min-h-[520px] content-between p-7 max-[900px]:min-h-0 max-[900px]:p-[22px] max-[560px]:p-[18px]')}>
        <div className="grid gap-2.5">
          <p className={eyebrow}>OA 运营工作台</p>
          <h1 className="m-0 text-[42px] leading-[1.12] text-[#efe2c8] shadow-black [text-shadow:0_2px_0_#0a0d0d] max-[900px]:text-[34px] max-[560px]:text-[30px]">外包公司模拟器</h1>
          <p className="text-[15px] font-bold text-[#aab0a8]">招聘 · 合同 · 财务 · 邮件</p>
        </div>
        <div className="mt-[42px] grid gap-2.5" aria-label="主菜单">
          <button
            type="button"
            className={cn(menuAction, 'border-[#a99768] bg-[linear-gradient(180deg,#4b4537,#292822)] text-[#ffe6ad] hover:bg-[linear-gradient(180deg,#5c523e,#312d24)] focus-visible:bg-[linear-gradient(180deg,#5c523e,#312d24)]')}
            onClick={onStartNewGame}
          >
            开始新游戏
          </button>
          <ContinueGameDialog
            importedSaves={importedSaves}
            importStatus={importStatus}
            onImportSaves={onImportSaves}
            onLoadImportedSave={onLoadImportedSave}
          />
          <HomeSettingsDialog
            visualSettings={visualSettings}
            onUpdateVisualSettings={onUpdateVisualSettings}
          />
          <button
            type="button"
            className={cn(menuAction, 'border-[#68453e] text-[#ffb0a2] hover:border-[#9f5e50] hover:bg-[#32201e] focus-visible:border-[#9f5e50] focus-visible:bg-[#32201e]')}
            onClick={onExit}
          >
            退出
          </button>
        </div>
        {exitStatus ? (
          <p className="mt-4 text-[13px] font-bold text-[#aab0a8]" role="status">
            {exitStatus}
          </p>
        ) : null}
      </div>
      <aside
        className={cn(surface, 'self-stretch p-6 max-[560px]:p-[18px]')}
        aria-label="当前会话概览"
      >
        <p className={eyebrow}>当前会话</p>
        <h2 className="mb-[18px] mt-1 text-2xl">运营看板</h2>
        <dl className="m-0 grid [&_dd]:m-0 [&_dd]:text-right [&_dd]:font-extrabold [&_dd]:text-[#efe2c8] [&_div:first-child]:border-t [&_div:first-child]:border-[#343b38] [&_div]:flex [&_div]:justify-between [&_div]:gap-4 [&_div]:border-b [&_div]:border-[#343b38] [&_div]:py-3.5 [&_dt]:m-0 [&_dt]:text-[13px] [&_dt]:font-bold [&_dt]:text-[#9da49c]">
          <div>
            <dt>游戏日</dt>
            <dd>第 {day} 天</dd>
          </div>
          <div>
            <dt>现金</dt>
            <dd>{money(moneyValue)}</dd>
          </div>
          <div>
            <dt>员工</dt>
            <dd>{employees.length} 人</dd>
          </div>
          <div>
            <dt>合同</dt>
            <dd>{laborContracts.length + projectContracts.length} 个</dd>
          </div>
          <div>
            <dt>已导入存档</dt>
            <dd>{importedSaves.length} 个</dd>
          </div>
        </dl>
      </aside>
    </section>
  )
}
export default HomePage
