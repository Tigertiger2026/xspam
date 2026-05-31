<script lang="ts">
  let { source }: { source: 'manual_block' | 'cloud_spam' | 'imported' } = $props()
</script>

<span
  class="px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide shadow-sm backdrop-blur-sm border transition-all duration-300 {
    source === 'manual_block'
      ? 'bg-blue-500/10 text-blue-600 border-blue-500/20'
      : source === 'cloud_spam'
      ? 'bg-purple-500/10 text-purple-600 border-purple-500/20'
      : 'bg-neutral-500/10 text-neutral-600 border-neutral-500/20'
  }"
>
  {#if source === 'manual_block'}
    手动屏蔽
  {:else if source === 'cloud_spam'}
    云端同步
  {:else}
    导入数据
  {/if}
</span>
