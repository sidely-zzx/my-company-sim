import type { ChangeEvent } from 'react'

import { ContinueGameDialog } from '../components/save/ContinueGameDialog'
import { HomeSettingsDialog } from '../components/setting'
import { useGameStore } from '../store/gameStore'
import type { ImportedSave, VisualSettings } from '../type'
import '../App.css'
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
    <section className='home-screen'>
      <div className='home-panel home-menu-panel'>
        <div className='home-brand'>
          <p className='eyebrow'>OA 运营工作台</p>
          <h1>外包公司模拟器</h1>
          <p className='home-subtitle'>招聘 · 合同 · 财务 · 邮件</p>
        </div>
        <div className='home-actions' aria-label='主菜单'>
          <button
            type='button'
            className='menu-action menu-action-primary'
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
            type='button'
            className='menu-action menu-action-danger'
            onClick={onExit}
          >
            退出
          </button>
        </div>
        {exitStatus ? (
          <p className='menu-status' role='status'>
            {exitStatus}
          </p>
        ) : null}
      </div>
      <aside
        className='home-panel home-overview-panel'
        aria-label='当前会话概览'
      >
        <p className='eyebrow'>当前会话</p>
        <h2>运营看板</h2>
        <dl className='home-status-list'>
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
