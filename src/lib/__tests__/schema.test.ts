import { expect, test } from 'vitest'
import { tweetScheam } from '../api'
import fs from 'fs'
import { extractObjects } from '../util/extractObjects'

test('tweetScheam validation', () => {
  const data = JSON.parse(fs.readFileSync('./src/lib/__tests__/assets/TweetDetail11.json', 'utf-8'))
  const allTweets = extractObjects(data, (it) => it?.__typename === 'Tweet')
  
  for (const t of allTweets) {
    const res = tweetScheam.safeParse(t)
    if (!res.success) {
      console.log('Failed tweet ID:', t.rest_id)
      for (const err of res.error.errors) {
        console.log('  ', err.path.join('.'), err.message)
      }
    }
    expect(res.success).toBe(true)
  }
})
