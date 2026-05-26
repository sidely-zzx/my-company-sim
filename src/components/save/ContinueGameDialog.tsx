import type { ChangeEvent } from 'react'
import { useRef } from 'react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog'
import { Input } from '../ui/input'
import { button, cn, emptyState, menuAction, srOnly } from '../../styles/tw'
import type { ImportedSave } from '../../type'
import { money } from '../../utils'

interface ContinueGameDialogProps {
  importedSaves: ImportedSave[]
  importStatus: string
  onImportSaves: (event: ChangeEvent<HTMLInputElement>) => Promise<void>
  onLoadImportedSave: (save: ImportedSave) => void
}

function formatSaveDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleString('zh-CN', {
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function ContinueGameDialog({
  importedSaves,
  importStatus,
  onImportSaves,
  onLoadImportedSave,
}: ContinueGameDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button type="button" className={menuAction}>
          继续游戏
        </button>
      </DialogTrigger>
      <DialogContent className="w-[min(calc(100vw-32px),720px)]">
        <DialogTitle>继续游戏</DialogTitle>
        <DialogDescription className="mb-[18px] mt-0 text-[#aab0a8]">
          已导入存档会显示在此列表中。
        </DialogDescription>
        <div className="mb-3.5 flex flex-wrap items-center gap-2.5 max-[560px]:[&_button]:w-full">
          <button type="button" className={button} onClick={() => fileInputRef.current?.click()}>
            导入存档
          </button>
          <Input
            ref={fileInputRef}
            aria-label="导入本地存档"
            className={srOnly}
            type="file"
            multiple
            accept=".json,.companysim,.companysim.json,application/json"
            onChange={(event) => {
              void onImportSaves(event)
            }}
          />
          {importStatus ? (
            <span className="inline-flex min-h-8 max-w-full items-center text-[13px] font-extrabold text-[#aab0a8] [overflow-wrap:anywhere]" role="status">
              {importStatus}
            </span>
          ) : null}
        </div>
        {importedSaves.length === 0 ? (
          <p className={emptyState}>暂无已导入存档。</p>
        ) : (
          <div className="grid gap-2.5">
            {importedSaves.map((save) => (
              <button
                key={save.id}
                type="button"
                className={cn(button, 'flex min-h-[74px] items-center justify-between gap-3.5 border-[#3d4642] px-3.5 py-3 text-left text-[#efe2c8] hover:border-[#8b7f63] hover:bg-[#252b28] focus-visible:border-[#8b7f63] focus-visible:bg-[#252b28] focus-visible:outline-none max-[560px]:flex-col max-[560px]:items-start')}
                onClick={() => onLoadImportedSave(save)}
              >
                <span className="grid gap-1">
                  <strong>{save.fileName}</strong>
                  <small className="text-[13px] text-[#9aa29a]">
                    第 {save.day} 天 · {money(save.money)} · {formatSaveDate(save.savedAt)}
                  </small>
                </span>
                <em className="shrink-0 not-italic text-[#dac69c]">读取</em>
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
