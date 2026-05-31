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
} = {
  spamUsers: new Set(),
}

// 刷新 Spam 用户列表
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
