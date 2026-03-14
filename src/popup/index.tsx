import React, { useCallback, useEffect, useState } from 'react'
import { MainMenuView } from './components/MainMenuView'
import { MemoryTableView } from './components/MemoryTableView'
import { FolderView } from './components/FolderView'
import { SettingsView } from './components/SettingsView'
import type { QueryRecordsResponse, StatusUpdate } from '../types/messages'
import { LanguageProvider, useTranslation } from '../i18n/LanguageContext'
import { ThemeProvider, useTheme } from '../i18n/ThemeContext'
import { getThemeTokens } from '../ui/theme'

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
  const [totalRecords, setTotalRecords] = useState(0)
  const [loading, setLoading] = useState(true)
  const [activeTabId, setActiveTabId] = useState<number | null>(null)
  const [isOnAISite, setIsOnAISite] = useState(false)
  const [dataVersion, setDataVersion] = useState(0)
  const { theme } = useTheme()
  const tk = getThemeTokens(theme)
  const { t } = useTranslation()

  // Track popup open once on mount
  useEffect(() => {
  }, [])

  // Load initial record count + detect AI site
  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0]
      if (tab?.id && tab.url && AI_ORIGINS.some((o) => tab.url!.startsWith(o))) {
        setActiveTabId(tab.id)
        setIsOnAISite(true)
      }
    })

    chrome.runtime.sendMessage(
      { type: 'QUERY_RECORDS', payload: { filters: { limit: 1 } } },
      (response: QueryRecordsResponse | undefined) => {
        if (!chrome.runtime.lastError && response) {
          setTotalRecords(response.payload.total)
        }
        setLoading(false)
      }
    )

    const timeoutId = setTimeout(() => setLoading(false), 2000)
    return () => clearTimeout(timeoutId)
  }, [])

  // Keep totalRecords in sync with live STATUS_UPDATE broadcasts, and bump
  // dataVersion so MemoryTableView reloads its record list automatically.
  useEffect(() => {
    const listener = (message: unknown) => {
      const msg = message as StatusUpdate
      if (msg.type !== 'STATUS_UPDATE') return
      setTotalRecords(msg.payload.totalRecords)
      setDataVersion((v) => v + 1)
    }
    chrome.runtime.onMessage.addListener(listener)
    return () => chrome.runtime.onMessage.removeListener(listener)
  }, [])

  // Re-query record count (called after import / delete)
  const refreshTotal = useCallback(() => {
    chrome.runtime.sendMessage(
      { type: 'QUERY_RECORDS', payload: { filters: { limit: 1 } } },
      (response: QueryRecordsResponse | undefined) => {
        if (!chrome.runtime.lastError && response) {
          setTotalRecords(response.payload.total)
        }
      }
    )
    setDataVersion((v) => v + 1)
  }, [])

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

  if (loading) {
    return (
      <div
        style={{
          width: POPUP_WIDTH,
          height: 120,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: tk.textMuted,
          fontSize: 13,
          fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif',
          backgroundColor: tk.bg,
        }}
      >
        {t.loading}
      </div>
    )
  }

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
          <SettingsView onBack={goBack} onAllDeleted={refreshTotal} />
        </div>

        {/* Slot 1: Main menu (center) */}
        <div style={{ width: POPUP_WIDTH, flexShrink: 0, opacity: view === 'main' ? 1 : 0, transition: 'opacity 0.24s ease, background-color 0.25s ease, color 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease' }}>
          <MainMenuView
            totalRecords={totalRecords}
            onOpenMemory={() => navigateTo('memory')}
            onOpenFolder={() => navigateTo('folder')}
            isOnAISite={isOnAISite}
            onOpenPanel={handleOpenPanel}
            onImported={refreshTotal}
            onOpenSettings={openSettings}
          />
        </div>

        {/* Slot 2: Detail view — both rendered, toggled to prevent flash during slide-back */}
        <div style={{ width: POPUP_WIDTH, flexShrink: 0, position: 'relative', opacity: view === 'memory' || view === 'folder' ? 1 : 0, transition: 'opacity 0.24s ease, background-color 0.25s ease, color 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease' }}>
          <div style={{ display: detailView === 'memory' ? 'flex' : 'none', flexDirection: 'column', height: 580 }}>
            <MemoryTableView onBack={goBack} onDeleted={refreshTotal} reloadKey={dataVersion} maxHeight={580} />
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
