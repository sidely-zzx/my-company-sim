import type { ChangeEvent } from 'react'
import { useRef } from 'react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog'
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
        <button type="button" className="menu-action">
          继续游戏
        </button>
      </DialogTrigger>
      <DialogContent className="menu-dialog">
        <DialogTitle>继续游戏</DialogTitle>
        <DialogDescription className="dialog-description">
          已导入存档会显示在此列表中。
        </DialogDescription>
        <div className="save-import-row">
          <button type="button" onClick={() => fileInputRef.current?.click()}>
            导入存档
          </button>
          <input
            ref={fileInputRef}
            aria-label="导入本地存档"
            className="sr-only"
            type="file"
            multiple
            accept=".json,.companysim,.companysim.json,application/json"
            onChange={(event) => {
              void onImportSaves(event)
            }}
          />
          {importStatus ? (
            <span className="save-status" role="status">
              {importStatus}
            </span>
          ) : null}
        </div>
        {importedSaves.length === 0 ? (
          <p className="empty-state">暂无已导入存档。</p>
        ) : (
          <div className="imported-save-list">
            {importedSaves.map((save) => (
              <button
                key={save.id}
                type="button"
                className="imported-save-row"
                onClick={() => onLoadImportedSave(save)}
              >
                <span>
                  <strong>{save.fileName}</strong>
                  <small>
                    第 {save.day} 天 · {money(save.money)} · {formatSaveDate(save.savedAt)}
                  </small>
                </span>
                <em>读取</em>
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
