/** Petit client Claude partagé par les trois outils. */

export function hasClaude(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY)
}

function key(): string {
  return process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY || ''
}

/** Convention Anthropic : permet de pointer vers une passerelle interne si besoin. */
function baseUrl(): string {
  return (process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com').replace(/\/+$/, '')
}

export type AskOptions = {
  system: string
  prompt: string
  maxTokens?: number
  temperature?: number
}

export async function askClaude(opts: AskOptions): Promise<string> {
  if (!hasClaude()) {
    throw new Error('ANTHROPIC_API_KEY manquante — ajoute-la dans ton fichier .env')
  }

  const res = await fetch(`${baseUrl()}/v1/messages`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': key(),
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5',
      max_tokens: opts.maxTokens ?? 2000,
      temperature: opts.temperature ?? 0.7,
      system: opts.system,
      messages: [{ role: 'user', content: opts.prompt }],
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Claude a répondu ${res.status} : ${body.slice(0, 400)}`)
  }

  const data = (await res.json()) as { content?: { type: string; text?: string }[] }
  return data.content?.find((c) => c.type === 'text')?.text || ''
}

/** Claude adore encadrer son JSON de ```json — on nettoie avant de parser. */
export function parseJson<T>(raw: string): T {
  let text = raw.trim()
  if (text.startsWith('```')) {
    text = text.replace(/^```[a-z]*\n?/i, '').replace(/```\s*$/, '').trim()
  }
  const start = text.search(/[[{]/)
  if (start > 0) text = text.slice(start)
  const lastBrace = Math.max(text.lastIndexOf('}'), text.lastIndexOf(']'))
  if (lastBrace >= 0) text = text.slice(0, lastBrace + 1)

  try {
    return JSON.parse(text) as T
  } catch {
    throw new Error("Claude n'a pas renvoyé du JSON exploitable. Relance la demande.")
  }
}

export async function askClaudeJson<T>(opts: AskOptions): Promise<T> {
  const raw = await askClaude({
    ...opts,
    system: `${opts.system}\n\nRéponds UNIQUEMENT avec du JSON valide, sans texte autour, sans balises markdown.`,
  })
  return parseJson<T>(raw)
}
