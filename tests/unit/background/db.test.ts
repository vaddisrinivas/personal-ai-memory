import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import 'fake-indexeddb/auto'
import { MemoryDatabase } from '../../../src/background/db'
import type { MemoryRecord } from '../../../src/types/memory'

function makeRecord(i: number): MemoryRecord {
  return {
    id: `r${i}`,
    role: 'user',
    content: `content ${i}`,
    provider: 'openai',
    sessionId: 'test-session',
    timestamp: (i + 1) * 1000,
    createdAt: (i + 1) * 1000,
    isPartial: false,
    isDeleted: false,
    isSuperseded: false,
  }
}

describe('MemoryDatabase.queryRecords offset pagination', () => {
  let db: MemoryDatabase

  beforeEach(async () => {
    db = new MemoryDatabase()
    await db.open()
    // Insert 10 records with timestamps 1000, 2000, ..., 10000 (ids r0..r9)
    for (let i = 0; i < 10; i++) {
      await db.addRecord(makeRecord(i))
    }
  })

  afterEach(async () => {
    await db.delete()
  })

  it('returns the most recent N records when offset=0', async () => {
    const { records, total } = await db.queryRecords({ limit: 3, offset: 0 })
    expect(total).toBe(10)
    expect(records).toHaveLength(3)
    expect(records.map((r) => r.id)).toEqual(['r7', 'r8', 'r9'])
  })

  it('returns the next page when offset=3', async () => {
    const { records, total } = await db.queryRecords({ limit: 3, offset: 3 })
    expect(total).toBe(10)
    expect(records).toHaveLength(3)
    expect(records.map((r) => r.id)).toEqual(['r4', 'r5', 'r6'])
  })

  it('returns fewer records when offset+limit exceeds total', async () => {
    const { records, total } = await db.queryRecords({ limit: 4, offset: 8 })
    expect(total).toBe(10)
    expect(records).toHaveLength(2)
    expect(records.map((r) => r.id)).toEqual(['r0', 'r1'])
  })

  it('returns empty array when offset >= total', async () => {
    const { records, total } = await db.queryRecords({ limit: 5, offset: 10 })
    expect(total).toBe(10)
    expect(records).toHaveLength(0)
  })
})
