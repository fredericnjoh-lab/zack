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
- **Repost Instagram → YouTube** : tes Reels republiés en Shorts sur ta chaîne

## Veille auto (obligatoire sur Render free)

Le plan free Render **s’endort** : le timer interne ne suffit pas. Utilise le workflow
`.github/workflows/auto-veille.yml` :

1. Repo GitHub → **Settings → Secrets and variables → Actions**
2. Ajoute `ZACK_URL` = `https://zack-n0zd.onrender.com` (ou ton URL)
3. Optionnel : `CRON_SECRET` (même valeur côté Render env)
4. Dans Zack → Veille → **Activer** la veille automatique
5. Test : Actions → **Zack daily auto-veille** → Run workflow

Chaque matin ~7h Paris, GitHub réveille le serveur et lance `POST /api/cron/veille`.

## Repost Instagram → YouTube

Onglet **Repost** : Zack lit ton compte Instagram (`fredjoclothing.paris` par défaut),
récupère les vidéos, réécrit titre + description pour le SEO YouTube (Claude), puis
les envoie sur ta chaîne (`fredjoclothing`). Chaque post n'est publié qu'une fois —
le lien Instagram ↔ YouTube est mémorisé dans le store.

### 1. Créer l'app OAuth Google (une fois)

1. [Google Cloud Console](https://console.cloud.google.com) → nouveau projet.
2. **APIs & Services → Library** → active **YouTube Data API v3**.
3. **OAuth consent screen** → type *External* → ajoute ton adresse Google en
   *Test user* (sinon le refresh token expire au bout de 7 jours).
4. **Credentials → Create credentials → OAuth client ID → Web application**.
5. *Authorized redirect URIs* : `https://<ton-domaine>/api/youtube/callback`
   (ex. `https://zack-n0zd.onrender.com/api/youtube/callback`, et
   `http://127.0.0.1:8787/api/youtube/callback` en local).
6. Copie `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` dans `.env` (ou dans les
   variables Render).

### 2. Connecter la chaîne

Onglet **Repost** → **Connecter YouTube** → choisis le compte de la chaîne
`fredjoclothing` → autorise. La page de retour affiche un
`GOOGLE_REFRESH_TOKEN=…` : recopie-le dans les variables d'environnement Render,
sinon le lien saute au prochain déploiement (disque free éphémère).

### 3. Publier

1. **Lire mon Instagram** → Zack scrape le compte via Apify (1–3 min, async).
2. Coche les vidéos → **Publier sur YouTube**.
3. Visibilité par défaut : **privée** — passe en *publique* quand tu es sûr du rendu.

Réglages disponibles : visibilité, titre réécrit par Claude ou légende brute,
`#Shorts` automatique, nombre de vidéos par run auto.

### 4. Repost automatique

Active **Repost auto chaque matin** dans l'onglet, puis laisse le workflow
`.github/workflows/auto-repost.yml` appeler `POST /api/cron/repost` (08h30 Paris).
Mêmes secrets que la veille : `ZACK_URL`, `CRON_SECRET`.

Dans le chat Zack : « repost sur YouTube » lance le même pipeline.

**Attention droits** : ne republie que tes propres vidéos. Une musique sous licence
présente dans un Reel peut déclencher une revendication Content ID côté YouTube.
Quota YouTube Data API : ~1 600 unités par upload, 10 000 unités/jour par défaut
(soit ~6 vidéos/jour).

## Deploy Render (URL stable)

1. Pousse ce repo sur GitHub (public).
2. Sur [render.com](https://render.com) → **New** → **Blueprint** → sélectionne le repo (utilise `render.yaml`).
3. Ajoute les secrets :
   - `APIFY_TOKEN`
   - `ANTHROPIC_API_KEY`
   - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_REFRESH_TOKEN` (repost YouTube)
4. Deploy → URL du type `https://zack-xxxx.onrender.com`

Ou manuellement : **New Web Service** → Build `npm install --include=dev && npm run build` → Start `npm start`.

## Notes

- Les données (`data/store.json`) sont locales au disque du service (éphémère sur le plan free) : une veille Apify re-remplit tout.
- Compte Instagram **privé** = non lisible par Apify.
- Sur le free tier Render, le process dort : le workflow GitHub **Zack daily auto-veille** appelle `POST /api/cron/veille` chaque matin.
- Les veilles Apify partent en **async** (plus de timeout proxy « API failed »).
- Le repost télécharge la vidéo Instagram en mémoire (limite 300 Mo) : les URLs CDN
  Instagram expirent, Zack re-scrape automatiquement si le dernier scan a plus de 30 min.
