import React from 'react'
import { FavoritePromptsSection } from './FavoritePromptsSection'
import { ImportView } from './ImportView'
import { ExportView } from './ExportView'
import { useTranslation } from '../../i18n/LanguageContext'
import { useTheme } from '../../i18n/ThemeContext'
import { getThemeTokens } from '../../ui/theme'
import { FolderIcon, ListIcon } from '../../ui/icons'
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

      <ExportView />
    </>
  )
}
