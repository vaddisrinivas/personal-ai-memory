import React, { useCallback, useEffect, useState } from 'react'
import type { MemoryRecord } from '../../types/memory'
import type {
  DeleteRecordResponse,
  GetConversationTitlesResponse,
  QueryRecordsResponse,
} from '../../types/messages'
import { useTranslation } from '../../i18n/LanguageContext'
import { useTheme } from '../../i18n/ThemeContext'
import { getThemeTokens } from '../../ui/theme'
import { ChevronLeftIcon, ChevronDownIcon, ChevronRightIcon } from '../../ui/icons'
import * as S from '../../ui/styles'

// ── Helpers ────────────────────────────────────────────────────────────────────

const FETCH_LIMIT = 300

function formatLocalTime(ms: number): string {
  return new Date(ms).toLocaleString(undefined, {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

function truncate(text: string, max = 120): string {
  return text.length > max ? text.slice(0, max) + '…' : text
}

const roleLabel: Record<string, string> = {
  user: 'User',
  assistant: 'AI',
}

function formatProviderLabel(sessionId: string): string {
  const provider = sessionId.split(':')[0]?.toLowerCase() ?? ''
  if (provider === 'openai') return 'openAI'
  if (provider === 'anthropic') return 'Anthropic'
  if (provider === 'google') return 'Google'
  return provider || 'Unknown'
}

function groupBySessionId(records: MemoryRecord[]): Map<string, MemoryRecord[]> {
  const map = new Map<string, MemoryRecord[]>()
  for (const r of records) {
    const list = map.get(r.sessionId) ?? []
    list.push(r)
    map.set(r.sessionId, list)
  }
  for (const list of map.values()) {
    list.sort((a, b) => a.createdAt - b.createdAt)
  }
  return map
}

// ─── Chunk Merging ─────────────────────────────────────────────────────────────

interface DisplayRecord {
  id: string
  chunkIds: string[]
  role: MemoryRecord['role']
  content: string
  createdAt: number
  isChunked: boolean
  chunkCount: number
}

function mergeChunks(records: MemoryRecord[]): DisplayRecord[] {
  const parentGroups = new Map<string, MemoryRecord[]>()
  const standalones: MemoryRecord[] = []

  for (const r of records) {
    if (r.parentId) {
      const arr = parentGroups.get(r.parentId) ?? []
      arr.push(r)
      parentGroups.set(r.parentId, arr)
    } else {
      standalones.push(r)
    }
  }

  for (const chunks of parentGroups.values()) {
    chunks.sort((a, b) => (a.chunkIndex ?? 0) - (b.chunkIndex ?? 0))
  }

  const result: DisplayRecord[] = []

  for (const r of standalones) {
    result.push({
      id: r.id,
      chunkIds: [r.id],
      role: r.role,
      content: r.content,
      createdAt: r.createdAt,
      isChunked: false,
      chunkCount: 1,
    })
  }

  for (const [parentId, chunks] of parentGroups.entries()) {
    result.push({
      id: parentId,
      chunkIds: chunks.map((c) => c.id),
      role: chunks[0].role,
      content: chunks.map((c) => c.content).join(''),
      createdAt: chunks[0].createdAt,
      isChunked: true,
      chunkCount: chunks.length,
    })
  }

  return result.sort((a, b) => a.createdAt - b.createdAt)
}

// ── Component ──────────────────────────────────────────────────────────────────

interface MemoryTableViewProps {
  onDeleted?: () => void
  onBack?: () => void
  width?: number
  maxHeight?: number
}

export function MemoryTableView({ onDeleted, onBack, width, maxHeight }: MemoryTableViewProps) {
  const { t } = useTranslation()
  const { theme } = useTheme()
  const tk = getThemeTokens(theme)
  const [records, setRecords] = useState<MemoryRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [hoverId, setHoverId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [collapsedSessions, setCollapsedSessions] = useState<Set<string>>(new Set())
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [titles, setTitles] = useState<Map<string, string>>(new Map())
  const [searchQuery, setSearchQuery] = useState('')

  const toggleSession = useCallback((sessionId: string) => {
    setCollapsedSessions((prev) => {
      const next = new Set(prev)
      if (next.has(sessionId)) next.delete(sessionId)
      else next.add(sessionId)
      return next
    })
  }, [])

  const copyContent = useCallback((text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 1500)
    })
  }, [])

  const toggleExpanded = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const loadTitles = useCallback((sessionIds: string[]) => {
    if (sessionIds.length === 0) return
    chrome.runtime.sendMessage(
      { type: 'GET_CONVERSATION_TITLES', payload: { sessionIds } },
      (response: GetConversationTitlesResponse | undefined) => {
        if (chrome.runtime.lastError || !response) return
        const titlesRecord = response.payload.titles
        if (titlesRecord && typeof titlesRecord === 'object') {
          const titlesMap = new Map<string, string>()
          for (const [sessionId, title] of Object.entries(titlesRecord)) {
            if (title) titlesMap.set(sessionId, title)
          }
          setTitles(titlesMap)
        }
      }
    )
  }, [])

  const load = useCallback(() => {
    setLoading(true)
    chrome.runtime.sendMessage(
      { type: 'QUERY_RECORDS', payload: { filters: { limit: FETCH_LIMIT } } },
      (response: QueryRecordsResponse | undefined) => {
        if (chrome.runtime.lastError || !response) {
          setRecords([])
          setLoading(false)
        } else {
          setRecords(response.payload.records)
          const sessionIds = Array.from(new Set(response.payload.records.map((r) => r.sessionId)))
          loadTitles(sessionIds)
          setLoading(false)
        }
      }
    )
  }, [loadTitles])

  useEffect(() => {
    load()
  }, [load])

  const handleDelete = useCallback(
    (displayId: string, chunkIds: string[]) => {
      setDeletingId(displayId)
      Promise.all(
        chunkIds.map(
          (chunkId) =>
            new Promise<boolean>((resolve) => {
              chrome.runtime.sendMessage(
                { type: 'DELETE_RECORD', payload: { recordId: chunkId } },
                (response: DeleteRecordResponse | undefined) => {
                  resolve(!chrome.runtime.lastError && !!response?.payload.success)
                }
              )
            })
        )
      ).then((results) => {
        setDeletingId(null)
        if (results.every(Boolean)) {
          setRecords((prev) => prev.filter((r) => !chunkIds.includes(r.id)))
          onDeleted?.()
        }
      })
    },
    [onDeleted]
  )

  const groups = groupBySessionId(records)
  const allSessionIds = Array.from(groups.keys()).sort((a, b) => {
    const aMax = Math.max(...(groups.get(a) ?? []).map((r) => r.createdAt))
    const bMax = Math.max(...(groups.get(b) ?? []).map((r) => r.createdAt))
    return bMax - aMax
  })

  const q = searchQuery.trim().toLowerCase()
  const sessionIds = q
    ? allSessionIds.filter((sid) => {
        const title = titles.get(sid) ?? ''
        if (title.toLowerCase().includes(q)) return true
        const list = groups.get(sid) ?? []
        return mergeChunks(list).some((dr) => dr.content.toLowerCase().includes(q))
      })
    : allSessionIds

  // When used inside the floating panel, the component owns its own scroll region
  // so the back header stays pinned at the top regardless of scroll position.
  const isFloating = !!onBack

  const backHeader = onBack ? (
    <div
      style={{
        ...S.viewHeader,
        flexShrink: 0,
        // Sticky within the panel's scroll container
        position: 'sticky',
        top: 0,
        zIndex: 1,
        backgroundColor: 'inherit',
      }}
    >
      <button
        type="button"
        style={{ ...S.iconBtn, backgroundColor: tk.btnBg, borderColor: tk.border, color: tk.text }}
        onClick={onBack}
      >
        <ChevronLeftIcon />
      </button>
      <span style={{ ...S.viewTitle, paddingLeft: 2, color: tk.text }}>{t.memoryList}</span>
    </div>
  ) : null

  if (loading) {
    return (
      <div style={{ ...S.viewContainerLoose, backgroundColor: tk.bg }}>
        {backHeader}
        <div style={{ ...styles.loading, color: tk.textMuted }}>{t.loadingMemories}</div>
      </div>
    )
  }

  if (records.length === 0) {
    return (
      <div style={{ ...S.viewContainerLoose, backgroundColor: tk.bg }}>
        {backHeader}
        <div style={{ ...styles.empty, color: tk.textMuted }}>{t.noMemories}</div>
      </div>
    )
  }

  const containerStyle: React.CSSProperties = {
    ...styles.container,
    backgroundColor: tk.bg,
    ...(width ? { width, maxWidth: width } : {}),
    ...(isFloating ? { display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 } : {}),
  }

  const effectiveMaxHeight = maxHeight ?? (onBack ? 500 : 360)
  // In floating mode the scroll div grows to fill remaining space;
  // in popup mode it uses the legacy maxHeight cap.
  const scrollStyle: React.CSSProperties = isFloating
    ? { ...styles.scroll, flex: 1, minHeight: 0, maxHeight: 'none', overflowY: 'auto' }
    : { ...styles.scroll, maxHeight: effectiveMaxHeight }

  return (
    <div style={containerStyle}>
      {backHeader}
      <div style={{ paddingLeft: 4, paddingRight: 4, paddingBottom: 8, flexShrink: 0 }}>
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t.searchMemories}
          style={{
            width: '100%',
            boxSizing: 'border-box',
            padding: '7px 10px',
            fontSize: 12,
            borderRadius: 8,
            border: `1px solid ${tk.border}`,
            backgroundColor: tk.inputBg,
            color: tk.text,
            outline: 'none',
            fontFamily: 'inherit',
          }}
        />
      </div>
      <div style={{ ...styles.sectionTitle, color: tk.textMuted, paddingLeft: 4, paddingRight: 4, flexShrink: 0 }}>
        {t.allMemories}
      </div>
      <div style={{ ...scrollStyle, paddingLeft: 4, paddingRight: 4 }}>
        {sessionIds.length === 0 && q ? (
          <div style={{ ...styles.empty, color: tk.textMuted }}>{t.searchNoResults}</div>
        ) : (
          sessionIds.map((sessionId) => {
            const list = groups.get(sessionId) ?? []
            const isCollapsed = q ? false : collapsedSessions.has(sessionId)
            const title = titles.get(sessionId)
            const providerLabel = formatProviderLabel(sessionId)
            const displayText = title
              ? `${title} (${providerLabel})`
              : sessionId.length > 28
                ? sessionId.slice(0, 25) + '…'
                : sessionId
            return (
              <div key={sessionId} style={styles.group}>
                <button
                  type="button"
                  style={{ ...styles.groupHeaderBtn, color: tk.textMuted }}
                  onClick={() => toggleSession(sessionId)}
                  aria-expanded={!isCollapsed}
                >
                  <span style={{ ...styles.groupHeaderCaret, color: tk.textTertiary }}>
                    {isCollapsed ? <ChevronRightIcon /> : <ChevronDownIcon />}
                  </span>
                  <span style={styles.groupHeader} title={title ? sessionId : undefined}>
                    {displayText}
                  </span>
                </button>
                {!isCollapsed && (
                  <div style={styles.recordList}>
                    {mergeChunks(list).map((dr) => (
                      <div
                        key={dr.id}
                        style={{
                          ...styles.row,
                          backgroundColor: hoverId === dr.id ? tk.btnHoverBg : tk.bgCard,
                          borderColor: tk.border,
                        }}
                        onMouseEnter={() => setHoverId(dr.id)}
                        onMouseLeave={() => setHoverId(null)}
                      >
                        <div style={styles.rowMain}>
                          <span style={{ ...styles.role, color: tk.textMuted }}>
                            {roleLabel[dr.role] ?? dr.role}
                            {dr.isChunked && (
                              <span style={{ fontSize: 10, color: tk.textTertiary, marginLeft: 4, fontWeight: 400 }}>
                                ×{dr.chunkCount}
                              </span>
                            )}
                          </span>
                          <span style={{ ...styles.time, color: tk.textTertiary }}>{formatLocalTime(dr.createdAt)}</span>
                        </div>
                        <div style={styles.rowContentLine}>
                          <div
                            style={{ ...styles.content, color: tk.text }}
                            onClick={() => toggleExpanded(dr.id)}
                            title={expandedIds.has(dr.id) ? undefined : dr.content}
                          >
                            {expandedIds.has(dr.id) ? dr.content : truncate(dr.content)}
                          </div>
                          <div style={styles.actions}>
                            {(hoverId === dr.id || deletingId === dr.id) && (
                              <button
                                style={{ ...styles.deleteBtn, color: tk.errorText }}
                                disabled={deletingId === dr.id}
                                onClick={() => handleDelete(dr.id, dr.chunkIds)}
                                type="button"
                              >
                                {deletingId === dr.id ? t.deleting : t.deleteBtn}
                              </button>
                            )}
                            <button
                              type="button"
                              style={{ ...styles.copyBtn, color: tk.accent }}
                              onClick={() => copyContent(dr.content, dr.id)}
                              title={t.copyBtn}
                            >
                              {copiedId === dr.id ? t.copied : t.copyBtn}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    marginTop: 0,
    paddingLeft: 4,
    paddingRight: 4,
    paddingBottom: 8,
    boxSizing: 'border-box',
    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif',
  },
  backHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '10px 12px',
    borderBottom: '1px solid',
    marginBottom: 10,
  },
  backBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: 13,
    padding: '2px 6px 2px 0',
    fontWeight: 500,
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    fontFamily: 'inherit',
  },
  backTitle: {
    fontSize: 14,
    fontWeight: 600,
    letterSpacing: '-0.01em',
  },
  loading: {
    padding: 12,
    fontSize: 12,
    textAlign: 'center',
  },
  empty: {
    padding: 12,
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    marginBottom: 8,
  },
  scroll: {
    maxHeight: 360,
    overflowY: 'auto',
  },
  group: {
    marginBottom: 14,
  },
  groupHeaderBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    width: '100%',
    padding: '4px 0',
    marginBottom: 4,
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    textAlign: 'left',
    fontSize: 11,
    fontFamily: 'ui-monospace, monospace',
  },
  groupHeaderCaret: {
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
  },
  groupHeader: {
    wordBreak: 'break-all',
  },
  recordList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  rowContentLine: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  row: {
    border: '1px solid',
    borderRadius: 10,
    padding: '10px 14px',
    position: 'relative',
    transition: 'background-color 0.1s ease',
  },
  rowMain: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  role: {
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.02em',
  },
  time: {
    fontSize: 10,
    flexShrink: 0,
  },
  content: {
    fontSize: 12,
    lineHeight: 1.5,
    wordBreak: 'break-word',
    flex: 1,
    padding: '2px 0',
    cursor: 'pointer',
    letterSpacing: '-0.01em',
  },
  actions: {
    display: 'flex',
    gap: 8,
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  copyBtn: {
    fontSize: 11,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '2px 6px',
    textDecoration: 'underline',
    fontFamily: 'inherit',
  },
  deleteBtn: {
    fontSize: 11,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '2px 6px',
    textDecoration: 'underline',
    fontFamily: 'inherit',
  },
}
