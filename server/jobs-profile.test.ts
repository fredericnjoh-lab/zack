import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, test } from 'node:test'

const dataDir = mkdtempSync(join(tmpdir(), 'zack-profile-'))
const previousEnv = {
  ZACK_DATA_DIR: process.env.ZACK_DATA_DIR,
  UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
  UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
  APIFY_TOKEN: process.env.APIFY_TOKEN,
  APIFY_API_TOKEN: process.env.APIFY_API_TOKEN,
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  CLAUDE_API_KEY: process.env.CLAUDE_API_KEY,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
}

process.env.ZACK_DATA_DIR = dataDir
delete process.env.UPSTASH_REDIS_REST_URL
delete process.env.UPSTASH_REDIS_REST_TOKEN
delete process.env.APIFY_TOKEN
delete process.env.APIFY_API_TOKEN
delete process.env.ANTHROPIC_API_KEY
delete process.env.CLAUDE_API_KEY
delete process.env.OPENAI_API_KEY

const jobs = await import('./jobs.ts')
const db = await import('./db.ts')

after(() => {
  rmSync(dataDir, { recursive: true, force: true })
  for (const [key, value] of Object.entries(previousEnv)) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
})

async function waitForJob(timeoutMs = 3000) {
  const deadline = Date.now() + timeoutMs
  while (jobs.getProfileJob().status === 'running' && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 25))
  }
  return jobs.getProfileJob()
}

test('profile analysis returns immediately and does not call Apify without a token', async () => {
  const fetches: string[] = []
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
    fetches.push(String(input))
    return originalFetch(input, init)
  }) as typeof fetch

  try {
    const { started, job } = jobs.startProfileJob({ handle: 'atelierlumiere', lang: 'fr' })
    assert.equal(started, true)
    assert.equal(job.status, 'running')
    assert.equal(job.handle, 'atelierlumiere')

    const concurrent = jobs.startProfileJob({ handle: 'studio.nord' })
    assert.equal(concurrent.started, false)
    assert.equal(concurrent.job.handle, 'atelierlumiere')

    const done = await waitForJob()
    assert.equal(done.status, 'ok')
    assert.equal(done.handle, 'atelierlumiere')
    assert.ok((done.posts || 0) > 0)
    assert.equal(fetches.some((url) => url.includes('api.apify.com')), false)

    const stored = db.loadStore()
    assert.equal(stored.profile?.handle, 'atelierlumiere')
    assert.ok((stored.profile?.postsAnalyzed || 0) > 0)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('profile analysis errors when the handle has no stored posts', async () => {
  const { started } = jobs.startProfileJob({ handle: 'unknown.brand', lang: 'en' })
  assert.equal(started, true)
  const done = await waitForJob()
  assert.equal(done.status, 'error')
  assert.match(done.error || '', /No posts retrieved/)
})
