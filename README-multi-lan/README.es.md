<div align="center">

# Personal AI Memory

**Tus conversaciones, recordadas. Privadamente.**

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Manifest V3](https://img.shields.io/badge/Chrome-Manifest%20V3-green.svg)](https://developer.chrome.com/docs/extensions/mv3/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

🌐 [English](README.en.md) | [繁體中文](README.zh-TW.md) | [简体中文](README.zh-CN.md) | [日本語](README.ja.md) | [한국어](README.ko.md) | [Français](README.fr.md) | [Deutsch](README.de.md) | [Volver al inicio](README.md)


<a href="https://www.producthunt.com/products/personal-ai-memory?embed=true&amp;utm_source=badge-featured&amp;utm_medium=badge&amp;utm_campaign=badge-personal-ai-memory" target="_blank" rel="noopener noreferrer"><img alt="Personal AI Memory - Captures and stores your chat from various AI platforms | Product Hunt" width="250" height="54" src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1089387&amp;theme=light&amp;t=1772644496610"></a>
</div>

---

> Una extensión de Chrome que **captura silenciosamente** tus conversaciones de ChatGPT / Claude / Gemini / Perplexity y las almacena como memorias semánticas privadas e indexadas localmente — con un botón **Recall** de un clic para inyectar contexto relevante en nuevos chats.
>
> **100% local. Sin nube. Sin servidor. Sin cuenta requerida.**


---

## Instalación

### Para usuarios — Chrome Web Store

Instala directamente desde la [Chrome Web Store](https://chrome.google.com/webstore/detail/cjkjgbddkaoogdbfffiooeppnmbplpnh).

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
| **Captura pasiva** | Intercepta automáticamente ChatGPT / Claude / Gemini — sin configuración, sin clics |
| **Búsqueda híbrida** | Vectorial (decaimiento temporal) + BM25, fusionados con RRF para mejores resultados |
| **Recall con un clic** | Inyecta memorias relevantes como prompt RAG en ChatGPT y Claude |
| **Copia de seguridad local** | Exporta / importa copia completa como JSON (con embeddings incluidos) |
| **Prompts favoritos** | Guarda, autocompletado (Trie), organiza en carpetas con drag-and-drop |
| **Panel flotante** | Panel de memoria arrastrable en cada sitio de IA |
| **8 idiomas de UI** | zh-TW · zh-CN · en · ja · ko · es · fr · de — detección automática |
| **Tema oscuro / claro** | Toggle estilo Apple Liquid Glass |

**Plataformas compatibles:** ChatGPT (`chat.openai.com` / `chatgpt.com`) · Gemini (`gemini.google.com`) · Claude (`claude.ai`)

---

# ¿Cómo exportar el historial de chat de ChatGPT/Gemini?

## Pasos para exportar el historial de chat de ChatGPT

1. Inicia sesión en tu cuenta de ChatGPT y ve a la pantalla principal.
2. Haz clic en tu "Foto de perfil" o "Nombre" en la esquina para abrir el menú.
3. Selecciona "Settings" (Configuración).
4. Ve a la pestaña "Data controls" (Controles de datos).
5. Encuentra la opción "Export data" (Exportar datos) y haz clic en "Export" (Exportar).
6. Aparecerá una ventana de confirmación; haz clic en "Confirm export" (Confirmar exportación).
7. Recibirás un correo electrónico que contiene un enlace de descarga en tu dirección de correo electrónico registrada (Nota: Puede tardar hasta 24 horas en recibir el correo de exportación después de solicitarlo).
8. Haz clic en el enlace del correo electrónico para descargar el archivo ZIP. Después de extraerlo, el archivo que contiene tu historial de chat será `conversations-00x.json`.

## Pasos para exportar el historial de chat de Gemini

La exportación de datos completos para Gemini está integrada a través del servicio Google Takeout.

1. Inicia sesión en tu cuenta de Google y navega al sitio web de [Google Takeout](https://takeout.google.com).
2. Haz clic en "Desmarcar todo" en la parte superior de la página para borrar todos los servicios de Google predeterminados.
3. Desplázate hacia abajo en la lista, busca y marca "Mi actividad" (My Activity) (Nota: No selecciones ~~Gemini Apps~~).
4. Haz clic en el botón "Varios formatos" debajo de esa sección.
5. En la ventana de configuración que aparece, cambia el formato del primer registro de actividad de "HTML" a "JSON" y haz clic en Aceptar.
6. Desplázate hasta el final de la página y haz clic en "Siguiente paso".
7. Elige tu método de entrega (por ejemplo, Enviar enlace de descarga por correo electrónico), mantén el tipo de archivo y el tamaño máximo predeterminados, y haz clic en "Crear exportación".
8. Espera a que el sistema termine de procesar y recibirás un correo electrónico con el enlace de descarga. Después de extraer el archivo, el registro exportado será `my activity.json`.
---

## Cómo funciona

```
Chateas en ChatGPT / Claude / Gemini
        │  (la extensión captura silenciosamente en segundo plano)
        ▼
Memorias almacenadas localmente en IndexedDB
+ vector de embedding semántico (ONNX, se ejecuta en el navegador)
+ índice de palabras clave (MiniSearch / BM25, en memoria del Service Worker)
        │
        │  Más tarde — inicias un nuevo chat
        ▼
Haces clic en 🧠 Recall junto al input de ChatGPT / Claude
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
│   └── adapters/
│       ├── chatgpt.ts         Parser SSE delta-v1 de ChatGPT
│       ├── claude.ts          Parser SSE de Claude
│       └── gemini.ts          Parser XHR StreamGenerate de Gemini
├── contents/
│   ├── interceptor.ts         Puente ISOLATED-world + MutationObserver <title>
│   ├── memory-float-ui.tsx    Punto de entrada del content script del panel flotante
│   └── chatgpt-injector.tsx   Inyección del botón Recall + ensamblaje del prompt RAG
├── tabs/
│   └── offscreen.tsx          Inferencia ONNX (Offscreen Document — requiere DOM)
├── popup/
│   ├── index.tsx              Raíz del Popup — navegación por panel deslizante
│   └── components/
│       ├── MainMenuView.tsx   Menú principal + sección de Prompts favoritos
│       ├── MemoryTableView.tsx Lista de memorias agrupadas por sesión
│       ├── ImportView.tsx     UI de importación JSON
│       ├── ExportView.tsx     UI de exportación JSON
│       ├── FavoritePromptsSection.tsx Prompts con autocompletado Trie
│       └── FolderView.tsx     Gestión de carpetas con drag-and-drop
├── ui/memory-panel/
│   └── FloatingMemoryPanel.tsx Panel flotante arrastrable (logo + panel)
├── i18n/
│   ├── translations.ts        Mapa de cadenas en 8 idiomas
│   ├── LanguageContext.tsx    Cambio de idioma (localStorage)
│   └── ThemeContext.tsx       Tema oscuro / claro (localStorage)
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

### v0.0.3 — 2026-03-02
- **Nuevo:** Soporte para Perplexity (`perplexity.ai`) — las conversaciones se capturan silenciosamente mientras navegas. Nota: Perplexity no admite exportación de datos, por lo que cada conversación debe abrirse individualmente para ser recopilada.

### v0.0.2 — 2026-03-01
- **Nuevo:** Soporte completo para Claude web (`claude.ai`) — captura de conversaciones, inyección del botón Recall y panel flotante de memoria ahora funcionan en Claude

### v0.0.1 — Lanzamiento inicial
- Captura de conversaciones de ChatGPT y Gemini
- Búsqueda híbrida vector + BM25 con fusión RRF
- Botón Recall con un clic (ChatGPT)
- Prompts favoritos con autocompletado Trie y carpetas drag-and-drop
- Exportación / importación de copia de seguridad JSON
- Panel flotante de memoria
- 8 idiomas de UI, tema oscuro / claro

---

## Contribuciones y licencia

¡Se aceptan PRs e Issues! Por favor, abre un Issue para discutir cambios significativos antes de enviar un PR.

- Reportar bugs: [abrir un Issue](../../issues)
- Solicitudes de funciones: [abrir un Issue](../../issues)

---

## License

[Apache 2.0](LICENSE)