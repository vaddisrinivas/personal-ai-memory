import React, { useCallback, useEffect, useState } from 'react'
import { MemoryMenuContent } from './components/MemoryMenuContent'
import { MemoryTableView } from './components/MemoryTableView'
import { FolderView } from './components/FolderView'
import { SettingsView } from './components/SettingsView'
import type { StatusUpdate } from '../types/messages'
import { LanguageProvider, useTranslation } from '../i18n/LanguageContext'
import { ThemeProvider, useTheme } from '../i18n/ThemeContext'
import { getThemeTokens } from '../ui/theme'
import { SunIcon, MoonIcon, GearIcon, ExternalLinkIcon } from '../ui/icons'
import * as S from '../ui/styles'
import type { LangCode } from '../i18n/translations'

type View = 'main' | 'memory' | 'folder' | 'settings'
type DetailView = 'memory' | 'folder'

const AI_ORIGINS = [
  'https://chat.openai.com',
  'https://chatgpt.com',
  // TODO: Implement ClaudeAdapter
  'https://claude.ai',
  'https://gemini.google.com',
]

const POPUP_WIDTH = 360

const THEME_TRANSITION_CSS = `
.aim-panel * {
  transition-property: background-color, color, border-color, box-shadow;
  transition-duration: 0.25s;
  transition-timing-function: ease;
}
`

function App() {
  useEffect(() => {
    const id = 'aim-theme-transition-style'
    if (document.getElementById(id)) return
    const el = document.createElement('style')
    el.id = id
    el.textContent = THEME_TRANSITION_CSS
    document.head.appendChild(el)
  }, [])
  const [view, setView] = useState<View>('main')
  const [detailView, setDetailView] = useState<DetailView>('memory')
  const [activeTabId, setActiveTabId] = useState<number | null>(null)
  const [isOnAISite, setIsOnAISite] = useState(false)
  const [dataVersion, setDataVersion] = useState(0)
  const { theme, toggleTheme } = useTheme()
  const tk = getThemeTokens(theme)
  const { t, lang, setLang, langNames, langCodes } = useTranslation()

  // Detect AI site
  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0]
      if (tab?.id && tab.url && AI_ORIGINS.some((o) => tab.url!.startsWith(o))) {
        setActiveTabId(tab.id)
        setIsOnAISite(true)
      }
    })
  }, [])

  // Bump dataVersion on STATUS_UPDATE so MemoryTableView reloads automatically
  useEffect(() => {
    const listener = (message: unknown) => {
      const msg = message as StatusUpdate
      if (msg.type !== 'STATUS_UPDATE') return
      setDataVersion((v) => v + 1)
    }
    chrome.runtime.onMessage.addListener(listener)
    return () => chrome.runtime.onMessage.removeListener(listener)
  }, [])

  const refreshData = useCallback(() => setDataVersion((v) => v + 1), [])

  // Send OPEN_MEMORY_PANEL to the active AI tab, then close the popup
  const handleOpenPanel = useCallback(() => {
    if (!activeTabId) return
    chrome.tabs
      .sendMessage(activeTabId, { type: 'OPEN_MEMORY_PANEL' })
      .catch(() => void 0)
      .finally(() => window.close())
  }, [activeTabId])

  const navigateTo = useCallback((target: DetailView) => {
    setDetailView(target)
    setView(target)
  }, [])

  const goBack = useCallback(() => setView('main'), [])
  const openSettings = useCallback(() => setView('settings'), [])

  // Slot order: settings(0) | main(1) | detail(2)
  // Settings slides in from the left, detail slides in from the right — no cross-over.
  const slideIndex = view === 'settings' ? 0 : view === 'main' ? 1 : 2

  return (
    <div
      className="aim-panel"
      style={{
        width: POPUP_WIDTH,
        minWidth: POPUP_WIDTH,
        overflow: 'hidden',
        backgroundColor: tk.bg,
      }}
    >
      <div
        style={{
          display: 'flex',
          width: POPUP_WIDTH * 3,
          transform: `translateX(-${slideIndex * POPUP_WIDTH}px)`,
          transition: 'transform 0.32s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {/* Slot 0: Settings (slides in from left) */}
        <div style={{ width: POPUP_WIDTH, flexShrink: 0, opacity: view === 'settings' ? 1 : 0, transition: 'opacity 0.24s ease, background-color 0.25s ease, color 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease' }}>
          <SettingsView onBack={goBack} onAllDeleted={refreshData} />
        </div>

        {/* Slot 1: Main menu (center) */}
        <div style={{ width: POPUP_WIDTH, flexShrink: 0, opacity: view === 'main' ? 1 : 0, transition: 'opacity 0.24s ease, background-color 0.25s ease, color 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease' }}>
          <div style={{ ...S.viewContainer, backgroundColor: tk.bg, color: tk.text }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.02em', color: tk.text }}>AI Memory</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  type="button"
                  onClick={toggleTheme}
                  style={{ ...S.iconBtn, backgroundColor: tk.btnBg, borderColor: tk.border, color: tk.textMuted }}
                  title={theme === 'light' ? t.themeDark : t.themeLight}
                >
                  {theme === 'light' ? <MoonIcon /> : <SunIcon />}
                </button>
                <button
                  type="button"
                  onClick={openSettings}
                  style={{ ...S.iconBtn, backgroundColor: tk.btnBg, borderColor: tk.border, color: tk.textMuted }}
                  title={t.settings}
                >
                  <GearIcon />
                </button>
                <select
                  value={lang}
                  onChange={(e) => setLang(e.target.value as LangCode)}
                  style={{ fontSize: 12, padding: '6px 8px', borderRadius: 10, border: '1px solid', borderColor: tk.inputBorder, backgroundColor: tk.inputBg, color: tk.text, cursor: 'pointer', outline: 'none', minWidth: 88, fontFamily: 'inherit' }}
                  title={t.language}
                >
                  {langCodes.map((code) => (
                    <option key={code} value={code}>{langNames[code]}</option>
                  ))}
                </select>
              </div>
            </div>

            {isOnAISite && (
              <button
                type="button"
                onClick={handleOpenPanel}
                style={{ ...S.menuBtn, backgroundColor: tk.btnPrimaryBg, borderColor: tk.btnPrimaryBg, color: '#fff' }}
              >
                <span style={S.iconWrap}><ExternalLinkIcon /></span>
                <span>{t.openOnPage}</span>
              </button>
            )}

            <MemoryMenuContent
              onOpenMemory={() => navigateTo('memory')}
              onOpenFolder={() => navigateTo('folder')}
              onImported={() => {
                refreshData()
                navigateTo('memory')
              }}
            />
          </div>
        </div>

        {/* Slot 2: Detail views — both rendered, toggled to prevent flash during slide-back */}
        <div style={{ width: POPUP_WIDTH, flexShrink: 0, position: 'relative', opacity: view === 'memory' || view === 'folder' ? 1 : 0, transition: 'opacity 0.24s ease, background-color 0.25s ease, color 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease' }}>
          <div style={{ display: detailView === 'memory' ? 'flex' : 'none', flexDirection: 'column', height: 580 }}>
            <MemoryTableView onBack={goBack} onDeleted={refreshData} reloadKey={dataVersion} maxHeight={580} />
          </div>
          <div style={{ display: detailView === 'folder' ? 'block' : 'none', maxHeight: 580, overflowY: 'auto' }}>
            <FolderView onBack={goBack} width={POPUP_WIDTH} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default function PopupRoot() {
  return (
    <LanguageProvider>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </LanguageProvider>
  )
}
