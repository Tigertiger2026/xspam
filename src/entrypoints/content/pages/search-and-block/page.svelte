<script lang="ts">
  import { dbApi, type User } from '$lib/db'
  import { ADataTable } from '$lib/components/logic/a-data-table'
  import { Input } from '$lib/components/ui/input'
  import { filterUser, type SearchParams } from './utils/filterUser'
  import SelectFilter from './components/SelectFilter.svelte'
  import { type LabelValue } from './components/SelectFilter.types'
  import { extractCurrentUserId } from '$lib/observe'
  import { blockUser, unblockUser } from '$lib/api/twitter'
  import { debounce, groupBy } from 'es-toolkit'
  import { buttonVariants } from '$lib/components/ui/button'
  import {
    DownloadIcon,
    EyeIcon,
    MenuIcon,
    ShieldBanIcon,
    ShieldCheckIcon,
  } from 'lucide-svelte'
  import { toast } from 'svelte-sonner'
  import { serializeError } from 'serialize-error'
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu'
  import { shadcnConfig } from '$lib/components/logic/config'
  import TableExtraButton from '$lib/components/logic/TableExtraButton.svelte'
  import { navigate } from '$lib/components/logic/router'
  import { userColumns } from './utils/columns'
  import { t } from '$lib/i18n'
  import { batchBlockUsersMutation } from '$lib/hooks/batchBlockUsers'
  import { searchPeople } from '$lib/api/twitter'
  import { confirmToast } from '$lib/components/custom/toast'
  import { selectImportFile } from '$lib/hooks/batchBlockUsers'

  /**
   * XSpam Client - Search and Block Page
   * 
   * 精简版：移除了 @tanstack/svelte-query 依赖
   * 直接使用 dbApi 操作本地数据
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
  let rows = $derived(filterUser(users, searchParams))

  // 加载数据
  async function loadUsers() {
    isLoading = true
    error = null
    try {
      const allUsers = await dbApi.users.getAll(10000)
      users = allUsers.filter(u => u.blocking)
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
    { value: 'all', label: $t('searchAndBlock.filter.all') },
    { value: 'blocked', label: $t('searchAndBlock.filter.blocked') },
    { value: 'unblocked', label: $t('searchAndBlock.filter.unblocked') },
  ]
  const labelOptions: LabelValue<'all' | 'manual' | 'cloud' | 'imported'>[] = [
    { value: 'all', label: $t('searchAndBlock.filter.all') },
    { value: 'manual', label: $t('searchAndBlock.filter.manual') },
    { value: 'cloud', label: $t('searchAndBlock.filter.cloud') },
    { value: 'imported', label: $t('searchAndBlock.filter.imported') },
  ]
  
  // 列定义
  const allColumns = userColumns({ t })
  let visibleColumnsKeys = $state<string[]>([
    'profile_image_url',
    'screen_name',
    'name',
    'blocking',
  ])
  let visibleColumns = $derived(
    allColumns.filter((it) => visibleColumnsKeys.includes(it.key)),
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
    const users = await selectImportFile()
    if (!users) return
    const controller = new AbortController()
    isBlocking = true
    try {
      await batchBlockUsersMutation({
        controller,
        users: () => users,
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

  // 导出选中用户
  function exportSelected() {
    const data = JSON.stringify(selectedUsers, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `blocked-users-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success(`已导出 ${selectedUsers.length} 个用户`)
  }
</script>

<div class="flex flex-col gap-2 p-4">
  <div class="flex items-center gap-2">
    <Input
      placeholder={$t('searchAndBlock.search.name')}
      bind:value={search.name}
      class="w-48"
    />
    <Input
      placeholder={$t('searchAndBlock.search.screenName')}
      bind:value={search.screenName}
      class="w-48"
    />
    <SelectFilter
      label={$t('searchAndBlock.filter.blockingLabel')}
      options={blockingOptions}
      bind:selected={search.blocking}
      onChange={(value) => {
        searchParams = { ...searchParams, blocking: value }
      }}
    />
    <SelectFilter
      label={$t('searchAndBlock.filter.sourceLabel')}
      options={labelOptions}
      bind:selected={search.label}
      onChange={(value) => {
        searchParams = { ...searchParams, label: value }
      }}
    />
    <div class="ml-auto">
      <TableExtraButton
        {allColumns}
        bind:visibleColumns={visibleColumnsKeys}
        onExport={exportSelected}
        exportDisabled={selectedUsers.length === 0}
      >
        {#snippet buttons()}
          <DropdownMenu.Item onclick={importUsers}>
            <DownloadIcon class="w-4 h-4 mr-2" />
            {$t('searchAndBlock.importUsers')}
          </DropdownMenu.Item>
          <DropdownMenu.Item 
            onclick={batchUnblock}
            disabled={selectedUsers.length === 0 || isBlocking}
          >
            <ShieldCheckIcon class="w-4 h-4 mr-2" />
            {$t('searchAndBlock.batchUnblock')}
          </DropdownMenu.Item>
          <DropdownMenu.Item 
            onclick={batchReblock}
            disabled={selectedUsers.length === 0 || isBlocking}
          >
            <ShieldBanIcon class="w-4 h-4 mr-2" />
            {$t('searchAndBlock.batchReblock')}
          </DropdownMenu.Item>
        {/snippet}
      </TableExtraButton>
    </div>
  </div>
  
  {#if error}
    <div class="text-red-500 p-4">{error}</div>
  {/if}
  
  {#if isLoading}
    <div class="p-4 text-center">加载中...</div>
  {:else}
    <ADataTable
      data={rows}
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
