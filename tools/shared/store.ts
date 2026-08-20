import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const dataDir = join(here, '..', '..', 'data', 'tools')

/** Stockage JSON minimal, un fichier par outil. Suffisant tant qu'on est seul dessus. */
export function makeStore<T extends object>(name: string, seed: T) {
  const file = join(dataDir, `${name}.json`)

  function load(): T {
    try {
      return { ...seed, ...(JSON.parse(readFileSync(file, 'utf8')) as T) }
    } catch {
      return structuredClone(seed)
    }
  }

  function save(value: T): void {
    mkdirSync(dataDir, { recursive: true })
    writeFileSync(file, JSON.stringify(value, null, 2))
  }

  function update(fn: (current: T) => T): T {
    const next = fn(load())
    save(next)
    return next
  }

  return { load, save, update, file }
}
