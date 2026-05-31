<script lang="ts">
  import { Button } from '$lib/components/ui/button'
  import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
  } from '$lib/components/ui/card'
  import { ShieldAlertIcon, RefreshCwIcon, UsersIcon, ShieldCheckIcon, HelpCircleIcon } from 'lucide-svelte'
  import { onMount } from 'svelte'
  import { toast } from 'svelte-sonner'
  import { blockUser } from '$lib/api/twitter'
  import { dbApi, dbStore, compatSpamUser } from '$lib/db'
  import type { User } from '$lib/db'
  import { syncCloudSpamList } from '$lib/cloudSpam'
  import { batchBlockUsersMutation } from '$lib/hooks/batchBlockUsers'

  let stats = $state({
    total: 0,
    manual: 0,
    cloud: 0,
    imported: 0,
    lastSync: '从未同步',
    cloudVersion: '未加载'
  })

  let isSyncing = $state(false)
  let isBatchBlocking = $state(false)

  // 1. 本地统计数据提取
  async function loadStats() {
    try {
      const tx = dbStore.idb.transaction('spamUsers', 'readonly')
      const store = tx.objectStore('spamUsers')
      const allRecords = await store.getAll()
      await tx.done
      
      const compat = allRecords.map(compatSpamUser).filter(it => it.hideStatus === 'active')
      stats.total = compat.length
      stats.manual = compat.filter(it => it.source === 'manual_block').length
      stats.cloud = compat.filter(it => it.source === 'cloud_spam').length
      stats.imported = compat.filter(it => it.source === 'imported').length
      
      const syncStore = await browser.storage.local.get<{
        lastCloudSpamSyncedAt?: number
        cloudDataVersion?: string
      }>(['lastCloudSpamSyncedAt', 'cloudDataVersion'])
      if (syncStore.lastCloudSpamSyncedAt) {
        stats.lastSync = new Date(syncStore.lastCloudSpamSyncedAt).toLocaleString()
      }
      if (syncStore.cloudDataVersion) {
        stats.cloudVersion = syncStore.cloudDataVersion
      }
    } catch (err: any) {
      console.error('Failed to load stats', err)
    }
  }

  onMount(() => {
    loadStats()
  })

  // 2. 云端增量同步逻辑
  async function handleSync() {
    if (isSyncing) return
    isSyncing = true
    const toastId = toast.loading('正在连接 GitHub Release 云端垃圾库...')
    try {
      const result = await syncCloudSpamList()
      if (result.mode === 'noop') {
        toast.success(`云端同步成功，当前已是最新版本 ${result.version}。`, { id: toastId })
      } else if (result.mode === 'delta' && result.fromVersion && result.toVersion) {
        toast.success(
          `云端同步成功，已从 ${result.fromVersion} 更新到 ${result.toVersion}；新增 ${result.inserted} 个，移除 ${result.removed} 个。`,
          { id: toastId },
        )
      } else {
        toast.success(
          `云端同步成功，已加载版本 ${result.version}；新增 ${result.inserted} 个，移除 ${result.removed} 个。`,
          { id: toastId },
        )
      }
      await loadStats()
    } catch (err: any) {
      toast.error('云端同步失败: ' + err.message, { id: toastId })
    } finally {
      isSyncing = false
    }
  }

  // 3. 批量将本地已隐藏的云端垃圾升级为真实物理 Block (使用限速保护)
  async function handleBatchBlock() {
    if (isBatchBlocking) return
    
    try {
      const tx = dbStore.idb.transaction('spamUsers', 'readonly')
      const store = tx.objectStore('spamUsers')
      const allRecords = await store.getAll()
      await tx.done
      
      const targets = allRecords
        .map(compatSpamUser)
        .filter(it => it.source === 'cloud_spam' && it.hideStatus === 'active' && it.blockStatus !== 'blocked')
        
      if (targets.length === 0) {
        toast.info('目前没有需要进行物理屏蔽的云端已同步隐藏账号。')
        return
      }
      
      const isConfirmed = confirm(
        `【安全警示】批量物理 Block 动作会改变您在推特上的账号拉黑关系（在推特系统上被计入黑名单）。\n\n确认将这 ${targets.length} 个账号在推特上进行真实 Block 吗？`
      )
      if (!isConfirmed) return
      
      isBatchBlocking = true
      
      const usersToBlock = targets.map(t => ({
        id: t.id,
        screen_name: t.handle || '',
        name: t.displayName || '',
      } as User))

      await batchBlockUsersMutation({
        controller: new AbortController(),
        users: () => usersToBlock,
        blockUser: async (user) => {
          await blockUser({ id: user.id })
        },
        getAuthInfo: async () => {
          const authInfo = (
            await browser.storage.local.get<{ authInfo: any }>('authInfo')
          ).authInfo
          return authInfo!
        },
        onProcessed: async (user, meta) => {
          if (meta.error) {
            await dbApi.spamUsers.markBlockFailed(user.id)
          } else {
            await dbApi.spamUsers.markBlocked(user.id)
            await dbApi.users.block(user)
          }
        }
      })
      
      await loadStats()
    } catch (err: any) {
      toast.error('执行大批量任务时遇到异常中断: ' + err.message)
    } finally {
      isBatchBlocking = false
    }
  }
</script>

<!-- 顶部数据状态展示 -->
<div class="grid gap-4 mb-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
  <Card class="bg-gradient-to-br from-indigo-500/8 to-purple-500/8 border-border shadow-sm backdrop-blur-sm">
    <CardHeader class="flex flex-row items-center justify-between pb-2">
      <CardTitle class="text-sm font-semibold text-foreground">本地黑名单总数</CardTitle>
      <div class="rounded-full w-8 h-8 flex items-center justify-center bg-indigo-500/15 text-indigo-500 dark:bg-indigo-500/20 dark:text-indigo-300">
        <ShieldCheckIcon class="w-4 h-4" />
      </div>
    </CardHeader>
    <CardContent>
      <div class="text-3xl font-extrabold text-foreground">{stats.total} <span class="text-sm font-normal text-muted-foreground">个</span></div>
      <p class="text-xs text-muted-foreground mt-1.5">当前在推特页面隐藏的总账号</p>
    </CardContent>
  </Card>

  <Card class="bg-gradient-to-br from-purple-500/8 to-pink-500/8 border-border shadow-sm backdrop-blur-sm">
    <CardHeader class="flex flex-row items-center justify-between pb-2">
      <CardTitle class="text-sm font-semibold text-foreground">云端垃圾库同步</CardTitle>
      <div class="rounded-full w-8 h-8 flex items-center justify-center bg-purple-500/15 text-purple-500 dark:bg-purple-500/20 dark:text-purple-300">
        <RefreshCwIcon class="w-4 h-4" />
      </div>
    </CardHeader>
    <CardContent>
      <div class="text-3xl font-extrabold text-foreground">{stats.cloud} <span class="text-sm font-normal text-muted-foreground">个</span></div>
      <p class="text-xs text-muted-foreground mt-1.5">云端经去重聚合同步到本地的记录</p>
    </CardContent>
  </Card>

  <Card class="bg-gradient-to-br from-blue-500/8 to-cyan-500/8 border-border shadow-sm backdrop-blur-sm">
    <CardHeader class="flex flex-row items-center justify-between pb-2">
      <CardTitle class="text-sm font-semibold text-foreground">用户手动屏蔽</CardTitle>
      <div class="rounded-full w-8 h-8 flex items-center justify-center bg-blue-500/15 text-blue-500 dark:bg-blue-500/20 dark:text-blue-300">
        <UsersIcon class="w-4 h-4" />
      </div>
    </CardHeader>
    <CardContent>
      <div class="text-3xl font-extrabold text-foreground">{stats.manual} <span class="text-sm font-normal text-muted-foreground">个</span></div>
      <p class="text-xs text-muted-foreground mt-1.5">您在使用推特时主动点击拉黑的数量</p>
    </CardContent>
  </Card>

  <Card class="bg-gradient-to-br from-neutral-500/8 to-slate-500/8 border-border shadow-sm backdrop-blur-sm">
    <CardHeader class="flex flex-row items-center justify-between pb-2">
      <CardTitle class="text-sm font-semibold text-foreground">外部导入账号</CardTitle>
      <div class="rounded-full w-8 h-8 flex items-center justify-center bg-neutral-500/15 text-neutral-500 dark:bg-neutral-500/20 dark:text-neutral-300">
        <HelpCircleIcon class="w-4 h-4" />
      </div>
    </CardHeader>
    <CardContent>
      <div class="text-3xl font-extrabold text-foreground">{stats.imported} <span class="text-sm font-normal text-muted-foreground">个</span></div>
      <p class="text-xs text-muted-foreground mt-1.5">通过外部 CSV 或数据列表安全导入的数量</p>
    </CardContent>
  </Card>
</div>

<!-- 控制与控制按钮 -->
<div class="grid gap-6 md:grid-cols-2">
  <!-- 同步大卡片 -->
  <Card class="shadow-sm border-border bg-card flex flex-col justify-between">
    <CardHeader>
      <CardTitle class="text-lg font-bold flex items-center gap-2 text-foreground">
        <RefreshCwIcon class="w-5 h-5 text-indigo-500 {isSyncing ? 'animate-spin' : ''}" />
        云端 Spam 库同步中心
      </CardTitle>
    </CardHeader>
    <CardContent class="flex-1 flex flex-col justify-between py-2">
      <div class="text-muted-foreground text-sm leading-relaxed space-y-2 mb-6">
        <p>云端 Spam 库由 GitHub Release 分发。插件先拉取 metadata，再按版本下载 full snapshot 或 daily delta。</p>
        <p class="font-semibold text-foreground flex items-center gap-1.5 mt-4 bg-muted/60 p-2.5 rounded border border-border">
          <span>上次同步时间：</span>
          <span class="text-indigo-600">{stats.lastSync}</span>
        </p>
        <p class="font-semibold text-foreground flex items-center gap-1.5 bg-muted/60 p-2.5 rounded border border-border">
          <span>当前云端版本：</span>
          <span class="text-indigo-600">{stats.cloudVersion}</span>
        </p>
      </div>
      <Button 
        onclick={handleSync} 
        disabled={isSyncing}
        class="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold h-11 hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 shadow-md rounded-lg flex items-center justify-center gap-2"
      >
        {#if isSyncing}
          <RefreshCwIcon class="w-4 h-4 animate-spin" />
          正在极速拉取并计算...
        {:else}
          <RefreshCwIcon class="w-4 h-4" />
          立即拉取最新云端垃圾库
        {/if}
      </Button>
    </CardContent>
  </Card>

  <!-- 批量物理 Block 大卡片 -->
  <Card class="shadow-sm border-rose-200/60 dark:border-rose-900/50 bg-card flex flex-col justify-between">
    <CardHeader>
      <CardTitle class="text-lg font-bold flex items-center gap-2 text-foreground">
        <ShieldAlertIcon class="w-5 h-5 text-rose-500" />
        批量物理 Block 执行面板
      </CardTitle>
    </CardHeader>
    <CardContent class="flex-1 flex flex-col justify-between py-2">
      <div class="text-muted-foreground text-sm leading-relaxed mb-6 space-y-2">
        <p class="text-rose-700 dark:text-rose-200 font-semibold bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 p-3 rounded-lg flex gap-2">
          <span>⚠️</span>
          <span>安全警示：云端垃圾库命中的账号默认仅在本地推特网页自动隐藏（Hide）。如果您希望将所有当前被本地隐藏的云端垃圾批量写入您本人的推特官方拉黑名单中，可以在此发起物理 Block。</span>
        </p>
      </div>
      <Button 
        variant="destructive" 
        onclick={handleBatchBlock}
        disabled={isBatchBlocking || stats.cloud === 0}
        class="w-full h-11 font-bold shadow-md rounded-lg hover:bg-rose-700 transition-all duration-300 flex items-center justify-center gap-2"
      >
        <ShieldCheckIcon class="w-4 h-4" />
        确认一键物理 Block 所有隐藏云端账号
      </Button>
    </CardContent>
  </Card>
</div>
