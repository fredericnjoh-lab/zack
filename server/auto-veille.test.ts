import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, before, test } from 'node:test'
import type { Store } from './types.ts'

const dataDir = mkdtempSync(join(tmpdir(), 'zack-auto-veille-'))
process.env.ZACK_DATA_DIR = dataDir
process.env.NODE_ENV = 'test'
delete process.env.APIFY_TOKEN
delete process.env.APIFY_API_TOKEN
delete process.env.UPSTASH_REDIS_REST_URL
delete process.env.UPSTASH_REDIS_REST_TOKEN

const db = await import('./db.ts')
const jobs = await import('./jobs.ts')
const scheduler = await import('./scheduler.ts')

function fixture(overrides: Partial<Store> = {}): Store {
  return {
    accounts: [{ handle: 'atelierlumiere', addedAt: '2026-10-18T00:00:00.000Z' }],
    reels: [
      {
        id: 'seed-1',
        handle: 'atelierlumiere',
        views: 10_000,
        source: 'seed',
        caption: 'baseline',
      },
    ],
    calendar: [],
    scripts: [],
    remakes: [],
    autoVeille: { enabled: true, hour: scheduler.parisHour() },
    ...overrides,
  }
}

async function waitForJob(timeoutMs = 3000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const job = jobs.getVeilleJob()
    if (job.status === 'ok' || job.status === 'error') return job
    await new Promise((resolve) => setTimeout(resolve, 15))
  }
  throw new Error(`veille job stuck at ${jobs.getVeilleJob().status}`)
}

before(async () => {
  await db.initializeStore()
})

after(() => {
  jobs.resetVeilleJob()
  rmSync(dataDir, { recursive: true, force: true })
})

test('local veille stamps lastRunAt so the scheduler will not relaunch immediately', async () => {
  jobs.resetVeilleJob()
  db.saveStore(fixture())

  const { started } = jobs.startVeilleJob({ source: 'scheduler' })
  assert.equal(started, true)
  const done = await waitForJob()
  assert.equal(done.status, 'ok')
  assert.ok(db.loadStore().autoVeille?.lastRunAt)

  const again = await scheduler.maybeRunAutoVeille(false)
  assert.equal(again.ran, false)
  assert.match(again.reason, /déjà lancée/i)
})

test('stampAutoVeilleAttempt records a failed attempt without dropping other writes', async () => {
  jobs.resetVeilleJob()
  const hour = scheduler.parisHour()
  db.saveStore(
    fixture({
      autoVeille: { enabled: true, hour },
      calendar: [{ id: 'keep-me', day: 1, month: 10, year: 2026, label: 'idée', status: 'ecrit' }],
    }),
  )

  jobs.stampAutoVeilleAttempt(new Date())
  const stored = db.loadStore()
  assert.ok(stored.autoVeille?.lastRunAt)
  assert.equal(stored.calendar[0]?.id, 'keep-me')
  assert.equal(stored.autoVeille?.enabled, true)
  assert.equal(stored.autoVeille?.hour, hour)

  const skipped = await scheduler.maybeRunAutoVeille(false)
  assert.equal(skipped.ran, false)
  assert.match(skipped.reason, /déjà lancée/i)
})

test('scheduler does not retry after an in-memory failure from today', async () => {
  jobs.resetVeilleJob()
  const hour = scheduler.parisHour()
  db.saveStore(fixture({ autoVeille: { enabled: true, hour }, accounts: [] }))

  const empty = jobs.startVeilleJob({ source: 'scheduler' })
  assert.equal(empty.started, false)
  assert.equal(empty.job.status, 'error')
  assert.ok(empty.job.finishedAt)

  db.saveStore(fixture({ autoVeille: { enabled: true, hour } }))
  const skipped = await scheduler.maybeRunAutoVeille(false)
  assert.equal(skipped.ran, false)
  assert.match(skipped.reason, /échec déjà tenté/i)
})
