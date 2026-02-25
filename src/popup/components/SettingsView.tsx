import React, { useState } from 'react'
import { useTranslation } from '../../i18n/LanguageContext'
import { useTheme } from '../../i18n/ThemeContext'
import { getThemeTokens } from '../../ui/theme'
import { ChevronLeftIcon, TrashIcon } from '../../ui/icons'
import * as S from '../../ui/styles'
import type { ClearAllMemoriesResponse } from '../../types/messages'

// ── Component ──────────────────────────────────────────────────────────────────

interface SettingsViewProps {
  onBack: () => void
  onAllDeleted?: () => void
}

export function SettingsView({ onBack, onAllDeleted }: SettingsViewProps) {
  const { t } = useTranslation()
  const { theme } = useTheme()
  const tk = getThemeTokens(theme)

  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  const handleDeleteAll = async () => {
    setDeleting(true)
    setStatus(null)
    try {
      const response = await new Promise<ClearAllMemoriesResponse>((resolve) => {
        chrome.runtime.sendMessage({ type: 'CLEAR_ALL_MEMORIES' }, resolve)
      })
      if (response?.payload?.success) {
        setStatus(t.deleteAllSuccess)
        setConfirming(false)
        onAllDeleted?.()
      } else {
        setStatus(t.deleteAllFailed(response?.payload?.error ?? 'unknown'))
      }
    } catch (err) {
      setStatus(t.deleteAllFailed(String(err)))
    } finally {
      setDeleting(false)
    }
  }

  const actionBtn: React.CSSProperties = {
    flex: 1,
    padding: '8px 0',
    borderRadius: 8,
    border: '1px solid',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: 'inherit',
  }

  return (
    <div style={{ ...S.viewContainerLoose, backgroundColor: tk.bg, color: tk.text }}>
      {/* Header */}
      <div style={S.viewHeader}>
        <button
          type="button"
          onClick={onBack}
          style={{ ...S.iconBtn, backgroundColor: tk.btnBg, borderColor: tk.border, color: tk.text }}
        >
          <ChevronLeftIcon />
        </button>
        <span style={{ ...S.viewTitle, color: tk.text }}>{t.settings}</span>
      </div>

      <div style={{ ...S.divider, backgroundColor: tk.separator }} />

      {/* Danger Zone */}
      <div style={{ borderRadius: 12, border: '1px solid', borderColor: tk.errorText, padding: '14px 14px 10px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ ...S.sectionLabel, color: tk.errorText }}>
          {t.dangerZone}
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 500, letterSpacing: '-0.01em', color: tk.text }}>{t.deleteAllMemory}</div>
            <div style={{ fontSize: 12, lineHeight: 1.4, color: tk.textMuted }}>{t.deleteAllMemoryDesc}</div>
          </div>
          {!confirming && (
            <button
              type="button"
              onClick={() => { setStatus(null); setConfirming(true) }}
              style={{ ...S.iconBtn, borderRadius: 8, backgroundColor: 'transparent', borderColor: tk.errorText, color: tk.errorText }}
            >
              <TrashIcon />
            </button>
          )}
        </div>

        {confirming && (
          <div style={{ borderRadius: 10, border: '1px solid', borderColor: tk.errorText, backgroundColor: tk.errorBg, padding: '12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: tk.errorText }}>
              {t.deleteAllConfirmTitle}
            </div>
            <div style={{ fontSize: 12, lineHeight: 1.4, color: tk.textMuted }}>
              {t.deleteAllConfirmDesc}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                disabled={deleting}
                style={{ ...actionBtn, backgroundColor: tk.btnBg, borderColor: tk.border, color: tk.text }}
              >
                {t.deleteAllCancel}
              </button>
              <button
                type="button"
                onClick={handleDeleteAll}
                disabled={deleting}
                style={{ ...actionBtn, backgroundColor: tk.errorText, borderColor: tk.errorText, color: '#fff', opacity: deleting ? 0.6 : 1 }}
              >
                {deleting ? '…' : t.deleteAllConfirm}
              </button>
            </div>
          </div>
        )}

        {status && (
          <div style={{ fontSize: 12, fontWeight: 500, color: status.startsWith('✓') ? tk.successText : tk.errorText }}>
            {status}
          </div>
        )}
      </div>
    </div>
  )
}
