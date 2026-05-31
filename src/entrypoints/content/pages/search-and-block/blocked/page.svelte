<script lang="ts">
  import { dbApi, type User } from '$lib/db'
  import { ADataTable } from '$lib/components/logic/a-data-table'
  import { Input } from '$lib/components/ui/input'
  import { Button } from '$lib/components/ui/button'
  import { debounce } from 'es-toolkit'
  import { ShieldCheckIcon, DownloadIcon } from 'lucide-svelte'
  import { toast } from 'svelte-sonner'
  import { userColumns } from '../utils/columns'
  import { t } from '$lib/i18n'
  import { unblockUser } from '$lib/api/twitter'
  import { batchBlockUsersMutation } from '$lib/hooks/batchBlockUsers'

  /**
   * XSpam Client - Blocked Users Page
   * 
   * 精简版：移除 @tanstack/svelte-query 依赖
   */

  // 状态
  let users = $state<User[]>([])
  let isLoading = $state(false)
  let searchName = $state('')
  let selectedUsers = $state<User[]>([])
  let isUnblocking = $state(false)

  // 列定义
  const allColumns = userColumns
  let visibleColumnsKeys = $state<string[]>([
    'profile_image_url',
    'screen_name', 
    'name',
    'blocking',
  ])
  let visibleColumns = $derived(
    allColumns.filter((it) => visibleColumnsKeys.includes(it.dataIndex as string))
  )

  // 过滤后的数据
  let filteredUsers = $derived(
    users.filter(u => {
      if (!searchName) return true
      const search = searchName.toLowerCase()
      return (
        u.name?.toLowerCase().includes(search) ||
        u.screen_name?.toLowerCase().includes(search)
      )
    })
  )

  // 加载数据
  async function loadUsers() {
    isLoading = true
    try {
      const all = await dbApi.users.getAll(10000)
      users = all.filter(u => u.blocking)
    } catch (err) {
      toast.error('加载失败')
    } finally {
      isLoading = false
    }
  }

  // 初始加载
  $effect(() => {
    loadUsers()
  })

  // 批量解除屏蔽
  async function batchUnblock() {
    if (selectedUsers.length === 0) return
    
    const confirmed = confirm(`确定要解除屏蔽 ${selectedUsers.length} 个用户吗？`)
    if (!confirmed) return

    const controller = new AbortController()
    isUnblocking = true
    
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
          console.log(`Unblocked ${u.screen_name}`, meta)
        },
      })
      await loadUsers()
      selectedUsers = []
      toast.success('解除屏蔽成功')
    } finally {
      isUnblocking = false
    }
  }

  // 导出
  function exportUsers() {
    const data = JSON.stringify(users, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `blocked-users-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success(`已导出 ${users.length} 个用户`)
  }
</script>

<div class="p-4 space-y-4">
  <div class="flex items-center gap-2">
    <Input
      placeholder={$t('searchAndBlock.search.name')}
      bind:value={searchName}
      class="w-64"
    />
    <Button
      variant="outline"
      onclick={batchUnblock}
      disabled={selectedUsers.length === 0 || isUnblocking}
    >
      <ShieldCheckIcon class="w-4 h-4 mr-2" />
      {$t('searchAndBlock.batchUnblock')}
      {#if selectedUsers.length > 0}
        ({selectedUsers.length})
      {/if}
    </Button>
    <Button
      variant="outline"
      onclick={exportUsers}
      class="ml-auto"
    >
      <DownloadIcon class="w-4 h-4 mr-2" />
      {$t('common.export')}
    </Button>
  </div>

  {#if isLoading}
    <div class="p-4 text-center">加载中...</div>
  {:else}
    <ADataTable
      dataSource={filteredUsers}
      columns={visibleColumns}
      bind:selectedRows={selectedUsers}
      getRowId={(row) => row.id}
    />
    <div class="text-sm text-muted-foreground">
      共 {filteredUsers.length} 个已屏蔽用户
      {#if selectedUsers.length > 0}
        ，已选择 {selectedUsers.length} 个
      {/if}
    </div>
  {/if}
</div>
