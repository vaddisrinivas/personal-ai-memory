<div align="center">

# Personal AI Memory

**Tus conversaciones, recordadas. Privadamente.**

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Chrome Web Store](https://img.shields.io/chrome-web-store/v/cjkjgbddkaoogdbfffiooeppnmbplpnh?label=Chrome%20Web%20Store)](https://chromewebstore.google.com/detail/personal-ai-memory-local/cjkjgbddkaoogdbfffiooeppnmbplpnh)
[![Manifest V3](https://img.shields.io/badge/Chrome-Manifest%20V3-green.svg)](https://developer.chrome.com/docs/extensions/mv3/)
[![ChatGPT](https://img.shields.io/badge/ChatGPT-supported-74aa9c?logo=openai&logoColor=white)](https://chatgpt.com)
[![Claude](https://img.shields.io/badge/Claude-supported-d97757?logo=anthropic&logoColor=white)](https://claude.ai)
[![Gemini](https://img.shields.io/badge/Gemini-supported-4285F4?logo=google&logoColor=white)](https://gemini.google.com)
[![Perplexity](https://img.shields.io/badge/Perplexity-supported-20808D?logo=perplexity&logoColor=white)](https://perplexity.ai)
[![Grok](https://img.shields.io/badge/Grok-supported-000000?logo=x&logoColor=white)](https://grok.com)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

🌐 [English](README.en.md) | [繁體中文](README.zh-TW.md) | [简体中文](README.zh-CN.md) | [日本語](README.ja.md) | [한국어](README.ko.md) | [Français](README.fr.md) | [Deutsch](README.de.md) | [Volver al inicio](../README.md)


<a href="https://www.producthunt.com/products/personal-ai-memory?embed=true&amp;utm_source=badge-featured&amp;utm_medium=badge&amp;utm_campaign=badge-personal-ai-memory" target="_blank" rel="noopener noreferrer"><img alt="Personal AI Memory - Captures and stores your chat from various AI platforms | Product Hunt" width="250" height="54" src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1089387&amp;theme=light&amp;t=1772644496610"></a>
</div>

---

> Una extensión de Chrome que **captura silenciosamente** tus conversaciones de ChatGPT / Claude / Gemini / Perplexity / Grok y las almacena como memorias semánticas privadas e indexadas localmente — con un botón **Recall** de un clic para inyectar contexto relevante en nuevos chats.
>
> **100% local. Sin nube. Sin servidor. Sin cuenta requerida.**


---

## Instalación

### Para usuarios — Chrome Web Store

Instala directamente desde la [Chrome Web Store](https://chromewebstore.google.com/detail/personal-ai-memory-local/cjkjgbddkaoogdbfffiooeppnmbplpnh).

> **Nota:** La versión de Chrome Web Store puede ir por detrás del último lanzamiento. Para las funciones más recientes, descarga el último `.zip` desde la página de [Releases](../../releases) e instálalo manualmente (ver pasos abajo).

### Instalación manual desde Release

1. Ve a la página de [Releases](../../releases) y descarga el último `.zip`
2. Descomprime el archivo
3. Abre Chrome → `chrome://extensions/`
4. Activa el **Modo desarrollador** (arriba a la derecha)
5. Haz clic en **Cargar descomprimida** → selecciona la carpeta descomprimida

### Para desarrolladores — Compilar desde el código fuente

**Requisitos:** Node.js 18+, pnpm (`npm install -g pnpm`), Chrome / Edge (MV3)

```bash
# Haz un fork de este repositorio en tu propia cuenta de GitHub
git clone https://github.com/<your-github-username>/personal-ai-memory.git
cd personal-ai-memory
pnpm install

# Modo desarrollo — recompila automáticamente al guardar
pnpm dev
```

Luego carga `build/chrome-mv3-dev/` mediante **Cargar descomprimida** en `chrome://extensions/`.

```bash
# Compilación de producción
pnpm build
# salida: build/chrome-mv3-prod/
```

> Tras cualquier cambio de código: haz clic en **Recargar** en la tarjeta AI Memory y luego actualiza las pestañas de IA abiertas.

---

## Funciones de un vistazo

| Función | Detalles |
|---------|----------|
| **Captura pasiva** | Intercepta automáticamente ChatGPT / Claude / Gemini / Perplexity / Grok — sin configuración, sin clics. Solo visita la página y las conversaciones existentes se capturan automáticamente. |
| **Búsqueda híbrida** | Vectorial (decaimiento temporal) + BM25, fusionados con RRF para mejores resultados |
| **Recall con un clic** | Inyecta memorias relevantes como prompt RAG en todas las plataformas compatibles |
| **Copia de seguridad local** | Exporta / importa copia completa como JSON (con embeddings incluidos) |
| **Prompts favoritos** | Guarda, autocompletado (Trie), organiza en carpetas con drag-and-drop |
| **Panel flotante** | Panel de memoria arrastrable en cada sitio de IA |
| **8 idiomas de UI** | zh-TW · zh-CN · en · ja · ko · es · fr · de — detección automática |
| **Tema oscuro / claro** | Toggle estilo Apple Liquid Glass |

**Plataformas compatibles:** ChatGPT (`chat.openai.com` / `chatgpt.com`) · Gemini (`gemini.google.com`) · Claude (`claude.ai`) · Perplexity (`perplexity.ai`) · Grok (`grok.com`)

---

## ¿Cómo exportar el historial de chat?

### ChatGPT

1. Inicia sesión en tu cuenta de ChatGPT y ve a la pantalla principal.
2. Haz clic en tu "Foto de perfil" o "Nombre" en la esquina para abrir el menú.
3. Selecciona **Settings** (Configuración).
4. Ve a la pestaña **Data controls** (Controles de datos).
5. Encuentra **Export data** y haz clic en **Export**.
6. Haz clic en **Confirm export** en la ventana de confirmación.
7. Recibirás un correo electrónico con un enlace de descarga (puede tardar hasta 24 horas).
8. Descarga el archivo ZIP. Después de extraerlo, el historial de chat es `conversations-00x.json`.

### Gemini

Exportar vía Google Takeout:

1. Ve a [Google Takeout](https://takeout.google.com) e inicia sesión.
2. Haz clic en **Desmarcar todo** en la parte superior.
3. Desplázate hacia abajo y marca **Mi actividad** (My Activity) (NO ~~Gemini Apps~~).
4. Haz clic en el botón **Varios formatos**.
5. Cambia el formato del primer registro de **HTML** a **JSON**, haz clic en Aceptar.
6. Haz clic en **Siguiente paso** → elige método de entrega → **Crear exportación**.
7. Espera el correo. Después de extraer, el archivo es `my activity.json`.

### Claude

1. Ve a [https://claude.ai/settings/data-privacy-controls](https://claude.ai/settings/data-privacy-controls).
2. Haz clic en **Export data**.
3. Espera el correo electrónico con el enlace de descarga.
4. Después de extraer, el historial de chat es `conversations.json`.

### Perplexity

> Perplexity **no** admite exportación de datos de usuario. Cada conversación debe visitarse individualmente para ser capturada por la extensión.

### Grok

1. Ve a [https://grok.com](https://grok.com).
2. Haz clic en tu foto de perfil (abajo a la izquierda) → **Settings** → **Data controls**.
3. Haz clic en **Export Account Data**.
4. Espera varias horas para recibir el correo con el enlace de descarga.
5. Después de extraer, el archivo es `prod-grok-backend.json`.

---

## Cómo funciona

```
Chateas en ChatGPT / Claude / Gemini / Perplexity / Grok
        │  (la extensión captura silenciosamente en segundo plano)
        ▼
Memorias almacenadas localmente en IndexedDB
+ vector de embedding semántico (ONNX, se ejecuta en el navegador)
+ índice de palabras clave (MiniSearch / BM25, en memoria del Service Worker)
        │
        │  Más tarde — inicias un nuevo chat
        ▼
Haces clic en 🧠 Recall junto al campo de entrada en cualquier plataforma compatible
        │
        ▼
Búsqueda híbrida:
  Ruta A — similitud vectorial × decaimiento temporal (reciente = mayor peso)
  Ruta B — búsqueda por palabras clave BM25 (coincidencia de prefijos)
  Fusión  — Reciprocal Rank Fusion (RRF)
        │
        ▼
Las top-k memorias se inyectan como contexto RAG en el input
La IA ahora tiene tu historial como conocimiento de fondo
```

### Algoritmo de búsqueda (detalle)

```
Ruta A — Búsqueda vectorial + Decaimiento temporal
  consulta → Float32Array embedding (ONNX, Offscreen Document)
  por cada registro: dot_product(q, r.embedding) × exp(-0.01 × díasAntigüedad)
  agrupar por parentId → mantener puntuación máxima por grupo
  ordenar descendente → vectorRanked[]
  (semivida ≈ 69 días, λ = 0.01)

Ruta B — Búsqueda por palabras clave (MiniSearch / BM25)
  miniSearch.search(query, { prefix: true })
  coincidencia de prefijos: "py" encuentra "python", "react" encuentra "reactivity"
  ordenar por puntuación BM25 → kwRanked[]

Fusión — Reciprocal Rank Fusion (RRF, k = 60)
  rrfScore[key] += 1 / (60 + rank)  para cada lista
  sumar ambas listas → ordenar desc → top-k → combinar chunks → SearchResult[]
```

**Fallback:** si el embedding falla, se devuelven solo resultados de palabras clave; si no hay coincidencias de palabras clave, se devuelven solo resultados vectoriales.

---

## Privacidad y seguridad

Esta extensión intercepta tus conversaciones de IA. Esto es exactamente lo que hace y no hace:

| Pregunta | Respuesta |
|----------|-----------|
| ¿Dónde se almacenan los datos? | **Solo en IndexedDB local del navegador** (`AIMemoryDB`) — nunca sale de tu dispositivo |
| ¿Hace solicitudes de red? | **Solo una vez** — para descargar el modelo ONNX en la primera ejecución. Los datos de conversación nunca se suben. |
| ¿Pueden los sitios web ver mis memorias? | No. Los datos están aislados en el almacenamiento de la extensión, inaccesible para los scripts de página. |
| ¿Puedo eliminar mis datos? | Sí — eliminación suave de registros individuales desde el panel flotante, o borrado completo via DevTools → IndexedDB. |

> **Trata esta extensión como un diario local.** Ve todo lo que escribes y recibes en los sitios de IA compatibles. Revisa el código fuente si tienes dudas.

---

## Stack tecnológico

| Capa | Tecnología |
|------|------------|
| Framework de extensión | [Plasmo](https://docs.plasmo.com) (Chrome MV3) |
| UI | React 18 + Theme Tokens personalizados |
| Persistencia | IndexedDB via [Dexie](https://dexie.org) |
| Búsqueda vectorial | [Transformers.js](https://xenova.github.io/transformers.js/) ONNX — `paraphrase-multilingual-MiniLM-L12-v2` |
| Búsqueda por palabras clave | [MiniSearch](https://github.com/lucaong/minisearch) (BM25, en memoria) |
| Lenguaje | TypeScript |

<details>
<summary><strong>📂 Estructura del proyecto</strong></summary>

```
src/
├── background/
│   ├── index.ts               Enrutador de mensajes · manejador de captura · sincronización MiniSearch
│   ├── search.ts              Motor de búsqueda híbrida (vector×decay + BM25 + RRF)
│   ├── db.ts                  Operaciones IndexedDB (Dexie)
│   ├── embedding.ts           Constantes de nombre / versión del modelo ONNX
│   ├── injector.ts            Interceptor fetch/XHR MAIN-world (inyectado en la página)
│   ├── chunking.ts            Fragmentación de texto (segmentos 500 chars, solapamiento 75)
│   ├── domSync.ts             Sincronización de conversaciones basada en DOM
│   ├── offscreen.ts           Manejador de mensajes del Offscreen document
│   ├── perplexityBgFetch.ts  Ayuda de fetch en segundo plano para Perplexity
│   ├── syncEmbeddings.ts      Utilidades de sincronización de embeddings
│   └── adapters/
│       ├── chatgpt.ts         Parser SSE delta-v1 de ChatGPT
│       ├── claude.ts          Parser SSE de Claude
│       ├── gemini.ts          Parser XHR StreamGenerate de Gemini + captura pasiva
│       ├── perplexity.ts      Parser SSE de Perplexity
│       └── grok.ts            Parser SSE de Grok
├── contents/
│   ├── interceptor.ts         Puente ISOLATED-world + MutationObserver <title>
│   ├── memory-float-ui.tsx    Punto de entrada del content script del panel flotante
│   ├── chatgpt-injector.tsx   Botón Recall ChatGPT + prompt RAG
│   ├── claude-injector.tsx    Botón Recall Claude
│   ├── gemini-injector.tsx    Captura pasiva Gemini + botón Recall
│   ├── grok-injector.tsx      Botón Recall Grok
│   └── perplexity-injector.tsx Botón Recall Perplexity
├── importers/
│   ├── base.ts                Interfaz base del importador
│   ├── chatgptConversations.ts Importador JSON ChatGPT
│   ├── claudeConversations.ts  Importador JSON Claude
│   ├── geminiTakeout.ts       Importador Gemini Takeout
│   ├── grokConversations.ts   Importador JSON Grok
│   └── index.ts               Registro de importadores
├── tabs/
│   └── offscreen.tsx          Inferencia ONNX (Offscreen Document — requiere DOM)
├── popup/
│   ├── index.tsx              Raíz del Popup — navegación por panel deslizante
│   └── components/
│       ├── FloatingMemoryPanel.tsx Panel flotante arrastrable (logo + panel)
│       ├── MemoryMenuContent.tsx   Contenido del menú de memoria (barra lateral / popup)
│       ├── MemoryTableView.tsx Lista de memorias agrupadas por sesión
│       ├── ImportView.tsx     UI de importación JSON
│       ├── ExportView.tsx     UI de exportación JSON
│       ├── FavoritePromptsSection.tsx Prompts con autocompletado Trie
│       └── FolderView.tsx     Gestión de carpetas con drag-and-drop
├── utils/
│   ├── chrome-storage.ts      Helpers chrome.storage.local compartidos (cargar/guardar/suscribir)
│   ├── rag.ts                 Formateo de prompts RAG
│   ├── recall-button.ts       Creación e inyección del botón Recall
│   ├── recall-helpers.ts      Utilidades Recall compartidas
│   ├── trie.ts                Estructura de datos Trie para autocompletado
│   ├── message-passing.ts     Paso de mensajes Chrome con tipos seguros
│   └── onboarding-highlight.ts Helpers de resaltado de pasos de onboarding
├── i18n/
│   ├── translations.ts        Mapa de cadenas en 8 idiomas
│   ├── LanguageContext.tsx    Cambio de idioma (chrome.storage — sincroniza entre pestañas)
│   ├── ThemeContext.tsx       Tema oscuro / claro (chrome.storage — sincroniza entre pestañas)
│   └── lang-storage.ts        Helpers de persistencia de idioma
└── types/
    ├── memory.ts              Interfaces MemoryRecord · SearchResult
    └── messages.ts            Todas las definiciones de tipos de mensajes Chrome
```

</details>

---

## Depuración y pruebas

| Objetivo | Cómo acceder |
|----------|-------------|
| Background Service Worker | `chrome://extensions/` → AI Memory → **Service worker** |
| Popup | Clic derecho en el icono de la extensión → **Inspeccionar popup** |
| Content scripts | DevTools → Sources → Content scripts |
| IndexedDB | DevTools → Application → Storage → IndexedDB → `AIMemoryDB` |
| Prueba de búsqueda manual | Consola del Service Worker: `testSearch('palabra', 5)` |

```bash
pnpm test              # Pruebas unitarias (Vitest)
pnpm test:integration  # Pruebas de integración
pnpm test:e2e          # Pruebas E2E (Playwright — ejecutar pnpm build primero)
```


---

## Historial de cambios

Consulta [CHANGELOG.md](../CHANGELOG.md) para el historial completo de versiones.

---

## Contribuciones y licencia

¡Se aceptan PRs e Issues! Por favor, abre un Issue para discutir cambios significativos antes de enviar un PR.

- Reportar bugs: [abrir un Issue](../../issues)
- Solicitudes de funciones: [abrir un Issue](../../issues)

---

## License

[Apache 2.0](LICENSE)
