import React, { useRef, useState } from 'react'
import { ImportView } from './ImportView'
import { ExportView } from './ExportView'
import { FavoritePromptsSection } from './FavoritePromptsSection'
import { useTranslation } from '../../i18n/LanguageContext'
import { useTheme } from '../../i18n/ThemeContext'
import { getThemeTokens } from '../../ui/theme'
import { SunIcon, MoonIcon, GearIcon, ExternalLinkIcon, FolderIcon, ListIcon, DownloadIcon } from '../../ui/icons'
import * as S from '../../ui/styles'
import type { LangCode } from '../../i18n/translations'
import { parseClaudeConversations } from '../../importers/claudeConversations'
import type { SerializableMemoryRecord } from '../../types/memory'
import type { ImportMemoriesResponse } from '../../types/messages'

// ── Component ──────────────────────────────────────────────────────────────────

interface MainMenuViewProps {
  totalRecords: number
  onOpenMemory: () => void
  onOpenFolder?: () => void
  isOnAISite?: boolean
  onOpenPanel?: () => void
  onImported?: () => void
  onOpenSettings?: () => void
}

export function MainMenuView({
  totalRecords,
  onOpenMemory,
  onOpenFolder,
  isOnAISite,
  onOpenPanel,
  onImported,
  onOpenSettings,
}: MainMenuViewProps) {
  const { t, lang, setLang, langNames, langCodes } = useTranslation()
  const { theme, toggleTheme } = useTheme()
  const tk = getThemeTokens(theme)

  const claudeInputRef = useRef<HTMLInputElement>(null)
  const [importingClaude, setImportingClaude] = useState(false)
  const [claudeStatus, setClaudeStatus] = useState<{ type: 'idle' } | { type: 'success'; msg: string } | { type: 'error'; msg: string }>({ type: 'idle' })

  function handleClaudeImportClick() {
    claudeInputRef.current?.click()
  }

  async function handleClaudeFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImportingClaude(true)
    setClaudeStatus({ type: 'idle' })
    const reader = new FileReader()
    reader.onload = async (ev) => {
      try {
        let raw: unknown
        try { raw = JSON.parse(ev.target?.result as string) } catch { throw new Error(t.importClaudeInvalidFile) }
        if (!Array.isArray(raw)) throw new Error(t.importClaudeInvalidFile)
        const records = parseClaudeConversations(raw)
        if (records.length === 0) throw new Error(t.importClaudeInvalidFile)
        const count = await new Promise<number>((resolve, reject) => {
          chrome.runtime.sendMessage(
            { type: 'IMPORT_MEMORIES', payload: { records: records as SerializableMemoryRecord[] } },
            (r: ImportMemoriesResponse | undefined) => {
              if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message))
              if (!r) return reject(new Error('No response from background'))
              if (!r.payload.success) return reject(new Error(r.payload.error ?? '寫入失敗'))
              resolve(r.payload.count)
            }
          )
        })
        setClaudeStatus({ type: 'success', msg: t.importClaudeSuccess(count) })
        setTimeout(() => setClaudeStatus({ type: 'idle' }), 3000)
        onImported?.()
      } catch (err) {
        setClaudeStatus({ type: 'error', msg: t.importClaudeFailed((err as Error).message ?? String(err)) })
      } finally {
        setImportingClaude(false)
        e.target.value = ''
      }
    }
    reader.onerror = () => { setClaudeStatus({ type: 'error', msg: t.importReadFailed }); setImportingClaude(false) }
    reader.readAsText(file)
  }

  return (
    <div style={{ ...S.viewContainer, backgroundColor: tk.bg, color: tk.text }}>
      {/* Header */}
      <div style={localStyles.header}>
        <img
          src={
            typeof chrome !== 'undefined' && chrome.runtime?.id
              ? chrome.runtime.getURL('assets/icon.png')
              : ''
          }
          alt="Personal AI Memory"
          width={36}
          height={36}
          style={{ display: 'block', borderRadius: 10, flexShrink: 0 }}
          onError={(e) => {
            const img = e.target as HTMLImageElement
            img.style.display = 'none'
          }}
        />
        <div style={localStyles.headerText}>
          <div style={{ ...localStyles.title, color: tk.text }}>AI Memory</div>
          <div style={{ fontSize: 12, letterSpacing: '-0.01em', color: tk.textMuted }}>{t.totalRecords(totalRecords)}</div>
        </div>
        <div style={localStyles.headerActions}>
          <button
            type="button"
            onClick={toggleTheme}
            style={{ ...S.iconBtn, backgroundColor: tk.btnBg, borderColor: tk.border, color: tk.textMuted }}
            title={theme === 'light' ? t.themeDark : t.themeLight}
          >
            {theme === 'light' ? <MoonIcon /> : <SunIcon />}
          </button>
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value as LangCode)}
            style={{ ...localStyles.langSelect, backgroundColor: tk.inputBg, borderColor: tk.inputBorder, color: tk.text }}
            title={t.language}
          >
            {langCodes.map((code) => (
              <option key={code} value={code}>
                {langNames[code]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Settings Button */}
      {onOpenSettings && (
        <button
          type="button"
          onClick={onOpenSettings}
          style={{ ...S.menuBtn, backgroundColor: tk.btnBg, borderColor: tk.border, color: tk.text }}
        >
          <span style={S.iconWrap}><GearIcon /></span>
          <span>{t.settings}</span>
        </button>
      )}

      <div style={{ ...S.divider, backgroundColor: tk.separator }} />

      {/* Primary action — only on supported AI sites */}
      {isOnAISite && (
        <button
          style={{ ...S.menuBtn, backgroundColor: tk.btnPrimaryBg, borderColor: tk.btnPrimaryBg, color: '#fff' }}
          onClick={() => {
            onOpenPanel?.()
          }}
          type="button"
        >
          <span style={S.iconWrap}><ExternalLinkIcon /></span>
          <span>{t.openOnPage}</span>
        </button>
      )}

      {/* Favorite Prompts */}
      <FavoritePromptsSection />

      {/* Prompts Folder button */}
      {onOpenFolder && (
        <button
          style={{ ...S.menuBtn, backgroundColor: tk.btnBg, borderColor: tk.border, color: tk.text }}
          onClick={() => {
            onOpenFolder()
          }}
          type="button"
        >
          <span style={S.iconWrap}><FolderIcon /></span>
          <span>{t.promptsFolder}</span>
        </button>
      )}

      <div style={{ ...S.divider, backgroundColor: tk.separator }} />

      {/* Bottom action buttons */}
      <button
        style={{ ...S.menuBtn, backgroundColor: tk.btnBg, borderColor: tk.border, color: tk.text }}
        onClick={onOpenMemory}
        type="button"
      >
        <span style={S.iconWrap}><ListIcon /></span>
        <span>{t.viewMemories}</span>
      </button>

      <ImportView onImported={onImported} />

      <div style={{ position: 'relative', width: '100%' }}>
        <button
          style={importingClaude
            ? { ...S.menuBtn, ...S.btnDisabled }
            : { ...S.menuBtn, backgroundColor: tk.btnBg, borderColor: tk.border, color: tk.text }}
          onClick={handleClaudeImportClick}
          disabled={importingClaude}
          type="button"
        >
          <span style={S.iconWrap}><DownloadIcon /></span>
          <span>{importingClaude ? t.importingClaude : t.importClaude}</span>
        </button>
        <input ref={claudeInputRef} type="file" accept=".json" onChange={handleClaudeFileChange} style={{ display: 'none' }} />
        {claudeStatus.type !== 'idle' && (
          <div style={claudeStatus.type === 'success'
            ? { ...S.statusMsg, backgroundColor: tk.successBg, color: tk.successText }
            : { ...S.statusMsg, backgroundColor: tk.errorBg, color: tk.errorText }}>
            {claudeStatus.msg}
          </div>
        )}
      </div>

      <ExportView />
    </div>
  )
}

const localStyles: Record<string, React.CSSProperties> = {
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  headerText: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    flex: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: 700,
    letterSpacing: '-0.02em',
  },
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  langSelect: {
    fontSize: 12,
    padding: '6px 8px',
    borderRadius: 10,
    border: '1px solid',
    cursor: 'pointer',
    outline: 'none',
    flexShrink: 0,
    minWidth: 88,
    fontFamily: 'inherit',
  },
}
