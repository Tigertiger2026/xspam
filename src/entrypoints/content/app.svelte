<script lang="ts">
  import { messager } from '$lib/messaging'
  import SearchBlockPage from './pages/search-and-block/page.svelte'
  import BlockedUsersPage from './pages/search-and-block/blocked/page.svelte'
  import SettingsPage from './pages/settings/page.svelte'
  import { Toaster } from '$lib/components/ui/sonner/index.js'
  import { ModeWatcher, mode } from 'mode-watcher'
  import {
    type RouteConfig,
    Router,
    RouterView,
  } from '$lib/components/logic/router'
  import AppLayout from '$lib/components/layout/AppLayout.svelte'
  import { Button } from '$lib/components/ui/button'
  import { XIcon } from 'lucide-svelte'
  import { ShadcnConfig } from '$lib/components/logic/config'
  import DashboardPage from './pages/dashboard/page.svelte'
  import SettingsAppearancePage from './pages/settings/appearance/page.svelte'
  import SettingsFilterPage from './pages/settings/filter/page.svelte'
  import SettingsPrivacyPage from './pages/settings/privacy/page.svelte'
  import DashboardActivitiesPage from './pages/dashboard/activities/page.svelte'
  import SettingsLanguagesPage from './pages/settings/languages/page.svelte'
  import { FloatingButton } from '$lib/components/logic/floating'
  import { useOpen } from '$lib/stores/open.svelte'
  import SettingsBlockPage from './pages/settings/block/page.svelte'

  let {
    initialPath,
    standalone = false,
    portalRoot,
  }: {
    initialPath?: string
    standalone?: boolean
    portalRoot?: HTMLElement
  } = $props()

  let openState = useOpen(standalone || !!initialPath)

  onMount(() => {
    if (standalone) {
      return
    }
    messager.onMessage('show', () => {
      openState.openModal()
    })
    return messager.removeAllListeners
  })

  const root = $derived(portalRoot ?? document.body)

  // TODO https://github.com/svecosystem/mode-watcher/issues/104
  $effect(() => {
    const current = $mode
    if (root) {
      root.className = `color-scheme: ${current}`
    }
  })

  // 精简版路由：移除 ModList 和 MutedWords
  const routes: RouteConfig[] = [
    {
      path: '/',
      component: DashboardPage,
    },
    {
      path: '/dashboard/activities',
      component: DashboardActivitiesPage,
    },
    {
      path: '/search-and-block',
      component: SearchBlockPage,
    },
    {
      path: '/search-and-block/blocked-users',
      component: BlockedUsersPage,
    },
    {
      path: '/settings',
      component: SettingsPage,
    },
    {
      path: '/settings/appearance',
      component: SettingsAppearancePage,
    },
    {
      path: '/settings/filter',
      component: SettingsFilterPage,
    },
    {
      path: '/settings/privacy',
      component: SettingsPrivacyPage,
    },
    {
      path: '/settings/languages',
      component: SettingsLanguagesPage,
    },
    {
      path: '/settings/block',
      component: SettingsBlockPage,
    },
  ]
</script>

<ShadcnConfig portal={root}>
  {#if !standalone}
    <FloatingButton />
  {/if}

  <Router
    initialPath={import.meta.env.VITE_INITIAL_PATH ?? initialPath}
    {routes}
  >
    {#if standalone || openState.opened}
      <AppLayout open={standalone || openState.open} {standalone}>
        <RouterView />
        {#if !standalone}
          <Button
            variant="ghost"
            size="icon"
            class="absolute top-0 right-0"
            onclick={openState.closeModal}
          >
            <XIcon class="w-4 h-4" />
          </Button>
        {/if}
      </AppLayout>
    {/if}
  </Router>
</ShadcnConfig>

<ModeWatcher />
<Toaster richColors closeButton expand />
