<div align="center">

# Personal AI Memory

**Vos conversations, mémorisées. Confidentiellement.**

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Manifest V3](https://img.shields.io/badge/Chrome-Manifest%20V3-green.svg)](https://developer.chrome.com/docs/extensions/mv3/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

🌐 [English](README.en.md) | [繁體中文](README.zh-TW.md) | [简体中文](README.zh-CN.md) | [日本語](README.ja.md) | [한국어](README.ko.md) | [Español](README.es.md) | [Deutsch](README.de.md) | [Retour à l'accueil](README.md)

</div>

---

> Une extension Chrome qui **capture silencieusement** vos conversations ChatGPT / Claude / Gemini et les stocke sous forme de mémoires sémantiques privées indexées localement — avec un bouton **Recall** en un clic pour injecter du contexte pertinent dans les nouveaux chats.
>
> **100% local. Pas de cloud. Pas de serveur. Pas de compte requis.**


---

## Installation

### Pour les utilisateurs — Chrome Web Store

Installez directement depuis le [Chrome Web Store](https://chrome.google.com/webstore/detail/cjkjgbddkaoogdbfffiooeppnmbplpnh).

> **Note :** La version Chrome Web Store peut être en retard par rapport à la dernière version. Pour les fonctionnalités les plus récentes, téléchargez le dernier `.zip` depuis la page [Releases](../../releases) et installez-le manuellement (voir les étapes ci-dessous).

### Installation manuelle depuis une Release

1. Rendez-vous sur la page [Releases](../../releases) et téléchargez le dernier `.zip`
2. Décompressez le fichier
3. Ouvrez Chrome → `chrome://extensions/`
4. Activez le **Mode développeur** (en haut à droite)
5. Cliquez sur **Charger l'extension non empaquetée** → sélectionnez le dossier décompressé

### Pour les développeurs — Compiler depuis le code source

**Prérequis :** Node.js 18+, pnpm (`npm install -g pnpm`), Chrome / Edge (MV3)

```bash
git clone <repository-url>
cd AI_Memory
pnpm install

# Mode développement — recompile automatiquement à chaque sauvegarde
pnpm dev
```

Chargez ensuite `build/chrome-mv3-dev/` via **Charger l'extension non empaquetée** dans `chrome://extensions/`.

```bash
# Build de production
pnpm build
# sortie : build/chrome-mv3-prod/
```

> Après toute modification de code : cliquez sur **Recharger** sur la carte AI Memory, puis rafraîchissez les onglets IA ouverts.

---

## Fonctionnalités en un coup d'œil

| Fonctionnalité | Détails |
|----------------|---------|
| **Capture passive** | Intercepte automatiquement ChatGPT / Claude / Gemini — sans configuration, sans clics |
| **Recherche hybride** | Vectorielle (décroissance temporelle) + BM25, fusionnées avec RRF pour les meilleurs résultats |
| **Recall en un clic** | Injecte les mémoires pertinentes comme prompt RAG dans ChatGPT et Claude |
| **Sauvegarde locale** | Exportez / importez une sauvegarde complète en JSON (embeddings inclus) |
| **Prompts favoris** | Sauvegarder, autocomplétion (Trie), organiser en dossiers glisser-déposer |
| **Panneau flottant** | Panneau mémoire déplaçable sur chaque site IA |
| **8 langues d'interface** | zh-TW · zh-CN · en · ja · ko · es · fr · de — détection automatique |
| **Thème sombre / clair** | Bascule inspirée Apple Liquid Glass |

**Plateformes supportées :** ChatGPT (`chat.openai.com` / `chatgpt.com`) · Gemini (`gemini.google.com`) · Claude (`claude.ai`)


---


# Comment exporter l'historique des discussions ChatGPT/Gemini ?

## Étapes d'exportation de l'historique des discussions ChatGPT

1. Connectez-vous à votre compte ChatGPT et accédez à l'écran principal.
2. Cliquez sur votre « Photo de profil » ou « Nom » dans le coin pour ouvrir le menu.
3. Sélectionnez « Settings » (Paramètres).
4. Accédez à l'onglet « Data controls » (Contrôles des données).
5. Trouvez l'option « Export data » (Exporter les données) et cliquez sur « Export » (Exporter).
6. Une fenêtre de confirmation apparaîtra ; cliquez sur « Confirm export » (Confirmer l'exportation).
7. Vous recevrez un e-mail contenant un lien de téléchargement à votre adresse e-mail enregistrée (Remarque : Il peut s'écouler jusqu'à 24 heures avant de recevoir l'e-mail d'exportation après la demande).
8. Cliquez sur le lien dans l'e-mail pour télécharger le fichier ZIP. Après extraction, le fichier contenant votre historique de discussion sera `conversations-00x.json`.


## Étapes d'exportation de l'historique des discussions Gemini

L'exportation des données complètes pour Gemini est intégrée via le service Google Takeout.

1. Connectez-vous à votre compte Google et accédez au site Web [Google Takeout](https://takeout.google.com).
2. Cliquez sur « Tout désélectionner » en haut de la page pour effacer tous les services Google par défaut.
3. Faites défiler la liste, trouvez et cochez « Mon activité » (My Activity) (Remarque : Ne sélectionnez pas ~~Gemini Apps~~).
4. Cliquez sur le bouton « Plusieurs formats » sous cette section.
5. Dans la fenêtre de paramètres qui apparaît, remplacez le format du premier enregistrement d'activité de « HTML » par « JSON », et cliquez sur OK.
6. Faites défiler tout en bas de la page et cliquez sur « Étape suivante ».
7. Choisissez votre mode de livraison (par exemple, Envoyer le lien de téléchargement par e-mail), conservez le type de fichier et la taille maximale par défaut, puis cliquez sur « Créer une exportation ».
8. Attendez que le système ait terminé le traitement et vous recevrez un e-mail avec le lien de téléchargement. Après l'extraction, le fichier d'enregistrement exporté sera `my activity.json`.

---

## Comment ça fonctionne

```
Vous chattez sur ChatGPT / Claude / Gemini
        │  (l'extension capture silencieusement en arrière-plan)
        ▼
Mémoires stockées localement dans IndexedDB
+ vecteur d'embedding sémantique (ONNX, s'exécute dans le navigateur)
+ index de mots-clés (MiniSearch / BM25, en mémoire du Service Worker)
        │
        │  Plus tard — vous démarrez un nouveau chat
        ▼
Cliquez sur 🧠 Recall à côté du champ de saisie ChatGPT / Claude
        │
        ▼
Recherche hybride :
  Route A — similarité vectorielle × décroissance temporelle (récent = poids plus élevé)
  Route B — recherche par mots-clés BM25 (correspondance de préfixes)
  Fusion  — Reciprocal Rank Fusion (RRF)
        │
        ▼
Les top-k mémoires sont injectées comme contexte RAG dans le champ de saisie
L'IA dispose maintenant de votre historique comme connaissance de fond
```

### Algorithme de recherche (détail)

```
Route A — Recherche vectorielle + Décroissance temporelle
  requête → Float32Array embedding (ONNX, Offscreen Document)
  pour chaque enregistrement : dot_product(q, r.embedding) × exp(-0.01 × joursAncienneté)
  regrouper par parentId → conserver le score max décroissant par groupe
  trier décroissant → vectorRanked[]
  (demi-vie ≈ 69 jours, λ = 0.01)

Route B — Recherche par mots-clés (MiniSearch / BM25)
  miniSearch.search(query, { prefix: true })
  correspondance de préfixes : "py" trouve "python", "react" trouve "reactivity"
  trier par score BM25 → kwRanked[]

Fusion — Reciprocal Rank Fusion (RRF, k = 60)
  rrfScore[key] += 1 / (60 + rang)  pour chaque liste
  sommer les deux listes → trier desc → top-k → fusionner chunks → SearchResult[]
```

**Repli :** si l'embedding échoue, seuls les résultats par mots-clés sont retournés ; si aucune correspondance de mots-clés, seuls les résultats vectoriels sont retournés.

---

## Confidentialité et sécurité

Cette extension intercepte vos conversations IA. Voici exactement ce qu'elle fait et ne fait pas :

| Question | Réponse |
|----------|---------|
| Où sont stockées les données ? | **Uniquement dans l'IndexedDB locale du navigateur** (`AIMemoryDB`) — ne quitte jamais votre appareil |
| Envoie-t-elle des requêtes réseau ? | **Une seule fois** — pour télécharger le modèle ONNX au premier démarrage. Les données de conversation ne sont jamais envoyées. |
| Les sites web peuvent-ils voir mes mémoires ? | Non. Les données sont isolées dans le stockage de l'extension, inaccessibles aux scripts de page. |
| Puis-je supprimer mes données ? | Oui — suppression douce d'enregistrements individuels depuis le panneau flottant, ou effacement complet via DevTools → IndexedDB. |

> **Traitez cette extension comme un journal intime local.** Elle voit tout ce que vous tapez et recevez sur les sites IA supportés. Examinez le code source si vous avez des inquiétudes.

---

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Framework d'extension | [Plasmo](https://docs.plasmo.com) (Chrome MV3) |
| UI | React 18 + Theme Tokens personnalisés |
| Persistance | IndexedDB via [Dexie](https://dexie.org) |
| Recherche vectorielle | [Transformers.js](https://xenova.github.io/transformers.js/) ONNX — `paraphrase-multilingual-MiniLM-L12-v2` |
| Recherche par mots-clés | [MiniSearch](https://github.com/lucaong/minisearch) (BM25, en mémoire) |
| Langage | TypeScript |

<details>
<summary><strong>📂 Structure du projet</strong></summary>

```
src/
├── background/
│   ├── index.ts               Routeur de messages · gestionnaire de capture · sync MiniSearch
│   ├── search.ts              Moteur de recherche hybride (vecteur×décroissance + BM25 + RRF)
│   ├── db.ts                  Opérations IndexedDB (Dexie)
│   ├── embedding.ts           Constantes de nom / version du modèle ONNX
│   ├── injector.ts            Intercepteur fetch/XHR MAIN-world (injecté dans la page)
│   └── adapters/
│       ├── chatgpt.ts         Parseur SSE delta-v1 ChatGPT
│       ├── claude.ts          Parseur SSE Claude
│       └── gemini.ts          Parseur XHR StreamGenerate Gemini
├── contents/
│   ├── interceptor.ts         Pont ISOLATED-world + MutationObserver <title>
│   ├── memory-float-ui.tsx    Point d'entrée du content script du panneau flottant
│   └── chatgpt-injector.tsx   Injection du bouton Recall + assemblage du prompt RAG
├── tabs/
│   └── offscreen.tsx          Inférence ONNX (Offscreen Document — nécessite le DOM)
├── popup/
│   ├── index.tsx              Racine du Popup — navigation par panneau coulissant
│   └── components/
│       ├── MainMenuView.tsx   Menu principal + section Prompts favoris
│       ├── MemoryTableView.tsx Liste des mémoires groupées par session
│       ├── ImportView.tsx     UI d'importation JSON
│       ├── ExportView.tsx     UI d'exportation JSON
│       ├── FavoritePromptsSection.tsx Prompts avec autocomplétion Trie
│       └── FolderView.tsx     Gestion des dossiers avec glisser-déposer
├── ui/memory-panel/
│   └── FloatingMemoryPanel.tsx Panneau flottant déplaçable (logo + panneau)
├── i18n/
│   ├── translations.ts        Carte de chaînes en 8 langues
│   ├── LanguageContext.tsx    Changement de langue (localStorage)
│   └── ThemeContext.tsx       Thème sombre / clair (localStorage)
└── types/
    ├── memory.ts              Interfaces MemoryRecord · SearchResult
    └── messages.ts            Toutes les définitions de types de messages Chrome
```

</details>

---

## Débogage et tests

| Cible | Comment y accéder |
|-------|-------------------|
| Background Service Worker | `chrome://extensions/` → AI Memory → **Service worker** |
| Popup | Clic droit sur l'icône de l'extension → **Inspecter le popup** |
| Content scripts | DevTools → Sources → Content scripts |
| IndexedDB | DevTools → Application → Storage → IndexedDB → `AIMemoryDB` |
| Test de recherche manuel | Console du Service Worker : `testSearch('mot-clé', 5)` |

```bash
pnpm test              # Tests unitaires (Vitest)
pnpm test:integration  # Tests d'intégration
pnpm test:e2e          # Tests E2E (Playwright — exécuter pnpm build d'abord)
```


---

## Journal des modifications

### v0.0.2 — 2026-03-01
- **Nouveau :** Support complet de Claude web (`claude.ai`) — capture de conversations, injection du bouton Recall et panneau mémoire flottant fonctionnent désormais sur Claude

### v0.0.1 — Version initiale
- Capture de conversations ChatGPT et Gemini
- Recherche hybride vecteur + BM25 avec fusion RRF
- Bouton Recall en un clic (ChatGPT)
- Prompts favoris avec autocomplétion Trie et dossiers glisser-déposer
- Export / import de sauvegarde JSON
- Panneau mémoire flottant
- 8 langues d'interface, thème sombre / clair

---

## Contributions et licence

Les PRs et Issues sont les bienvenues ! Veuillez ouvrir une Issue pour discuter des changements importants avant de soumettre une PR.

- Signaler des bugs : [ouvrir une Issue](../../issues)
- Demandes de fonctionnalités : [ouvrir une Issue](../../issues)

---

## License

[Apache 2.0](LICENSE)
