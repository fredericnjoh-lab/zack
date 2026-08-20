/** Lance n'importe quel robot Apify et renvoie les résultats. */

export function hasApify(): boolean {
  return Boolean(process.env.APIFY_TOKEN || process.env.APIFY_API_TOKEN)
}

function token(): string {
  return process.env.APIFY_TOKEN || process.env.APIFY_API_TOKEN || ''
}

/** Surchargeable pour pointer vers un proxy ou un serveur de test. */
function baseUrl(): string {
  return (process.env.APIFY_BASE_URL || 'https://api.apify.com').replace(/\/+$/, '')
}

const DONE = ['SUCCEEDED', 'FAILED', 'ABORTED', 'TIMED-OUT']

/**
 * `actor` s'écrit avec un tilde dans l'API REST : `compass~crawler-google-places`.
 * On attend la fin du run puis on lit son dataset.
 */
export async function runActor(
  actor: string,
  input: unknown,
  opts?: { timeoutMs?: number },
): Promise<Record<string, unknown>[]> {
  if (!hasApify()) throw new Error('APIFY_TOKEN manquant — ajoute-le dans ton fichier .env')

  const runRes = await fetch(
    `${baseUrl()}/v2/acts/${actor}/runs?token=${encodeURIComponent(token())}&waitForFinish=120`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input),
    },
  )

  if (!runRes.ok) {
    const body = await runRes.text()
    throw new Error(`Apify a refusé le run (${runRes.status}) : ${body.slice(0, 300)}`)
  }

  const run = (await runRes.json()) as {
    data?: { id?: string; defaultDatasetId?: string; status?: string }
  }
  const runId = run.data?.id
  const datasetId = run.data?.defaultDatasetId
  if (!datasetId) throw new Error('Apify : dataset introuvable')

  // waitForFinish plafonne bien avant la fin d'un gros scrape : on continue à sonder.
  let status = run.data?.status
  const deadline = Date.now() + (opts?.timeoutMs ?? 8 * 60_000)
  while (runId && status && !DONE.includes(status)) {
    if (Date.now() > deadline) break
    await new Promise((r) => setTimeout(r, 5000))
    const statusRes = await fetch(
      `${baseUrl()}/v2/actor-runs/${runId}?token=${encodeURIComponent(token())}`,
    )
    if (!statusRes.ok) break
    const now = (await statusRes.json()) as { data?: { status?: string } }
    status = now.data?.status
  }

  if (status === 'FAILED' || status === 'ABORTED') {
    throw new Error(`Le robot Apify s'est arrêté (${status}). Vérifie ta recherche ou ton quota.`)
  }

  const itemsRes = await fetch(
    `${baseUrl()}/v2/datasets/${datasetId}/items?token=${encodeURIComponent(token())}&clean=true&format=json`,
  )
  if (!itemsRes.ok) throw new Error(`Apify : lecture du dataset impossible (${itemsRes.status})`)

  const items = (await itemsRes.json()) as unknown
  return Array.isArray(items) ? (items as Record<string, unknown>[]) : []
}
