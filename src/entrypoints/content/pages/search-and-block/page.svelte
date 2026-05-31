<script lang="ts">
  import { dbApi, dbStore, compatSpamUser, type User } from '$lib/db'
  import { ADataTable } from '$lib/components/logic/a-data-table'
  import { Input } from '$lib/components/ui/input'
  import { filterUser, type SearchParams } from './utils/filterUser'
  import SelectFilter from './components/SelectFilter.svelte'
  import { type LabelValue } from './components/SelectFilter.types'
  import { debounce } from 'es-toolkit'
  import { Button } from '$lib/components/ui/button'
  import {
    ShieldBanIcon,
    ShieldCheckIcon,
    DownloadIcon,
  } from 'lucide-svelte'
  import { toast } from 'svelte-sonner'
  import { userColumns } from './utils/columns'
  import { t } from '$lib/i18n'
  import { blockUser, unblockUser } from '$lib/api/twitter'
  import { batchBlockUsersMutation, selectImportFile } from '$lib/hooks/batchBlockUsers'

  /**
   * XSpam Client - Search and Block Page
   */

  // 状态管理
  let users = $state<User[]>([])
  let isLoading = $state(false)
  let error = $state<string | null>(null)
  
  // 搜索和筛选
  let search = $state<{
    name?: string
    screenName?: string
    blocking?: 'all' | 'blocked' | 'unblocked'
    label: 'all' | 'manual' | 'cloud' | 'imported'
  }>({ label: 'all', blocking: 'all' })
  let searchParams = $state<SearchParams>({ label: 'all' })
  
  // 选中的用户
  let selectedUsers = $state<User[]>([])
  
  // 批量操作
  let isBlocking = $state(false)

  // 行数据
  let rows = $derived(users.filter(u => filterUser(u, searchParams)))

  // 加载数据
  async function loadUsers() {
    isLoading = true
    error = null
    try {
      const tx = dbStore.idb.transaction('spamUsers', 'readonly')
      const store = tx.objectStore('spamUsers')
      const allSpam = await store.getAll()
      await tx.done

      const compatSpam = allSpam.map(compatSpamUser).filter((it: any) => it.hideStatus === 'active')
      const spamMap = new Map()
      compatSpam.forEach((u: any) => {
        spamMap.set(u.userId || u.id, {
          id: u.userId || u.id,
          screen_name: u.handle || u.id,
          name: u.displayName || u.handle || u.id,
          profile_image_url: u.avatarUrl,
          blocking: true,
          source: u.source,
          updated_at: u.updated_at
        })
      })

      const allUsers = await dbApi.users.getAll(10000)
      allUsers.filter((u: any) => u.blocking).forEach((u: any) => {
        if (!spamMap.has(u.id)) {
           spamMap.set(u.id, u)
        } else {
           const existing = spamMap.get(u.id)
           spamMap.set(u.id, { ...existing, ...u, blocking: true })
        }
      })
      users = Array.from(spamMap.values())
    } catch (err) {
      error = String(err)
      toast.error('加载用户列表失败')
    } finally {
      isLoading = false
    }
  }

  // 初始加载
  $effect(() => {
    loadUsers()
  })

  // 防抖搜索
  const debouncedSetSearch = debounce(
    (val: typeof search) => {
      searchParams = {
        ...searchParams,
        name: val.name,
        screenName: val.screenName,
      } as SearchParams
    },
    300,
  )
  $effect(() => {
    debouncedSetSearch(search)
  })

  // 筛选选项
  const blockingOptions: LabelValue<'all' | 'blocked' | 'unblocked'>[] = [
    { value: 'all', label: $t('search-and-block.filter.all') },
    { value: 'blocked', label: $t('search-and-block.filter.blocking.blocked') },
    { value: 'unblocked', label: $t('search-and-block.filter.blocking.unblocked') },
  ]
  const labelOptions: LabelValue<'all' | 'manual' | 'cloud' | 'imported'>[] = [
    { value: 'all', label: $t('search-and-block.filter.all') },
    { value: 'manual', label: '手动屏蔽' },
    { value: 'cloud', label: '云端同步' },
    { value: 'imported', label: '导入' },
  ]
  
  // 列定义
  const allColumns = userColumns
  let visibleColumnsKeys = $state<string[]>([
    'profile_image_url',
    'screen_name',
    'name',
    'blocking',
  ])
  let visibleColumns = $derived(
    allColumns
      .filter((it) => visibleColumnsKeys.includes(it.dataIndex as string))
      .map(col => ({
        ...col,
        title: $t(col.title)
      }))
  )

  // 批量解除屏蔽
  async function batchUnblock() {
    const controller = new AbortController()
    isBlocking = true
    try {
      await batchBlockUsersMutation({
        controller,
        users: () => selectedUsers,
        blockUser: async (u) => {
          try {
            await unblockUser(u.id)
            await dbApi.users.unblock(u)
            return undefined
          } catch (err) {
            throw new Error(String(err))
          }
        },
        onProcessed: async (u, meta) => {
          console.log(`Processed ${u.screen_name}`, meta)
        },
      })
      await loadUsers() // 刷新列表
    } finally {
      isBlocking = false
      selectedUsers = []
    }
  }

  // 批量重新屏蔽
  async function batchReblock() {
    const controller = new AbortController()
    isBlocking = true
    try {
      await batchBlockUsersMutation({
        controller,
        users: () => selectedUsers,
        blockUser: async (u) => {
          try {
            await blockUser({ id: u.id })
            await dbApi.users.block(u)
            return undefined
          } catch (err) {
            throw new Error(String(err))
          }
        },
        onProcessed: async (u, meta) => {
          console.log(`Processed ${u.screen_name}`, meta)
        },
      })
      await loadUsers() // 刷新列表
    } finally {
      isBlocking = false
      selectedUsers = []
    }
  }

  // 导入用户
  async function importUsers() {
    const importedUsers = await selectImportFile()
    if (!importedUsers) return
    const controller = new AbortController()
    isBlocking = true
    try {
      await batchBlockUsersMutation({
        controller,
        users: () => importedUsers as User[],
        blockUser: async (u) => {
          try {
            await blockUser({ id: u.id })
            await dbApi.users.block(u)
            return undefined
          } catch (err) {
            throw new Error(String(err))
          }
        },
        onProcessed: async (u, meta) => {
          console.log(`Processed ${u.screen_name}`, meta)
        },
      })
      await loadUsers() // 刷新列表
    } finally {
      isBlocking = false
    }
  }

</script>

<div class="flex flex-col gap-2 p-4">
  <div class="flex items-center gap-2">
    <Input
      placeholder={$t('search-and-block.search.placeholder')}
      bind:value={search.name}
      class="w-48 bg-zinc-900/50 border-zinc-800"
    />
    <Input
      placeholder={$t('search-and-block.search.placeholder')}
      bind:value={search.screenName}
      class="w-48 bg-zinc-900/50 border-zinc-800"
    />
    <SelectFilter
      label={$t('search-and-block.filter.blocking')}
      options={blockingOptions}
      bind:selected={search.blocking}
      onChange={(value) => {
        searchParams = { ...searchParams, filterBlocked: value }
      }}
    />
    <SelectFilter
      label="来源"
      options={labelOptions}
      bind:selected={search.label}
      onChange={(value) => {
        searchParams = { ...searchParams, label: value }
      }}
    />
    <div class="ml-auto flex gap-2">
      <Button variant="outline" size="sm" onclick={importUsers} class="bg-zinc-900/50 border-zinc-800 hover:bg-zinc-800">
        <DownloadIcon class="w-4 h-4 mr-2" />
        {$t('search-and-block.actions.importBlockList')}
      </Button>
      <Button variant="outline" size="sm" onclick={batchUnblock} disabled={selectedUsers.length === 0 || isBlocking} class="bg-zinc-900/50 border-zinc-800 hover:bg-zinc-800">
        <ShieldCheckIcon class="w-4 h-4 mr-2" />
        {$t('search-and-block.actions.unblockSelected')}
      </Button>
      <Button variant="outline" size="sm" onclick={batchReblock} disabled={selectedUsers.length === 0 || isBlocking} class="bg-zinc-900/50 border-zinc-800 hover:bg-zinc-800">
        <ShieldBanIcon class="w-4 h-4 mr-2" />
        {$t('search-and-block.actions.blockSelected')}
      </Button>
    </div>
  </div>
  
  {#if error}
    <div class="text-red-500 p-4">{error}</div>
  {/if}
  
  {#if isLoading}
    <div class="p-4 text-center">加载中...</div>
  {:else}
    <ADataTable
      dataSource={rows}
      columns={visibleColumns}
      bind:selectedRows={selectedUsers}
      getRowId={(row) => row.id}
    />
    <div class="text-sm text-muted-foreground">
      共 {rows.length} 个用户
      {#if selectedUsers.length > 0}
        ，已选择 {selectedUsers.length} 个
      {/if}
    </div>
  {/if}
</div>
