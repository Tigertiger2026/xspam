<script lang="ts">
  import { SidebarProvider, SidebarTrigger } from '$lib/components/ui/sidebar'
  import type { Snippet } from 'svelte'
  import AppSidebar from './AppSidebar.svelte'
  import { cn } from '$lib/utils'
  import {
    ArrowLeftIcon,
    HomeIcon,
    MessageCircleOffIcon,
    SettingsIcon,
    UserIcon,
    UsersIcon,
    CodeIcon,
    UserXIcon,
    XIcon,
  } from 'lucide-svelte'
  import {
    goBack,
    navigate,
    router,
    useRoute,
  } from '$lib/components/logic/router'
  import type { MenuItem } from './types'
  import { setContext } from 'svelte'
  import { Button } from '../ui/button'
  import { t } from '$lib/i18n'
  import { getSettings } from '$lib/settings'

  let {
    open,
    standalone = false,
    children,
    onClose,
  }: {
    open: boolean
    standalone?: boolean
    children: Snippet
    onClose?: () => void
  } = $props()

  const menuItems = $derived.by(() => {
    const list: MenuItem[] = [
      {
        title: $t('dashboard.title'),
        url: '/',
        icon: HomeIcon,
        to: 'content',
      },
      {
        title: 'Blocked Accounts',
        url: '/search-and-block/blocked-users',
        icon: UserXIcon,
        to: 'content',
      },
      {
        title: $t('settings.title'),
        url: '/settings',
        icon: SettingsIcon,
        to: 'footer',
      },
    ]
    if (import.meta.env.DEV || getSettings().devMode) {
      list.push({
        title: 'Dev',
        url: '/dev',
        icon: CodeIcon,
        to: 'content',
      })
    }
    return list
  })
  const autoTitle = $derived(
    menuItems.find((it) => it.url === router.path)?.title ??
      $t('dashboard.title'),
  )
  let title = $state<string>()
  setContext('GlobalState', {
    setTitle: (val?: string) => {
      title = val
    },
  })

  const route = useRoute()
  const isTopLevel = $derived(
    !route.matched?.path ||
      menuItems.some((it) => route.matched?.path === it.url),
  )
  function safeGoBack() {
    if (router.history.length > 0) {
      goBack()
    } else {
      navigate('/')
    }
  }
</script>

<div
  id="mass-block-twitter"
  class={cn(
    standalone
      ? 'w-full min-h-screen flex flex-col bg-background'
      : 'fixed z-[999999] w-full top-0 left-0 h-screen h-[100dvh] flex flex-col bg-background',
    open ? 'block' : 'hidden',
  )}
>
  <SidebarProvider>
    <AppSidebar items={menuItems} />
    <main class="w-full flex-1 overflow-hidden flex flex-col">
      <header
        class="flex items-center gap-2 h-14 sticky top-0 bg-background/80 backdrop-blur px-6 border-b z-10"
      >
        {#if isTopLevel}
          <SidebarTrigger />
        {:else}
          <Button variant="ghost" size="icon" class="-ml-2" onclick={safeGoBack}>
            <ArrowLeftIcon class="w-4 h-4" />
          </Button>
        {/if}
        <h1 class="text-xl font-bold truncate flex-1" id="layout-nav-title">
          {title ?? autoTitle}
        </h1>
        <div class="ml-auto flex items-center gap-2" id="layout-nav-extra">
          {#if onClose}
            <Button variant="ghost" size="icon" onclick={onClose}>
              <XIcon class="w-5 h-5" />
            </Button>
          {/if}
        </div>
      </header>
      <div class="flex-1 px-6 pt-4 pb-6 overflow-auto">
        {@render children?.()}
      </div>
    </main>
  </SidebarProvider>
</div>
