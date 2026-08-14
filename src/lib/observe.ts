import { dbApi, Tweet, User } from './db'
import { eventMessage, spamContext } from './shared'
import { getUserByScreenName } from './api/twitter'

export function extractCurrentUserId(): string | undefined {
  // 1. Try reading from twid cookie (fast & accurate: twid=u%3D123456789 or twid="u=123456789")
  if (typeof document !== 'undefined' && document.cookie) {
    const cookieMatch = /(?:^|;\s*)twid=(?:u%3D|u%3d|"u=)?(\d+)/i.exec(document.cookie)
    if (cookieMatch?.[1]) {
      return cookieMatch[1]
    }
  }
  // 2. Try looking in script tags
  if (typeof document !== 'undefined') {
    const scripts = document.querySelectorAll('script')
    for (const script of scripts) {
      if (script.textContent && (script.textContent.includes('current_user') || script.textContent.includes('screen_name'))) {
        const idMatch = /"id_str":"(\d+)"/.exec(script.textContent)
        if (idMatch?.[1]) return idMatch[1]
      }
    }
  }
  return undefined
}

export function getCurrentUser(): User {
  const currentId = extractCurrentUserId()
  const match = document.documentElement.innerHTML.match(
    /"name":"(.*?)","screen_name":"(.*?)","id_str":"(\d+?)"/,
  )
  if (!match) {
    if (currentId) {
      return {
        id: currentId,
        name: '',
        screen_name: '',
        blocking: false,
        updated_at: new Date().toISOString(),
      } as User
    }
    throw new Error('Failed to extract user information')
  }
  const [, name, screen_name, id] = match
  return {
    id: currentId || id,
    name,
    screen_name,
    blocking: false,
    updated_at: new Date().toISOString(),
  } as User
}

export function extractTweet(tweetElement: HTMLElement): {
  tweetId: string
  tweetText?: string
} {
  const tweetLink = tweetElement.querySelector('a[href*="/status/"]')
  if (!tweetLink || !(tweetLink instanceof HTMLAnchorElement)) {
    console.log('tweetElement', tweetElement.innerHTML)
    throw new Error('tweetLink not found')
  }
  const tweetId = tweetLink.href.match(/status\/(\d+)/)?.[1]
  if (!tweetId) {
    throw new Error('tweetId not found')
  }
  const tweetText = tweetElement.querySelector(
    '[data-testid="tweetText"]',
  )?.textContent
  return {
    tweetId,
    tweetText: tweetText?.trim(),
  }
}

export function removeTweets(tweetIds: string[]) {
  const elements = document.querySelectorAll(
    '[data-testid="cellInnerDiv"]:has([data-testid="reply"])',
  ) as NodeListOf<HTMLElement>
  elements.forEach((tweetElement) => {
    const { tweetId } = extractTweet(tweetElement)
    if (tweetIds.includes(tweetId)) {
      // Hide tweets instead of removing them to avoid errors when Twitter itself tries to remove tweets
      tweetElement.style.display = 'none'
    }
  })
}

export function getTweetElement(tweetId: string): HTMLElement | undefined {
  const elements = document.querySelectorAll(
    '[data-testid="cellInnerDiv"]:has([data-testid="reply"])',
  ) as NodeListOf<HTMLElement>
  return [...elements].find((tweetElement) => {
    const { tweetId: tweetElementId } = extractTweet(tweetElement)
    return tweetElementId === tweetId
  })
}

export function addBlockButtonInTweet(tweetElement: HTMLElement) {
  if (tweetElement.dataset.quickBlockAdded === 'true') {
    return
  }
  const grokButton = tweetElement.querySelector('button[aria-label*="Grok"]')
  const caretButton = tweetElement.querySelector('button[data-testid="caret"]')
  const moreBar =
    grokButton?.parentElement ??
    caretButton?.closest('div:has(>button[data-testid="caret"])') ??
    caretButton?.parentElement ??
    tweetElement.querySelector('div:has(>div>button[data-testid="caret"])')
  if (!moreBar) {
    return
  }
  const parent = moreBar.parentElement
  if (parent && getComputedStyle(parent).display !== 'flex') {
    parent.style.display = 'flex'
    parent.style.flexDirection = 'row'
    parent.style.gap = '4px'
  }
  const customButton = document.createElement('button')
  customButton.className = 'mass-block-twitter-button-block'
  customButton.title = 'Quick Block'
  customButton.style.opacity = '0'
  customButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-shield-ban"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m4.243 5.21 14.39 12.472"/></svg>
    `
  const refSvg =
    grokButton?.querySelector('svg') ??
    moreBar.querySelector('button[data-testid="caret"] svg') ??
    moreBar.querySelector('svg')
  if (refSvg) {
    customButton.style.stroke = getComputedStyle(refSvg).color || 'currentColor'
  }
  customButton.addEventListener('click', async () => {
    try {
      const { tweetId } = extractTweet(tweetElement)
      const tweet = await dbApi.tweets.get(tweetId)
      if (!tweet) {
        eventMessage.sendMessage('Toast', {
          type: 'error',
          message: 'Tweet not found',
        })
        console.error(
          'tweet not found',
          tweetId,
          `https://x.com/test/status/${tweetId}`,
        )
        return
      }
      const request = await extractMinimalSpamReportRequest(tweet)
      const user = await dbApi.users.get(tweet.user_id)
      if (!user) {
        return
      }
      spamContext.spamUsers.add(user.id)
      if (user.screen_name) {
        spamContext.spamScreenNames.add(user.screen_name.toLowerCase())
      }
      eventMessage.sendMessage('QuickBlock', {
        user,
        tweet,
        report: request,
        elementToHide: tweetElement,
      })
    } catch (err) {
      console.error('[XSpam] Failed to quick block from tweet', err)
    }
  })
  if (moreBar.parentNode) {
    moreBar.parentNode.insertBefore(customButton, moreBar)
  }
  tweetElement.dataset.quickBlockAdded = 'true'
  requestAnimationFrame(() => {
    customButton.style.opacity = '1'
    customButton.style.transition = 'opacity 0.2s'
  })
}

export function addBlockButtonInUser(
  userElement: HTMLElement,
  screen_name: string,
) {
  if (userElement.dataset.quickBlockAdded === 'true') {
    return
  }
  const followButton = userElement.querySelector(
    'button[data-testid$="-follow"], button[data-testid$="-unfollow"]',
  ) as HTMLElement
  if (!followButton) {
    return
  }
  const blockButton = followButton.cloneNode() as HTMLButtonElement
  blockButton.textContent = 'Block'
  blockButton.style.marginLeft = 'auto'
  blockButton.style.marginRight = '0.5rem'
  const height = getComputedStyle(followButton).height
  blockButton.style.height = height
  blockButton.style.lineHeight = height
  blockButton.style.backgroundColor = 'rgb(244, 33, 46)'
  blockButton.style.color = 'rgb(255, 255, 255)'
  blockButton.style.fontWeight = 'bold'
  const container = followButton.parentElement?.parentElement
  if (!container) {
    return
  }
  container.insertBefore(blockButton, followButton.parentElement)
  userElement.dataset.quickBlockAdded = 'true'
  blockButton.addEventListener('click', async () => {
    const user = await getUserByScreenName(screen_name)
    if (!user) {
      return
    }
    const request = {
      userId: user.id,
      handle: user.screen_name,
      displayName: user.name,
      source: 'manual_block' as const,
      createdAt: Date.now(),
    }
    spamContext.spamUsers.add(user.id)
    if (user.screen_name) {
      spamContext.spamScreenNames.add(user.screen_name.toLowerCase())
    }
    userElement.style.display = 'none'
    eventMessage.sendMessage('QuickBlock', {
      user,
      report: request,
    })
  })
}

async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message)
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
  return hashHex
}

function extractDomains(text: string): string[] {
  const urls = text.match(/https?:\/\/[^\s$.?#].[^\s]*/g) || []
  const domains = urls
    .map((u) => {
      try {
        return new URL(u).hostname
      } catch {
        return ''
      }
    })
    .filter(Boolean)
  return Array.from(new Set(domains))
}

export type MinimalSpamReportRequest = {
  userId: string
  handle?: string
  displayName?: string
  evidence?: {
    linkDomains?: string[]
    replyTextHash?: string
  }
  source: 'manual_block'
  createdAt: number
}

export async function extractMinimalSpamReportRequest(
  tweet: Tweet,
): Promise<MinimalSpamReportRequest> {
  const user = await dbApi.users.get(tweet.user_id)
  const replyTextHash = await sha256(tweet.text)
  const linkDomains = extractDomains(tweet.text)

  return {
    userId: tweet.user_id,
    handle: user?.screen_name,
    displayName: user?.name,
    evidence: {
      linkDomains,
      replyTextHash,
    },
    source: 'manual_block',
    createdAt: Date.now(),
  }
}
