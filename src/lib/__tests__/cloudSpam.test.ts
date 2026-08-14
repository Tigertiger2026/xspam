import { describe, expect, it } from 'vitest'
import {
  collectRequiredDeltas,
  isCloudSnapshotCurrent,
  type CloudSpamMetadata,
} from '$lib/cloudSpam'

function createMetadata(): CloudSpamMetadata {
  return {
    schemaVersion: 1,
    generatedAt: Date.now(),
    currentVersion: '2026-05-26',
    full: {
      version: '2026-05-26',
      url: 'https://example.com/full.json',
      sha256: 'abc',
    },
    deltas: [
      {
        date: '2026-05-25',
        fromVersion: '2026-05-24',
        toVersion: '2026-05-25',
        url: 'https://example.com/delta-2026-05-25.json',
        sha256: 'def',
      },
      {
        date: '2026-05-26',
        fromVersion: '2026-05-25',
        toVersion: '2026-05-26',
        url: 'https://example.com/delta-2026-05-26.json',
        sha256: 'ghi',
      },
    ],
    retentionDays: 30,
  }
}

describe('collectRequiredDeltas', () => {
  it('returns ordered delta chain when contiguous', () => {
    const chain = collectRequiredDeltas('2026-05-24', createMetadata())
    expect(chain?.map((it) => it.date)).toEqual(['2026-05-25', '2026-05-26'])
  })

  it('returns null when a delta is missing', () => {
    const metadata = createMetadata()
    metadata.deltas = metadata.deltas.slice(1)
    expect(collectRequiredDeltas('2026-05-24', metadata)).toBeNull()
  })

  it('returns empty array when already current', () => {
    expect(collectRequiredDeltas('2026-05-26', createMetadata())).toEqual([])
  })
})

describe('isCloudSnapshotCurrent', () => {
  it('treats the same version and generatedAt as current', () => {
    const metadata = createMetadata()
    expect(isCloudSnapshotCurrent({
      localVersion: metadata.currentVersion,
      localGeneratedAt: metadata.generatedAt,
      metadata,
    })).toBe(true)
  })

  it('forces a full refresh when the same daily version was republished', () => {
    const metadata = createMetadata()
    expect(isCloudSnapshotCurrent({
      localVersion: metadata.currentVersion,
      localGeneratedAt: metadata.generatedAt - 1,
      metadata,
    })).toBe(false)
  })

  it('refreshes once after upgrading from clients without generatedAt state', () => {
    const metadata = createMetadata()
    expect(isCloudSnapshotCurrent({
      localVersion: metadata.currentVersion,
      metadata,
    })).toBe(false)
  })
})
