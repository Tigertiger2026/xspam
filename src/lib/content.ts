import { getTweetElement } from './observe'
import { ShieldBanIcon, ShieldCheckIcon } from 'lucide-svelte'
import { toast } from 'svelte-sonner'
import { ulid } from 'ulidx'
import {
  blockUser,
  getBlockedUsers,
  getCommunityInfo,
  getCommunityMembers,
  getUserBlueVerifiedFollowers,
  getUserByScreenName,
  getUserFollowers,
  getUserFollowing,
  searchPeople,
  unblockUser,
} from './api/twitter'
import { xClientTransaction } from './api'
import dayjs from 'dayjs'
import { navigate } from './components/logic/router'
import { useOpen } from './stores/open.svelte'
import { dbApi, Tweet, User } from './db'
import { eventMessage, flowFilterCacheMap, refreshSpamUsers, spamContext } from './shared'

/**
 * XSpam Client - Content Script Utilities
 * 
 * 精简版：移除所有后端依赖，只保留本地功能和 X API 调用
 */

// 自动检查待处理用户（简化版 - 只刷新本地缓存，不上传到后端）
export async function autoCheckPendingUsers() {
  // 简化版本：不上传到后端，只刷新本地缓存
  // 云端数据通过 syncCloudSpamList 从 GitHub Release 同步
  console.log('[XSpam] Auto check pending users (local only)')
  // 可以添加本地逻辑，如果有需要的话
}

// 测试任务列表（开发调试用）
interface Task {
  name: string
  fn: () => Promise<any>
  status: 'idle' | 'running' | 'success' | 'error'
  collapsibled: boolean
  result?: any
  error?: Error
}

export const tasks: Pick<Task, 'name' | 'fn'>[] = [
  {
    name: 'getXTransactionId',
    fn: () =>
      xClientTransaction.generateTransactionId(
        'POST',
        'https://x.com/i/api/1.1/blocks/create.json',
      ),
  },
  {
    name: 'getBlockedUsers',
    fn: () => getBlockedUsers({ count: 10 }),
  },
  {
    name: 'blockUser',
    fn: () => blockUser({ id: '25073877' }),
  },
  {
    name: 'unblockUser',
    fn: () => unblockUser('25073877'),
  },
  {
    name: 'searchPeople',
    fn: () =>
      searchPeople({
        term: 'trump',
        count: 10,
      }),
  },
  {
    name: 'getCommunityInfo',
    fn: () => getCommunityInfo({ communityId: '1900366536683987325' }),
  },
  {
    name: 'getCommunityMembers',
    fn: () => getCommunityMembers({ communityId: '1900366536683987325' }),
  },
  {
    name: 'getUserBlueVerifiedFollowers',
    fn: () => getUserBlueVerifiedFollowers({ userId: '736267842681602048' }),
  },
  {
    name: 'getUserFollowers',
    fn: () => getUserFollowers({ userId: '736267842681602048' }),
  },
  {
    name: 'getUserFollowing',
    fn: () => getUserFollowing({ userId: '736267842681602048' }),
  },
  {
    name: 'getUserByScreenName',
    fn: () => getUserByScreenName('rxliuli'),
  },
]

// 一键 Block 功能（核心功能，保留）
export function quickBlock(options: {
  user: User
  tweet?: Tweet
  elementToHide?: HTMLElement
  blockUser?: (user: User) => Promise<void>
}) {
  const { user, tweet } = options
  const element = options.elementToHide || (tweet ? getTweetElement(tweet.id) : undefined)
  if (element) {
    element.style.display = 'none'
  }

  // 1. 立即在本地库标记为 manual_block
  dbApi.spamUsers.upsertManualBlock(user).catch((err) => {
    console.error('Failed to write manual block to local DB', err)
  })

  let isDismissed = false
  const title = `Blocked user @${user.screen_name} ${user.name}`

  const timer = setTimeout(async () => {
    try {
      if (options.blockUser) {
        await options.blockUser(user)
      } else {
        await blockUser({ id: user.id })
      }
      // 成功后更新状态为 blocked
      await dbApi.users.block(user)
      await dbApi.spamUsers.markBlocked(user.id)
    } catch (error) {
      console.error('Failed to perform real X block', error)
      // 失败后更新状态为 failed (本地页面保持隐藏)
      await dbApi.spamUsers.markBlockFailed(user.id)
    }

    await dbApi.activitys.record([
      {
        id: ulid(),
        action: 'block',
        trigger_type: 'manual',
        match_filter: 'batchSelected',
        match_type: tweet ? 'tweet' : 'user',
        tweet_id: tweet?.id,
        tweet_content: tweet?.text,
        user_id: user.id,
        user_name: user.name,
        user_screen_name: user.screen_name,
        user_profile_image_url: user.profile_image_url,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ])
  }, 3000)

  toast.info(title, {
    duration: 3000,
    icon: ShieldBanIcon,
    cancel: {
      label: 'Undo',
      onClick: async () => {
        clearTimeout(timer)
        if (element) {
          element.style.display = 'block'
        }
        try {
          await dbApi.spamUsers.remove(user.id)
          spamContext.spamUsers.delete(user.id)
          if (user.screen_name) {
            spamContext.spamScreenNames.delete(user.screen_name.toLowerCase())
          }
          flowFilterCacheMap.clear()
          eventMessage.sendMessage('reloadSpamContext', undefined).catch(() => {})
        } catch (err) {
          console.error('Failed to undo local spam record', err)
        }
        toast.info('Block undone.', {
          icon: ShieldCheckIcon,
          duration: 3000,
          cancel: undefined,
        })
      },
    },
    onDismiss: () => {
      isDismissed = true
    },
  })
}

// 显示昨日屏蔽统计
export function autoAlertBlocked() {
  setTimeout(async () => {
    const lastAlert = localStorage.getItem('LAST_ALERT_BLOCKED')
    if (lastAlert) {
      const now = dayjs()
      if (now.diff(dayjs(lastAlert), 'day') === 0) {
        return
      }
    }
    localStorage.setItem('LAST_ALERT_BLOCKED', new Date().toISOString())
    const before = dayjs().subtract(1, 'day')
    const blockedUsers = (
      await dbApi.activitys.getByRange(
        before.startOf('day').toDate(),
        before.endOf('day').toDate(),
      )
    ).sort((a, b) => b.created_at.localeCompare(a.created_at))
    if (blockedUsers.length === 0) {
      return
    }
    toast.info(`${blockedUsers.length} users were blocked yesterday`, {
      duration: 10000,
      description:
        blockedUsers
          .slice(0, 3)
          .map((it) => it.user_name)
          .join(',') +
        (blockedUsers.length > 3 ? ` and ${blockedUsers.length - 3} more` : ''),
      action: {
        label: 'View',
        onClick: () => {
          navigate('/dashboard/activities')
          useOpen().openModal()
        },
      },
    })
  }, 1000 * 10)
}
