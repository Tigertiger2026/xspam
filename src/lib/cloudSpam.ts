import dayjs from 'dayjs'
import { dbApi } from './db'
import { SPAM_DATA_METADATA_URL } from './constants'
import { flowFilterCacheMap } from './shared'
import { messager } from './messaging'
import { parse, stringifyAsync } from './serializer'

const CLOUD_SYNCED_AT_KEY = 'lastCloudSpamSyncedAt'
const CLOUD_VERSION_KEY = 'cloudDataVersion'
const CLOUD_SOURCE_KEY = 'cloudDataSource'
const LEGACY_CURSOR_KEY = 'lastSyncAt'

export interface CloudSpamRecord {
  userId: string
  handle?: string
  score: number
  status: 'suspicious' | 'spam'
  reportCount: number
  updatedAt: number
}

export interface CloudSpamFullSnapshot {
  schemaVersion: 1
  version: string
  generatedAt: number
  records: CloudSpamRecord[]
}

export interface CloudSpamDeltaOp {
  op: 'upsert' | 'remove'
  userId?: string
  updatedAt?: number
  record?: CloudSpamRecord
}

export interface CloudSpamDelta {
  schemaVersion: 1
  date: string
  fromVersion: string
  toVersion: string
  ops: CloudSpamDeltaOp[]
}

export interface CloudSpamMetadata {
  schemaVersion: 1
  generatedAt: number
  currentVersion: string
  full: {
    version: string
    url: string
    sha256: string
  }
  deltas: {
    date: string
    fromVersion: string
    toVersion: string
    url: string
    sha256: string
  }[]
  retentionDays: number
}

export interface CloudSpamSyncResult {
  inserted: number
  removed: number
  generatedAt: number
  version: string
  mode: 'full' | 'delta' | 'noop'
  fromVersion?: string
  toVersion?: string
}

async function sha256Hex(text: string): Promise<string> {
  const buffer = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(text),
  )
  return Array.from(new Uint8Array(buffer))
    .map((it) => it.toString(16).padStart(2, '0'))
    .join('')
}

async function fetchText(stage: string, url: string): Promise<string> {
  const resp = parse(
    await messager.sendMessage(
      'fetch',
      await stringifyAsync([url, { method: 'GET' }]),
    ),
  ) as Response
  if (!resp.ok) {
    let body = ''
    try {
      body = await resp.text()
    } catch {
      body = 'No response body'
    }
    throw new Error(
      `${stage} failed: [${resp.status}] ${resp.statusText || 'Unknown error'}${body ? ` (${body.slice(0, 300)})` : ''}`,
    )
  }
  return await resp.text()
}

async function fetchJson<T>(stage: string, url: string): Promise<T> {
  const text = await fetchText(stage, url)
  try {
    return JSON.parse(text) as T
  } catch (error) {
    throw new Error(`${stage} failed: invalid JSON`)
  }
}

async function fetchVerifiedJson<T>(
  stage: string,
  url: string,
  sha256: string,
): Promise<T> {
  const text = await fetchText(stage, url)
  const actual = await sha256Hex(text)
  if (actual !== sha256) {
    throw new Error(
      `${stage} failed: sha256 mismatch (expected ${sha256}, got ${actual})`,
    )
  }
  try {
    return JSON.parse(text) as T
  } catch {
    throw new Error(`${stage} failed: invalid JSON`)
  }
}

function isValidDateVersion(version: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(version)
}

export function collectRequiredDeltas(
  localVersion: string,
  metadata: CloudSpamMetadata,
): CloudSpamMetadata['deltas'] | null {
  if (!isValidDateVersion(localVersion)) return null
  if (!isValidDateVersion(metadata.currentVersion)) return null

  const start = dayjs(localVersion)
  const end = dayjs(metadata.currentVersion)
  const daysBehind = end.diff(start, 'day')
  if (daysBehind <= 0) return []
  if (daysBehind > metadata.retentionDays) return null

  const byDate = new Map(metadata.deltas.map((it) => [it.date, it]))
  const required: CloudSpamMetadata['deltas'] = []
  let prevVersion = localVersion
  for (let offset = 1; offset <= daysBehind; offset++) {
    const date = start.add(offset, 'day').format('YYYY-MM-DD')
    const delta = byDate.get(date)
    if (!delta) return null
    if (delta.fromVersion !== prevVersion) return null
    required.push(delta)
    prevVersion = delta.toVersion
  }
  return prevVersion === metadata.currentVersion ? required : null
}

async function applyFullSnapshot(snapshot: CloudSpamFullSnapshot) {
  const records = snapshot.records.filter((it) => it.status === 'spam')
  await dbApi.spamUsers.replaceCloudSpamSnapshot(records)
  return {
    inserted: records.length,
    removed: 0,
  }
}

async function applyDelta(delta: CloudSpamDelta) {
  const upserts: CloudSpamRecord[] = []
  const removes: string[] = []
  for (const op of delta.ops) {
    if (op.op === 'upsert' && op.record && op.record.status === 'spam') {
      upserts.push(op.record)
    }
    if (op.op === 'remove' && typeof op.userId === 'string') {
      removes.push(op.userId)
    }
  }

  if (upserts.length > 0) {
    await dbApi.spamUsers.upsertCloudSpam(upserts)
  }
  await Promise.all(
    removes.map((userId) => dbApi.spamUsers.removeCloudSpamUser(userId)),
  )
  return {
    inserted: upserts.length,
    removed: removes.length,
  }
}

export async function syncCloudSpamList(options?: {
  force?: boolean
}): Promise<CloudSpamSyncResult> {
  const store = await browser.storage.local.get<{
    [CLOUD_VERSION_KEY]?: string
  }>(CLOUD_VERSION_KEY)
  const localVersion = options?.force ? '' : (store[CLOUD_VERSION_KEY] || '')
  const metadata = await fetchJson<CloudSpamMetadata>(
    'metadata fetch',
    SPAM_DATA_METADATA_URL,
  )

  if (localVersion && localVersion === metadata.currentVersion) {
    await browser.storage.local.set({
      [CLOUD_SYNCED_AT_KEY]: Date.now(),
      [CLOUD_VERSION_KEY]: metadata.currentVersion,
      [CLOUD_SOURCE_KEY]: 'github-release',
    })
    return {
      inserted: 0,
      removed: 0,
      generatedAt: metadata.generatedAt,
      version: metadata.currentVersion,
      mode: 'noop',
    }
  }

  let inserted = 0
  let removed = 0
  let mode: CloudSpamSyncResult['mode'] = 'full'
  let fromVersion: string | undefined

  if (!localVersion) {
    const snapshot = await fetchVerifiedJson<CloudSpamFullSnapshot>(
      'full snapshot fetch',
      metadata.full.url,
      metadata.full.sha256,
    )
    const result = await applyFullSnapshot(snapshot)
    inserted += result.inserted
    removed += result.removed
  } else {
    const deltas = collectRequiredDeltas(localVersion, metadata)
    if (!deltas || deltas.length === 0) {
      const snapshot = await fetchVerifiedJson<CloudSpamFullSnapshot>(
        'full snapshot fetch',
        metadata.full.url,
        metadata.full.sha256,
      )
      const result = await applyFullSnapshot(snapshot)
      inserted += result.inserted
      removed += result.removed
      fromVersion = localVersion
    } else {
      mode = 'delta'
      fromVersion = localVersion
      for (const deltaDescriptor of deltas) {
        const delta = await fetchVerifiedJson<CloudSpamDelta>(
          `delta fetch ${deltaDescriptor.date}`,
          deltaDescriptor.url,
          deltaDescriptor.sha256,
        )
        const result = await applyDelta(delta)
        inserted += result.inserted
        removed += result.removed
      }
    }
  }

  await browser.storage.local.set({
    [CLOUD_SYNCED_AT_KEY]: Date.now(),
    [CLOUD_VERSION_KEY]: metadata.currentVersion,
    [CLOUD_SOURCE_KEY]: 'github-release',
  })
  await browser.storage.local.remove(LEGACY_CURSOR_KEY)

  flowFilterCacheMap.clear()

  return {
    inserted,
    removed,
    generatedAt: metadata.generatedAt,
    version: metadata.currentVersion,
    mode,
    fromVersion,
    toVersion: metadata.currentVersion,
  }
}
