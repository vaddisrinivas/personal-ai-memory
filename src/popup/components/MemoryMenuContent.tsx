import React, { useState } from 'react'
import { FavoritePromptsSection } from './FavoritePromptsSection'
import { ImportView } from './ImportView'
import { ExportView } from './ExportView'
import { useTranslation } from '../../i18n/LanguageContext'
import { useTheme } from '../../i18n/ThemeContext'
import { getThemeTokens } from '../../ui/theme'
import { FolderIcon, ListIcon, UploadIcon } from '../../ui/icons'
import * as S from '../../ui/styles'

// ── Component ──────────────────────────────────────────────────────────────────

interface MemoryMenuContentProps {
  onOpenMemory: () => void
  onOpenFolder?: () => void
  onImported?: () => void
}

/**
 * Shared menu items used by both the popup's MainMenuView and the in-page
 * FloatingMemoryPanel. Renders as a React fragment so items participate in the
 * parent's flex-column / gap layout without an extra wrapper element.
 */
export function MemoryMenuContent({ onOpenMemory, onOpenFolder, onImported }: MemoryMenuContentProps) {
  const { t } = useTranslation()
  const { theme } = useTheme()
  const tk = getThemeTokens(theme)
  const [syncingVault, setSyncingVault] = useState(false)
  const [vaultSyncStatus, setVaultSyncStatus] = useState<string | null>(null)

  const syncLocalVault = () => {
    setSyncingVault(true)
    setVaultSyncStatus('Starting local vault sync...')
    chrome.runtime.sendMessage({ type: 'SYNC_VAULT_NATIVE' }, (response) => {
      setSyncingVault(false)
      if (chrome.runtime.lastError) {
        setVaultSyncStatus(chrome.runtime.lastError.message || 'Local vault sync failed')
        return
      }
      if (!response?.success) {
        setVaultSyncStatus(response?.error || 'Local vault sync failed')
        return
      }
      const imported = response.imported ?? 0
      const skipped = response.skipped ?? 0
      const total = response.total ?? 0
      const next = response.done ? 'complete' : `next offset ${response.nextOffset ?? 0}`
      setVaultSyncStatus(`Imported ${imported}, skipped ${skipped} / ${total}; ${next}`)
      onImported?.()
    })
  }

  return (
    <>
      <FavoritePromptsSection />

      {onOpenFolder && (
        <button
          type="button"
          style={{ ...S.menuBtn, backgroundColor: tk.btnBg, borderColor: tk.border, color: tk.text }}
          onClick={onOpenFolder}
        >
          <span style={S.iconWrap}><FolderIcon /></span>
          <span>{t.promptsFolder}</span>
        </button>
      )}

      <div style={{ ...S.divider, backgroundColor: tk.separator }} />

      <button
        type="button"
        style={{ ...S.menuBtn, backgroundColor: tk.btnBg, borderColor: tk.border, color: tk.text }}
        onClick={onOpenMemory}
      >
        <span style={S.iconWrap}><ListIcon /></span>
        <span>{t.viewMemories}</span>
      </button>

      <ImportView onImported={onImported} />

      <button
        type="button"
        style={syncingVault ? { ...S.menuBtn, ...S.btnDisabled } : { ...S.menuBtn, backgroundColor: tk.btnBg, borderColor: tk.border, color: tk.text }}
        onClick={syncLocalVault}
        disabled={syncingVault}
      >
        <span style={S.iconWrap}><UploadIcon /></span>
        <span>{syncingVault ? 'Syncing local vault...' : 'Sync local vault'}</span>
      </button>

      {vaultSyncStatus && (
        <div style={{ fontSize: 11, color: tk.textMuted, lineHeight: 1.35 }}>
          {vaultSyncStatus}
        </div>
      )}

      <ExportView />
    </>
  )
}
