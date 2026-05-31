import { User } from '$lib/db'

export type SearchParams = {
  filterBlocked?: 'all' | 'blocked' | 'unblocked'
  filterVerified?: 'all' | 'verified' | 'unverified'
  filterFollowed?: 'all' | 'followed' | 'unfollowed'
  label?: 'all' | 'manual' | 'cloud' | 'imported'
  name?: string
  screenName?: string
}

export function filterUser(user: User, searchParams: SearchParams) {
  if (searchParams.filterBlocked === 'blocked' && !user.blocking) {
    return false
  }
  if (searchParams.filterBlocked === 'unblocked' && user.blocking) {
    return false
  }
  if (searchParams.filterFollowed === 'followed' && !user.following) {
    return false
  }
  if (searchParams.filterFollowed === 'unfollowed' && user.following) {
    return false
  }
  if (searchParams.filterVerified === 'verified' && !user.is_blue_verified) {
    return false
  }
  if (searchParams.filterVerified === 'unverified' && user.is_blue_verified) {
    return false
  }
  
  if (searchParams.label && searchParams.label !== 'all') {
    const userSource = (user as any).source
    if (userSource !== searchParams.label) {
      return false
    }
  }

  if (searchParams.name) {
    const search = searchParams.name.toLowerCase()
    if (!user.name?.toLowerCase().includes(search)) {
      return false
    }
  }

  if (searchParams.screenName) {
    const search = searchParams.screenName.toLowerCase()
    if (!user.screen_name?.toLowerCase().includes(search)) {
      return false
    }
  }

  return true
}
