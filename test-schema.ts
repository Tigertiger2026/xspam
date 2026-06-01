import { tweetScheam } from './src/lib/api';
import fs from 'fs';
import { extractObjects } from './src/lib/util/extractObjects';

const data = JSON.parse(fs.readFileSync('./src/lib/__tests__/assets/TweetDetail11.json', 'utf-8'));

const tweets = extractObjects(data, (it) => tweetScheam.safeParse(it).success);
console.log('Valid tweets count:', tweets.length);

const allTweets = extractObjects(data, (it) => it?.__typename === 'Tweet');
console.log('All tweets count:', allTweets.length);

for (const t of allTweets) {
  const res = tweetScheam.safeParse(t);
  if (!res.success) {
    console.log('Failed tweet ID:', t.rest_id);
    for (const err of res.error.errors) {
      console.log('  ', err.path.join('.'), err.message);
    }
  }
}
