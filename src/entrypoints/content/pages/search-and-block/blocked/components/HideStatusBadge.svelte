<script lang="ts">
  let { hideStatus }: { hideStatus: 'active' | 'removed' } = $props()
</script>

<span
  class="px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide border shadow-sm backdrop-blur-sm transition-all duration-300 {
    hideStatus === 'active'
      ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
      : 'bg-rose-500/10 text-rose-600 border-rose-500/20'
  }"
>
  {#if hideStatus === 'active'}
    隐藏中
  {:else}
    恢复显示
  {/if}
</span>
