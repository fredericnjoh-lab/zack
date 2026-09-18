import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, test } from 'node:test'
import type { Store } from './types.ts'

const dataDir = mkdtempSync(join(tmpdir(), 'zack-store-'))
let remoteSnapshot: string | null = null
let failedGets = 0
const commands: string[][] = []

const redis = createServer((req, res) => {
  let body = ''
  req.on('data', (chunk) => {
    body += chunk
  })
  req.on('end', () => {
    assert.equal(req.headers.authorization, 'Bearer test-token')
    const command = JSON.parse(body) as string[]
    commands.push(command)
    res.setHeader('content-type', 'application/json')
    if (command[0] === 'GET') {
      if (failedGets > 0) {
        failedGets -= 1
        res.statusCode = 503
        res.end(JSON.stringify({ error: 'temporary outage' }))
        return
      }
      res.end(JSON.stringify({ result: remoteSnapshot }))
      return
    }
    if (command[0] === 'SET') {
      remoteSnapshot = command[2]!
      res.end(JSON.stringify({ result: 'OK' }))
      return
    }
    res.statusCode = 400
    res.end(JSON.stringify({ error: 'unknown command' }))
  })
})

await new Promise<void>((resolve) => redis.listen(0, '127.0.0.1', resolve))
const address = redis.address()
assert(address && typeof address === 'object')

process.env.NODE_ENV = 'test'
process.env.ZACK_DATA_DIR = dataDir
process.env.ZACK_STORE_KEY = 'test:zack'
process.env.UPSTASH_REDIS_REST_URL = `http://127.0.0.1:${address.port}`
process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token'

const db = await import('./db.ts')

after(async () => {
  await new Promise<void>((resolve) => redis.close(() => resolve()))
  rmSync(dataDir, { recursive: true, force: true })
  delete process.env.ZACK_DATA_DIR
  delete process.env.ZACK_STORE_KEY
  delete process.env.UPSTASH_REDIS_REST_URL
  delete process.env.UPSTASH_REDIS_REST_TOKEN
})

test('restores, migrates and queues durable store snapshots', async () => {
  const durable: Omit<Store, 'remakes'> = {
    accounts: [{ handle: 'durable.brand', addedAt: '2026-08-21T00:00:00.000Z' }],
    reels: [
      {
        id: 'remote-post',
        handle: 'durable.brand',
        views: 42_000,
        source: 'apify',
        url: 'https://www.instagram.com/p/Durable/',
      },
    ],
    calendar: [],
    scripts: [],
    lastVeilleAt: '2026-08-21T12:00:00.000Z',
    lastVeilleMode: 'apify',
  }
  remoteSnapshot = JSON.stringify(durable)

  const status = await db.initializeStore()
  assert.equal(status.backend, 'upstash')
  assert.equal(status.configured, true)
  assert.equal(status.restored, true)
  assert.equal(status.lastError, undefined)
  assert.deepEqual(commands[0], ['GET', 'test:zack'])

  const restored = db.loadStore()
  assert.equal(restored.accounts[0]?.handle, 'durable.brand')
  assert.equal(restored.reels[0]?.id, 'remote-post')
  assert.deepEqual(restored.remakes, [])
  assert.deepEqual(restored.writingGuide, { documents: [], learnedRules: [] })

  restored.accounts.push({ handle: 'new.brand', addedAt: '2026-08-22T00:00:00.000Z' })
  db.saveStore(restored)
  await db.flushStoreWrites()

  assert.deepEqual(commands.at(-1)?.slice(0, 2), ['SET', 'test:zack'])
  const savedRemote = JSON.parse(remoteSnapshot!) as Store
  assert.equal(savedRemote.accounts.at(-1)?.handle, 'new.brand')
  const savedLocal = JSON.parse(readFileSync(join(dataDir, 'store.json'), 'utf8')) as Store
  assert.equal(savedLocal.accounts.at(-1)?.handle, 'new.brand')
  assert.equal(db.getPersistenceStatus().lastError, undefined)
  assert.ok(db.getPersistenceStatus().lastSyncedAt)
})

test('does not overwrite a durable snapshot when startup restore fails', async () => {
  const preciousSnapshot = remoteSnapshot
  const setCount = commands.filter(([name]) => name === 'SET').length
  rmSync(join(dataDir, 'store.json'), { force: true })
  failedGets = 3

  const status = await db.initializeStore()
  assert.equal(status.configured, true)
  assert.equal(status.restored, false)
  assert.equal(status.durableWrites, false)
  assert.match(status.lastError || '', /indisponible/i)

  const fallback = db.loadStore()
  assert.equal(fallback.lastVeilleMode, 'seed')
  fallback.accounts.push({ handle: 'local.only', addedAt: '2026-08-22T00:00:30.000Z' })
  db.saveStore(fallback)
  await db.flushStoreWrites()

  assert.equal(remoteSnapshot, preciousSnapshot)
  assert.equal(commands.filter(([name]) => name === 'SET').length, setCount)
  assert.equal(db.loadStore().accounts.at(-1)?.handle, 'local.only')
})

test('loadStore coerces a transcription whose LLM fields were saved as objects', async () => {
  const current = db.loadStore()
  writeFileSync(
    join(dataDir, 'store.json'),
    JSON.stringify({
      ...current,
      transcriptions: [
        {
          id: 'tr-broken',
          reelId: 'seed-1',
          handle: 'atelierlumiere',
          ocrText: { text: 'NEW DROP' },
          spokenGuess: ['VO: drop', 'CTA'],
          fullTranscript: [
            { time: '0:00', text: 'Hook' },
            { time: '0:05', text: 'Preuve' },
          ],
          captions: { punchy: { text: 'légende A' }, soft: 'légende B' },
          source: 'caption',
          createdAt: '2026-09-18T00:00:00.000Z',
        },
      ],
    }),
  )

  const repaired = db.loadStore()
  const row = repaired.transcriptions?.[0]
  assert.equal(row?.ocrText, 'NEW DROP')
  assert.equal(row?.fullTranscript, 'Hook\nPreuve')
  assert.equal(row?.fullTranscript.slice(0, 4), 'Hook')
  assert.equal(row?.captions.punchy, 'légende A')
  assert.equal(row?.captions.soft, 'légende B')
})

test('keeps the atomic local copy when the remote store is unavailable', async () => {
  const recovered = await db.initializeStore()
  assert.equal(recovered.durableWrites, true)
  await new Promise<void>((resolve) => redis.close(() => resolve()))
  const store = db.loadStore()
  store.accounts.push({ handle: 'offline.brand', addedAt: '2026-08-22T00:01:00.000Z' })
  db.saveStore(store)
  await db.flushStoreWrites()

  assert.equal(db.loadStore().accounts.at(-1)?.handle, 'offline.brand')
  assert.match(db.getPersistenceStatus().lastError || '', /fetch failed|indisponible/i)
})
