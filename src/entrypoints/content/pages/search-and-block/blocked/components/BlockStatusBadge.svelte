<script lang="ts">
  let { blockStatus }: { blockStatus: 'not_requested' | 'pending' | 'blocked' | 'failed' } = $props()
</script>

<span
  class="px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide border shadow-sm backdrop-blur-sm transition-all duration-300 {
    blockStatus === 'not_requested'
      ? 'bg-neutral-500/10 text-neutral-500 border-neutral-500/20'
      : blockStatus === 'pending'
      ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
      : blockStatus === 'blocked'
      ? 'bg-green-500/10 text-green-600 border-green-500/20'
      : 'bg-red-500/10 text-red-600 border-red-500/20'
  }"
>
  {#if blockStatus === 'not_requested'}
    未发起 Block
  {:else if blockStatus === 'pending'}
    屏蔽中...
  {:else if blockStatus === 'blocked'}
    已真实 Block
  {:else}
    Block 失败
  {/if}
</span>
