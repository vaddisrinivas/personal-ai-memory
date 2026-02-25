// TODO: Implement ClaudeAdapter

import type { MemoryRecord } from '../../types/memory'
import {
  generateRecordId,
  generateSessionId,
  normalizeContent,
  type IAdapter,
} from './base'

/**
 * ClaudeAdapter handles Anthropic Claude network payloads.
 *
 * Claude web uses:
 *   POST https://claude.ai/api/organizations/<org>/chat_conversations/<id>/completion
 *
 * Responses are Server-Sent Events with event types:
 *   content_block_start, content_block_delta, content_block_stop,
 *   message_start, message_delta, message_stop
 *
 * The interceptor assembles delta chunks and sends us assembled messages.
 */
export class ClaudeAdapter implements IAdapter {
  private static readonly HANDLED_PATTERNS = [
    'claude.ai/api/',
    'api.anthropic.com/v1/messages',
  ]

  canHandle(url: string): boolean {
    return ClaudeAdapter.HANDLED_PATTERNS.some((p) => url.includes(p))
  }

  parse(rawData: unknown, _url: string, timestamp: number): MemoryRecord[] {
    try {
      return this.parsePayload(rawData, timestamp)
    } catch {
      return []
    }
  }

  private parsePayload(rawData: unknown, timestamp: number): MemoryRecord[] {
    if (!rawData || typeof rawData !== 'object') return []
    const data = rawData as Record<string, unknown>

    // Anthropic Messages API response:
    // { id, type: 'message', role: 'assistant', content: [{type:'text', text}], ... }
    if (data['type'] === 'message' && Array.isArray(data['content'])) {
      return this.parseApiMessage(data, timestamp)
    }

    // Assembled SSE format from interceptor:
    // { role, content, conversationId, model?, isPartial? }
    if (data['role'] && data['content']) {
      return this.parseAssembledMessage(data, timestamp)
    }

    // Claude web conversation format:
    // { uuid, chat_messages: [{ uuid, text, sender, ... }] }
    if (data['uuid'] && Array.isArray(data['chat_messages'])) {
      return this.parseChatMessages(data, timestamp)
    }

    return []
  }

  private parseApiMessage(
    data: Record<string, unknown>,
    timestamp: number
  ): MemoryRecord[] {
    const contentBlocks = data['content'] as Array<Record<string, unknown>>
    const textBlocks = contentBlocks.filter((b) => b['type'] === 'text')
    const text = textBlocks.map((b) => b['text'] as string).join('\n')
    if (!text) return []

    const id = (data['id'] as string) ?? String(timestamp)
    const isStop = (data['stop_reason'] as string | undefined) === 'end_turn'

    const record: MemoryRecord = {
      id: generateRecordId(),
      role: 'assistant',
      content: normalizeContent(text),
      provider: 'anthropic',
      sessionId: generateSessionId('anthropic', id),
      model: data['model'] as string | undefined,
      timestamp,
      createdAt: Date.now(),
      isPartial: !isStop,
      isDeleted: false,
      isSuperseded: false,
    }
    return [record]
  }

  private parseAssembledMessage(
    data: Record<string, unknown>,
    timestamp: number
  ): MemoryRecord[] {
    const role = data['role'] as string
    const content = data['content'] as string
    const conversationId = (data['conversationId'] as string) ?? String(timestamp)
    const isPartial = Boolean(data['isPartial'])

    const record: MemoryRecord = {
      id: generateRecordId(),
      role: role === 'human' || role === 'user' ? 'user' : 'assistant',
      content: normalizeContent(content),
      provider: 'anthropic',
      sessionId: generateSessionId('anthropic', conversationId),
      model: data['model'] as string | undefined,
      timestamp,
      createdAt: Date.now(),
      isPartial,
      isDeleted: false,
      isSuperseded: false,
    }
    return [record]
  }

  private parseChatMessages(
    data: Record<string, unknown>,
    timestamp: number
  ): MemoryRecord[] {
    const conversationUuid = data['uuid'] as string
    const messages = data['chat_messages'] as Array<Record<string, unknown>>
    if (!messages.length) return []

    // Return only the last message (most recent capture)
    const last = messages[messages.length - 1]
    const sender = last['sender'] as string
    const text = (last['text'] as string) ?? ''
    if (!text) return []

    const record: MemoryRecord = {
      id: generateRecordId(),
      role: sender === 'human' ? 'user' : 'assistant',
      content: normalizeContent(text),
      provider: 'anthropic',
      sessionId: generateSessionId('anthropic', conversationUuid),
      timestamp,
      createdAt: Date.now(),
      isPartial: false,
      isDeleted: false,
      isSuperseded: false,
    }
    return [record]
  }
}
