# 뿌듯(Ppudeut) 코드 감사 리포트

**감사 일자:** 2025-11-30  
**감사 범위:** 전체 프론트엔드 코드 (web/) 및 Tauri 백엔드 (src-tauri/)

---

## 요약 (Executive Summary)

| 영역 | 심각도 | 발견된 이슈 수 |
|------|--------|---------------|
| 보안 | 🔴 높음 | 3개 |
| 버그 가능성 | 🟠 중간 | 2개 |
| 성능 | 🟡 낮음 | 3개 |
| 구조/유지보수 | 🟠 중간 | 4개 |
| 테스트 | 🟠 중간 | 3개 |

**전체 평가:** 기본적인 보안 조치는 되어있으나, 몇 가지 심각한 문제가 있음. 특히 XSS 취약점과 암호화 방식은 즉시 수정 필요.

---

## 1. 보안 감사 (Security Audit)

### 1.1 🔴 [심각] innerHTML을 통한 잠재적 XSS 취약점

**위치:** `web/main.js:622`, `web/main.js:1218`

**문제:**
```javascript
// main.js:622 - 이모지 피커
grid.innerHTML = EMOJIS.map(emoji => 
    `<button class="emoji-option" data-emoji="${emoji}">${emoji}</button>`
).join('');

// main.js:1218 - 업적 목록
achievementsList.innerHTML = ACHIEVEMENTS.map(a => {
    const unlocked = this.profile.achievements.includes(a.id);
    return `
        <div class="achievement-item ${unlocked ? '' : 'locked'}">
            <span class="icon">${a.icon}</span>
            <div class="info">
                <div class="name">${a.name}</div>
                <div class="desc">${a.desc}</div>
            </div>
        </div>
    `;
}).join('');
```

**분석:**
- `EMOJIS`와 `ACHIEVEMENTS`는 **코드에 하드코딩된 상수**이므로 현재는 안전함
- 그러나 이 패턴은 위험함: 만약 나중에 이 값들이 사용자 입력이나 외부 소스에서 오게 되면 XSS 공격에 노출됨
- `escapeHtml` 함수가 있지만 여기서 사용하지 않음

**권장 조치:**
1. `document.createElement` + `textContent` 패턴으로 변경
2. 또는 템플릿에 `escapeHtml()` 적용

**예시 수정:**
```javascript
// 안전한 방식
ACHIEVEMENTS.forEach(a => {
    const div = document.createElement('div');
    div.className = `achievement-item ${unlocked ? '' : 'locked'}`;
    
    const icon = document.createElement('span');
    icon.className = 'icon';
    icon.textContent = a.icon; // textContent는 자동으로 이스케이프
    
    // ... 나머지 요소들
    achievementsList.appendChild(div);
});
```

---

### 1.2 🔴 [심각] 암호화 방식의 보안 무의미성

**위치:** `web/security-utils.js:98-146`

**문제:**
```javascript
const CIPHER_KEY = 'ppudeut-secret-key-2025'; // 하드코딩된 키

export function simpleEncrypt(text, key = CIPHER_KEY) {
    // XOR 암호화
    encrypted[i] = textBytes[i] ^ keyBytes[i % keyBytes.length];
    return btoa(String.fromCharCode(...encrypted));
}
```

**분석:**
1. **키가 소스코드에 하드코딩됨** - 누구나 소스를 보면 키를 알 수 있음
2. **XOR 암호화는 암호학적으로 안전하지 않음** - 특히 짧은 키가 반복되면 쉽게 깨짐
3. **Base64는 암호화가 아님** - 단순 인코딩일 뿐
4. 현재 이 함수는 실제로 **사용되지 않음** (`encrypt = false`로만 호출됨)

**위험도:** 현재는 사용되지 않아 실질적 위험은 없으나, 이 함수의 존재 자체가 "암호화된다"는 잘못된 안심감을 줄 수 있음.

**권장 조치:**
1. **삭제하거나 명확히 "난독화(obfuscation)"라고 명시**
2. 진짜 암호화가 필요하면 Web Crypto API 사용:
```javascript
// 진짜 암호화가 필요한 경우
async function realEncrypt(text, password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    
    const key = await crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt: crypto.getRandomValues(new Uint8Array(16)), iterations: 100000, hash: 'SHA-256' },
        await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveKey']),
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt']
    );
    // ... AES-GCM 암호화
}
```

---

### 1.3 🟠 [중간] 민감 데이터의 평문 저장

**위치:** `web/main.js:246-297`

**문제:**
```javascript
// 모든 데이터가 localStorage에 평문으로 저장됨
safeLocalStorageSet('todo-profile', this.profile, false); // encrypt = false
safeLocalStorageSet('todo-settings', this.settings, false);
safeLocalStorageSet('todos', this.todos, false);
```

**분석:**
- 할 일 목록, 프로필(레벨, XP, 업적), 설정이 평문으로 저장됨
- 동일 브라우저의 다른 탭이나 확장 프로그램에서 접근 가능
- Tauri 앱이므로 시스템의 다른 앱에서도 접근 가능할 수 있음

**위험도:** 이 앱의 특성상 민감 정보(비밀번호 등)가 없으므로 **실질적 위험은 낮음**. 하지만 할 일 내용이 개인적일 수 있음.

**권장 조치:** 현재 수준으로 충분. 단, 사용자가 민감한 할 일을 저장할 수 있으므로 문서에 명시 권장.

---

## 2. 버그 가능성 분석

### 2.1 🟠 [중간] Todo ID 충돌 가능성

**위치:** 
- `web/main.js:652` - `id: Date.now()`
- `web/todo-core.js:24` - `id: Date.now() + Math.random()`
- `web/main.js:311` - `todo.id = Date.now() + Math.random()`

**문제:**
```javascript
// main.js - Math.random() 없이 Date.now()만 사용
const todo = {
    id: Date.now(),  // ⚠️ 1ms 내 여러 호출 시 충돌!
    text: validation.sanitized,
    // ...
};

// todo-core.js - Math.random() 추가됨
id: Date.now() + Math.random(), // 조금 나음
```

**분석:**
1. `main.js:652`의 `addTodo()`는 `Math.random()` 없이 `Date.now()`만 사용
2. `todo-core.js`는 `Math.random()`을 더함
3. **일관성 없음**: 같은 앱에서 두 가지 다른 ID 생성 방식 사용
4. `Math.random()`도 암호학적으로 안전하지 않음

**재현 시나리오:**
```javascript
// 빠르게 두 번 추가하면 같은 ID 가능
addTodo('할 일 1');
addTodo('할 일 2'); // 같은 밀리초에 실행되면 ID 충돌!
```

**권장 조치:**
```javascript
// crypto.randomUUID() 사용 (가장 안전)
const todo = {
    id: crypto.randomUUID(),
    // ...
};

// 또는 충돌 방지 카운터 추가
let idCounter = 0;
function generateId() {
    return `${Date.now()}-${++idCounter}-${Math.random().toString(36).substr(2, 9)}`;
}
```

---

### 2.2 🟡 [낮음] toggleTodo 로직 버그

**위치:** `web/main.js:671-687`

**문제:**
```javascript
toggleTodo(id) {
    const todo = this.todos.find(t => t.id === id);
    if (!todo) return;

    const wasCompleted = todo.completed;
    
    // todo-core 함수로 토글
    this.todos = toggleTodoById(this.todos, id);
    this.saveTodos();

    // ⚠️ 버그: wasCompleted가 true이고 토글 후 false가 되면?
    if (!wasCompleted && !todo.completed) {  // 둘 다 false일 때만
        this.onTodoComplete(todo);
    }
    // ...
}
```

**분석:**
- `toggleTodoById`는 **새 배열**을 반환함 (불변성 유지)
- 그런데 `todo` 변수는 **이전 배열의 객체**를 참조
- `todo.completed`는 변경되지 않음!
- 따라서 `!wasCompleted && !todo.completed`는 "완료되지 않은 상태에서 완료되지 않은 상태"를 체크하게 됨

**실제 동작:** 조건이 항상 `wasCompleted`가 `false`일 때만 참이 되므로, 우연히 의도대로 동작하지만 **로직이 잘못됨**.

**권장 수정:**
```javascript
toggleTodo(id) {
    const todo = this.todos.find(t => t.id === id);
    if (!todo) return;

    const wasCompleted = todo.completed;
    this.todos = toggleTodoById(this.todos, id);
    this.saveTodos();

    // 수정: 새 배열에서 todo를 다시 찾거나, wasCompleted 기반으로 판단
    if (!wasCompleted) {
        // 완료되지 않은 상태에서 토글 = 완료됨
        const updatedTodo = this.todos.find(t => t.id === id);
        if (updatedTodo?.completed) {
            this.onTodoComplete(updatedTodo);
        }
    }
    this.render();
}
```

---

## 3. 성능 감사 (Performance Audit)

### 3.1 🟡 [낮음] 전체 리스트 재렌더링

**위치:** `web/main.js:1233-1267`

**문제:**
```javascript
render() {
    // 매번 전체 리스트를 innerHTML = ''로 비우고 다시 생성
    todoList.innerHTML = '';
    todoList.appendChild(fragment);
}
```

**분석:**
- 할 일이 100개 있으면, 하나만 체크해도 100개 모두 다시 생성
- 각 요소에 이벤트 리스너가 6-7개씩 붙음 (dragstart, dragover, dragleave, drop, dragend, dblclick, keydown, click, change)
- 현재 규모에서는 문제없으나, 할 일이 많아지면 느려질 수 있음

**이미 있는 해결책 (미사용):**
```javascript
// performance-utils.js에 이미 있음!
export function updateListIncremental(container, oldItems, newItems, createElementFn, getKeyFn)
```

**권장 조치:**
```javascript
// 기존 updateListIncremental 활용
render() {
    const newTodos = this.todos;
    updateListIncremental(
        todoList,
        this.lastTodosSnapshot,
        newTodos,
        (todo) => this.createTodoElement(todo),
        (todo) => todo.id
    );
    this.lastTodosSnapshot = [...newTodos];
}
```

---

### 3.2 🟡 [낮음] createTodoElement 내 과다한 이벤트 리스너

**위치:** `web/main.js:1269-1407`

**문제:**
```javascript
createTodoElement(todo) {
    // 요소 하나당 최소 7개의 이벤트 리스너 등록
    li.addEventListener('dragstart', ...);
    li.addEventListener('dragover', ...);
    li.addEventListener('dragleave', ...);
    li.addEventListener('drop', ...);
    li.addEventListener('dragend', ...);
    span.addEventListener('dblclick', ...);
    li.addEventListener('keydown', ...);
    checkbox.addEventListener('change', ...);
    del.addEventListener('click', ...);
    li.addEventListener('click', ...);
    pinBtn.addEventListener('click', ...);
    pomodoroBtn?.addEventListener('click', ...);
}
```

**분석:**
- 할 일 50개 = 최소 350개의 이벤트 리스너
- 렌더링할 때마다 모두 새로 생성 (기존 것은 GC 대기)
- 이벤트 위임(Event Delegation) 미사용

**권장 조치:**
```javascript
// 이벤트 위임 패턴 사용
bindEvents() {
    const todoList = document.getElementById('todoList');
    
    // 한 번만 등록, 모든 할 일에 적용
    todoList.addEventListener('click', (e) => {
        const li = e.target.closest('.todo-item');
        if (!li) return;
        const id = Number(li.dataset.id);
        
        if (e.target.classList.contains('delete-btn')) {
            this.deleteTodo(id);
        } else if (e.target.classList.contains('pin-btn')) {
            this.togglePin(id);
        } else if (e.target.classList.contains('todo-checkbox')) {
            // checkbox는 change 이벤트 필요
        } else {
            this.toggleTodo(id);
        }
    });
}
```

---

### 3.3 🟡 [낮음] rafThrottle 미활용

**위치:** `web/main.js:105`

**문제:**
```javascript
this.renderThrottled = rafThrottle(() => this.render());
// 하지만 실제로는 this.render()를 직접 호출함
```

**분석:**
- `rafThrottle`로 감싼 `renderThrottled`가 있지만 사용되지 않음
- 모든 곳에서 `this.render()`를 직접 호출

**권장 조치:** `render()` 호출을 `renderThrottled()`로 교체

---

## 4. 구조/유지보수 감사

### 4.1 🟠 [중간] main.js 과대 크기

**현황:**
```
main.js:         1,441줄  (39%)  ⚠️ 너무 큼
todo-core.js:      210줄  (6%)
security-utils.js: 263줄  (7%)
performance-utils.js: 439줄 (12%)
ui-utils.js:       412줄  (11%)
accessibility.js:  374줄  (10%)
backup-utils.js:   313줄  (9%)
sound-manager.js:  103줄  (3%)
confetti-manager.js: 126줄 (3%)
-----------------------------------
총계:            3,681줄
```

**분석:**
- `main.js`가 전체의 39%를 차지
- 하나의 클래스(`TodoManager`)에 30개 이상의 메서드
- 역할이 너무 많음: UI, 상태 관리, 게임화(레벨/XP/업적), 뽀모도로, 드래그앤드롭...

**권장 분리:**

| 새 모듈 | 추출할 기능 | 예상 크기 |
|---------|------------|----------|
| `profile-manager.js` | 레벨, XP, 스트릭, 업적 | ~150줄 |
| `pomodoro-manager.js` | 뽀모도로 타이머 전체 | ~120줄 |
| `settings-manager.js` | 설정 로드/저장, 테마, 투명도 | ~100줄 |
| `drag-drop-manager.js` | 드래그 앤 드롭 핸들러 | ~80줄 |
| `todo-renderer.js` | createTodoElement, render | ~200줄 |

---

### 4.2 🟡 [낮음] 이벤트 리스너 정리 메커니즘 미사용

**위치:** `web/main.js:113`, `web/performance-utils.js:27`

**문제:**
```javascript
// main.js - 배열은 있지만 비어있음
this.eventCleanupFunctions = [];

// performance-utils.js - 좋은 유틸이 있지만 사용 안 함
export function addTrackedEventListener(element, eventType, handler, options)
```

**분석:**
- `addTrackedEventListener` 같은 유틸이 있지만 `main.js`에서 사용하지 않음
- `destroy()` 메서드가 있지만 호출되는 곳이 없음
- 현재는 단일 페이지라 문제없으나, 모달이나 동적 컴포넌트 추가 시 메모리 누수 가능

---

### 4.3 🟡 [낮음] 상수 중복 정의

**위치:** `web/main.js:52-80`

**문제:**
```javascript
// main.js에 하드코딩된 상수들
const EMOJIS = ['📝', '🎯', ...];
const MOTIVATIONAL_QUOTES = [...];
const ACHIEVEMENTS = [...];
const LEVEL_XP = [0, 100, 250, ...];
```

**권장 조치:**
```javascript
// constants.js로 분리
export const EMOJIS = [...];
export const MOTIVATIONAL_QUOTES = [...];
export const ACHIEVEMENTS = [...];
export const LEVEL_XP = [...];
```

---

### 4.4 🟡 [낮음] JSDoc 타입 불완전

**위치:** `web/types.js`

**현황:**
- `types.js`가 있지만 일부 타입만 정의됨
- `Profile`, `Settings` 타입이 정의되어 있지 않음
- 함수 매개변수/반환값 타입이 불완전한 곳 있음

---

## 5. 테스트 감사

### 5.1 🟠 [중간] 테스트 커버리지 부족

**현황:**
- `test-todo-core.js`: 13개 테스트 (순수 로직만)
- `main.js` (UI/상태): 테스트 **0개**
- `security-utils.js`: 테스트 **0개**
- 기타 유틸리티: 테스트 **0개**

**누락된 테스트:**

| 영역 | 필요한 테스트 | 우선순위 |
|------|-------------|---------|
| security-utils | `validateAndSanitizeInput` 엣지 케이스 | 높음 |
| security-utils | XSS 패턴 차단 검증 | 높음 |
| main.js | 스트릭 계산 로직 | 중간 |
| main.js | 레벨업 XP 계산 | 중간 |
| backup-utils | 백업/복원 무결성 | 중간 |

---

### 5.2 🟡 [낮음] 테스트 프레임워크 미사용

**현황:**
```javascript
// 직접 구현한 간이 테스트
import assert from 'assert';
function runTests() {
    console.log('✓ 테스트 1: 할 일 추가');
    // ...
}
```

**분석:**
- Node.js 내장 `assert`만 사용
- 테스트 격리, 모킹, 커버리지 측정 불가
- CI에서 실패 시 디버깅 어려움

**권장 조치:** Vitest 또는 Jest 도입
```javascript
// vitest 예시
import { describe, it, expect } from 'vitest';
import { addTodoList } from './todo-core.js';

describe('addTodoList', () => {
    it('빈 텍스트는 추가하지 않음', () => {
        const result = addTodoList([], '');
        expect(result).toHaveLength(0);
    });
    
    it('200자 초과 텍스트는 추가하지 않음', () => {
        const longText = 'a'.repeat(201);
        const result = addTodoList([], longText);
        expect(result).toHaveLength(0);
    });
});
```

---

### 5.3 🟡 [낮음] 엣지 케이스 테스트 부족

**현재 테스트되지 않는 케이스:**
- 200자 경계값 (199, 200, 201자)
- 특수문자만 있는 입력 (`<script>`, `javascript:`)
- 빈 배열에서의 동작
- 존재하지 않는 ID로 조작 시도
- localStorage 용량 초과 시

---

## 6. 권장 조치 우선순위

### 즉시 수정 (1주 이내)

| # | 이슈 | 위치 | 수정 난이도 |
|---|------|------|-----------|
| 1 | ID 생성 충돌 가능성 | main.js:652 | 쉬움 |
| 2 | toggleTodo 로직 버그 | main.js:671-687 | 쉬움 |
| 3 | innerHTML → createElement | main.js:622, 1218 | 중간 |

### 단기 개선 (1개월 이내)

| # | 이슈 | 작업 |
|---|------|------|
| 4 | 암호화 함수 정리 | 삭제하거나 명확히 "난독화"로 표시 |
| 5 | main.js 분리 | profile-manager, pomodoro-manager 추출 |
| 6 | 테스트 추가 | security-utils, 스트릭/레벨 로직 |

### 장기 개선 (3개월 이내)

| # | 이슈 | 작업 |
|---|------|------|
| 7 | 렌더링 최적화 | updateListIncremental 활용 |
| 8 | 이벤트 위임 | 개별 리스너 → 위임 패턴 |
| 9 | 테스트 프레임워크 | Vitest 도입 + 커버리지 측정 |
| 10 | TypeScript 점진적 도입 | todo-core.ts부터 시작 |

---

## 부록: 파일별 책임 분석

```
web/
├── main.js           # ⚠️ 과부하 - UI + 상태 + 게임화 + 뽀모도로 + 설정
├── todo-core.js      # ✅ 좋음 - 순수 함수, 테스트됨
├── security-utils.js # 🟡 보통 - 사용되지 않는 암호화 함수 있음
├── performance-utils.js # 🟡 보통 - 좋은 유틸이나 미사용 많음
├── ui-utils.js       # ✅ 좋음 - 모달, 토스트 등
├── accessibility.js  # ✅ 좋음 - 키보드 단축키, 접근성
├── backup-utils.js   # ✅ 좋음 - 백업/복원
├── sound-manager.js  # ✅ 좋음 - 분리됨
├── confetti-manager.js # ✅ 좋음 - 분리됨
└── test-todo-core.js # 🟡 보통 - 기본 테스트만

src-tauri/
├── src/main.rs       # ✅ 좋음 - 최소한의 코드
└── tauri.conf.json   # ✅ 좋음 - 적절한 CSP
```

---

**작성자:** Claude (AI Code Auditor)  
**검토 방법:** 정적 분석, 코드 리뷰, 패턴 분석
