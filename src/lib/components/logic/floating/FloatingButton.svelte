<script lang="ts">
  import * as Popover from '$lib/components/ui/popover'
  import icon from './assets/48.png'
  import { shadcnConfig } from '../config'
  import { XIcon } from 'lucide-svelte'
  import { useOpen } from '$lib/stores/open.svelte'
  import { useSettings } from '$lib/settings'
  import { toast } from 'svelte-sonner'
  import CloseFloatingButtonToast from './components/CloseFloatingButtonToast.svelte'
  import { t } from '$lib/i18n'

  /**
   * XSpam Client - Floating Button
   * 
   * 精简版：只保留打开 Dashboard 的功能
   * 移除了导出相关的功能
   */

  const openState = useOpen()

  let top = $state(0)
  onMount(() => {
    top = document.documentElement.clientHeight / 2 - 100
  })

  const settings = useSettings()

  function onCloseFloatingButton() {
    const toastId = toast(CloseFloatingButtonToast as any, {
      duration: Number.POSITIVE_INFINITY,
      position: 'top-center',
      action: {
        label: 'Close',
        onClick: () => {
          $settings.showFloatingButton = false
          toast.dismiss(toastId)
        },
      },
    })
  }

  let open = $state(false)

  onMount(() => {
    const onClick = (ev: MouseEvent) => {
      const target = ev.target
      if (
        target &&
        target instanceof Element &&
        target.tagName === 'mass-block-twitter'.toUpperCase()
      ) {
        return
      }
      open = false
    }
    document.addEventListener('click', onClick)
    const onTouchEnd = (ev: TouchEvent) => {
      const touch = ev.changedTouches[0]
      if (touch) {
        const target = document.elementFromPoint(touch.clientX, touch.clientY)
        if (target && target.tagName === 'mass-block-twitter'.toUpperCase()) {
          return
        }
      }
      open = false
    }
    document.addEventListener('touchend', onTouchEnd)
    return () => {
      document.removeEventListener('click', onClick)
      document.removeEventListener('touchend', onTouchEnd)
    }
  })
</script>

{#if $settings.showFloatingButton}
  <div
    id="mass-block-twitter-floating-button"
    style="top: {top}px"
    class="fixed right-0 z-[999999] flex flex-col items-end"
  >
    <Popover.Root bind:open>
      <Popover.Trigger>
        <button
          id="floating-button-trigger"
          class="hover:bg-accent hover:text-accent-foreground bg-transparent shadow-none transition-all duration-300 ease-in-out border-0 w-12 h-12 flex items-center justify-center"
          style="border-radius: 50%;"
        >
          <img src={icon} alt="Logo" class="w-8 h-8" />
        </button>
      </Popover.Trigger>
      <Popover.Content
        class="w-fit p-0"
        style="z-index: 999999;"
        portal={shadcnConfig.portal}
      >
        <button
          class="absolute top-2 right-2 p-1 hover:bg-accent rounded-md"
          onclick={onCloseFloatingButton}
        >
          <XIcon class="w-4 h-4" />
        </button>
        <div class="p-4 pr-8">
          <h3 class="font-medium text-sm mb-2">{$t('app.name')}</h3>
          <button
            class="text-sm text-primary hover:underline"
            onclick={() => {
              openState.openModal()
              open = false
            }}
          >
            {$t('floatingButton.openDashboard')}
          </button>
        </div>
      </Popover.Content>
    </Popover.Root>
  </div>
{/if}
