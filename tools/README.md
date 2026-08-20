# tools/ — les trois outils du post, séparés

Trois petits logiciels autonomes, un par méthode. Chacun a son serveur, sa page, son port,
et peut être déployé seul. Ils partagent seulement `tools/shared/` (Claude, Apify, stockage, serveur).

| Outil | Ce qu'il fait | Lancer | Adresse |
|---|---|---|---|
| **Agence** | Une idée → post LinkedIn + script reel + légende Instagram, dans ta voix | `npm run tool:agence` | http://127.0.0.1:8801 |
| **Leads** | Ta cible en français → prospects Google Maps qualifiés → CSV | `npm run tool:leads` | http://127.0.0.1:8802 |
| **Générateur** | Ta douleur → un vrai outil sur mesure, écrit sur ton disque | `npm run tool:builder` | http://127.0.0.1:8803 |

## Démarrer

```bash
npm install
cp .env.example .env    # puis colle tes clés dedans
npm run tool:agence     # ou tool:leads, ou tool:builder
```

Ouvre l'adresse affichée dans le terminal. Aucun build, aucune compilation : la page est servie telle quelle.

Les trois peuvent tourner en même temps, chacun sur son port (8801 / 8802 / 8803). Pour en déplacer un :
`PORT_AGENCE=8811 npm run tool:agence`. Si un port est déjà pris, le terminal te le dit et te donne la commande.

## Les clés

| Clé | Qui en a besoin | Où la prendre |
|---|---|---|
| `ANTHROPIC_API_KEY` | les trois | console.anthropic.com |
| `APIFY_TOKEN` | Leads uniquement | apify.com (compte gratuit) |

Sans clé, chaque outil démarre quand même et te dit en clair ce qui manque, en français.

## Ce que chaque outil fait exactement

### 1. Agence — `tools/marketing/`

- **Ma voix** : tu colles des posts de créateurs qui t'inspirent (ou les tiens), Claude en tire un guide
  de style réutilisable — règles d'écriture, plus un style par plateforme. Il est appliqué à tout ce que
  tu génères ensuite.
- **Créer** : tu donnes une idée en vrac. Le bouton « Pose-moi 3 questions » ajoute le cadrage audience
  avant d'écrire ; « Écrire directement » saute l'étape. Tu choisis les formats voulus.
- **Historique** : les 60 dernières générations, avec un bouton copier sur chaque format.

### 2. Leads — `tools/leads/`

- Tu remplis métier + ville + nombre de fiches + **ton offre**.
- Le robot Google Maps d'Apify tourne en tâche de fond (une requête HTTP ne survivrait pas à 3 minutes),
  la page affiche l'avancement.
- Claude note chaque prospect **sur 100 pour ton offre à toi**, explique la note, et écrit une accroche
  personnalisée par prospect.
- Table triée par pertinence, export CSV pour ton CRM. Relancer la même recherche met à jour les fiches
  existantes au lieu de les dupliquer.

À savoir : Google Maps donne rarement l'email. Le téléphone et le site sont presque toujours là — l'email
se trouve ensuite depuis le site.

### 3. Générateur — `tools/builder/`

Les quatre étapes du post, dans l'ordre :

1. Tu décris **la douleur**, pas la solution.
2. Claude pose 5 questions métier (jamais techniques — il décide à ta place sur la technique).
3. Il propose **la plus petite version utile**, et range explicitement dans « plus tard » tout ce qui est
   tentant mais pas indispensable.
4. Il écrit les fichiers dans `tools/builder/generated/<slug>/` et te donne la commande pour lancer ton
   outil. Ensuite tu l'améliores en t'en servant, depuis Claude Code.

Le code généré réutilise les briques de `tools/shared/`, donc il tourne sans installer quoi que ce soit
de plus. Les outils générés ne sont pas versionnés (voir `.gitignore`) : ils sont à toi.

## Déployer un outil en ligne

`render.yaml` décrit déjà les trois services. Sur render.com → **New → Blueprint** → choisis le repo :
Render crée `agence`, `leads` et `builder` en plus de `zack`. Supprime ceux dont tu n'as pas besoin,
colle tes clés dans chacun. Chaque outil a sa propre URL.

Sur le plan gratuit de Render, le disque est éphémère : `data/tools/*.json` est effacé au redémarrage.
Pour Leads, exporte ton CSV — c'est de toute façon là que vivent tes prospects, dans ton CRM.

## Comment c'est fait

```
tools/
  shared/      claude.ts · apify.ts · store.ts · http.ts   ← les 4 briques communes
  marketing/   server.ts + public/index.html
  leads/       server.ts + public/index.html
  builder/     server.ts + public/index.html + generated/
```

Chaque `server.ts` fait moins de 250 lignes et se lit de haut en bas. Si tu veux changer un
comportement, ouvre-le dans Claude Code et décris ce que tu veux : c'est exactement le propos
de la méthode 3.
