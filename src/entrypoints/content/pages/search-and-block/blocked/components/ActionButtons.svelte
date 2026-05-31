<script lang="ts">
  import { Button } from '$lib/components/ui/button'
  import { RotateCcwIcon, RefreshCwIcon } from 'lucide-svelte'
  
  let { 
    hideStatus, 
    blockStatus, 
    onRemoveHide, 
    onRetryBlock 
  }: { 
    hideStatus: 'active' | 'removed';
    blockStatus: 'not_requested' | 'pending' | 'blocked' | 'failed';
    onRemoveHide: () => void;
    onRetryBlock: () => void;
  } = $props()
</script>

<div class="flex items-center gap-1.5">
  {#if hideStatus === 'active'}
    <Button 
      variant="ghost" 
      size="sm" 
      class="text-xs h-7 px-2.5 text-rose-600 hover:text-rose-700 hover:bg-rose-500/10 rounded-md transition-all duration-200" 
      onclick={onRemoveHide}
    >
      <RotateCcwIcon class="w-3.5 h-3.5 mr-1" />
      恢复显示
    </Button>
  {/if}
  {#if blockStatus === 'failed' || blockStatus === 'not_requested'}
    <Button 
      variant="ghost" 
      size="sm" 
      class="text-xs h-7 px-2.5 text-blue-600 hover:text-blue-700 hover:bg-blue-500/10 rounded-md transition-all duration-200" 
      onclick={onRetryBlock}
    >
      <RefreshCwIcon class="w-3.5 h-3.5 mr-1" />
      发起 Block
    </Button>
  {/if}
</div>
