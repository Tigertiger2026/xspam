import fs from 'fs';
import { z } from 'zod';

const urlSchema = z.object({
  url: z.string(),
  expanded_url: z.string().optional(),
})

const timelineUserSchema = z.object({
  __typename: z.literal('User').optional(),
  id: z.string(),
  rest_id: z.string(),
  is_blue_verified: z.boolean().optional(),
  avatar: z.object({ image_url: z.string().optional() }).optional(),
  core: z.object({
    screen_name: z.string().optional().nullable(),
    name: z.string().optional().nullable(),
    created_at: z.string().optional().nullable(),
  }).optional(),
  legacy: z.object({
    blocking: z.boolean().optional().nullable(),
    following: z.boolean().optional().nullable(),
    screen_name: z.string().optional().nullable(),
    name: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
    profile_image_url_https: z.string().optional().nullable(),
    created_at: z.string().optional(),
    followers_count: z.number().optional(),
    friends_count: z.number().optional(),
    default_profile: z.boolean().optional(),
    default_profile_image: z.boolean().optional(),
    location: z.string().optional().nullable(),
    url: z.string().optional().nullable(),
    entities: z.object({
      description: z.object({ urls: z.array(urlSchema).optional() }).optional(),
      url: z.object({ urls: z.array(urlSchema) }).optional(),
    }).optional(),
  }),
  location: z.object({ location: z.string() }).optional(),
  relationship_perspectives: z.object({
    blocking: z.boolean().optional(),
    following: z.boolean(),
  }).optional(),
  verification: z.object({
    verified: z.boolean().optional(),
    verified_type: z.enum(['Government', 'Business']).optional(),
  }).optional(),
})

function extract(json, matcher) {
  let results = []
  function traverse(obj) {
    if (matcher(obj)) {
      results.push(obj)
    }
    for (let key in obj) {
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        traverse(obj[key])
      }
    }
  }
  traverse(json)
  return results
}

const data = JSON.parse(fs.readFileSync('./src/lib/__tests__/assets/TweetDetail19.json', 'utf-8'));

const users = extract(data, (it) => {
  if (it && typeof it === 'object' && it.rest_id) {
    const res = timelineUserSchema.safeParse(it)
    if (!res.success) {
      // console.log('Failed user:', it.rest_id, JSON.stringify(res.error.errors))
    }
    return res.success
  }
  return false
});
console.log('Valid users count:', users.length);

const allUsers = extract(data, (it) => it && typeof it === 'object' && it.__typename === 'User' && it.rest_id);
console.log('All users count:', allUsers.length);

for (const u of allUsers) {
  const res = timelineUserSchema.safeParse(u);
  if (!res.success) {
    console.log('Failed user ID:', u.rest_id, JSON.stringify(res.error.errors, null, 2));
  }
}
