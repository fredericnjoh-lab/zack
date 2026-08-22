# Zack

Veille Instagram **pour marques de vêtements** — score viral concurrent → script drop/fit → calendrier.

Streetwear · DTC · ready-to-wear. Moteur : Apify (scrape) + score relatif + Claude (OCR / scripts / remakes).

## Local

```bash
npm install
cp .env.example .env   # APIFY_TOKEN + ANTHROPIC_API_KEY
npm run build
npm start
```

App + API : http://127.0.0.1:8787

## Fonctionnalités

- Score viral (médiane compte × type de média)
- Transcription + OCR frame (Claude Vision) + 2 légendes
- Veille automatique via **GitHub Actions** (réveille Render free + scrape)
- Découverte de comptes de niche
- Méthode d’écriture : documents + règles retenues
- Chat agentique (« lance une veille », « raccourcis mon accroche », …)
- Agenda drag & drop (boîte à idées → jours) + statuts écrit/tourné/publié

## Veille auto (obligatoire sur Render free)

Le plan free Render **s’endort** : le timer interne ne suffit pas. Utilise le workflow
`.github/workflows/auto-veille.yml` :

1. Repo GitHub → **Settings → Secrets and variables → Actions**
2. Ajoute `ZACK_URL` = `https://zack-n0zd.onrender.com` (ou ton URL)
3. Optionnel : `CRON_SECRET` (même valeur côté Render env)
4. Dans Zack → Veille → **Activer** la veille automatique
5. Test : Actions → **Zack daily auto-veille** → Run workflow

Chaque matin ~7h Paris, GitHub réveille le serveur et lance `POST /api/cron/veille`.

## Deploy Render (URL stable)

1. Pousse ce repo sur GitHub (public).
2. Sur [render.com](https://render.com) → **New** → **Blueprint** → sélectionne le repo (utilise `render.yaml`).
3. Ajoute les secrets :
   - `APIFY_TOKEN`
   - `ANTHROPIC_API_KEY`
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
4. Deploy → URL du type `https://zack-xxxx.onrender.com`

Ou manuellement : **New Web Service** → Build `npm install --include=dev && npm run build` → Start `npm start`.

## Persistance des recherches sur Render Free

Le disque d'une instance Render Free est éphémère. Sans stockage distant, les
comptes, résultats Apify, scripts et réglages reviennent aux données de démo
après un redéploiement ou le remplacement de l'instance.

Zack peut sauvegarder automatiquement tout son état dans un Redis Upstash
(l'offre gratuite suffit pour une instance) :

1. Crée une base Redis sur [console.upstash.com](https://console.upstash.com).
2. Dans **REST API**, copie `UPSTASH_REDIS_REST_URL` et
   `UPSTASH_REDIS_REST_TOKEN`.
3. Ajoute ces deux valeurs dans Render → service **zack** → **Environment**.
4. Redéploie le service, puis lance une veille.

Au démarrage, Zack restaure la dernière recherche avant d'accepter du trafic.
Chaque ajout, veille, script ou changement de réglage est ensuite écrit dans le
fichier local et mis en file pour sauvegarde distante. `/api/health` expose
`persistence.backend`, `configured`, `restored`, `lastSyncedAt` et `lastError`
ainsi que `durableWrites` pour diagnostiquer la connexion sans exposer les
secrets. Si la restauration échoue après trois essais, Zack conserve son cache
local mais bloque les écritures distantes pour ne jamais écraser une sauvegarde
valide avec les données de démo.

Sans ces variables, le comportement reste local et l'application continue de
fonctionner, mais les données ne survivent pas à une nouvelle instance Render.

## Notes

- `data/store.json` reste le cache local ; Upstash en est la copie durable quand il est configuré.
- Compte Instagram **privé** = non lisible par Apify.
- Sur le free tier Render, le process dort : le workflow GitHub **Zack daily auto-veille** appelle `POST /api/cron/veille` chaque matin.
- Les veilles Apify partent en **async** (plus de timeout proxy « API failed »).
