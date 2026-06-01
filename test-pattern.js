import { URLPattern } from 'urlpattern-polyfill'

const pattern = new URLPattern('https://x.com/i/api/graphql/*/(HomeTimeline|TweetDetail|UserTweets|UserTweetsAndReplies|CommunityTweetsTimeline|HomeLatestTimeline|SearchTimeline|Bookmarks|ListLatestTweetsTimeline)')

console.log(pattern.test('https://x.com/i/api/graphql/1234/TweetDetail?variables=abc'))
