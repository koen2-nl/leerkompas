import { readFile } from 'node:fs/promises'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

async function getAppVersion() {
  const packageInfo = JSON.parse(await readFile(new URL('./package.json', import.meta.url), 'utf8'))
  const releaseStatus = JSON.parse(await readFile(new URL('./release-status.json', import.meta.url), 'utf8'))
  const packageVersion = packageInfo.version.match(/^\\d+\\.\\d+/)?.[0] || '0.1'
  let pullRequestNumber = process.env.VERCEL_GIT_PULL_REQUEST_ID

  // Preview builds use their own PR number. Production builds use the newest merged PR.
  if (!pullRequestNumber && process.env.VERCEL_ENV === 'production') {
    try {
      const response = await fetch('https://api.github.com/repos/koen2-nl/leerkompas/pulls?state=closed&sort=created&direction=desc&per_page=100', {
        headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'SlimLeren-version-build' }
      })
      if (response.ok) {
        const pullRequests = await response.json()
        const latestMerged = pullRequests.find(pullRequest => pullRequest.merged_at)
        if (latestMerged) pullRequestNumber = String(latestMerged.number)
      }
    } catch {
      // Keep the package version as a fallback if GitHub cannot be reached.
    }
  }

  const versionNumber = /^\\d+$/.test(pullRequestNumber || '') ? Number(pullRequestNumber) : Number(packageVersion.split('.')[1] || 1)
  const majorVersion = releaseStatus.released ? 1 : 0
  return { version: `${majorVersion}.${versionNumber}`, released: Boolean(releaseStatus.released) }
}

export default defineConfig(async () => {
  const { version, released } = await getAppVersion()
  return {
    plugins: [react()],
    base: './',
    define: {
      __APP_VERSION__: JSON.stringify(version),
      __APP_RELEASED__: JSON.stringify(released)
    }
  }
})
