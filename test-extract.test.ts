import { test } from 'vitest'
import { tweetScheam } from './src/lib/api'

test('extraction', () => {
  const tweet = {
    __typename: "TweetWithVisibilityResults",
    tweet: {
        rest_id: "1925307171253715147",
        core: {
            user_results: {
                result: {
                    __typename: "User",
                    rest_id: "3754034293",
                    legacy: {
                      screen_name: "test",
                      name: "test"
                    }
                }
            }
        },
        legacy: {
          created_at: "test",
          full_text: "test",
          user_id_str: "123",
          id_str: "123",
          entities: {},
          conversation_id_str: "123",
          lang: "zh"
        },
        source: "test"
    }
  }
  
  import { extractObjects } from './src/lib/util/extractObjects'
  const res = extractObjects(tweet, (it) => tweetScheam.safeParse(it).success)
  console.log('Matches:', res.length)
})
