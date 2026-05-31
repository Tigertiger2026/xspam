import { messager } from '$lib/messaging'
import { parse, stringifyAsync } from '$lib/serializer'

export default defineBackground(() => {
  const DashboardTabIdKey = 'dashboardTabId'

  async function openDashboard(path = '/') {
    await browser.storage.local.set({
      openExtensionPath: path,
    })
    const stored = await browser.storage.local.get<{
      dashboardTabId?: number
    }>(DashboardTabIdKey)
    if (stored.dashboardTabId) {
      const existingTab = await browser.tabs.get(stored.dashboardTabId).catch(
        () => undefined,
      )
      if (existingTab?.id && existingTab.url?.startsWith('https://x.com/')) {
        await browser.tabs.update(existingTab.id, { active: true })
        if (existingTab.windowId) {
          await browser.windows.update(existingTab.windowId, {
            focused: true,
          })
        }
        await messager.sendMessage('show', undefined, existingTab.id)
        return
      }
    }

    const tab = await browser.tabs.create({
      url: 'https://x.com/home',
      active: true,
    })
    if (!tab.id) {
      return
    }
    await browser.storage.local.set({
      [DashboardTabIdKey]: tab.id,
    })
    const onUpdated = async (
      tabId: number,
      changeInfo: { status?: string },
    ) => {
      if (tabId !== tab.id || changeInfo.status !== 'complete') {
        return
      }
      browser.tabs.onUpdated.removeListener(onUpdated)
      await messager.sendMessage('show', undefined, tab.id)
    }
    browser.tabs.onUpdated.addListener(onUpdated)
  }

  messager.onMessage('fetch', async (ev) => {
    const req = parse(ev.data) as Parameters<typeof fetch>
    // console.log('Background fetch request', req)
    const r = await stringifyAsync(await fetch(...req))
    // console.log('Background fetch response', r)
    return r
  })

  browser.action.onClicked.addListener(async () => {
    await openDashboard()
  })
})
