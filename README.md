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
