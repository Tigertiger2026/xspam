/**
 * XSpam Client - Constants
 * 
 * 所有配置都是公开的，没有后端服务
 */

// 云端 Spam 数据库元信息地址（GitHub Release）
export const SPAM_DATA_METADATA_URL =
  import.meta.env.VITE_SPAM_DATA_METADATA_URL ??
  'https://github.com/Tigertiger2026/xspam/releases/download/spam-data-latest/metadata.json'

// 设置存储键
export const HIDE_SUSPICIOUS_ACCOUNTS_KEY = 'HIDE_SUSPICIOUS_ACCOUNTS'
export const SETTINGS_KEY = 'MASS_BLOCK_TWITTER_SETTINGS'
