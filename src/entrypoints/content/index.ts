import { mount, unmount } from 'svelte'
import App from './app.svelte'
import './app.css'
import {
  autoAlertBlocked,
  autoCheckPendingUsers,
  quickBlock,
} from '$lib/content'
import { getLocaleLanguage, initI18n } from '$lib/i18n'
import { wait } from '@liuli-util/async'
import { eventMessage } from '$lib/shared'
import { initDB } from '$lib/db'
import { toast } from 'svelte-sonner'

export default defineContentScript({
  matches: ['https://x.com/**', 'https://mobile.x.com/**'],
  allFrames: true,
  runAt: 'document_start',
  cssInjectionMode: 'ui',
  async main(ctx) {
    await initDB()

    autoCheckPendingUsers()
    autoAlertBlocked()

    await wait(() => !!document.body)

    initI18n(getLocaleLanguage() ?? 'en-US')
    const openExtensionPath = (
      await browser.storage.local.get<{ openExtensionPath?: string }>(
        'openExtensionPath',
      )
    ).openExtensionPath
    if (openExtensionPath) {
      await browser.storage.local.remove('openExtensionPath')
    }
    const ui = await createShadowRootUi(ctx, {
      name: 'mass-block-twitter',
      position: 'inline',
      anchor: 'body',
      onMount: (uiContainer) => {
        const app = mount(App, {
          target: uiContainer,
          props: {
            initialPath: openExtensionPath,
            portalRoot: uiContainer,
          },
        })
        return app
      },
      onRemove: (app) => {
        if (app) unmount(app)
      },
    })
    ui.mount()

    eventMessage.onMessage('QuickBlock', quickBlock)
    eventMessage.onMessage('Toast', (data) =>
      toast[data.type](data.message, data.options),
    )
    eventMessage.onMessage('showBlockUserToast', (data) => {
      const { name, screen_name } = data
      toast.info(`Blocked user @${screen_name} ${name}`, {
        action: {
          label: 'Open',
          onClick: () => {
            window.open(`https://x.com/${screen_name}`, '_blank')
          },
        },
      })
    })
  },
})
