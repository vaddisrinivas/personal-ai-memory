import React, { useCallback, useEffect, useRef, useState } from "react";
import type { MemoryRecord } from "../../types/memory";
import type {
  DeleteRecordResponse,
  GetConversationTitlesResponse,
  QueryRecordsResponse,
} from "../../types/messages";
import { useTranslation } from "../../i18n/LanguageContext";
import { useTheme } from "../../i18n/ThemeContext";
import { getThemeTokens } from "../../ui/theme";
import {
  ChevronLeftIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ArrowDownWideNarrowIcon,
  ArrowUpWideNarrowIcon,
} from "../../ui/icons";
import * as S from "../../ui/styles";

type ProviderFilter = "all" | "openai" | "anthropic" | "google" | "perplexity" | "xai";

// ── Helpers ────────────────────────────────────────────────────────────────────

const FETCH_LIMIT = 300;

function formatLocalTime(ms: number): string {
  return new Date(ms).toLocaleString(undefined, {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function truncate(text: string, max = 120): string {
  return text.length > max ? text.slice(0, max) + "…" : text;
}

const roleLabel: Record<string, string> = {
  user: "User",
  assistant: "AI",
};

function getProvider(sessionId: string): string {
  return sessionId.split(":")[0]?.toLowerCase() ?? "";
}

function formatProviderLabel(sessionId: string): string {
  const provider = getProvider(sessionId);
  if (provider === "openai") return "ChatGPT";
  if (provider === "anthropic") return "Claude";
  if (provider === "google") return "Gemini";
  if (provider === "perplexity") return "Perplexity";
  if (provider === "xai") return "Grok";
  return provider || "Unknown";
}

function groupBySessionId(
  records: MemoryRecord[],
): Map<string, MemoryRecord[]> {
  const map = new Map<string, MemoryRecord[]>();
  for (const r of records) {
    const list = map.get(r.sessionId) ?? [];
    list.push(r);
    map.set(r.sessionId, list);
  }
  for (const list of map.values()) {
    list.sort((a, b) => a.timestamp - b.timestamp);
  }
  return map;
}

// ─── Chunk Merging ─────────────────────────────────────────────────────────────

interface DisplayRecord {
  id: string;
  chunkIds: string[];
  role: MemoryRecord["role"];
  content: string;
  timestamp: number;
  createdAt: number;
  isChunked: boolean;
  chunkCount: number;
}

function mergeChunks(records: MemoryRecord[]): DisplayRecord[] {
  const parentGroups = new Map<string, MemoryRecord[]>();
  const standalones: MemoryRecord[] = [];

  for (const r of records) {
    if (r.parentId) {
      const arr = parentGroups.get(r.parentId) ?? [];
      arr.push(r);
      parentGroups.set(r.parentId, arr);
    } else {
      standalones.push(r);
    }
  }

  for (const chunks of parentGroups.values()) {
    chunks.sort((a, b) => (a.chunkIndex ?? 0) - (b.chunkIndex ?? 0));
  }

  const result: DisplayRecord[] = [];

  for (const r of standalones) {
    result.push({
      id: r.id,
      chunkIds: [r.id],
      role: r.role,
      content: r.content,
      timestamp: r.timestamp,
      createdAt: r.createdAt,
      isChunked: false,
      chunkCount: 1,
    });
  }

  for (const [parentId, chunks] of parentGroups.entries()) {
    result.push({
      id: parentId,
      chunkIds: chunks.map((c) => c.id),
      role: chunks[0].role,
      content: chunks.map((c) => c.content).join(""),
      timestamp: chunks[0].timestamp,
      createdAt: chunks[0].createdAt,
      isChunked: true,
      chunkCount: chunks.length,
    });
  }

  // Sort messages within a session by their actual conversation timestamp
  return result.sort((a, b) => a.timestamp - b.timestamp);
}

// ── Animation CSS ────────────────────────────────────────────────────────────

const MEMORY_ANIMATION_CSS = `
@keyframes aimRowFadeIn {
  from { opacity: 0; transform: translateY(-6px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes aimRowFadeOut {
  from { opacity: 1; transform: translateY(0) scale(1); }
  to   { opacity: 0; transform: translateY(-4px) scale(0.97); }
}
.aim-row-enter { animation: aimRowFadeIn 0.25s cubic-bezier(0.4, 0, 0.2, 1) both; }
.aim-row-exit  { animation: aimRowFadeOut 0.25s cubic-bezier(0.4, 0, 0.2, 1) both; pointer-events: none; }
`;

// ── Component ──────────────────────────────────────────────────────────────────

interface MemoryTableViewProps {
  onDeleted?: () => void;
  onBack?: () => void;
  width?: number;
  maxHeight?: number;
  reloadKey?: number;
}

const PROVIDER_FILTERS: { key: ProviderFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "openai", label: "ChatGPT" },
  { key: "anthropic", label: "Claude" },
  { key: "google", label: "Gemini" },
  { key: "perplexity", label: "Perplexity" },
  { key: "xai", label: "Grok" },
];

export function MemoryTableView({
  onDeleted,
  onBack,
  width,
  maxHeight,
  reloadKey,
}: MemoryTableViewProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const tk = getThemeTokens(theme);
  const [records, setRecords] = useState<MemoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [fadingOutIds, setFadingOutIds] = useState<Set<string>>(new Set());
  const [newSessionIds, setNewSessionIds] = useState<Set<string>>(new Set());
  const prevSessionIdsRef = useRef<Set<string>>(new Set());
  const isFirstLoadRef = useRef(true);
  const [collapsedSessions, setCollapsedSessions] = useState<Set<string>>(
    new Set(),
  );
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [titles, setTitles] = useState<Map<string, string>>(new Map());
  const [searchQuery, setSearchQuery] = useState("");
  const [sortDesc, setSortDesc] = useState(true);
  const [providerFilter, setProviderFilter] = useState<ProviderFilter>("all");
  // Tracks sessions the user has manually collapsed while a search is active
  const [searchCollapsed, setSearchCollapsed] = useState<Set<string>>(
    new Set(),
  );

  // Inject animation keyframes once
  useEffect(() => {
    const id = "aim-memory-animation-style";
    if (document.getElementById(id)) return;
    const el = document.createElement("style");
    el.id = id;
    el.textContent = MEMORY_ANIMATION_CSS;
    document.head.appendChild(el);
    return () => el.remove();
  }, []);

  // Detect brand-new session groups after the initial load
  useEffect(() => {
    if (loading) return;
    const currentIds = new Set(records.map((r) => r.sessionId));
    if (isFirstLoadRef.current) {
      isFirstLoadRef.current = false;
      prevSessionIdsRef.current = currentIds;
      return;
    }
    const added = new Set<string>();
    for (const id of currentIds) {
      if (!prevSessionIdsRef.current.has(id)) added.add(id);
    }
    prevSessionIdsRef.current = currentIds;
    if (added.size > 0) {
      setNewSessionIds(added);
      const timer = setTimeout(() => setNewSessionIds(new Set()), 400);
      return () => clearTimeout(timer);
    }
  }, [loading, records]);

  // Reset search-mode collapse state when the query is cleared
  useEffect(() => {
    if (!searchQuery) setSearchCollapsed(new Set());
  }, [searchQuery]);

  // Track searches with debounce
  useEffect(() => {
    if (!searchQuery.trim()) return;
    const id = setTimeout(() => {
    }, 800);
    return () => clearTimeout(id);
  }, [searchQuery]);

  const toggleSession = useCallback(
    (sessionId: string, isSearching: boolean) => {
      if (isSearching) {
        setSearchCollapsed((prev) => {
          const next = new Set(prev);
          if (next.has(sessionId)) next.delete(sessionId);
          else next.add(sessionId);
          return next;
        });
      } else {
        setCollapsedSessions((prev) => {
          const next = new Set(prev);
          if (next.has(sessionId)) next.delete(sessionId);
          else next.add(sessionId);
          return next;
        });
      }
    },
    [],
  );

  const copyContent = useCallback((text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    });
  }, []);

  const toggleExpanded = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const loadTitles = useCallback((sessionIds: string[]) => {
    if (sessionIds.length === 0) return;
    chrome.runtime.sendMessage(
      { type: "GET_CONVERSATION_TITLES", payload: { sessionIds } },
      (response: GetConversationTitlesResponse | undefined) => {
        if (chrome.runtime.lastError || !response) return;
        const titlesRecord = response.payload.titles;
        if (titlesRecord && typeof titlesRecord === "object") {
          const titlesMap = new Map<string, string>();
          for (const [sessionId, title] of Object.entries(titlesRecord)) {
            if (title) titlesMap.set(sessionId, title);
          }
          setTitles(titlesMap);
        }
      },
    );
  }, []);

  const load = useCallback(
    (showSpinner = false) => {
      if (showSpinner) setLoading(true);
      chrome.runtime.sendMessage(
        { type: "QUERY_RECORDS", payload: { filters: { limit: FETCH_LIMIT } } },
        (response: QueryRecordsResponse | undefined) => {
          if (chrome.runtime.lastError || !response) {
            setRecords([]);
            setLoading(false);
          } else {
            setRecords(response.payload.records);
            const sessionIds = Array.from(
              new Set(response.payload.records.map((r) => r.sessionId)),
            );
            loadTitles(sessionIds);
            setLoading(false);
          }
        },
      );
    },
    [loadTitles],
  );

  const hasMountedRef = useRef(false);

  useEffect(() => {
    // First mount: show spinner so the empty-state doesn't flash
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      load(true);
    } else {
      // Subsequent reloads (new conversation captured, import, etc.): silent update
      load(false);
    }
  }, [load, reloadKey]);

  const handleDelete = useCallback(
    (displayId: string, chunkIds: string[]) => {
      // Trigger fade-out animation immediately for visual feedback
      setFadingOutIds((prev) => new Set([...prev, displayId]));
      Promise.all(
        chunkIds.map(
          (chunkId) =>
            new Promise<boolean>((resolve) => {
              chrome.runtime.sendMessage(
                { type: "DELETE_RECORD", payload: { recordId: chunkId } },
                (response: DeleteRecordResponse | undefined) => {
                  resolve(
                    !chrome.runtime.lastError && !!response?.payload.success,
                  );
                },
              );
            }),
        ),
      ).then((results) => {
        if (results.every(Boolean)) {
          // Remove from records after the fade-out animation completes
          setTimeout(() => {
            setRecords((prev) => prev.filter((r) => !chunkIds.includes(r.id)));
            setFadingOutIds((prev) => {
              const next = new Set(prev);
              next.delete(displayId);
              return next;
            });
            onDeleted?.();
          }, 280);
        } else {
          // API failed — cancel animation
          setFadingOutIds((prev) => {
            const next = new Set(prev);
            next.delete(displayId);
            return next;
          });
        }
      });
    },
    [onDeleted],
  );

  // Normalize Gemini sessions & dedupe ChatGPT partials before grouping.
  //
  // 1) Gemini: avoid duplicate "google:unknown" groupings.
  //    If we have both a concrete Gemini session (google:<conversationId>) and
  //    an "unknown" session with identical provider/role/content, we treat the
  //    unknown record as belonging to the concrete session. Orphaned "unknown"
  //    Gemini records with no concrete match are dropped from the UI.
  //
  // 2) ChatGPT: the interceptor can occasionally emit an early short assistant
  //    reply followed by the full message (e.g. "Hey Mars" then
  //    "Hey Mars 👋😄\n\nWhat's going on today?") for the same session. We
  //    collapse these by keeping only the longest assistant message when
  //    contents are prefix-related and timestamps are very close.
  const normalizedRecords = React.useMemo(() => {
    if (records.length === 0) return records;

    const canonicalByContent = new Map<string, string>();

    for (const r of records) {
      if (r.provider === "google" && r.sessionId !== "google:unknown") {
        const key = `${r.provider}:${r.role}:${r.content}`;
        if (!canonicalByContent.has(key)) {
          canonicalByContent.set(key, r.sessionId);
        }
      }
    }

    // If there's no known concrete Gemini session, keep records as-is.
    if (canonicalByContent.size === 0) return records;

    const remapped: MemoryRecord[] = [];
    for (const r of records) {
      if (r.provider === "google" && r.sessionId === "google:unknown") {
        const key = `${r.provider}:${r.role}:${r.content}`;
        const canonical = canonicalByContent.get(key);
        if (canonical) {
          remapped.push({ ...r, sessionId: canonical });
        }
        // If no canonical match exists, drop this "unknown" record from UI.
      } else {
        remapped.push(r);
      }
    }

    // Dedupe ChatGPT partial assistant messages per session.
    const bySession = groupBySessionId(remapped);
    const WINDOW_MS = 10_000;
    const cleaned: MemoryRecord[] = [];

    for (const [sessionId, list] of bySession.entries()) {
      if (!sessionId.startsWith("openai:") || list.length < 2) {
        cleaned.push(...list);
        continue;
      }

      const keepFlags = new Array(list.length).fill(true);

      for (let i = 0; i < list.length; i++) {
        const a = list[i];
        if (a.provider !== "openai" || a.role !== "assistant") continue;

        for (let j = i + 1; j < list.length; j++) {
          const b = list[j];
          if (b.provider !== "openai" || b.role !== "assistant") continue;
          const dt = b.timestamp - a.timestamp;
          if (dt < 0 || dt > WINDOW_MS) continue;

          // If later content is a strict extension of the earlier one, drop the earlier.
          if (
            b.content.length > a.content.length &&
            b.content.startsWith(a.content)
          ) {
            keepFlags[i] = false;
            break;
          }
        }
      }

      for (let i = 0; i < list.length; i++) {
        if (keepFlags[i]) cleaned.push(list[i]);
      }
    }

    return cleaned;
  }, [records]);

  const groups = groupBySessionId(normalizedRecords);

  // Provider filter first, then sort
  const allSessionIds = Array.from(groups.keys())
    .filter(
      (sid) => providerFilter === "all" || getProvider(sid) === providerFilter,
    )
    .sort((a, b) => {
      const aMax = Math.max(...(groups.get(a) ?? []).map((r) => r.timestamp));
      const bMax = Math.max(...(groups.get(b) ?? []).map((r) => r.timestamp));
      return sortDesc ? bMax - aMax : aMax - bMax;
    });

  const q = searchQuery.trim().toLowerCase();

  // Filter sessions by search query
  const sessionIds = q
    ? allSessionIds.filter((sid) => {
        const title = titles.get(sid) ?? "";
        if (title.toLowerCase().includes(q)) return true;
        const list = groups.get(sid) ?? [];
        return mergeChunks(list).some((dr) =>
          dr.content.toLowerCase().includes(q),
        );
      })
    : allSessionIds;

  // The component always owns its scroll region (both popup and floating panel modes).
  // back header + search bar + provider pills are sticky at the top; only the list scrolls.
  const containerStyle: React.CSSProperties = {
    ...styles.container,
    backgroundColor: tk.bg,
    ...(width ? { width, maxWidth: width } : {}),
    display: "flex",
    flexDirection: "column",
    // Fill the height allocated by the parent (popup: fixed 580px flex container;
    // floating panel: flex:1 with minHeight:0)
    flex: 1,
    minHeight: 0,
    ...(maxHeight != null ? { maxHeight } : {}),
  };

  const backHeader = onBack ? (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
        flexShrink: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button
          type="button"
          style={{
            ...S.iconBtn,
            backgroundColor: tk.btnBg,
            borderColor: tk.border,
            color: tk.text,
          }}
          onClick={onBack}
        >
          <ChevronLeftIcon />
        </button>
        <span style={{ ...S.viewTitle, paddingLeft: 2, color: tk.text }}>
          {t.memoryList}
        </span>
      </div>
      <button
        type="button"
        title={sortDesc ? t.sortNewest : t.sortOldest}
        onClick={() => setSortDesc((prev) => !prev)}
        style={{
          ...S.iconBtn,
          backgroundColor: tk.btnBg,
          borderColor: tk.border,
          color: tk.textMuted,
        }}
      >
        {sortDesc ? <ArrowDownWideNarrowIcon /> : <ArrowUpWideNarrowIcon />}
      </button>
    </div>
  ) : null;

  if (loading) {
    return (
      <div style={containerStyle}>
        {backHeader}
        <div style={{ ...styles.loading, color: tk.textMuted }}>
          {t.loadingMemories}
        </div>
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div style={containerStyle}>
        {backHeader}
        <div style={{ ...styles.empty, color: tk.textMuted }}>
          {t.noMemories}
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      {/* ── Sticky header area ── */}
      <div style={{ flexShrink: 0 }}>
        {backHeader}
        {/* Search bar */}
        <div style={{ paddingTop: 8, paddingBottom: 6 }}>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.searchMemories}
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "8px 10px",
              fontSize: 12,
              borderRadius: 8,
              border: `1px solid ${tk.border}`,
              backgroundColor: tk.inputBg,
              color: tk.text,
              outline: "none",
              fontFamily: "inherit",
            }}
          />
        </div>
        {/* Provider filter pills */}
        <div
          style={{
            display: "flex",
            gap: 6,
            paddingBottom: 8,
            flexWrap: "wrap",
          }}
        >
          {PROVIDER_FILTERS.map(({ key, label }) => {
            const active = providerFilter === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setProviderFilter(key)}
                style={{
                  fontSize: 11,
                  fontWeight: active ? 600 : 400,
                  padding: "3px 10px",
                  borderRadius: 20,
                  border: `1px solid ${active ? tk.accent : tk.border}`,
                  backgroundColor: active ? tk.accent : tk.btnBg,
                  color: active ? "#fff" : tk.textMuted,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  transition: "all 0.15s ease",
                }}
              >
                {label}
              </button>
            );
          })}
          {/* Sort toggle when no back button (standalone popup w/o header) */}
          {!onBack && (
            <button
              type="button"
              title={sortDesc ? t.sortNewest : t.sortOldest}
              onClick={() => setSortDesc((prev) => !prev)}
              style={{
                marginLeft: "auto",
                ...S.iconBtn,
                backgroundColor: tk.btnBg,
                borderColor: tk.border,
                color: tk.textMuted,
              }}
            >
              {sortDesc ? (
                <ArrowDownWideNarrowIcon />
              ) : (
                <ArrowUpWideNarrowIcon />
              )}
            </button>
          )}
        </div>
        <div style={{ ...styles.sectionTitle, color: tk.textMuted }}>
          {t.allMemories}
        </div>
      </div>

      {/* ── Scrollable list ── */}
      <div style={{ ...styles.scroll, margin: "0 -16px", padding: "0 16px" }}>
        {sessionIds.length === 0 && (q || providerFilter !== "all") ? (
          <div style={{ ...styles.empty, color: tk.textMuted }}>
            {t.searchNoResults}
          </div>
        ) : (
          sessionIds.map((sessionId) => {
            const list = groups.get(sessionId) ?? [];
            // When searching: auto-expand by default, but respect manual collapse by user
            const isCollapsed = q
              ? searchCollapsed.has(sessionId)
              : collapsedSessions.has(sessionId);
            const title = titles.get(sessionId);
            const providerLabel = formatProviderLabel(sessionId);
            const displayText = title
              ? `${title} (${providerLabel})`
              : sessionId.length > 28
                ? sessionId.slice(0, 25) + "…"
                : sessionId;
            return (
              <div
                key={sessionId}
                className={newSessionIds.has(sessionId) ? "aim-row-enter" : ""}
                style={styles.group}
              >
                <button
                  type="button"
                  style={{ ...styles.groupHeaderBtn, color: tk.textMuted }}
                  onClick={() => toggleSession(sessionId, !!q)}
                  aria-expanded={!isCollapsed}
                >
                  <span
                    style={{
                      ...styles.groupHeaderCaret,
                      color: tk.textTertiary,
                    }}
                  >
                    {isCollapsed ? <ChevronRightIcon /> : <ChevronDownIcon />}
                  </span>
                  <span
                    style={styles.groupHeader}
                    title={title ? sessionId : undefined}
                  >
                    {displayText}
                  </span>
                </button>
                {!isCollapsed && (
                  <div style={styles.recordList}>
                    {mergeChunks(list).map((dr) => (
                      <div
                        key={dr.id}
                        className={
                          fadingOutIds.has(dr.id) ? "aim-row-exit" : ""
                        }
                        style={{
                          ...styles.row,
                          backgroundColor:
                            hoverId === dr.id ? tk.btnHoverBg : tk.bgCard,
                          borderColor: tk.border,
                        }}
                        onMouseEnter={() => setHoverId(dr.id)}
                        onMouseLeave={() => setHoverId(null)}
                      >
                        {/* Delete X — top-right corner, always visible */}
                        <button
                          style={{
                            ...styles.deleteXBtn,
                            color: tk.textTertiary,
                          }}
                          disabled={fadingOutIds.has(dr.id)}
                          onClick={() => handleDelete(dr.id, dr.chunkIds)}
                          type="button"
                          title={t.deleteBtn}
                          onMouseEnter={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.color =
                              tk.errorText;
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.color =
                              tk.textTertiary;
                          }}
                        >
                          {fadingOutIds.has(dr.id) ? "…" : "×"}
                        </button>
                        <div style={styles.rowMain}>
                          <span style={{ ...styles.role, color: tk.textMuted }}>
                            {roleLabel[dr.role] ?? dr.role}
                            {dr.isChunked && (
                              <span
                                style={{
                                  fontSize: 10,
                                  color: tk.textTertiary,
                                  marginLeft: 4,
                                  fontWeight: 400,
                                }}
                              >
                                ×{dr.chunkCount}
                              </span>
                            )}
                          </span>
                          <span
                            style={{
                              ...styles.time,
                              color: tk.textTertiary,
                              paddingRight: 20,
                            }}
                          >
                            {formatLocalTime(dr.timestamp)}
                          </span>
                        </div>
                        <div
                          style={{ ...styles.content, color: tk.text }}
                          onClick={() => toggleExpanded(dr.id)}
                          title={
                            expandedIds.has(dr.id) ? undefined : dr.content
                          }
                        >
                          {expandedIds.has(dr.id)
                            ? dr.content
                            : truncate(dr.content)}
                        </div>
                        {/* Copy button — bottom-right on its own row */}
                        <div style={styles.bottomRow}>
                          <button
                            type="button"
                            style={{ ...styles.copyBtn, color: tk.accent }}
                            onClick={() => copyContent(dr.content, dr.id)}
                            title={t.copyBtn}
                            onMouseEnter={(e) => {
                              (
                                e.currentTarget as HTMLButtonElement
                              ).style.textDecoration = "underline";
                            }}
                            onMouseLeave={(e) => {
                              (
                                e.currentTarget as HTMLButtonElement
                              ).style.textDecoration = "none";
                            }}
                          >
                            {copiedId === dr.id ? t.copied : t.copyBtn}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    marginTop: 0,
    padding: "12px 16px 8px",
    boxSizing: "border-box",
    fontFamily: "ui-sans-serif, system-ui, -apple-system, sans-serif",
  },
  loading: {
    padding: 12,
    fontSize: 12,
    textAlign: "center",
  },
  empty: {
    padding: 12,
    fontSize: 12,
    fontStyle: "italic",
    textAlign: "center",
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    marginBottom: 8,
  },
  scroll: {
    flex: 1,
    overflowY: "auto",
    minHeight: 0,
  },
  group: {
    marginBottom: 14,
  },
  groupHeaderBtn: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    width: "100%",
    padding: "4px 0",
    marginBottom: 4,
    border: "none",
    background: "none",
    cursor: "pointer",
    textAlign: "left",
    fontSize: 11,
    fontFamily: "inherit",
  },
  groupHeaderCaret: {
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
  },
  groupHeader: {
    wordBreak: "break-all",
  },
  recordList: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  row: {
    border: "1px solid",
    borderRadius: 10,
    padding: "10px 14px",
    position: "relative",
    transition: "background-color 0.1s ease",
  },
  deleteXBtn: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    border: "none",
    background: "none",
    borderRadius: 4,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 15,
    lineHeight: 1,
    padding: 0,
    fontFamily: "inherit",
  },
  bottomRow: {
    display: "flex",
    justifyContent: "flex-end",
    marginTop: 4,
  },
  rowMain: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
    gap: 8,
  },
  role: {
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: "0.02em",
  },
  time: {
    fontSize: 10,
    flexShrink: 0,
  },
  content: {
    fontSize: 12,
    lineHeight: 1.5,
    wordBreak: "break-word",
    flex: 1,
    padding: "2px 0",
    cursor: "pointer",
    letterSpacing: "-0.01em",
  },
  copyBtn: {
    fontSize: 11,
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "2px 6px",
    textDecoration: "none",
    fontFamily: "inherit",
  },
};
