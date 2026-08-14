<script lang="ts">
  import { navigate } from '$lib/components/logic/router/route.svelte'
  import { Sidebar } from '$lib/components/ui/sidebar'
  import { Button } from '$lib/components/ui/button'
  import type { MenuItem } from './types'
  import { PanelLeftIcon } from 'lucide-svelte'

  const {
    items,
  }: {
    items: MenuItem[]
  } = $props()

  const content = $derived(items.filter((it) => it.to === 'content'))
  const footer = $derived(items.filter((it) => it.to === 'footer'))

  function onClickMenuUrl(url: string) {
    navigate(url)
  }
</script>

<Sidebar>
  <div class="flex flex-col h-full py-4">
    <div class="px-6 font-extrabold text-xl pb-8 text-indigo-600 flex items-center justify-between">
      <button type="button" class="cursor-pointer text-left focus:outline-none" onclick={() => onClickMenuUrl('/')}>Mass Block</button>
    </div>
    <div class="flex-1 flex flex-col gap-2 px-3">
      {#each content as item (item.title)}
        <Button 
          variant="ghost" 
          class="justify-start w-full gap-3 h-11 px-4 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950/50" 
          onclick={() => onClickMenuUrl(item.url)}
        >
          <item.icon class="w-5 h-5 opacity-70" />
          <span class="font-medium">{item.title}</span>
        </Button>
      {/each}
    </div>
    <div class="px-3 pb-4">
      {#each footer as item (item.title)}
        <Button 
          variant="ghost" 
          class="justify-start w-full gap-3 h-11 px-4 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950/50" 
          onclick={() => onClickMenuUrl(item.url)}
        >
          <item.icon class="w-5 h-5 opacity-70" />
          <span class="font-medium">{item.title}</span>
        </Button>
      {/each}
    </div>
  </div>
</Sidebar>
