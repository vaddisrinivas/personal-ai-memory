import type { LangCode } from './translations'
import {
  detectDefaultLang,
  loadLangFromChrome,
  readLangFromLocalStorage,
  writeLangToLocalStorage,
  LANG_STORAGE_KEY,
} from './lang-storage'

const RECALL_MESSAGES: Record<
  LangCode,
  {
    promptEmpty: string
    alreadyRecalled: string
  }
> = {
  'zh-TW': {
    promptEmpty: '[AI Memory] 請先輸入你的問題，再點擊 Recall。',
    alreadyRecalled:
      '[AI Memory] 已經注入過記憶。請先清空文字框，再輸入新的問題並重新點擊 Recall。',
  },
  'zh-CN': {
    promptEmpty: '[AI Memory] 请先输入你的问题，然后再点击 Recall。',
    alreadyRecalled:
      '[AI Memory] 已经注入过记忆。请先清空输入框，再输入新的问题并重新点击 Recall。',
  },
  en: {
    promptEmpty: '[AI Memory] Please type your question first, then click Recall.',
    alreadyRecalled:
      '[AI Memory] Memories already recalled. Clear the text and type your question again to recall fresh memories.',
  },
  ja: {
    promptEmpty: '[AI Memory] まず質問を入力してから、Recall をクリックしてください。',
    alreadyRecalled:
      '[AI Memory] すでにメモリが注入されています。入力欄をいったんクリアしてから、新しい質問を入力して再度 Recall をクリックしてください。',
  },
  ko: {
    promptEmpty: '[AI Memory] 먼저 질문을 입력한 뒤 Recall을 클릭해 주세요.',
    alreadyRecalled:
      '[AI Memory] 이미 메모리가 주입되었습니다. 입력창의 내용을 지운 뒤, 새 질문을 입력하고 다시 Recall을 클릭해 주세요.',
  },
  es: {
    promptEmpty: '[AI Memory] Escribe primero tu pregunta y luego haz clic en Recall.',
    alreadyRecalled:
      '[AI Memory] Las memorias ya se han inyectado. Borra el texto, escribe tu pregunta de nuevo y vuelve a hacer clic en Recall para obtener memorias frescas.',
  },
  fr: {
    promptEmpty: "[AI Memory] Saisissez d'abord votre question, puis cliquez sur Recall.",
    alreadyRecalled:
      "[AI Memory] Des souvenirs ont déjà été injectés. Effacez le texte, saisissez à nouveau votre question puis cliquez sur Recall pour rappeler de nouveaux souvenirs.",
  },
  de: {
    promptEmpty: "[AI Memory] Bitte gib zuerst deine Frage ein und klicke dann auf Recall.",
    alreadyRecalled:
      "[AI Memory] Erinnerungen wurden bereits eingefügt. Bitte lösche zuerst den Text, gib deine Frage erneut ein und klicke noch einmal auf Recall, um neue Erinnerungen abzurufen.",
  },
}

let cachedLang: LangCode | null = null

// Best-effort async bootstrap from chrome.storage.local so all contexts share one language
void (async () => {
  const fromChrome = await loadLangFromChrome()
  if (fromChrome) {
    cachedLang = fromChrome
    writeLangToLocalStorage(fromChrome)
  }
})()

// Keep cachedLang in sync when other contexts update chrome.storage.local
try {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'local') return
      const change = changes[LANG_STORAGE_KEY]
      const next = change?.newValue as LangCode | undefined
      if (!next || next === cachedLang) return
      cachedLang = next
      writeLangToLocalStorage(next)
    })
  }
} catch {
  // ignore
}

function detectLangForContentScript(): LangCode {
  if (cachedLang) return cachedLang

  const fromLocal = readLangFromLocalStorage()
  if (fromLocal && fromLocal in RECALL_MESSAGES) {
    cachedLang = fromLocal
    return fromLocal
  }

  const nav = typeof navigator !== 'undefined' ? navigator.language ?? '' : 'en'
  const fallback = detectDefaultLang(nav)
  cachedLang = fallback
  writeLangToLocalStorage(fallback)
  return fallback
}

export function getRecallMessagesForContentScript() {
  const lang = detectLangForContentScript()
  return RECALL_MESSAGES[lang] ?? RECALL_MESSAGES.en
}

