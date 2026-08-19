# Zack

Veille Instagram → score viral → scripts → photos/carrousels → calendrier.

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
- Veille automatique à l’heure choisie (Europe/Paris)
- Découverte de comptes de niche
- Méthode d’écriture : documents + règles retenues
- Chat agentique (« lance une veille », « raccourcis mon accroche », …)
- Agenda drag & drop (boîte à idées → jours) + statuts écrit/tourné/publié

## Deploy Render (URL stable)

1. Pousse ce repo sur GitHub (public).
2. Sur [render.com](https://render.com) → **New** → **Blueprint** → sélectionne le repo (utilise `render.yaml`).
3. Ajoute les secrets :
   - `APIFY_TOKEN`
   - `ANTHROPIC_API_KEY`
4. Deploy → URL du type `https://zack-xxxx.onrender.com`

Ou manuellement : **New Web Service** → Build `npm install --include=dev && npm run build` → Start `npm start`.

## Notes

- Les données (`data/store.json`) sont locales au disque du service (éphémère sur le plan free) : une veille Apify re-remplit tout.
- Compte Instagram **privé** = non lisible par Apify.
- Sur le free tier Render, le process dort : active un **Cron Job** Render qui appelle `POST /api/auto-veille/run` avec `{"force":true}` si tu veux un palmarès fiable chaque matin.
