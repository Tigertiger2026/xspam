import { defineConfig, UserManifest } from 'wxt'
import path from 'path'

export default defineConfig({
  srcDir: 'src',
  outDir: 'dist',
  extensionApi: 'chrome',
  modules: ['@wxt-dev/module-svelte'],
  manifestVersion: 3,
  manifest: (env) => {
    const spamDataMetadataUrl =
      process.env.VITE_SPAM_DATA_METADATA_URL ||
      'https://github.com/Tigertiger2026/xspam/releases/download/spam-data-latest/metadata.json'
    const hostPermissions = new Set<string>([
      'https://x.com/**',
      'https://github.com/*',
      'https://objects.githubusercontent.com/*',
      'https://github-releases.githubusercontent.com/*',
      'https://release-assets.githubusercontent.com/*',
    ])
    try {
      const parsedMetadataUrl = new URL(spamDataMetadataUrl)
      hostPermissions.add(`${parsedMetadataUrl.origin}/*`)
    } catch {
      // Ignore invalid local override; runtime fetch will fail clearly.
    }

    const manifest: UserManifest = {
      // languages https://developer.chrome.com/docs/extensions/reference/api/i18n?hl=zh-cn#locales
      name: '__MSG_extName__',
      description: '__MSG_extDescription__',
      default_locale: 'en',
      permissions: ['storage', 'tabs'],
      web_accessible_resources: [],
      action: {
        default_icon: {
          '16': 'icon/16.png',
          '32': 'icon/32.png',
          '48': 'icon/48.png',
          '128': 'icon/128.png',
        },
      },
      host_permissions: Array.from(hostPermissions),
    }
    if (env.browser === 'firefox') {
      manifest.browser_specific_settings = {
        gecko: {
          id: 'mass-block-twitter@rxliuli.com',
        },
      }
      manifest.permissions!.push('declarativeNetRequest')
      manifest.declarative_net_request = {
        rule_resources: [
          {
            id: 'ruleset',
            enabled: true,
            path: 'rules.json',
          },
        ],
      }
    }
    return manifest
  },
  zip: {
    name: 'mass-block-twitter',
  },
  runner: {
    disabled: true,
  },
  vite: () => ({
    css: {
      postcss: {
        plugins: [
          require('tailwindcss'),
          require('autoprefixer'),
        ]
      }
    },
    resolve: {
      alias: {
        $lib: path.resolve('./src/lib'),
      },
      conditions: ['svelte', 'browser', 'import', 'default'],
    },
    ssr: {
      noExternal: ['runed', 'svelte-toolbelt', 'bits-ui'],
    },
  }),
})
