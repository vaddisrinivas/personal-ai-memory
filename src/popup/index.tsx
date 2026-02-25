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

function App() {
  const [view, setView] = useState<View>('main')
  const [detailView, setDetailView] = useState<DetailView>('memory')
  const [totalRecords, setTotalRecords] = useState(0)
  const [loading, setLoading] = useState(true)
  const [activeTabId, setActiveTabId] = useState<number | null>(null)
  const [isOnAISite, setIsOnAISite] = useState(false)
  const { theme } = useTheme()
  const tk = getThemeTokens(theme)
  const { t } = useTranslation()

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

  // Keep totalRecords in sync with live STATUS_UPDATE broadcasts
  useEffect(() => {
    const listener = (message: unknown) => {
      const msg = message as StatusUpdate
      if (msg.type !== 'STATUS_UPDATE') return
      setTotalRecords(msg.payload.totalRecords)
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
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
          backgroundColor: tk.bg,
        }}
      >
        {t.loading}
      </div>
    )
  }

  return (
    <div
      style={{
        width: POPUP_WIDTH,
        minWidth: POPUP_WIDTH,
        overflow: 'hidden',
        backgroundColor: tk.bg,
      }}
    >
      {view === 'settings' ? (
        <SettingsView onBack={goBack} onAllDeleted={refreshTotal} />
      ) : (
        /* Sliding panel: two slots side by side, translateX controls which is visible */
        <div
          style={{
            display: 'flex',
            width: POPUP_WIDTH * 2,
            transform: view === 'main' ? 'translateX(0)' : `translateX(-${POPUP_WIDTH}px)`,
            transition: 'transform 0.32s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          {/* Slot 0: Main menu */}
          <div style={{ width: POPUP_WIDTH, flexShrink: 0 }}>
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

          {/* Slot 1: Detail view (memory or folder) */}
          <div style={{ width: POPUP_WIDTH, flexShrink: 0, maxHeight: 580, overflowY: 'auto' }}>
            {detailView === 'memory' ? (
              <MemoryTableView onBack={goBack} onDeleted={refreshTotal} />
            ) : (
              <FolderView onBack={goBack} width={POPUP_WIDTH} />
            )}
          </div>
        </div>
      )}
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
