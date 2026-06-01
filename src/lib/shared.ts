import { get } from 'idb-keyval'
import { dbApi, Tweet, User } from './db'
import { defineCustomEventMessage } from './util/CustomEventMessage'
import { ExternalToast } from 'svelte-sonner'
import { Lru } from 'toad-cache'

/**
 * XSpam Client - Shared State
 * 
 * 精简版：移除了 ModList 相关的类型和逻辑
 */

// 过滤缓存
export const flowFilterCacheMap = new Lru<{ value: boolean; reason?: string }>(
  1000,
)

// Spam 上下文
export const spamContext: {
  spamUsers: Set<string>
  spamScreenNames: Set<string>
} = {
  spamUsers: new Set(),
  spamScreenNames: new Set(),
}

// 初始化：从 IndexedDB 加载全部活跃 spam 用户到内存
export async function initSpamContext(): Promise<void> {
  try {
    const [allIds, allHandles] = await Promise.all([
      dbApi.spamUsers.getAllActiveIds(),
      dbApi.spamUsers.getAllActiveHandles(),
    ])
    allIds.forEach((id) => spamContext.spamUsers.add(id))
    allHandles.forEach((handle) => spamContext.spamScreenNames.add(handle))
    console.debug('[XSpam] initSpamContext: loaded', allIds.length, 'user IDs,', allHandles.length, 'screen names')
  } catch (err) {
    console.error('[XSpam] initSpamContext failed', err)
  }
}

// 刷新 Spam 用户列表（增量：从 API 响应中发现的用户）
export async function refreshSpamUsers(userIds: string[]): Promise<void> {
  const spamUserIds = await dbApi.spamUsers.isSpam(userIds)
  spamUserIds.forEach((userId) => {
    spamContext.spamUsers.add(userId)
  })
}

// 事件消息定义
import type { MinimalSpamReportRequest } from './observe'

export const eventMessage = defineCustomEventMessage<{
  QuickBlock: (data: { 
    user: User; 
    tweet?: Tweet; 
    report?: MinimalSpamReportRequest; 
    elementToHide?: HTMLElement 
  }) => void
  Toast: (data: {
    type: 'success' | 'error' | 'warning' | 'info'
    message: string
    options?: ExternalToast
  }) => void
  showBlockUserToast: (user: Pick<User, 'name' | 'screen_name'>) => void
}>()
