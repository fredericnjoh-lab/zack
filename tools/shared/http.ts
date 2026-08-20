import express, { type Express, type Request, type Response } from 'express'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/** Un serveur Express identique pour les trois outils : JSON, page statique, /api/health. */
export function createApp(toolDir: string, name: string): Express {
  const app = express()
  app.use(express.json({ limit: '2mb' }))
  app.use(express.static(join(toolDir, 'public')))
  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      tool: name,
      claude: Boolean(process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY),
      apify: Boolean(process.env.APIFY_TOKEN || process.env.APIFY_API_TOKEN),
    })
  })
  return app
}

/** Renvoie l'erreur en clair au navigateur au lieu d'un 500 muet. */
export function route(handler: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response) => {
    handler(req, res).catch((err: unknown) => {
      const message = err instanceof Error ? err.message : 'erreur inattendue'
      console.error(`[${req.method} ${req.path}]`, message)
      if (!res.headersSent) res.status(400).json({ error: message })
    })
  }
}

export function dirOf(importMetaUrl: string): string {
  return dirname(fileURLToPath(importMetaUrl))
}

/**
 * `envKey` donne à chaque outil sa propre variable (PORT_AGENCE, …) pour qu'ils puissent
 * tourner en même temps. PORT reste lu ensuite, car c'est ce que Render impose.
 */
export function listen(app: Express, defaultPort: number, name: string, envKey: string): void {
  const port = Number(process.env[envKey]) || Number(process.env.PORT) || defaultPort

  const server = app.listen(port, () => {
    console.log(`\n  ${name} → http://127.0.0.1:${port}\n`)
  })

  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.error(
        `\n  Le port ${port} est déjà pris — un autre outil tourne sûrement dessus.` +
          `\n  Ferme-le, ou lance celui-ci sur un autre port : ${envKey}=${port + 10} npm run …\n`,
      )
    } else {
      console.error(`\n  ${name} n'a pas pu démarrer : ${err.message}\n`)
    }
    process.exit(1)
  })
}
