<div align="center">

# Personal AI Memory

**Vos conversations, mémorisées. Confidentiellement.**

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Chrome Web Store](https://img.shields.io/chrome-web-store/v/cjkjgbddkaoogdbfffiooeppnmbplpnh?label=Chrome%20Web%20Store)](https://chromewebstore.google.com/detail/personal-ai-memory-local/cjkjgbddkaoogdbfffiooeppnmbplpnh)
[![Manifest V3](https://img.shields.io/badge/Chrome-Manifest%20V3-green.svg)](https://developer.chrome.com/docs/extensions/mv3/)
[![ChatGPT](https://img.shields.io/badge/ChatGPT-supported-74aa9c?logo=openai&logoColor=white)](https://chatgpt.com)
[![Claude](https://img.shields.io/badge/Claude-supported-d97757?logo=anthropic&logoColor=white)](https://claude.ai)
[![Gemini](https://img.shields.io/badge/Gemini-supported-4285F4?logo=google&logoColor=white)](https://gemini.google.com)
[![Perplexity](https://img.shields.io/badge/Perplexity-supported-20808D?logo=perplexity&logoColor=white)](https://perplexity.ai)
[![Grok](https://img.shields.io/badge/Grok-supported-000000?logo=x&logoColor=white)](https://grok.com)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

🌐 [English](README.en.md) | [繁體中文](README.zh-TW.md) | [简体中文](README.zh-CN.md) | [日本語](README.ja.md) | [한국어](README.ko.md) | [Español](README.es.md) | [Deutsch](README.de.md) | [Retour à l'accueil](../README.md)

<a href="https://www.producthunt.com/products/personal-ai-memory?embed=true&amp;utm_source=badge-featured&amp;utm_medium=badge&amp;utm_campaign=badge-personal-ai-memory" target="_blank" rel="noopener noreferrer"><img alt="Personal AI Memory - Captures and stores your chat from various AI platforms | Product Hunt" width="250" height="54" src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1089387&amp;theme=light&amp;t=1772644496610"></a>
</div>

</div>

---

> Une extension Chrome qui **capture silencieusement** vos conversations ChatGPT / Claude / Gemini / Perplexity / Grok et les stocke sous forme de mémoires sémantiques privées indexées localement — avec un bouton **Recall** en un clic pour injecter du contexte pertinent dans les nouveaux chats.
>
> **100% local. Pas de cloud. Pas de serveur. Pas de compte requis.**


---

## Installation

### Pour les utilisateurs — Chrome Web Store

Installez directement depuis le [Chrome Web Store](https://chromewebstore.google.com/detail/personal-ai-memory-local/cjkjgbddkaoogdbfffiooeppnmbplpnh).

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
# Forkez ce dépôt sur votre propre compte GitHub
git clone https://github.com/<your-github-username>/personal-ai-memory.git
cd personal-ai-memory
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
| **Capture passive** | Intercepte automatiquement ChatGPT / Claude / Gemini / Perplexity / Grok — sans configuration, sans clics. Visitez simplement la page et les conversations existantes sont capturées automatiquement. |
| **Recherche hybride** | Vectorielle (décroissance temporelle) + BM25, fusionnées avec RRF pour les meilleurs résultats |
| **Recall en un clic** | Injecte les mémoires pertinentes comme prompt RAG sur toutes les plateformes compatibles |
| **Sauvegarde locale** | Exportez / importez une sauvegarde complète en JSON (embeddings inclus) |
| **Prompts favoris** | Sauvegarder, autocomplétion (Trie), organiser en dossiers glisser-déposer |
| **Panneau flottant** | Panneau mémoire déplaçable sur chaque site IA |
| **8 langues d'interface** | zh-TW · zh-CN · en · ja · ko · es · fr · de — détection automatique |
| **Thème sombre / clair** | Bascule inspirée Apple Liquid Glass |

**Plateformes supportées :** ChatGPT (`chat.openai.com` / `chatgpt.com`) · Gemini (`gemini.google.com`) · Claude (`claude.ai`) · Perplexity (`perplexity.ai`) · Grok (`grok.com`)

---

## Comment exporter l'historique des discussions ?

### ChatGPT

1. Connectez-vous à votre compte ChatGPT et accédez à l'écran principal.
2. Cliquez sur votre « Photo de profil » ou « Nom » dans le coin pour ouvrir le menu.
3. Sélectionnez **Settings** (Paramètres).
4. Accédez à l'onglet **Data controls** (Contrôles des données).
5. Trouvez **Export data** et cliquez sur **Export**.
6. Cliquez sur **Confirm export** dans la fenêtre de confirmation.
7. Vous recevrez un e-mail avec un lien de téléchargement (peut prendre jusqu'à 24 heures).
8. Téléchargez le fichier ZIP. Après extraction, l'historique de discussion est `conversations-00x.json`.

### Gemini

Exporter via Google Takeout :

1. Accédez à [Google Takeout](https://takeout.google.com) et connectez-vous.
2. Cliquez sur **Tout désélectionner** en haut.
3. Faites défiler vers le bas et cochez **Mon activité** (My Activity) (PAS ~~Gemini Apps~~).
4. Cliquez sur le bouton **Plusieurs formats**.
5. Changez le format du premier enregistrement de **HTML** à **JSON**, cliquez sur OK.
6. Cliquez sur **Étape suivante** → choisissez le mode de livraison → **Créer une exportation**.
7. Attendez l'e-mail. Après extraction, le fichier est `my activity.json`.

### Claude

1. Accédez à [https://claude.ai/settings/data-privacy-controls](https://claude.ai/settings/data-privacy-controls).
2. Cliquez sur **Export data**.
3. Attendez l'e-mail avec le lien de téléchargement.
4. Après extraction, l'historique de discussion est `conversations.json`.

### Perplexity

> Perplexity ne prend **pas** en charge l'export de données utilisateur. Chaque conversation doit être ouverte individuellement pour être capturée par l'extension.

### Grok

1. Accédez à [https://grok.com](https://grok.com).
2. Cliquez sur votre photo de profil (en bas à gauche) → **Settings** → **Data controls**.
3. Cliquez sur **Export Account Data**.
4. Attendez plusieurs heures pour recevoir l'e-mail avec le lien de téléchargement.
5. Après extraction, le fichier est `prod-grok-backend.json`.

---

## Comment ça fonctionne

```
Vous chattez sur ChatGPT / Claude / Gemini / Perplexity / Grok
        │  (l'extension capture silencieusement en arrière-plan)
        ▼
Mémoires stockées localement dans IndexedDB
+ vecteur d'embedding sémantique (ONNX, s'exécute dans le navigateur)
+ index de mots-clés (MiniSearch / BM25, en mémoire du Service Worker)
        │
        │  Plus tard — vous démarrez un nouveau chat
        ▼
Cliquez sur 🧠 Recall à côté du champ de saisie sur n'importe quelle plateforme compatible
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
│   ├── chunking.ts            Découpage de texte (segments 500 car, chevauchement 75)
│   ├── domSync.ts             Synchronisation des conversations basée sur le DOM
│   ├── offscreen.ts           Gestionnaire de messages du document Offscreen
│   ├── perplexityBgFetch.ts   Aide au fetch en arrière-plan pour Perplexity
│   ├── syncEmbeddings.ts      Utilitaires de synchronisation des embeddings
│   └── adapters/
│       ├── chatgpt.ts         Parseur SSE delta-v1 ChatGPT
│       ├── claude.ts          Parseur SSE Claude
│       ├── gemini.ts          Parseur XHR StreamGenerate Gemini + capture passive
│       ├── perplexity.ts      Parseur SSE Perplexity
│       └── grok.ts            Parseur SSE Grok
├── contents/
│   ├── interceptor.ts         Pont ISOLATED-world + MutationObserver <title>
│   ├── memory-float-ui.tsx    Point d'entrée du content script du panneau flottant
│   ├── chatgpt-injector.tsx   Bouton Recall ChatGPT + prompt RAG
│   ├── claude-injector.tsx    Bouton Recall Claude
│   ├── gemini-injector.tsx    Capture passive Gemini + bouton Recall
│   ├── grok-injector.tsx      Bouton Recall Grok
│   └── perplexity-injector.tsx Bouton Recall Perplexity
├── importers/
│   ├── base.ts                Interface de base des importateurs
│   ├── chatgptConversations.ts Importateur JSON ChatGPT
│   ├── claudeConversations.ts  Importateur JSON Claude
│   ├── geminiTakeout.ts       Importateur Gemini Takeout
│   ├── grokConversations.ts   Importateur JSON Grok
│   └── index.ts               Registre des importateurs
├── tabs/
│   └── offscreen.tsx          Inférence ONNX (Offscreen Document — nécessite le DOM)
├── popup/
│   ├── index.tsx              Racine du Popup — navigation par panneau coulissant
│   └── components/
│       ├── FloatingMemoryPanel.tsx Panneau flottant déplaçable (logo + panneau)
│       ├── MemoryMenuContent.tsx   Contenu du menu mémoire (barre latérale / popup)
│       ├── MemoryTableView.tsx Liste des mémoires groupées par session
│       ├── ImportView.tsx     UI d'importation JSON
│       ├── ExportView.tsx     UI d'exportation JSON
│       ├── FavoritePromptsSection.tsx Prompts avec autocomplétion Trie
│       └── FolderView.tsx     Gestion des dossiers avec glisser-déposer
├── utils/
│   ├── chrome-storage.ts      Helpers chrome.storage.local partagés (charger/sauver/s'abonner)
│   ├── rag.ts                 Formatage des prompts RAG
│   ├── recall-button.ts       Création et injection du bouton Recall
│   ├── recall-helpers.ts      Utilitaires Recall partagés
│   ├── trie.ts                Structure de données Trie pour l'autocomplétion
│   ├── message-passing.ts     Passage de messages Chrome typé
│   └── onboarding-highlight.ts Helpers de mise en évidence des étapes d'onboarding
├── i18n/
│   ├── translations.ts        Carte de chaînes en 8 langues
│   ├── LanguageContext.tsx    Changement de langue (chrome.storage — sync entre onglets)
│   ├── ThemeContext.tsx       Thème sombre / clair (chrome.storage — sync entre onglets)
│   └── lang-storage.ts        Helpers de persistance de la langue
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

Voir [CHANGELOG.md](../CHANGELOG.md) pour l'historique complet des versions.

---

## Contributions et licence

Les PRs et Issues sont les bienvenues ! Veuillez ouvrir une Issue pour discuter des changements importants avant de soumettre une PR.

- Signaler des bugs : [ouvrir une Issue](../../issues)
- Demandes de fonctionnalités : [ouvrir une Issue](../../issues)

---

## License

[Apache 2.0](LICENSE)
