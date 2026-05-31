<script lang="ts">
  import LayoutNav from '$lib/components/layout/LayoutNav.svelte'
  import { dbApi } from '$lib/db'
  import ActivityItem from './components/ActivityItem.svelte'
  import { t } from '$lib/i18n'
  import { onMount } from 'svelte'

  /**
   * XSpam Client - Activities Page
   * 
   * 精简版：移除了 @tanstack/svelte-query 和 @rxliuli/svelte-window
   * 使用普通列表替代虚拟列表
   */

  let activities = $state<any[]>([])
  let isLoading = $state(false)
  let hasMore = $state(true)
  let cursor = $state<string | undefined>(undefined)
  let error = $state<string | null>(null)

  async function loadMore() {
    if (isLoading || !hasMore) return
    
    isLoading = true
    error = null
    
    try {
      const result = await dbApi.activitys.getByPage({ limit: 20, cursor })
      activities = [...activities, ...result.data]
      cursor = result.cursor
      hasMore = !!result.cursor
    } catch (err) {
      error = String(err)
    } finally {
      isLoading = false
    }
  }

  // 初始加载
  onMount(() => {
    loadMore()
  })

  // 滚动加载
  function onScroll(ev: Event) {
    const { scrollTop, scrollHeight, clientHeight } = ev.target as HTMLElement
    if (scrollTop + clientHeight + 100 >= scrollHeight) {
      loadMore()
    }
  }
</script>

<LayoutNav title={$t('dashboard.recentActivities.title')} />

{#if error}
  <div class="flex items-center justify-center h-full">
    <p class="text-red-500">{$t('common.error')}: {error}</p>
  </div>
{:else}
  <div 
    class="divide-y overflow-auto h-full"
    onscroll={onScroll}
  >
    {#each activities as activity (activity.id)}
      <div style="content-visibility: auto; contain-intrinsic-size: auto 90px;">
        <ActivityItem {activity} />
      </div>
    {/each}
    
    {#if isLoading}
      <div class="p-4 text-center text-muted-foreground">
        加载中...
      </div>
    {:else if !hasMore && activities.length === 0}
      <div class="p-4 text-center text-muted-foreground">
        暂无活动记录
      </div>
    {:else if !hasMore}
      <div class="p-4 text-center text-muted-foreground">
        没有更多记录了
      </div>
    {/if}
  </div>
{/if}
