<div align="center">

# Personal AI Memory

**당신의 대화, 비공개로 기억됩니다.**

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Manifest V3](https://img.shields.io/badge/Chrome-Manifest%20V3-green.svg)](https://developer.chrome.com/docs/extensions/mv3/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

🌐 [English](README.en.md) | [繁體中文](README.zh-TW.md) | [简体中文](README.zh-CN.md) | [日本語](README.ja.md) | [Español](README.es.md) | [Français](README.fr.md) | [Deutsch](README.de.md) | [홈으로](README.md)

</div>

---

> ChatGPT / Claude / Gemini 대화를 **자동으로 캡처**하여 브라우저 로컬에 시맨틱 벡터로 저장하는 Chrome 확장 프로그램 — 원클릭 **Recall** 버튼으로 관련 과거 기억을 새 대화에 주입합니다.
>
> **100% 로컬. 클라우드 없음. 서버 없음. 계정 불필요.**

---

## 설치

### 일반 사용자 — Release에서 로드

> _Chrome Web Store 등록 예정입니다._

그 전까지는 수동으로 설치하세요:

1. [Releases](../../releases) 페이지에서 최신 `.zip` 파일 다운로드
2. 압축 해제
3. Chrome → `chrome://extensions/` 열기
4. 우측 상단 **개발자 모드** 활성화
5. **압축해제된 확장 프로그램 로드** 클릭 → 압축 해제된 폴더 선택

### 개발자 — 소스코드에서 빌드

**요구 사항:** Node.js 18+, pnpm (`npm install -g pnpm`), Chrome / Edge (MV3)

```bash
git clone <repository-url>
cd AI_Memory
pnpm install

# 개발 모드 — 저장 시 자동 리빌드
pnpm dev
```

`chrome://extensions/`에서 **압축해제된 확장 프로그램 로드**로 `build/chrome-mv3-dev/`를 선택하세요.

```bash
# 프로덕션 빌드
pnpm build
# 출력: build/chrome-mv3-prod/
```

> 코드 수정 후: `chrome://extensions/`에서 AI Memory의 **새로고침**을 클릭하고, 열려 있는 AI 탭을 새로고침(F5)하세요.

---

## 주요 기능

| 기능 | 설명 |
|------|------|
| **수동 캡처** | ChatGPT / Claude / Gemini 대화를 자동으로 가로채 수동 조작 없이 저장 |
| **하이브리드 검색** | 시맨틱 벡터 검색(시간 감쇠) × BM25 키워드 검색, RRF 융합 |
| **원클릭 리콜** | ChatGPT 입력창 옆 Recall 버튼 클릭으로 관련 기억을 RAG 프롬프트로 주입 |
| **로컬 백업** | 전체 백업을 JSON으로 내보내기 / 가져오기(임베딩 벡터 포함) |
| **즐겨찾기 프롬프트** | Trie 자동완성, 폴더 관리, 드래그 앤 드롭 지원 |
| **플로팅 패널** | 모든 AI 사이트의 드래그 가능한 메모리 패널 |
| **8개 UI 언어** | zh-TW · zh-CN · en · ja · ko · es · fr · de — 자동 감지 |
| **다크 / 라이트 테마** | Apple Liquid Glass 스타일 전환 |

**지원 플랫폼:** ChatGPT(`chat.openai.com` / `chatgpt.com`) · Gemini(`gemini.google.com`) · Claude — _개발 중_
---

# ChatGPT/Gemini 채팅 기록을 내보내는 방법

## ChatGPT 채팅 기록 내보내기 단계

1. ChatGPT 계정에 로그인하고 메인 화면으로 이동합니다.
2. 화면 모서리에 있는 '프로필 사진' 또는 '이름'을 클릭하여 메뉴를 엽니다.
3. 'Settings'(설정)를 선택합니다.
4. 'Data controls'(데이터 제어) 탭으로 이동합니다.
5. 'Export data'(데이터 내보내기) 옵션을 찾아 'Export'(내보내기)를 클릭합니다.
6. 확인 창이 나타나면 'Confirm export'(내보내기 확인)를 클릭합니다.
7. 등록된 이메일 주소로 다운로드 링크가 포함된 이메일이 전송됩니다. (참고: 요청 후 내보내기 이메일을 받기까지 최대 24시간이 걸릴 수 있습니다.)
8. 이메일의 링크를 클릭하여 ZIP 파일을 다운로드합니다. 압축을 풀면 대화 기록이 포함된 파일은 `conversations-00x.json`입니다.


## Gemini 채팅 기록 내보내기 단계

Gemini의 전체 데이터 내보내기는 Google Takeout(Google 데이터 다운로드) 서비스를 통해 통합됩니다.

1. Google 계정에 로그인하고 [Google Takeout](https://takeout.google.com) 웹사이트로 이동합니다.
2. 페이지 상단의 '모두 선택 해제'를 클릭하여 기본 Google 서비스를 모두 지웁니다.
3. 목록을 아래로 스크롤하여 '내 활동'(My Activity)을 찾아 선택합니다. (참고: ~~Gemini Apps~~는 선택하지 않습니다.)
4. 해당 섹션 아래의 '여러 형식' 버튼을 클릭합니다.
5. 나타나는 설정 창에서 첫 번째 활동 기록의 형식을 'HTML'에서 'JSON'으로 변경하고 확인을 클릭합니다.
6. 페이지 맨 아래로 스크롤하여 '다음 단계'를 클릭합니다.
7. 전송 방법(예: 이메일을 통해 다운로드 링크 전송)을 선택하고, 기본 파일 형식과 최대 크기를 유지한 후 '내보내기 생성'을 클릭합니다.
8. 시스템 처리가 완료되고 다운로드 링크 이메일이 올 때까지 기다립니다. 다운로드 후 압축을 풀면 내보낸 기록 파일은 `my activity.json`이 됩니다.
---

## 작동 원리

```
ChatGPT / Claude / Gemini에서 대화
        │  (확장 프로그램이 백그라운드에서 자동 캡처)
        ▼
로컬 IndexedDB에 기억 저장
+ 시맨틱 임베딩 벡터 (ONNX, 브라우저에서 실행)
+ 키워드 인덱스 (MiniSearch / BM25, Service Worker 메모리)
        │
        │  나중에 — 새 대화 시작
        ▼
ChatGPT 입력창 옆 🧠 Recall 클릭
        │
        ▼
하이브리드 검색:
  경로 A — 벡터 유사도 × 시간 감쇠 (최근 = 높은 가중치)
  경로 B — BM25 키워드 검색 (접두사 매칭)
  융합   — Reciprocal Rank Fusion (RRF)
        │
        ▼
상위 k개 기억이 RAG 컨텍스트로 입력창에 주입됨
AI가 이제 당신의 대화 이력을 배경 지식으로 활용
```

### 검색 알고리즘 (상세)

```
경로 A — 벡터 검색 + 시간 감쇠
  쿼리 텍스트 → Float32Array 벡터 (ONNX, Offscreen Document)
  각 레코드: dot_product(q, r.embedding) × exp(-0.01 × 경과 일수)
  parentId로 그룹화 → 각 그룹의 최고 감쇠 점수 유지
  내림차순 정렬 → vectorRanked[]
  (반감기 ≈ 69일, λ = 0.01)

경로 B — 키워드 검색 (MiniSearch / BM25)
  miniSearch.search(query, { prefix: true })
  접두사 매칭: "py" → "python", "react" → "reactivity"
  BM25 점수 정렬 → kwRanked[]

융합 — Reciprocal Rank Fusion (RRF, k = 60)
  rrfScore[key] += 1 / (60 + rank)  각 목록에 적용
  두 목록 합산 → 내림차순 → top-k → 청크 병합 → SearchResult[]
```

**폴백:** 임베딩 실패 시 키워드 결과만 반환; 키워드 매칭 없을 시 벡터 결과만 반환.

---

## 개인정보 보호 및 보안

이 확장 프로그램은 AI 대화를 가로챕니다. 정확히 무엇을 하고 하지 않는지 명시합니다:

| 질문 | 답변 |
|------|------|
| 데이터는 어디에 저장되나요? | **브라우저 로컬 IndexedDB**(`AIMemoryDB`)만 — 기기를 절대 벗어나지 않음 |
| 네트워크 요청을 보내나요? | **단 한 번** — 최초 실행 시 ONNX 임베딩 모델 다운로드. 대화 데이터는 절대 업로드되지 않음. |
| 웹사이트에서 내 기억을 볼 수 있나요? | 아니요. 데이터는 확장 프로그램 스토리지에 격리되어 페이지 스크립트가 접근 불가. |
| 데이터를 삭제할 수 있나요? | 가능 — 플로팅 패널에서 개별 레코드 소프트 삭제, 또는 DevTools → IndexedDB에서 전체 삭제. |

> **이 확장 프로그램을 로컬 일기장처럼 취급하세요.** 지원 AI 사이트에서 입력하고 받는 모든 내용을 볼 수 있습니다. 우려가 있으면 소스 코드를 검토하세요.

---

## 기술 스택

| 레이어 | 기술 |
|--------|------|
| 프레임워크 | [Plasmo](https://docs.plasmo.com) (Chrome MV3) |
| UI | React 18 + 커스텀 Theme Token |
| 영속성 | IndexedDB via [Dexie](https://dexie.org) |
| 벡터 검색 | [Transformers.js](https://xenova.github.io/transformers.js/) ONNX — `paraphrase-multilingual-MiniLM-L12-v2` |
| 키워드 검색 | [MiniSearch](https://github.com/lucaong/minisearch) (BM25, 인메모리) |
| 언어 | TypeScript |

<details>
<summary><strong>📂 프로젝트 구조</strong></summary>

```
src/
├── background/
│   ├── index.ts               메시지 라우터 · 캡처 핸들러 · MiniSearch 동기화
│   ├── search.ts              하이브리드 검색 엔진 (벡터×감쇠 + BM25 + RRF)
│   ├── db.ts                  IndexedDB (Dexie) 작업
│   ├── embedding.ts           ONNX 모델명 / 버전 상수
│   ├── injector.ts            MAIN-world fetch/XHR 인터셉터 (페이지에 주입)
│   └── adapters/
│       ├── chatgpt.ts         ChatGPT SSE delta-v1 파서
│       ├── claude.ts          Claude SSE 파서
│       └── gemini.ts          Gemini XHR StreamGenerate 파서
├── contents/
│   ├── interceptor.ts         ISOLATED-world 브릿지 + <title> MutationObserver
│   ├── memory-float-ui.tsx    플로팅 패널 content script 진입점
│   └── chatgpt-injector.tsx   Recall 버튼 주입 + RAG 프롬프트 조립
├── tabs/
│   └── offscreen.tsx          ONNX 추론 (Offscreen Document)
├── popup/
│   ├── index.tsx              Popup 루트 — 슬라이딩 패널 네비게이션
│   └── components/
│       ├── MainMenuView.tsx   메인 메뉴 + 즐겨찾기 프롬프트 섹션
│       ├── MemoryTableView.tsx 세션별 그룹화된 메모리 목록
│       ├── ImportView.tsx     JSON 가져오기 UI
│       ├── ExportView.tsx     JSON 내보내기 UI
│       ├── FavoritePromptsSection.tsx Trie 자동완성 프롬프트
│       └── FolderView.tsx     드래그 앤 드롭 폴더 관리
├── ui/memory-panel/
│   └── FloatingMemoryPanel.tsx 드래그 가능한 플로팅 패널 (로고 + 패널)
├── i18n/
│   ├── translations.ts        8개 언어 문자열 맵
│   ├── LanguageContext.tsx    언어 전환 (localStorage)
│   └── ThemeContext.tsx       다크 / 라이트 테마 (localStorage)
└── types/
    ├── memory.ts              MemoryRecord · SearchResult 인터페이스
    └── messages.ts            모든 Chrome 메시지 타입 정의
```

</details>

---

## 디버깅 및 테스트

| 대상 | 방법 |
|------|------|
| Background Service Worker | `chrome://extensions/` → AI Memory → **Service worker** |
| Popup | 확장 아이콘 우클릭 → **팝업 검사** |
| Content scripts | DevTools → Sources → Content scripts |
| IndexedDB | DevTools → Application → Storage → IndexedDB → `AIMemoryDB` |
| 수동 검색 테스트 | Service Worker 콘솔: `testSearch('키워드', 5)` |

```bash
pnpm test              # 단위 테스트 (Vitest)
pnpm test:integration  # 통합 테스트
pnpm test:e2e          # E2E 테스트 (Playwright — 빌드 필요)
```


---

## 기여 및 라이선스

PR과 Issue를 환영합니다! 큰 변경 사항은 PR 제출 전에 Issue를 열어 논의해 주세요.

- 버그 신고: [Issue 열기](../../issues)
- 기능 요청: [Issue 열기](../../issues)

---

## License

[MIT](LICENSE)
