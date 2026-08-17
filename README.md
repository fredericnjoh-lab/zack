# Zack — MVP perso

Veille Instagram → score viral (vues / médiane du compte) → script → agenda.

## Démarrer (toi)

```bash
cd zack
npm install --ignore-scripts
npm run dev
```

- Web : http://127.0.0.1:5173  
- API : http://127.0.0.1:8787  

## Utilisation sans clés

1. Onglet **Veille** — comptes seed déjà là, clique **Recalculer la veille**
2. Ou **Ajouter un Reel à la main** (handle + vues)
3. **Générer le script** sur une exception
4. Agenda pour planifier

## Brancher le vrai Instagram

1. Crée un compte [Apify](https://apify.com) → token
2. Mets `APIFY_TOKEN=...` dans `.env`
3. Relance `npm run dev` → **Lancer la veille Apify**

Optionnel scripts LLM (dans l’ordre) :
1. `ANTHROPIC_API_KEY` → **Claude** (recommandé)
2. sinon `OPENAI_API_KEY`
3. sinon script local sans clé

## Limites honnêtes

- Scraping IG = fragile / ToS Meta — usage perso d’abord
- Pas encore : transcription audio, OCR overlay, billing multi-clients
