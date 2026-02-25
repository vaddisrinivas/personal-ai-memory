import React, { useRef, useState, useEffect } from 'react'
import type { IMemoryExportEnvelope, SerializableMemoryRecord } from '../../types/memory'
import type { ImportMemoriesResponse } from '../../types/messages'
import { useTranslation } from '../../i18n/LanguageContext'
import { useTheme } from '../../i18n/ThemeContext'
import { getThemeTokens } from '../../ui/theme'
import { DownloadIcon, ChevronRightIcon } from '../../ui/icons'
import * as S from '../../ui/styles'

// ── ChatGPT Conversation Parser ────────────────────────────────────────────────

interface ChatGPTMessage {
  id: string
  author: { role: string }
  content: { content_type: string; parts?: unknown[] }
  create_time: number | null
  status: string
}

interface ChatGPTMappingNode {
  id: string
  message: ChatGPTMessage | null
  parent: string | null
  children: string[]
}

interface ChatGPTConversation {
  id: string
  title?: string
  mapping: Record<string, ChatGPTMappingNode>
  create_time?: number
}

function parseChatGPTConversations(raw: unknown): SerializableMemoryRecord[] {
  if (!Array.isArray(raw)) throw new Error('Not an array')
  const records: SerializableMemoryRecord[] = []
  const now = Date.now()

  for (const conv of raw as ChatGPTConversation[]) {
    if (!conv.id || !conv.mapping || typeof conv.mapping !== 'object') continue
    const sessionId = `openai:chatgpt-${conv.id}`

    for (const node of Object.values(conv.mapping)) {
      const msg = node.message
      if (!msg) continue
      const role = msg.author?.role
      if (role !== 'user' && role !== 'assistant') continue
      if (msg.status !== 'finished_successfully') continue
      if (msg.content?.content_type !== 'text') continue

      const parts = msg.content.parts ?? []
      const text = parts
        .filter((p): p is string => typeof p === 'string')
        .join('\n')
        .trim()
      if (!text) continue

      const tsMs = msg.create_time ? msg.create_time * 1000 : now
      const convCreatedAt = conv.create_time ? conv.create_time * 1000 : now

      records.push({
        id: `chatgpt-import-${msg.id}`,
        role: role as 'user' | 'assistant',
        content: text,
        provider: 'openai',
        sessionId,
        timestamp: tsMs,
        createdAt: convCreatedAt,
        isPartial: false,
        isDeleted: false,
        isSuperseded: false,
        metadata: { source: 'chatgpt-export', conversationTitle: conv.title ?? '' },
      })
    }
  }
  return records
}

// ── Gemini Takeout Parser ──────────────────────────────────────────────────────

interface GeminiTakeoutEntry {
  header?: string
  title?: string
  time?: string
  products?: string[]
  safeHtmlItem?: Array<{ html?: string }>
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<li>/gi, '• ')
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function parseGeminiTakeout(raw: unknown): SerializableMemoryRecord[] {
  if (!Array.isArray(raw)) {
    throw new Error('Not an array')
  }
  const records: SerializableMemoryRecord[] = []
  const now = Date.now()
  for (const entry of raw as GeminiTakeoutEntry[]) {
    if (entry.header !== 'Gemini Apps') continue
    const timeMs = entry.time ? new Date(entry.time).getTime() : now
    if (isNaN(timeMs)) continue
    const sessionId = `google:takeout-${timeMs}`
    const rawTitle = entry.title ?? ''
    const userText = rawTitle.startsWith('Prompted ') ? rawTitle.slice('Prompted '.length).trim() : rawTitle.trim()
    if (userText) {
      records.push({
        id: `gemini-takeout-user-${timeMs}`,
        role: 'user',
        content: userText,
        provider: 'google',
        sessionId,
        timestamp: timeMs,
        createdAt: now,
        isPartial: false,
        isDeleted: false,
        isSuperseded: false,
        metadata: { source: 'google-takeout' },
      })
    }
    const htmlParts = (entry.safeHtmlItem ?? []).map((item) => stripHtml(item.html ?? '')).filter(Boolean)
    const assistantText = htmlParts.join('\n\n')
    if (assistantText) {
      records.push({
        id: `gemini-takeout-assistant-${timeMs}`,
        role: 'assistant',
        content: assistantText,
        provider: 'google',
        sessionId,
        timestamp: timeMs + 1,
        createdAt: now,
        isPartial: false,
        isDeleted: false,
        isSuperseded: false,
        metadata: { source: 'google-takeout' },
      })
    }
  }
  return records
}

// ── Component ──────────────────────────────────────────────────────────────────

const APP_NAME = 'PersonalAIMemoryLayer'
type Status = { type: 'idle' } | { type: 'success'; msg: string } | { type: 'error'; msg: string }
interface ImportViewProps { onImported?: () => void }

export function ImportView({ onImported }: ImportViewProps) {
  const [status, setStatus] = useState<Status>({ type: 'idle' })
  const [importing, setImporting] = useState(false)
  const [importingGemini, setImportingGemini] = useState(false)
  const [importingChatGPT, setImportingChatGPT] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const geminiInputRef = useRef<HTMLInputElement>(null)
  const chatgptInputRef = useRef<HTMLInputElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  
  const { t } = useTranslation()
  const { theme } = useTheme()
  const tk = getThemeTokens(theme)

  // 延遲關閉選單，解決 mousedown 導致畫面縮水吞掉下方按鈕 click 的問題
  useEffect(() => {
    let timeoutId: number
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        timeoutId = window.setTimeout(() => {
          setMenuOpen(false)
        }, 150) // 延遲 150 毫秒，保證 Export 按鈕能順利完成點擊
      }
    }
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      clearTimeout(timeoutId)
    }
  }, [menuOpen])

  async function sendRecordsToBackground(records: SerializableMemoryRecord[]): Promise<number> {
    const resp = await new Promise<ImportMemoriesResponse>((resolve, reject) => {
      chrome.runtime.sendMessage({ type: 'IMPORT_MEMORIES', payload: { records } }, (r: ImportMemoriesResponse | undefined) => {
        if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message))
        if (!r) return reject(new Error('No response from background'))
        resolve(r)
      })
    })
    if (!resp.payload.success) throw new Error(resp.payload.error ?? '寫入失敗')
    return resp.payload.count
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    setStatus({ type: 'idle' })
    const reader = new FileReader()
    reader.onload = async (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string) as IMemoryExportEnvelope
        if (data?.metadata?.app !== APP_NAME) throw new Error(t.importInvalidApp)
        if (!Array.isArray(data.payload)) throw new Error(t.importInvalidPayload)
        const resp = await new Promise<ImportMemoriesResponse>((resolve, reject) => {
          chrome.runtime.sendMessage({
            type: 'IMPORT_MEMORIES',
            payload: {
              records: data.payload as SerializableMemoryRecord[],
              ...(Array.isArray(data.prompts) && data.prompts.length > 0 && { prompts: data.prompts }),
              ...(Array.isArray(data.folders) && data.folders.length > 0 && { folders: data.folders }),
            },
          }, (r: ImportMemoriesResponse | undefined) => {
            if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message))
            if (!r) return reject(new Error('No response from background'))
            resolve(r)
          })
        })
        if (!resp.payload.success) throw new Error(resp.payload.error ?? '寫入失敗')
        setStatus({ type: 'success', msg: t.importSuccess(resp.payload.count) })
        setMenuOpen(false)
        onImported?.()
      } catch (err) {
        setStatus({ type: 'error', msg: t.importFailed((err as Error).message ?? String(err)) })
      } finally {
        setImporting(false)
        e.target.value = ''
      }
    }
    reader.onerror = () => { setStatus({ type: 'error', msg: t.importReadFailed }); setImporting(false) }
    reader.readAsText(file)
  }

  async function handleGeminiFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImportingGemini(true)
    setStatus({ type: 'idle' })
    const reader = new FileReader()
    reader.onload = async (ev) => {
      try {
        let raw: unknown
        try { raw = JSON.parse(ev.target?.result as string) } catch { throw new Error(t.importGeminiInvalidFile) }
        if (!Array.isArray(raw)) throw new Error(t.importGeminiInvalidFile)
        const hasGemini = (raw as GeminiTakeoutEntry[]).some((e) => e.header === 'Gemini Apps')
        if (!hasGemini) throw new Error(t.importGeminiInvalidFile)
        const records = parseGeminiTakeout(raw)
        if (records.length === 0) throw new Error(t.importGeminiInvalidFile)
        const count = await sendRecordsToBackground(records)
        setStatus({ type: 'success', msg: t.importGeminiSuccess(count) })
        setMenuOpen(false)
        onImported?.()
      } catch (err) {
        setStatus({ type: 'error', msg: t.importGeminiFailed((err as Error).message ?? String(err)) })
      } finally {
        setImportingGemini(false)
        e.target.value = ''
      }
    }
    reader.onerror = () => { setStatus({ type: 'error', msg: t.importReadFailed }); setImportingGemini(false) }
    reader.readAsText(file)
  }

  async function handleChatGPTFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImportingChatGPT(true)
    setStatus({ type: 'idle' })
    const reader = new FileReader()
    reader.onload = async (ev) => {
      try {
        let raw: unknown
        try { raw = JSON.parse(ev.target?.result as string) } catch { throw new Error(t.importChatGPTInvalidFile) }
        if (!Array.isArray(raw)) throw new Error(t.importChatGPTInvalidFile)
        const records = parseChatGPTConversations(raw)
        if (records.length === 0) throw new Error(t.importChatGPTInvalidFile)
        const count = await sendRecordsToBackground(records)
        setStatus({ type: 'success', msg: t.importChatGPTSuccess(count) })
        setMenuOpen(false)
        onImported?.()
      } catch (err) {
        setStatus({ type: 'error', msg: t.importChatGPTFailed((err as Error).message ?? String(err)) })
      } finally {
        setImportingChatGPT(false)
        e.target.value = ''
      }
    }
    reader.onerror = () => { setStatus({ type: 'error', msg: t.importReadFailed }); setImportingChatGPT(false) }
    reader.readAsText(file)
  }

  const busy = importing || importingGemini || importingChatGPT
  const buttonLabel = importing ? t.importing : importingGemini ? t.importingGemini : importingChatGPT ? t.importingChatGPT : t.importBackup

  const toggleMenu = (e: React.MouseEvent) => {
    e.stopPropagation()
    setMenuOpen(!menuOpen)
  }

  function handleChooseBackup(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation() // 強制停止冒泡，避免點擊觸發其他關閉事件
    fileInputRef.current?.click()
  }

  function handleChooseGemini(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation() // 強制停止冒泡
    geminiInputRef.current?.click()
  }

  function handleChooseChatGPT(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    chatgptInputRef.current?.click()
  }

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <button
        ref={btnRef}
        style={busy ? { ...S.menuBtn, ...S.btnDisabled } : { ...S.menuBtn, backgroundColor: tk.btnBg, borderColor: tk.border, color: tk.text }}
        onClick={toggleMenu}
        disabled={busy}
        type="button"
      >
        <span style={S.iconWrap}><DownloadIcon /></span>
        <span style={{ flex: 1 }}>{buttonLabel}</span>
        <span style={{ ...S.iconWrap, opacity: 0.4, transform: menuOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}>
          <ChevronRightIcon />
        </span>
      </button>

      {menuOpen && (
        <div style={{ ...S.dropdownMenu, backgroundColor: tk.bg, borderColor: tk.border }}>
          <div style={{ ...S.dropdownMenuLabel, color: tk.textMuted }}>{t.importChoose}</div>
          <button
            style={{ ...S.dropdownMenuItem, color: tk.text }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = tk.btnBg }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent' }}
            onClick={handleChooseBackup}
            type="button"
          >
            {t.importTypeBackup}
          </button>
          <button
            style={{ ...S.dropdownMenuItem, color: tk.text }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = tk.btnBg }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent' }}
            onClick={handleChooseGemini}
            type="button"
          >
            {t.importTypeGemini}
          </button>
          <button
            style={{ ...S.dropdownMenuItem, color: tk.text }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = tk.btnBg }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent' }}
            onClick={handleChooseChatGPT}
            type="button"
          >
            {t.importTypeChatGPT}
          </button>
        </div>
      )}

      <input ref={fileInputRef} type="file" accept=".json" onChange={handleFileChange} style={{ display: 'none' }} />
      <input ref={geminiInputRef} type="file" accept=".json" onChange={handleGeminiFileChange} style={{ display: 'none' }} />
      <input ref={chatgptInputRef} type="file" accept=".json" onChange={handleChatGPTFileChange} style={{ display: 'none' }} />

      {status.type !== 'idle' && (
        <div style={status.type === 'success' ? { ...S.statusMsg, backgroundColor: tk.successBg, color: tk.successText } : { ...S.statusMsg, backgroundColor: tk.errorBg, color: tk.errorText }}>
          {status.msg}
        </div>
      )}
    </div>
  )
}