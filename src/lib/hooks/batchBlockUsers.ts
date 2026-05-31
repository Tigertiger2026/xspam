import {
  batchBlockUsers,
  BatchBlockUsersProcessedMeta,
  ExpectedError,
} from '$lib/api'
import { dbApi, User } from '$lib/db'
import { tP } from '$lib/i18n'
import ms from 'ms'
import { toast } from 'svelte-sonner'
import { ulid } from 'ulidx'
import { fileSelector } from '$lib/util/fileSelector'
import { getSettings } from '$lib/settings'
import { parseCSV } from '$lib/util/csv'
import { omit, pick } from 'es-toolkit'

/**
 * XSpam Client - Batch Block Users
 * 
 * 精简版：移除 Pro 限制和后端依赖
 */

function getRandomCount(blockSpeedRange: [number, number]) {
  const [min, max] = blockSpeedRange
  return Math.max(min + Math.floor(Math.random() * (max - min)), 1)
}

export async function selectImportFile() {
  const files = await fileSelector({
    accept: '.json, .csv',
  })
  if (!files) {
    return
  }
  const str = await files[0].text()
  let users: User[]
  if (files[0].name.endsWith('.json')) {
    users = JSON.parse(str) as User[]
  } else {
    try {
      users = (parseCSV(str) as User[]).map(
        (it) =>
          pick(it, [
            'id',
            'screen_name',
            'name',
            'description',
            'profile_image_url',
            'created_at',
          ]) as User,
      )
    } catch (err) {
      toast.error(tP('modlists.detail.users.import.invalid'))
      return
    }
  }
  console.debug('import users', users)
  if (users.length === 0) {
    toast.error(tP('modlists.detail.users.import.empty'))
    return
  }
  for (const it of users) {
    if (!(it.id && it.screen_name)) {
      toast.error(tP('modlists.detail.users.import.invalid'))
      return
    }
  }
  const confirmed = confirm(
    tP('modlists.detail.users.import.confirm', {
      values: {
        count: users.length,
      },
    }),
  )
  if (!confirmed) {
    return
  }
  return users
}

/**
 * 批量屏蔽用户（简化版，无 Pro 限制）
 */
export const batchBlockUsersMutation = async <T extends User>(options: {
  controller: AbortController
  users: () => T[]
  total?: number
  blockUser: (user: T) => Promise<'skip' | undefined | void>
  onProcessed: (user: T, meta: BatchBlockUsersProcessedMeta) => Promise<void>
}) => {
  const { controller, users } = options
  const cancel = {
    label: tP('modlists.detail.toast.blockingStop'),
    onClick: () => {
      controller.abort()
      toast.dismiss(toastId)
    },
  }
  const toastId = toast.loading(tP('modlists.detail.toast.blocking'), {
    cancel,
  })
  
  let errorToastId = ulid()
  try {
    let lastBlockedIndex = 0
    let realBlockedCount = 0

    await batchBlockUsers(users, {
      onProcessed: async (user, meta) => {
        if (controller.signal.aborted) {
          return
        }
        lastBlockedIndex = meta.index
        if (meta.result !== 'skip') {
          realBlockedCount++
        }
        const errorMessage = (() => {
          if (!meta.error) {
            return
          }
          if (meta.error instanceof ExpectedError) {
            return tP(`error.${meta.error.code}` as any)
          }
          return String(meta.error)
        })()
        if (errorMessage) {
          toast.error(errorMessage, {
            id: errorToastId,
          })
        }
        
        // 简化的进度更新（移除 Pro 限制提示）
        if (meta.index % 5 === 0 || meta.index === meta.total) {
          toast.loading(
            tP('modlists.detail.toast.blockingProgress', {
              values: {
                current: meta.index,
                total: meta.total,
                speed: `${ms(meta.averageTime)}/user`,
                remain: ms(meta.wait, { long: true }),
              },
            }),
            {
              id: toastId,
              cancel,
            },
          )
        }
        await options.onProcessed(user, meta)
      },
      signal: controller.signal,
      blockUser: options.blockUser,
    })
    
    toast.success(
      tP('modlists.detail.toast.blockingSuccess', {
        values: {
          count: realBlockedCount,
        },
      }),
      {
        id: toastId,
      },
    )
  } catch (err) {
    if ((err as Error).name === 'AbortError') {
      toast.info(tP('modlists.detail.toast.blockingAborted'), {
        id: toastId,
      })
      return
    }
    throw err
  }
}
