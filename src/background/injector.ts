/**
 * MAIN world injector — runs inside the page via chrome.scripting.executeScript.
 *
 * Must be a single self-contained function: no imports, no closures over outer
 * variables. All helpers are defined inside. Captured data is dispatched via
 * CustomEvent so the isolated content script can forward to background.
 */

export function mainWorldInterceptor(): void {
  const READY_TYPE = '__ai_memory_injector_ready__'
  const ERR_TYPE = '__ai_memory_injector_error__'
  function sendReady(stage: string): void {
    try {
      window.postMessage({ type: READY_TYPE, payload: { stage } }, window.location.origin)
    } catch (_) {}
  }

  // If we already installed, exit immediately.
  // We flag window itself (not window.fetch) because ChatGPT / Next.js can replace
  // window.fetch during hydration, making any flag stored on the old fetch reference
  // invisible to a second injection and causing duplicate capture.
  try {
    const w = window as unknown as { __aiMemoryInstalled?: boolean }
    if (w.__aiMemoryInstalled) return
    w.__aiMemoryInstalled = true
  } catch (_) {}

  try {
    sendReady('started')
  } catch (_) {}

  try {
  // postMessage crosses MAIN ↔ ISOLATED boundary; CustomEvent does not.
  const POST_TYPE = '__ai_memory_capture__'

  function sendCapture(
    provider: string,
    rawData: unknown,
    url: string,
    timestamp: number
  ): void {
    try {
      window.postMessage(
        {
          type: POST_TYPE,
          payload: { provider, rawData, url, timestamp },
        },
        window.location.origin
      )
    } catch {
      // ignore
    }
  }

  /** Fixed Gemini conversation endpoint — only this URL is used for capture. */
  const GEMINI_STREAM_GENERATE_PATH = 'BardChatUi/data/assistant.lamda.BardFrontendService/StreamGenerate'

  function isGeminiStreamGenerateUrl(url: string): boolean {
    if (!url || typeof url !== 'string') return false
    if (!url.includes('gemini.google.com')) return false
    return url.includes(GEMINI_STREAM_GENERATE_PATH)
  }

  function detectProvider(url: string): string | null {
    if (!url || typeof url !== 'string') return null
    try {
      const u = new URL(url)
      const host = (u.hostname || '').toLowerCase()
      if (host === 'gemini.google.com' || host.endsWith('.gemini.google.com')) return 'google'
      if (host.includes('openai.com') || (host === 'chatgpt.com' && url.includes('/backend-api'))) return 'openai'
      // TODO: Implement ClaudeAdapter
      if (host.includes('anthropic.com') || host === 'claude.ai') return 'anthropic'
    } catch (_) {
      if (url.includes('gemini.google.com')) return 'google'
      if (url.includes('openai.com') || url.includes('chatgpt.com/backend-api')) return 'openai'
      // TODO: Implement ClaudeAdapter
      if (url.includes('anthropic.com') || url.includes('claude.ai/api')) return 'anthropic'
    }
    return null
  }

  function isApiEndpoint(url: string): boolean {
    const patterns = [
      '/v1/chat/completions',
      '/backend-api/f/conversation',
      '/backend-api/conversation',
      // TODO: Implement ClaudeAdapter
      'claude.ai/api/',
      'api.anthropic.com/v1/messages',
    ]
    return patterns.some((p) => url.includes(p))
  }

  /** Only send capture for URLs that carry the actual conversation reply we want to store. */
  function isConversationCaptureUrl(url: string, provider: string): boolean {
    if (provider === 'openai') {
      return (
        url.endsWith('chatgpt.com/backend-api/f/conversation') ||
        url.includes('chat.openai.com/backend-api/conversation')
      )
    }
    if (provider === 'anthropic') {
      return isClaudeCompletionUrl(url) || url.includes('api.anthropic.com/v1/messages')
    }
    if (provider === 'google') {
      return isGeminiStreamGenerateUrl(url)
    }
    return false
  }

  function isChatGPTDeltaV1(url: string): boolean {
    return url.includes('/backend-api/f/conversation')
  }

  /** Walk parsed value and collect text from arrays of strings or [id, string[]] blocks. */
  function collectTextFromGeminiChunk(val: unknown): string {
    if (typeof val === 'string') return val
    if (!Array.isArray(val)) return ''
    const parts: string[] = []
    for (const item of val) {
      if (typeof item === 'string') {
        parts.push(item)
      } else if (Array.isArray(item) && item.length >= 2 && Array.isArray(item[1])) {
        const maybeTextParts = item[1].filter((p): p is string => typeof p === 'string')
        if (maybeTextParts.length > 0) parts.push(maybeTextParts.join(''))
      } else if (Array.isArray(item)) {
        parts.push(collectTextFromGeminiChunk(item))
      }
    }
    return parts.join('')
  }

  /** Parse one Gemini Bard stream chunk (JSON string) to extract assistant text and conversationId. */
  function extractGeminiChunk(jsonStr: string): { text: string; cid: string } {
    try {
      const outer = JSON.parse(jsonStr) as unknown[];
      if (!Array.isArray(outer) || !Array.isArray(outer[0]) || outer[0].length < 3) return { text: '', cid: '' };
      
      const innerStr = outer[0][2];
      if (typeof innerStr !== 'string') return { text: '', cid: '' };
      
      const inner = JSON.parse(innerStr) as unknown[];
      if (!Array.isArray(inner)) return { text: '', cid: '' };
      let cid = '';
      if (Array.isArray(inner[1])) {
        const first = inner[1][0];
        // 精準抓取 c_ 開頭的 Conversation ID
        if (typeof first === 'string' && first.startsWith('c_')) cid = first;
        else if (typeof inner[1][1] === 'string') cid = inner[1][1];
      }
      
      let text = '';
      for (const idx of [4, 3, 5, 6, 7]) {
        if (idx >= inner.length) continue;
        const blockList = inner[idx];
        if (!Array.isArray(blockList) || blockList.length === 0) continue;
        
        const parts: string[] = [];
        for (let b = 0; b < blockList.length; b++) {
          const block = blockList[b];
          if (!Array.isArray(block) || block.length < 2 || !Array.isArray(block[1])) continue;
          
          // 抓取該區塊內的所有字串
          const part = (block[1] as unknown[])
            .filter((p): p is string => typeof p === 'string')
            .join(''); // 這裡維持 '' 沒關係，因為這是把同一個 block 裡可能碎裂的字串接起來
            
          if (part.length > 0) parts.push(part);
        }
        
        if (parts.length > 0) {
          text = parts.join('\n\n');
          break;
        }
      }
      
      if (!text && typeof collectTextFromGeminiChunk === 'function') {
        text = collectTextFromGeminiChunk(inner);
      }
      return { text, cid };
    } catch {
      return { text: '', cid: '' };
    }
  }


  function parseGeminiBardResponseText(fullText: string): { lastAssistantText: string; conversationId: string } {
    let lastAssistantText = '';
    let conversationId = '';
    if (!fullText || typeof fullText !== 'string') return { lastAssistantText, conversationId };
  
    let maxLen = 0;
    let bestPayload: string | null = null;
  
    // 正則尋找 ["wrb.fr" 開頭的陣列（容許中間有空白或換行）
    const startRegex = /\[\s*"wrb\.fr"/g;
    let match;
  
    while ((match = startRegex.exec(fullText)) !== null) {
      const chunkStart = match.index;
  
      let depth = 0;
      let inString = false;
      let escapeNext = false;
      let end = -1;
  
      // 從 ["wrb.fr" 開始往後遍歷，利用「括號深度」計算來精準抓取完整的 JSON
      for (let j = chunkStart; j < fullText.length; j++) {
        const char = fullText[j];
  
        // 處理跳脫字元 (例如 \")，防止誤判字串結束
        if (escapeNext) {
          escapeNext = false;
          continue;
        }
        if (char === '\\') {
          escapeNext = true;
          continue;
        }
  
        // 處理字串開關
        if (char === '"') {
          inString = !inString;
          continue;
        }
  
        // 只有在「不是字串內部」的情況下，才計算括號深度
        if (!inString) {
          if (char === '[') depth++;
          else if (char === ']') {
            depth--;
            if (depth === 0) {
              end = j + 1; // 找到完美閉合的右括號位置
              break;
            }
          }
        }
      }
  
      if (end !== -1) {
        // 成功擷取出 ["wrb.fr", ...] 陣列
        const chunkStr = fullText.slice(chunkStart, end);
        
        // 在外層包裝一個 []，以完美符合你 extractGeminiChunk 預期的格式: [["wrb.fr", ...]]
        const wrappedChunk = `[${chunkStr}]`;
  
        // 找出長度最大（包含最多文字）的那一包
        if (wrappedChunk.length > maxLen) {
          maxLen = wrappedChunk.length;
          bestPayload = wrappedChunk;
        }
  
        // 讓正則表達式直接跳到這包的結尾，繼續尋找下一個
        startRegex.lastIndex = end;
      } else {
        // 如果 end 是 -1，代表串流被中斷，括號沒閉合，直接跳出迴圈
        break;
      }
    }
  
    if (bestPayload) {
      const { text, cid } = extractGeminiChunk(bestPayload);
      if (text) lastAssistantText = text;
      if (cid) conversationId = cid;
    }
  
    return { lastAssistantText, conversationId };
  }

  /**
   * Parse form body (application/x-www-form-urlencoded) and return value for key.
   */
  function parseFormBodyKey(bodyText: string, key: string): string | null {
    if (!bodyText || typeof bodyText !== 'string') return null
    const parts = bodyText.split('&')
    for (const part of parts) {
      const eq = part.indexOf('=')
      if (eq === -1) continue
      const k = decodeURIComponent(part.slice(0, eq).replace(/\+/g, ' '))
      if (k === key) {
        return decodeURIComponent(part.slice(eq + 1).replace(/\+/g, ' '))
      }
    }
    return null
  }

  /**
   * Extract user message and conversationId from Gemini Bard form payload (f.req).
   * f.req is JSON: [null, "<string>"] where string parses to [[userText,0,...], [...], [c_xxx, r_xxx, ...], ...].
   */
  function extractGeminiRequestUserMessage(bodyText: string): { text: string; conversationId?: string } | null {
    const fReq = parseFormBodyKey(bodyText, 'f.req')
    if (!fReq) return null
    let outer: unknown
    try {
      outer = JSON.parse(fReq)
    } catch {
      return null
    }
    if (!Array.isArray(outer) || outer.length < 2) return null
    const innerStr = outer[1]
    if (typeof innerStr !== 'string') return null
    let inner: unknown
    try {
      inner = JSON.parse(innerStr)
    } catch {
      return null
    }
    if (!Array.isArray(inner) || inner.length === 0) return null
    const first = inner[0]
    if (!Array.isArray(first) || first.length === 0) return null
    const userText = first[0]
    if (typeof userText !== 'string' || !userText.trim()) return null
    let conversationId: string | undefined
    if (inner.length > 2 && Array.isArray(inner[2]) && inner[2].length > 0) {
      const c = inner[2][0]
      if (typeof c === 'string' && c.trim()) conversationId = c.trim()
    }
    return { text: userText.trim(), conversationId }
  }

  /** Extract user message from Claude completion POST body (payload.prompt). */
  function extractClaudeRequestUserMessage(body: unknown): { text: string; model?: string } | null {
    if (!body || typeof body !== 'object') return null
    const payload = body as Record<string, unknown>
    const prompt = payload['prompt']
    if (typeof prompt !== 'string' || !prompt.trim()) return null
    const model = payload['model'] as string | undefined
    return { text: prompt.trim(), model }
  }

  /** Returns true for Claude Web conversation history fetch (existing chat loaded). */
  function isClaudeConversationHistoryUrl(url: string): boolean {
    return /claude\.ai\/api\/organizations\/[^/]+\/chat_conversations\/[^/?]+/.test(url)
      && url.includes('tree=True')
  }

  /** Returns true for Claude Web completion streaming endpoint. */
  function isClaudeCompletionUrl(url: string): boolean {
    return url.includes('claude.ai/api/') && url.endsWith('/completion')
  }

  /** Returns true for Claude Web title generation endpoint. */
  function isClaudeTitleUrl(url: string): boolean {
    return url.includes('claude.ai/api/') && url.endsWith('/title')
  }

  /** Extract conversation UUID from Claude API URL path. */
  function extractClaudeConversationIdFromUrl(url: string): string | null {
    const match = url.match(/chat_conversations\/([^/]+)\//)
    return match ? match[1] : null
  }

  /** Extract last user message and optional conversation_id from ChatGPT POST payload (payload.messages[]). */
  function extractChatGPTRequestUserMessage(body: unknown): { text: string; conversationId?: string; messageId?: string; model?: string } | null {
    if (!body || typeof body !== 'object') return null
    const payload = body as Record<string, unknown>
    const messages = payload['messages'] as Array<Record<string, unknown>> | undefined
    const model = payload['model'] as string | undefined
    if (!Array.isArray(messages) || messages.length === 0) return null

    // Find last user message (by role or author.role)
    let lastUser: Record<string, unknown> | null = null
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i] as Record<string, unknown>
      const role = m['role'] as string | undefined
      const author = m['author'] as Record<string, unknown> | undefined
      const authorRole = author?.['role'] as string | undefined
      if (role === 'user' || authorRole === 'user') {
        lastUser = m
        break
      }
    }
    if (!lastUser) return null

    let text = ''
    const content = lastUser['content']
    if (typeof content === 'string') {
      text = content
    } else if (content && typeof content === 'object' && !Array.isArray(content)) {
      const parts = (content as Record<string, unknown>)['parts']
      if (Array.isArray(parts)) {
        const strings = parts.filter((p) => typeof p === 'string') as string[]
        const texts = parts
          .filter((p) => p && typeof p === 'object' && (p as Record<string, unknown>)['text'] !== undefined)
          .map((p) => (p as Record<string, unknown>)['text'] as string)
        text = strings.join('') || texts.join('')
      }
    }
    if (!text.trim()) return null

    const conversationId =
      (payload['conversation_id'] as string | undefined) ??
      (payload['conversationId'] as string | undefined)
    const id = typeof conversationId === 'string' && conversationId.trim() ? conversationId.trim() : undefined

    const messageId = lastUser['id'] as string | undefined
    const mid = typeof messageId === 'string' && messageId.trim() ? messageId.trim() : undefined

    return { text: text.trim(), conversationId: id, messageId: mid, model }
  }

  // ── Provider Strategy Table ───────────────────────────────────────────────
  // All referenced helpers are already defined above in the same function scope.
  // Adding a new provider = adding one entry here + updating detectProvider().
  const PROVIDER_STRATEGIES: Record<string, {
    isConversationCaptureUrl(url: string): boolean
    extractUserMessageFromBody(body: unknown, url: string): { text: string; conversationId?: string; messageId?: string; model?: string } | null
    conversationIdFromUrl(url: string): string | undefined
    usesDeltaV1(url: string): boolean
  }> = {
    openai: {
      isConversationCaptureUrl(url) {
        return (
          url.endsWith('chatgpt.com/backend-api/f/conversation') ||
          url.includes('chat.openai.com/backend-api/conversation')
        )
      },
      extractUserMessageFromBody(body, _url) {
        return extractChatGPTRequestUserMessage(body)
      },
      conversationIdFromUrl(_url) { return undefined },
      usesDeltaV1(url) { return isChatGPTDeltaV1(url) },
    },
    anthropic: {
      isConversationCaptureUrl(url) {
        return isClaudeCompletionUrl(url) || url.includes('api.anthropic.com/v1/messages')
      },
      extractUserMessageFromBody(body, url) {
        if (!isClaudeCompletionUrl(url)) return null
        const result = extractClaudeRequestUserMessage(body)
        if (!result) return null
        const conversationId = extractClaudeConversationIdFromUrl(url) ?? undefined
        return { text: result.text, model: result.model, conversationId }
      },
      conversationIdFromUrl(url) {
        return extractClaudeConversationIdFromUrl(url) ?? undefined
      },
      usesDeltaV1(_url) { return false },
    },
    google: {
      // Gemini uses XHR, not fetch — the fetch interceptor early-exits for google
      isConversationCaptureUrl(_url) { return false },
      extractUserMessageFromBody(_body, _url) { return null },
      conversationIdFromUrl(_url) { return undefined },
      usesDeltaV1(_url) { return false },
    },
  }

  /** Pending user message when POST had no conversationId (new chat); we defer until stream gives us one. */
  type PendingUserPayload = { role: 'user'; content: string; model?: string; messageId?: string; isPartial: boolean } | null

  async function assembleChatGPTDeltaV1(
    reader: ReadableStreamDefaultReader<Uint8Array>,
    url: string,
    timestamp: number,
    isPartialRef: { value: boolean },
    pendingUserPayload: PendingUserPayload = null
  ): Promise<void> {
    const decoder = new TextDecoder()
    let buffer = ''
    let currentEvent = ''
    let conversationId = ''
    let model: string | undefined
    let assistantMessageId: string | undefined
    const assistantChunks: string[] = []

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim()
            continue
          }
          if (!line.startsWith('data: ')) continue

          const jsonStr = line.slice(6).trim()
          if (!jsonStr || jsonStr === '[DONE]') continue

          try {
            const parsed = JSON.parse(jsonStr) as Record<string, unknown>

            const cid =
              (parsed['conversation_id'] as string | undefined) ??
              (parsed['conversationId'] as string | undefined)
            if (typeof cid === 'string' && cid.trim()) conversationId = cid.trim()

            if (currentEvent === 'delta') {
              if (parsed['o'] === 'add') {
                const msg = (parsed['v'] as Record<string, unknown> | undefined)?.['message'] as
                  | Record<string, unknown>
                  | undefined
                if (!model) {
                  model = (msg?.['metadata'] as Record<string, unknown> | undefined)?.[
                    'model_slug'
                  ] as string | undefined
                }
                // Capture the assistant message's UUID from the stream — this matches
                // the data-message-id attribute ChatGPT renders in the DOM, so the
                // DOM-scan path (reload) and the network-capture path (new chat) both
                // store the assistant reply under the same ID, preventing duplicates.
                if (!assistantMessageId) {
                  const msgId = msg?.['id'] as string | undefined
                  if (typeof msgId === 'string' && msgId.trim()) {
                    assistantMessageId = msgId.trim()
                  }
                }
              }
              // Only use one path: if v is an array it's a patch operation (containing
              // nested append ops); if v is a plain string it's a direct top-level append.
              // These two formats are mutually exclusive — never let both paths run for
              // the same event, which would duplicate the same text chunk.
              if (Array.isArray(parsed['v']) && (parsed['o'] === 'patch' || parsed['o'] === undefined)) {
                for (const patch of parsed['v'] as Record<string, unknown>[]) {
                  if (
                    patch['o'] === 'append' &&
                    patch['p'] === '/message/content/parts/0' &&
                    typeof patch['v'] === 'string'
                  ) {
                    assistantChunks.push(patch['v'])
                  }
                }
              } else if (parsed['o'] === 'append' && typeof parsed['v'] === 'string') {
                assistantChunks.push(parsed['v'])
              }
            }
          } catch {
            // skip unparseable
          }
        }
      }
    } catch {
      isPartialRef.value = true
    }

    const assistantText = assistantChunks.join('')
    // For new chats: send deferred user message first with conversationId from stream
    if (pendingUserPayload && conversationId) {
      sendCapture(
        'openai',
        { ...pendingUserPayload, conversationId },
        url,
        timestamp
      )
    } else if (pendingUserPayload && !conversationId) {
      // Fallback: stream gave no conversationId, send user with 'unknown' to avoid losing it
      sendCapture('openai', { ...pendingUserPayload, conversationId: 'unknown' }, url, timestamp)
    }
    // Only store the assistant reply when the stream completed cleanly (not cut off).
    // A partial/cut-off reply would be stored as incomplete content, and if ChatGPT
    // retries the full stream, the complete version would be stored again as a duplicate.
    if (assistantText && !isPartialRef.value) {
      const assistantPayload: Record<string, unknown> = {
        role: 'assistant',
        content: assistantText,
        conversationId: conversationId || 'unknown',
        model,
        isPartial: false,
      }
      if (assistantMessageId) assistantPayload['messageId'] = assistantMessageId
      sendCapture('openai', assistantPayload, url, timestamp)
    }
  }

  async function assembleSSEStream(
    reader: ReadableStreamDefaultReader<Uint8Array>,
    provider: string,
    url: string,
    timestamp: number,
    isPartialRef: { value: boolean },
    conversationIdOverride?: string
  ): Promise<void> {
    const decoder = new TextDecoder()
    let buffer = ''
    const contentChunks: string[] = []
    let conversationId: string | undefined = conversationIdOverride
    let model: string | undefined
    let role = 'assistant'

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const jsonStr = line.slice(6).trim()
          if (jsonStr === '[DONE]') continue

          try {
            const parsed = JSON.parse(jsonStr) as Record<string, unknown>

            const choices = parsed['choices'] as Array<Record<string, unknown>> | undefined
            if (choices?.length) {
              const delta = choices[0]['delta'] as Record<string, unknown> | undefined
              if (delta?.['content']) contentChunks.push(delta['content'] as string)
              if (delta?.['role']) role = delta['role'] as string
              if (!conversationId) conversationId = parsed['id'] as string | undefined
              if (!model) model = parsed['model'] as string | undefined
            }

            if (parsed['type'] === 'content_block_delta') {
              const d = parsed['delta'] as Record<string, unknown> | undefined
              if (d?.['text']) contentChunks.push(d['text'] as string)
            }

            if (parsed['type'] === 'message_start') {
              const msg = parsed['message'] as Record<string, unknown> | undefined
              // Only fall back to stream id if no override was provided
              if (!conversationId) conversationId = msg?.['id'] as string | undefined
              if (!model) model = msg?.['model'] as string | undefined
            }
          } catch {
            // skip
          }
        }
      }
    } catch {
      isPartialRef.value = true
    }

    const assembled = contentChunks.join('')
    if (assembled) {
      sendCapture(
        provider,
        {
          role,
          content: assembled,
          conversationId: conversationId ?? String(timestamp),
          model,
          isPartial: isPartialRef.value,
        },
        url,
        timestamp
      )
    }
  }

  // Verify fetch is available (the window-level guard above already prevents double injection)
  try {
    if (typeof window.fetch !== 'function') {
      sendReady('error: window.fetch is not a function')
      return
    }
  } catch (e) {
    sendReady('error: ' + (e instanceof Error ? e.message : String(e)))
    return
  }

  let originalFetch: typeof window.fetch
  try {
    originalFetch = window.fetch.bind(window)
  } catch (e) {
    sendReady('error: bind failed ' + (e instanceof Error ? e.message : String(e)))
    return
  }

  // Skip wrapping for known third-party/analytics URLs so we don't appear in their CSP/violation stacks.
  const isIgnoredHost = (u: string): boolean =>
    /googleadservices\.com|googletagmanager\.com|google-analytics\.com|doubleclick\.net/i.test(u)

  const interceptedFetch = async function interceptedFetch(
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    let url =
      typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url
    if (typeof url !== 'string') url = ''
    if (!url && input instanceof Request) {
      const r = input as Request
      url = (r.url && typeof r.url === 'string' ? r.url : '') || ''
    }
    if (typeof url === 'string' && url.startsWith('/') && typeof window !== 'undefined' && window.location) {
      url = window.location.origin + url
    }
    if (typeof url === 'string' && !url.startsWith('http') && typeof window !== 'undefined' && window.location) {
      try {
        url = new URL(url, window.location.href).href
      } catch (_) {}
    }
    if (isIgnoredHost(url)) return originalFetch(input, init)

    const provider = detectProvider(url)
    if (provider === 'google') {
      return originalFetch(input, init)
    }

    if (!provider || !isApiEndpoint(url)) {
      return originalFetch(input, init)
    }

    const timestamp = Date.now()
    let pendingUserPayload: PendingUserPayload = null

    const strategy = PROVIDER_STRATEGIES[provider]

    // Capture user message from POST body via provider strategy
    if (strategy && strategy.isConversationCaptureUrl(url)) {
      const method = (init?.method ?? (input instanceof Request ? (input as Request).method : 'GET')).toUpperCase()
      if (method === 'POST') {
        let bodyJson: unknown = null
        if (typeof init?.body === 'string') {
          try {
            bodyJson = JSON.parse(init.body)
          } catch {
            // ignore
          }
        } else if (input instanceof Request && (input as Request).body) {
          try {
            const cloned = (input as Request).clone()
            const text = await cloned.text()
            bodyJson = text ? JSON.parse(text) : null
          } catch {
            // ignore
          }
        }
        const userPayload = bodyJson ? strategy.extractUserMessageFromBody(bodyJson, url) : null
        if (userPayload?.text) {
          if (userPayload.conversationId) {
            const payload: Record<string, unknown> = {
              role: 'user',
              content: userPayload.text,
              isPartial: false,
              conversationId: userPayload.conversationId,
            }
            if (userPayload.model) payload['model'] = userPayload.model
            if (userPayload.messageId) payload['messageId'] = userPayload.messageId
            sendCapture(provider, payload, url, timestamp)
          } else {
            pendingUserPayload = {
              role: 'user',
              content: userPayload.text,
              model: userPayload.model,
              isPartial: false,
              messageId: userPayload.messageId,
            }
          }
        }
      }
    }

    const response = await originalFetch(input, init)

    // Intercept Claude conversation history (user opened existing chat)
    if (provider === 'anthropic' && isClaudeConversationHistoryUrl(url)) {
      response.clone()
        .json()
        .then((data: unknown) => {
          if (data && typeof data === 'object') {
            const d = data as Record<string, unknown>
            sendCapture('anthropic', data, url, timestamp)
            const title = d['name']
            const conversationId = d['uuid']
            if (typeof title === 'string' && title.trim() && typeof conversationId === 'string' && conversationId.trim()) {
              sendCapture('anthropic', { type: 'title_update', title: title.trim(), conversationId: conversationId.trim() }, url, timestamp)
            }
          }
        })
        .catch(() => undefined)
      return response
    }

    // Intercept Claude title API response and send as title_update
    if (provider === 'anthropic' && isClaudeTitleUrl(url)) {
      const clonedTitle = response.clone()
      clonedTitle
        .json()
        .then((data: unknown) => {
          if (data && typeof data === 'object') {
            const titleData = data as Record<string, unknown>
            const title = titleData['title']
            if (typeof title === 'string' && title.trim()) {
              const conversationId = extractClaudeConversationIdFromUrl(url)
              if (conversationId) {
                sendCapture(
                  'anthropic',
                  { type: 'title_update', title: title.trim(), conversationId },
                  url,
                  timestamp
                )
              }
            }
          }
        })
        .catch(() => undefined)
      return response
    }

    if (!strategy || !strategy.isConversationCaptureUrl(url)) {
      return response
    }

    const cloned = response.clone()
    const contentType = response.headers.get('content-type') ?? ''

    if (contentType.includes('text/event-stream')) {
      const reader = cloned.body?.getReader()
      if (reader) {
        const isPartialRef = { value: false }
        const convIdOverride = strategy.conversationIdFromUrl(url)
        const task = strategy.usesDeltaV1(url)
          ? assembleChatGPTDeltaV1(reader, url, timestamp, isPartialRef, pendingUserPayload)
          : assembleSSEStream(reader, provider, url, timestamp, isPartialRef, convIdOverride)
        task.catch(() => {
          isPartialRef.value = true
        })
      }
    } else if (contentType.includes('application/json')) {
      cloned
        .json()
        .then((data: unknown) => sendCapture(provider, data, url, timestamp))
        .catch(() => undefined)
    }

    return response
  }

  try {
    ;(interceptedFetch as unknown as { __aiMemoryIntercepted: boolean }).__aiMemoryIntercepted = true
    window.fetch = interceptedFetch
    sendReady('fetch_installed')
  } catch (e) {
    sendReady('error: assign fetch ' + (e instanceof Error ? e.message : String(e)))
  }

  // Prevent double injection for XHR too
  if ((window.XMLHttpRequest as unknown as { __aiMemoryIntercepted?: boolean }).__aiMemoryIntercepted) {
    return
  }

  const OriginalXHR = window.XMLHttpRequest

  class InterceptedXMLHttpRequest extends OriginalXHR {
    private _url = ''
    private _method = ''
    private _timestamp = 0

    open(method: string, url: string | URL, ...rest: unknown[]): void {
      this._method = method
      this._url = typeof url === 'string' ? url : (url as URL).href
      if (this._url.startsWith('/') && typeof window !== 'undefined' && window.location) {
        this._url = window.location.origin + this._url
      } else if (this._url && !this._url.startsWith('http') && typeof window !== 'undefined' && window.location) {
        try {
          this._url = new URL(this._url, window.location.href).href
        } catch (_) {}
      }
      // @ts-expect-error forward rest args
      super.open(method, url, ...rest)
    }

    send(body?: Document | XMLHttpRequestBodyInit | null): void {
      const provider = detectProvider(this._url)
      const isGeminiStream = isGeminiStreamGenerateUrl(this._url)

      if (isGeminiStream && this._method.toUpperCase() === 'POST' && body != null) {
        let bodyText: string | null = null
        if (typeof body === 'string') {
          bodyText = body
        } else if (typeof body === 'object' && body !== null && typeof (body as FormData).get === 'function') {
          const fd = body as FormData
          const fReq = fd.get('f.req')
          if (fReq != null && typeof fReq === 'string') bodyText = 'f.req=' + encodeURIComponent(fReq)
        }
        const geminiUser = bodyText ? extractGeminiRequestUserMessage(bodyText) : null
        if (geminiUser?.text) {
          this._timestamp = Date.now()
          const payload: Record<string, unknown> = {
            role: 'user',
            content: geminiUser.text,
            isPartial: false,
          }
          if (geminiUser.conversationId) payload['conversationId'] = geminiUser.conversationId
          sendCapture('google', payload, this._url, this._timestamp)
        }
      }

      const isGeminiUrl = isGeminiStreamGenerateUrl(this._url)
      if (isGeminiUrl || (provider && isApiEndpoint(this._url) && isConversationCaptureUrl(this._url, provider))) {
        if (!this._timestamp) this._timestamp = Date.now()
        this.addEventListener('load', () => {
          try {
            const contentType = (this.getResponseHeader('content-type') ?? '').toLowerCase()
            if (isGeminiUrl) {
              const raw = typeof this.responseText === 'string' ? this.responseText : ''
              const { lastAssistantText, conversationId } = parseGeminiBardResponseText(raw)
              if (lastAssistantText) {
                const payload: Record<string, unknown> = {
                  role: 'assistant',
                  content: lastAssistantText,
                  isPartial: false,
                }
                if (conversationId) payload['conversationId'] = conversationId
                sendCapture('google', payload, this._url, this._timestamp)
              }
            } else if (contentType.includes('application/json') && provider) {
              const data = JSON.parse(this.responseText as string) as unknown
              sendCapture(provider, data, this._url, this._timestamp)
            }
          } catch {
            // ignore
          }
        })
      }

    super.send(body ?? null)
  }
  }

  // Mark as intercepted to prevent double injection
  ;(InterceptedXMLHttpRequest as unknown as { __aiMemoryIntercepted: boolean }).__aiMemoryIntercepted = true
  window.XMLHttpRequest = InterceptedXMLHttpRequest as typeof XMLHttpRequest

  } catch (e) {
    sendReady('error: ' + (e instanceof Error ? e.message : String(e)))
  }
}
