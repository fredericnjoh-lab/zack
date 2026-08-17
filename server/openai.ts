import type { GeneratedScript, ScoredReel } from './types.ts'

export function hasOpenAI(): boolean {
  return Boolean(process.env.OPENAI_API_KEY)
}

export async function generateScriptFromReel(reel: ScoredReel): Promise<GeneratedScript> {
  const title = (reel.caption || 'Script Zack').split('\n')[0]!.slice(0, 80)

  if (!hasOpenAI()) {
    return localScript(reel, title)
  }

  const key = process.env.OPENAI_API_KEY!
  const prompt = `Tu es Zack, coach Reels Instagram francophone.
À partir de ce Reel concurrent, écris un script ORIGINAL dans la voix de l'utilisateur (pas une copie).
Reel @${reel.handle} — ${reel.views} vues — score viral ${reel.score.toFixed(1)}× (baseline ${Math.round(reel.baseline)}).
Caption: ${reel.caption || '(vide)'}

Réponds UNIQUEMENT en JSON:
{
  "beats": [{"time":"0:00","tone":"...","line":"...","subtitle":"..."}],
  "captions": {"punchy":"...","soft":"..."}
}
4 à 6 beats, total ~15-25s.`

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${key}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4.1-mini',
      temperature: 0.7,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'Tu réponds uniquement en JSON valide.' },
        { role: 'user', content: prompt },
      ],
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`OpenAI failed: ${res.status} ${body}`)
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[]
  }
  const content = data.choices?.[0]?.message?.content || '{}'
  const parsed = JSON.parse(content) as {
    beats?: GeneratedScript['beats']
    captions?: GeneratedScript['captions']
  }

  return {
    id: `script-${Date.now()}`,
    title,
    sourceReelId: reel.id,
    beats: parsed.beats?.length ? parsed.beats : localScript(reel, title).beats,
    captions: parsed.captions || localScript(reel, title).captions,
    createdAt: new Date().toISOString(),
  }
}

function localScript(reel: ScoredReel, title: string): GeneratedScript {
  return {
    id: `script-${Date.now()}`,
    title,
    sourceReelId: reel.id,
    createdAt: new Date().toISOString(),
    captions: {
      punchy: `Le vrai signal : ${reel.score.toFixed(1)}× la baseline — pas les vues brutes.`,
      soft: `J’ai regardé @${reel.handle} : ${Math.round(reel.views / 1000)}k vues vs ~${Math.round(reel.baseline / 1000)}k habituels. Voici mon take.`,
    },
    beats: [
      {
        time: '0:00',
        tone: 'Direct, regard caméra',
        line: `Si ton Reel fait ${formatViews(reel.views)} alors que le compte tourne autour de ${formatViews(reel.baseline)}… c’est un signal.`,
        subtitle: 'Pas les vues brutes. Le multiple.',
      },
      {
        time: '0:05',
        tone: 'Expliquer',
        line: `Zack calcule le score viral : ici ${reel.score.toFixed(1)}× la médiane du compte.`,
        subtitle: `Score ${reel.score.toFixed(1)}×`,
      },
      {
        time: '0:10',
        tone: 'Preuve',
        line: reel.caption
          ? `L’angle qui a marché : « ${reel.caption.slice(0, 90)} ». On le refait dans ta voix, pas en copiant.`
          : 'On reprend la structure (hook → preuve → CTA), pas les mots.',
        subtitle: 'Structure, pas copie',
      },
      {
        time: '0:16',
        tone: 'CTA',
        line: 'Tu veux le script complet découpé seconde par seconde ? Dis à Zack « raccourcis mon accroche ».',
        subtitle: 'Prêt à filmer',
      },
    ],
  }
}

function formatViews(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`
  return String(n)
}
