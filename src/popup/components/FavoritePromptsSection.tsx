import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { FavoritePrompt } from '../../types/memory'
import { useTranslation } from '../../i18n/LanguageContext'
import { useTheme } from '../../i18n/ThemeContext'
import { getThemeTokens } from '../../ui/theme'
import { PromptTrie } from '../../utils/trie'
import {
  PROMPTS_STORAGE_KEY as STORAGE_KEY,
  FOLDERS_STORAGE_KEY as FOLDERS_KEY,
  PROMPT_DRAG_TYPE as DRAG_TYPE,
} from '../../constants/prompts'

// ── SVG Icons ──────────────────────────────────────────────────────────────────

const StarIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
)

// ── Component ──────────────────────────────────────────────────────────────────

const MAX_VISIBLE = 3
const TRUNCATE_AT = 80

export function FavoritePromptsSection() {
  const { t } = useTranslation()
  const { theme } = useTheme()
  const tk = getThemeTokens(theme)
  const [prompts, setPrompts] = useState<FavoritePrompt[]>([])
  const [newText, setNewText] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [listExpanded, setListExpanded] = useState(false)
  const [suggestionsDismissed, setSuggestionsDismissed] = useState(false)
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const trieRef = useRef(new PromptTrie())

  useEffect(() => {
    chrome.storage.local.get(STORAGE_KEY, (result) => {
      const stored = result[STORAGE_KEY]
      if (Array.isArray(stored)) {
        setPrompts(stored)
        trieRef.current.rebuild(stored.map((p: FavoritePrompt) => p.text))
      }
    })
    const listener = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes[STORAGE_KEY]?.newValue != null && Array.isArray(changes[STORAGE_KEY].newValue)) {
        const next = changes[STORAGE_KEY].newValue as FavoritePrompt[]
        setPrompts(next)
        trieRef.current.rebuild(next.map((p) => p.text))
      }
    }
    chrome.storage.onChanged.addListener(listener)
    return () => chrome.storage.onChanged.removeListener(listener)
  }, [])

  const savePrompts = useCallback((next: FavoritePrompt[]) => {
    setPrompts(next)
    trieRef.current.rebuild(next.map((p) => p.text))
    chrome.storage.local.set({ [STORAGE_KEY]: next })
  }, [])

  const savePrompt = useCallback(() => {
    const text = newText.trim()
    if (!text) return
    const prompt: FavoritePrompt = { id: Date.now().toString(), text, createdAt: Date.now() }
    savePrompts([...prompts, prompt])
    setNewText('')
  }, [newText, prompts, savePrompts])

  const deletePrompt = useCallback(
    (id: string) => {
      const removed = prompts.find((p) => p.id === id)
      savePrompts(prompts.filter((p) => p.id !== id))
      if (removed) trieRef.current.remove(removed.text)
      chrome.storage.local.get(FOLDERS_KEY, (r) => {
        const folders = r[FOLDERS_KEY] as Array<{ id: string; promptIds: string[] }> | undefined
        if (Array.isArray(folders)) {
          const updated = folders.map((f) => ({
            ...f,
            promptIds: f.promptIds.filter((pid) => pid !== id),
          }))
          chrome.storage.local.set({ [FOLDERS_KEY]: updated })
        }
      })
    },
    [prompts, savePrompts]
  )

  const copyPrompt = useCallback((text: string, id: string) => {
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

  const canSave = newText.trim().length > 0
  const visiblePrompts = listExpanded ? prompts : prompts.slice(0, MAX_VISIBLE)
  const hiddenCount = prompts.length - MAX_VISIBLE

  const suggestList = useMemo(() => {
    const prefix = newText.trim()
    if (prefix.length < 2) return []
    return trieRef.current.suggest(prefix, 5).filter((s) => s !== prefix)
  }, [newText])

  const applySuggestion = useCallback((text: string) => {
    setNewText(text)
    setSuggestionsDismissed(true)
    setSelectedSuggestionIndex(0)
    textareaRef.current?.focus()
  }, [])

  const handleTextareaKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        savePrompt()
        return
      }
      if (e.key === 'Escape' && suggestList.length > 0) {
        setSuggestionsDismissed(true)
        setSelectedSuggestionIndex(0)
        return
      }
      if (suggestList.length === 0) return
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedSuggestionIndex((i) => (i + 1) % suggestList.length)
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedSuggestionIndex((i) => (i - 1 + suggestList.length) % suggestList.length)
        return
      }
      if (e.key === 'Tab') {
        e.preventDefault()
        const chosen = suggestList[selectedSuggestionIndex]
        if (chosen) applySuggestion(chosen)
      }
    },
    [suggestList, selectedSuggestionIndex, savePrompt, applySuggestion]
  )

  const handleTextareaChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewText(e.target.value)
    setSuggestionsDismissed(false)
    setSelectedSuggestionIndex(0)
  }, [])

  const handleDragStart = useCallback((e: React.DragEvent, promptId: string) => {
    e.dataTransfer.setData(DRAG_TYPE, promptId)
    e.dataTransfer.setData('text/plain', promptId)
    e.dataTransfer.effectAllowed = 'copy'
  }, [])

  return (
    <div style={styles.container}>
      {/* Section header */}
      <div style={styles.sectionHeader}>
        <span style={{ ...styles.starIcon, color: tk.textMuted }}>
          <StarIcon />
        </span>
        <span style={{ ...styles.sectionTitle, color: tk.text }}>{t.favoritePrompts}</span>
      </div>

      {/* Saved prompts list */}
      {prompts.length > 0 ? (
        <div style={styles.promptList}>
          {visiblePrompts.map((p) => {
            const isExpanded = expandedIds.has(p.id)
            const needsTruncation = p.text.length > TRUNCATE_AT
            const displayText =
              !isExpanded && needsTruncation ? p.text.slice(0, TRUNCATE_AT) + '…' : p.text
            return (
              <div
                key={p.id}
                style={{
                  ...styles.promptRow,
                  backgroundColor: tk.bgCard,
                  borderColor: tk.border,
                }}
                draggable
                onDragStart={(e) => handleDragStart(e, p.id)}
              >
                <div style={styles.promptBody}>
                  <span style={{ ...styles.promptText, color: tk.text }}>{displayText}</span>
                  {needsTruncation && (
                    <button
                      type="button"
                      style={{ ...styles.seeMoreBtn, color: tk.accent }}
                      onClick={() => toggleExpanded(p.id)}
                    >
                      {isExpanded ? t.seeLess : t.seeMore}
                    </button>
                  )}
                </div>
                <div style={styles.promptActions}>
                  <button
                    type="button"
                    style={{ ...styles.copyBtn, color: tk.accent }}
                    onClick={() => copyPrompt(p.text, p.id)}
                  >
                    {copiedId === p.id ? t.copied : t.copyBtn}
                  </button>
                  <button
                    type="button"
                    style={{ ...styles.deletePromptBtn, color: tk.textTertiary }}
                    onClick={() => deletePrompt(p.id)}
                    title={t.deleteBtn}
                  >
                    ×
                  </button>
                </div>
              </div>
            )
          })}

          {prompts.length > MAX_VISIBLE && (
            <button
              type="button"
              style={{ ...styles.listToggleBtn, color: tk.accent }}
              onClick={() => setListExpanded((v) => !v)}
            >
              {listExpanded ? t.seeLess : `${t.seeMore} (${hiddenCount})`}
            </button>
          )}
        </div>
      ) : (
        <div style={{ ...styles.noPrompts, color: tk.textMuted }}>{t.noPrompts}</div>
      )}

      {/* New prompt input with autosuggest */}
      <div style={styles.inputWrapper}>
        <textarea
          ref={textareaRef}
          value={newText}
          onChange={handleTextareaChange}
          placeholder={t.promptPlaceholder}
          style={{
            ...styles.textarea,
            backgroundColor: tk.inputBg,
            borderColor: tk.inputBorder,
            color: tk.text,
          }}
          rows={3}
          onKeyDown={handleTextareaKeyDown}
        />
        {suggestList.length > 0 && !suggestionsDismissed && (
          <div
            style={{
              ...styles.suggestList,
              backgroundColor: tk.bgCard,
              borderColor: tk.border,
            }}
          >
            <div style={{ ...styles.suggestLabel, color: tk.textMuted }}>{t.suggestFromHistory}</div>
            {suggestList.map((s, i) => (
              <button
                key={s}
                type="button"
                style={{
                  ...styles.suggestItem,
                  color: tk.text,
                  backgroundColor: i === selectedSuggestionIndex ? tk.btnHoverBg : 'transparent',
                }}
                onClick={() => applySuggestion(s)}
                onMouseEnter={() => setSelectedSuggestionIndex(i)}
              >
                {s.length > 80 ? s.slice(0, 80) + '…' : s}
              </button>
            ))}
          </div>
        )}
      </div>
      <div style={styles.saveRow}>
        <span style={{ ...styles.hint, color: tk.textTertiary }}>⌘↵</span>
        <button
          type="button"
          onClick={savePrompt}
          disabled={!canSave}
          style={
            canSave
              ? { ...styles.saveBtn, backgroundColor: tk.btnPrimaryBg }
              : { ...styles.saveBtn, ...styles.saveBtnDisabled }
          }
        >
          {t.savePrompt}
        </button>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  starIcon: {
    display: 'flex',
    alignItems: 'center',
    flexShrink: 0,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 600,
    letterSpacing: '-0.01em',
  },
  promptList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  promptRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 6,
    border: '1px solid',
    borderRadius: 10,
    padding: '8px 10px',
    cursor: 'grab',
  },
  promptBody: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    minWidth: 0,
  },
  promptText: {
    fontSize: 12,
    lineHeight: 1.5,
    wordBreak: 'break-word',
    letterSpacing: '-0.01em',
  },
  seeMoreBtn: {
    fontSize: 11,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    textDecoration: 'underline',
    textAlign: 'left',
    whiteSpace: 'nowrap',
    fontFamily: 'inherit',
  },
  promptActions: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
  },
  copyBtn: {
    fontSize: 11,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '1px 4px',
    textDecoration: 'underline',
    whiteSpace: 'nowrap',
    fontFamily: 'inherit',
  },
  deletePromptBtn: {
    fontSize: 15,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '0 2px',
    lineHeight: 1,
  },
  listToggleBtn: {
    fontSize: 11,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '2px 0',
    textDecoration: 'underline',
    textAlign: 'left',
    fontFamily: 'inherit',
  },
  noPrompts: {
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
    padding: '2px 0',
  },
  inputWrapper: {
    position: 'relative',
  },
  suggestList: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 4,
    border: '1px solid',
    borderRadius: 10,
    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
    zIndex: 10,
    maxHeight: 140,
    overflowY: 'auto',
  },
  suggestLabel: {
    fontSize: 10,
    padding: '5px 10px',
    borderBottom: '1px solid rgba(128,128,128,0.15)',
    letterSpacing: '0.03em',
  },
  suggestItem: {
    display: 'block',
    width: '100%',
    padding: '7px 10px',
    fontSize: 12,
    textAlign: 'left',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    fontFamily: 'inherit',
    transition: 'background-color 0.08s ease',
  },
  textarea: {
    width: '100%',
    padding: '8px 10px',
    borderRadius: 10,
    border: '1px solid',
    fontSize: 13,
    lineHeight: 1.5,
    resize: 'vertical',
    outline: 'none',
    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif',
    boxSizing: 'border-box',
    minHeight: 70,
    letterSpacing: '-0.01em',
  },
  saveRow: {
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
  },
  hint: {
    fontSize: 11,
    letterSpacing: '0.02em',
  },
  saveBtn: {
    fontSize: 12,
    fontWeight: 600,
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '5px 14px',
    cursor: 'pointer',
    fontFamily: 'inherit',
    letterSpacing: '-0.01em',
  },
  saveBtnDisabled: {
    backgroundColor: 'rgba(128,128,128,0.25)',
    cursor: 'not-allowed',
  },
}
