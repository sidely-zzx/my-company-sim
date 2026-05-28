import { useEffect, useRef, useState, type ChangeEvent } from 'react'

import { GameClock } from './components/game/GameClock'
import { parseGameSaveFileJson } from './game/save'
import { useGameStore } from './store/gameStore'
import { cn } from './styles/tw'
import type { ImportedSave, VisualSettings } from './type'
import GamePage from './pages/Game'
import HomePage from './pages/Home'

type AppView = 'home' | 'game'

const BASE_WIDTH = 1920
const BASE_HEIGHT = 1080
const USE_INTEGER_SCALE = false

function getGameScale() {
  const fitScale = Math.min(window.innerWidth / BASE_WIDTH, window.innerHeight / BASE_HEIGHT)

  if (USE_INTEGER_SCALE) {
    return Math.max(1, Math.floor(fitScale))
  }

  return fitScale
}

function App() {
  const gameRootRef = useRef<HTMLDivElement>(null)
  const [view, setView] = useState<AppView>('home')
  const [importedSaves, setImportedSaves] = useState<ImportedSave[]>([])
  const [importStatus, setImportStatus] = useState('')
  const [exitStatus, setExitStatus] = useState('')
  const [visualSettings, setVisualSettings] = useState<VisualSettings>({
    density: 'compact',
    theme: 'system',
    motion: 'standard',
    volume: 60,
  })
  const startGame = useGameStore((state) => state.startGame)
  const loadSaveJson = useGameStore((state) => state.loadSaveJson)

  function startNewGame() {
    startGame()
    setExitStatus('')
    setView('game')
  }

  function startNewGameWithoutTutorial() {
    // 从开始菜单跳过教程时，只关闭教程系统本身，玩家仍从第 1 天和普通市场开始。
    startGame({ skipTutorial: true })
    setExitStatus('')
    setView('game')
  }

  async function importSaves(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget
    const files = Array.from(input.files ?? [])
    if (files.length === 0) {
      return
    }

    const importedAt = Date.now()
    const loaded: ImportedSave[] = []
    const errors: string[] = []

    for (const [index, file] of files.entries()) {
      try {
        const json = await file.text()
        const saveFile = parseGameSaveFileJson(json)
        loaded.push({
          id: `${file.name}-${file.lastModified}-${importedAt}-${index}`,
          fileName: file.name,
          json,
          savedAt: saveFile.savedAt,
          day: saveFile.state.time.day,
          money: saveFile.state.money,
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : '读取失败'
        errors.push(`${file.name}: ${message}`)
      }
    }

    if (loaded.length > 0) {
      setImportedSaves((current) => [...loaded, ...current])
    }

    if (loaded.length > 0 && errors.length > 0) {
      setImportStatus(`已导入 ${loaded.length} 个存档，${errors.length} 个失败：${errors.join('；')}`)
    } else if (loaded.length > 0) {
      setImportStatus(`已导入 ${loaded.length} 个存档`)
    } else {
      setImportStatus(`未导入存档：${errors.join('；')}`)
    }

    input.value = ''
  }

  function loadImportedSave(save: ImportedSave) {
    try {
      loadSaveJson(save.json)
      setImportStatus(`已读取 ${save.fileName}`)
      setExitStatus('')
      setView('game')
    } catch (error) {
      setImportStatus(error instanceof Error ? error.message : '读取存档失败')
    }
  }

  function updateVisualSettings(patch: Partial<VisualSettings>) {
    setVisualSettings((current) => ({ ...current, ...patch }))
  }

  function exitApp() {
    setExitStatus('正在尝试关闭窗口')
    window.close()
    window.setTimeout(() => {
      if (!window.closed) {
        setExitStatus('当前环境无法自动关闭窗口，请手动关闭标签页/窗口')
      }
    }, 120)
  }

  useEffect(() => {
    if (view !== 'game') {
      return
    }

    function updateScale() {
      if (!gameRootRef.current) {
        return
      }

      gameRootRef.current.style.transform = `scale(${getGameScale()})`
    }

    updateScale()
    window.addEventListener('resize', updateScale)

    return () => window.removeEventListener('resize', updateScale)
  }, [view])

  if (view === 'home') {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_50%_0%,rgba(101,122,122,0.18),transparent_36%),linear-gradient(135deg,#151a1b_0%,#232829_46%,#111516_100%)] p-6 text-[#e8ddc7] grid items-center max-[900px]:items-start max-[900px]:p-3">
        <HomePage
          importedSaves={importedSaves}
          importStatus={importStatus}
          exitStatus={exitStatus}
          visualSettings={visualSettings}
          onStartNewGame={startNewGame}
          onStartNewGameWithoutTutorial={startNewGameWithoutTutorial}
          onImportSaves={importSaves}
          onLoadImportedSave={loadImportedSave}
          onUpdateVisualSettings={updateVisualSettings}
          onExit={exitApp}
        />
      </main>
    )
  }

  return (
    <main className={cn('game-viewport bg-[radial-gradient(circle_at_50%_0%,rgba(101,122,122,0.18),transparent_36%),linear-gradient(135deg,#151a1b_0%,#232829_46%,#111516_100%)] text-[#e8ddc7]')}>
      <GameClock />
      <div ref={gameRootRef} className="game-root">
        <GamePage
          visualSettings={visualSettings}
          onOpenHome={() => setView('home')}
          onUpdateVisualSettings={updateVisualSettings}
        />
      </div>
    </main>
  )
}

export default App
