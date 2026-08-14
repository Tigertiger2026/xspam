<script lang="ts">
  import { onMount } from 'svelte'
  import { dbApi, dbStore, compatSpamUser, type User } from '$lib/db'
  import { ADataTable } from '$lib/components/logic/a-data-table'
  import { Input } from '$lib/components/ui/input'
  import { Button } from '$lib/components/ui/button'
  import { debounce } from 'es-toolkit'
  import { ShieldCheckIcon } from 'lucide-svelte'
  import { toast } from 'svelte-sonner'
  import { userColumns } from '../utils/columns'
  import { t } from '$lib/i18n'
  import { unblockUser } from '$lib/api/twitter'
  import { batchBlockUsersMutation } from '$lib/hooks/batchBlockUsers'
  import { eventMessage } from '$lib/shared'

  /**
   * XSpam Client - Blocked Users Page
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
    allColumns
      .filter((it) => visibleColumnsKeys.includes(it.dataIndex as string))
      .map(col => ({
        ...col,
        title: $t(col.title)
      }))
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
      toast.error('加载失败')
      console.error(err)
    } finally {
      isLoading = false
    }
  }

  // 初始加载
  onMount(() => {
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
            await dbApi.spamUsers.remove(u.id)
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
      eventMessage.sendMessage('reloadSpamContext', undefined).catch(() => {})
      toast.success('解除屏蔽成功')
    } finally {
      isUnblocking = false
    }
  }
</script>

<div class="p-4 space-y-4">
  <div class="flex items-center gap-2">
    <Input
      placeholder={$t('search-and-block.search.placeholder')}
      bind:value={searchName}
      class="w-64 bg-zinc-900/50 border-zinc-800"
    />
    <Button
      variant="outline"
      size="sm"
      disabled={selectedUsers.length === 0 || isUnblocking}
      onclick={batchUnblock}
      class="gap-2 bg-zinc-900/50 border-zinc-800 hover:bg-zinc-800"
    >
      <ShieldCheckIcon class="w-4 h-4" />
      {$t('search-and-block.actions.unblockSelected')}
      {#if selectedUsers.length > 0}
        ({selectedUsers.length})
      {/if}
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
