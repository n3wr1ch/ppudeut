# API 문서

뿌듯 앱의 주요 API 및 함수 레퍼런스입니다.

## 목차

- [todo-core.js](#todo-corejs) - 핵심 비즈니스 로직
- [security-utils.js](#security-utilsjs) - 보안 유틸리티
- [performance-utils.js](#performance-utilsjs) - 성능 최적화
- [ui-utils.js](#ui-utilsjs) - UI 유틸리티
- [accessibility.js](#accessibilityjs) - 접근성
- [backup-utils.js](#backup-utilsjs) - 백업/복원

---

## todo-core.js

순수 함수로 구현된 할 일 관리 핵심 로직입니다.

### addTodoList(todos, text, options)

새 할 일을 추가합니다.

**매개변수:**
- `todos` (Todo[]): 기존 할 일 목록
- `text` (string): 할 일 텍스트
- `options` (Object): 추가 옵션
  - `emoji` (string|null): 이모지

**반환값:**
- `Todo[]`: 새 할 일 목록

**예제:**
```javascript
const newTodos = addTodoList(todos, '프로젝트 완료하기', { emoji: '🎯' });
```

---

### toggleTodoById(todos, id)

할 일의 완료 상태를 토글합니다.

**매개변수:**
- `todos` (Todo[]): 할 일 목록
- `id` (number): 할 일 ID

**반환값:**
- `Todo[]`: 업데이트된 할 일 목록

**예제:**
```javascript
const updatedTodos = toggleTodoById(todos, 123456);
```

---

### deleteTodoById(todos, id)

할 일을 삭제합니다.

**매개변수:**
- `todos` (Todo[]): 할 일 목록
- `id` (number): 할 일 ID

**반환값:**
- `Todo[]`: 업데이트된 할 일 목록

---

### updateTodoText(todos, id, newText)

할 일 텍스트를 수정합니다.

**매개변수:**
- `todos` (Todo[]): 할 일 목록
- `id` (number): 할 일 ID
- `newText` (string): 새 텍스트

**반환값:**
- `Todo[]`: 업데이트된 할 일 목록

---

### togglePinById(todos, id)

할 일의 핀 고정 상태를 토글합니다.

**매개변수:**
- `todos` (Todo[]): 할 일 목록
- `id` (number): 할 일 ID

**반환값:**
- `Todo[]`: 업데이트된 할 일 목록

---

### clearCompleted(todos)

완료된 할 일을 모두 제거합니다.

**매개변수:**
- `todos` (Todo[]): 할 일 목록

**반환값:**
- `Todo[]`: 활성 할 일만 포함된 목록

---

### sortTodos(todos)

할 일을 정렬합니다 (핀 고정된 항목 우선).

**매개변수:**
- `todos` (Todo[]): 할 일 목록

**반환값:**
- `Todo[]`: 정렬된 할 일 목록

---

### getActiveCount(todos)

활성 할 일 개수를 반환합니다.

**매개변수:**
- `todos` (Todo[]): 할 일 목록

**반환값:**
- `number`: 활성 할 일 개수

---

### searchTodos(todos, query)

할 일을 검색합니다.

**매개변수:**
- `todos` (Todo[]): 할 일 목록
- `query` (string): 검색어

**반환값:**
- `Todo[]`: 검색 결과

**예제:**
```javascript
const results = searchTodos(todos, '프로젝트');
```

---

### filterTodos(todos, filter)

할 일을 필터링합니다.

**매개변수:**
- `todos` (Todo[]): 할 일 목록
- `filter` (string): 필터 타입 ('all' | 'active' | 'completed')

**반환값:**
- `Todo[]`: 필터링된 목록

---

### calculateXP(createdAt)

할 일 나이에 따라 XP를 계산합니다.

**매개변수:**
- `createdAt` (string): 생성 시간 (ISO 8601)

**반환값:**
- `number`: XP (5-15)

**규칙:**
- 1시간 이내: 15 XP (빠른 완료 보너스)
- 1-48시간: 10 XP (기본)
- 48시간 이후: 5 XP (오래된 할 일 페널티)

---

## security-utils.js

보안 관련 유틸리티 함수입니다.

### validateAndSanitizeInput(input, options)

사용자 입력을 검증하고 새니타이징합니다.

**매개변수:**
- `input` (string): 검증할 입력
- `options` (Object): 검증 옵션
  - `maxLength` (number): 최대 길이 (기본값: 200)
  - `minLength` (number): 최소 길이 (기본값: 0)
  - `allowHtml` (boolean): HTML 허용 여부 (기본값: false)
  - `allowNewlines` (boolean): 개행 허용 여부 (기본값: false)

**반환값:**
- `ValidationResult`: { valid, sanitized, error? }

**예제:**
```javascript
const result = validateAndSanitizeInput(userInput, { maxLength: 200 });
if (result.valid) {
    saveTodo(result.sanitized);
} else {
    showError(result.error);
}
```

---

### escapeHtml(text)

HTML 특수 문자를 이스케이프합니다.

**매개변수:**
- `text` (string): 이스케이프할 텍스트

**반환값:**
- `string`: 이스케이프된 텍스트

---

### safeLocalStorageSet(key, value, encrypt)

안전하게 localStorage에 저장합니다.

**매개변수:**
- `key` (string): 저장 키
- `value` (*): 저장할 값
- `encrypt` (boolean): 암호화 여부 (기본값: false)

**반환값:**
- `boolean`: 성공 여부

---

### safeLocalStorageGet(key, defaultValue, decrypt)

안전하게 localStorage에서 읽습니다.

**매개변수:**
- `key` (string): 읽을 키
- `defaultValue` (*): 기본값
- `decrypt` (boolean): 복호화 여부 (기본값: false)

**반환값:**
- `*`: 읽은 값 또는 기본값

---

### logError(context, error, metadata)

에러를 로깅합니다.

**매개변수:**
- `context` (string): 에러 발생 컨텍스트
- `error` (Error): 에러 객체
- `metadata` (Object): 추가 메타데이터

**예제:**
```javascript
try {
    saveTodo(todo);
} catch (error) {
    logError('saveTodo', error, { todoId: todo.id });
}
```

---

### showUserMessage(message, type)

사용자에게 메시지를 표시합니다.

**매개변수:**
- `message` (string): 표시할 메시지
- `type` (string): 메시지 타입 ('error' | 'warning' | 'info')

---

## performance-utils.js

성능 최적화 유틸리티입니다.

### debounce(func, wait)

함수 호출을 지연시킵니다.

**매개변수:**
- `func` (Function): 실행할 함수
- `wait` (number): 대기 시간 (ms, 기본값: 300)

**반환값:**
- `Function`: debounced 함수

**예제:**
```javascript
const debouncedSearch = debounce((query) => {
    search(query);
}, 500);

input.addEventListener('input', (e) => {
    debouncedSearch(e.target.value);
});
```

---

### throttle(func, limit)

일정 시간마다만 함수를 실행합니다.

**매개변수:**
- `func` (Function): 실행할 함수
- `limit` (number): 제한 시간 (ms, 기본값: 300)

**반환값:**
- `Function`: throttled 함수

---

### rafThrottle(callback)

requestAnimationFrame을 사용한 최적화된 렌더링.

**매개변수:**
- `callback` (Function): 렌더링 콜백

**반환값:**
- `Function`: 최적화된 함수

**예제:**
```javascript
this.renderThrottled = rafThrottle(() => this.render());
```

---

### BatchUpdateQueue

여러 업데이트를 모아서 한 번에 처리합니다.

**생성자:**
```javascript
new BatchUpdateQueue(updateFn, delay)
```

**메서드:**
- `add(item)`: 아이템 추가
- `flush()`: 즉시 실행
- `clear()`: 큐 초기화

**예제:**
```javascript
const queue = new BatchUpdateQueue((items) => {
    render(items);
}, 16);

queue.add(todo1);
queue.add(todo2);
// 16ms 후 자동으로 render([todo1, todo2]) 실행
```

---

## ui-utils.js

UI 관련 유틸리티입니다.

### ModalManager

모달 관리 클래스입니다.

**생성자:**
```javascript
new ModalManager(modalId)
```

**메서드:**
- `open(onCloseCallback)`: 모달 열기
- `close()`: 모달 닫기
- `toggle()`: 모달 토글
- `setContent(content)`: 모달 내용 설정

**예제:**
```javascript
const modal = new ModalManager('myModal');
modal.open(() => {
    console.log('모달이 닫혔습니다');
});
```

---

### showToast(message, options)

토스트 메시지를 표시합니다.

**매개변수:**
- `message` (string): 메시지
- `options` (Object): 옵션
  - `type` (string): 타입 ('success' | 'error' | 'warning' | 'info')
  - `duration` (number): 표시 시간 (ms, 기본값: 3000)
  - `position` (string): 위치 ('top' | 'bottom')

**예제:**
```javascript
showToast('저장되었습니다!', { type: 'success' });
```

---

### AnimationUtils

애니메이션 유틸리티 클래스입니다.

**메서드:**
- `fadeIn(element, duration)`: 페이드 인
- `fadeOut(element, duration)`: 페이드 아웃
- `slideDown(element, duration)`: 슬라이드 다운
- `pulse(element, count)`: 펄스 효과

**예제:**
```javascript
AnimationUtils.fadeIn(element, 300);
AnimationUtils.pulse(button, 2);
```

---

### DOMUtils

DOM 조작 유틸리티 클래스입니다.

**메서드:**
- `createElement(tag, attributes, children)`: 엘리먼트 생성
- `smoothScroll(element, options)`: 스무스 스크롤
- `isInViewport(element)`: 뷰포트 확인

**예제:**
```javascript
const button = DOMUtils.createElement('button', {
    className: 'btn',
    onClick: handleClick
}, '클릭');
```

---

## accessibility.js

접근성 관련 유틸리티입니다.

### KeyboardShortcutManager

키보드 단축키 관리 클래스입니다.

**생성자:**
```javascript
new KeyboardShortcutManager()
```

**메서드:**
- `register(key, handler, description)`: 단축키 등록
- `unregister(key)`: 단축키 해제
- `enable()`: 활성화
- `disable()`: 비활성화
- `getShortcuts()`: 등록된 단축키 목록

**예제:**
```javascript
const shortcuts = new KeyboardShortcutManager();
shortcuts.register('ctrl+s', () => {
    save();
}, '저장');
shortcuts.enable();
```

---

### AccessibilityHelper

접근성 헬퍼 클래스입니다.

**메서드:**
- `trapFocus(container)`: 포커스 트랩
- `announce(message, priority)`: 스크린 리더 공지
- `makeListNavigable(listElement, options)`: 리스트 네비게이션
- `checkColorContrast(foreground, background)`: 색상 대비 확인

**예제:**
```javascript
// 스크린 리더 공지
AccessibilityHelper.announce('할 일이 추가되었습니다.');

// 색상 대비 확인
const result = AccessibilityHelper.checkColorContrast('#000000', '#ffffff');
console.log(result); // { ratio: 21, wcagAA: true, wcagAAA: true }
```

---

## backup-utils.js

백업 및 복원 유틸리티입니다.

### BackupManager

백업 관리 클래스입니다.

**생성자:**
```javascript
new BackupManager()
```

**메서드:**
- `createBackup()`: 백업 생성
- `exportToFile()`: JSON 파일로 내보내기
- `importFromFile(file)`: JSON 파일에서 가져오기 (Promise)
- `restore(backup)`: 백업 복원
- `validateBackup(backup)`: 백업 유효성 검증
- `setupAutoBackup(intervalDays)`: 자동 백업 설정
- `getAutoBackup()`: 자동 백업 가져오기

**예제:**
```javascript
const backupManager = new BackupManager();

// 백업 내보내기
backupManager.exportToFile();

// 백업 가져오기
const file = document.getElementById('fileInput').files[0];
const backup = await backupManager.importFromFile(file);
backupManager.restore(backup);

// 자동 백업 설정 (7일마다)
backupManager.setupAutoBackup(7);
```

---

### SearchFilterManager

검색 및 필터 관리 클래스입니다.

**생성자:**
```javascript
new SearchFilterManager()
```

**메서드:**
- `setFilter(filter)`: 필터 설정
- `setSearch(query)`: 검색어 설정
- `apply(todos)`: 필터/검색 적용
- `reset()`: 초기화

**예제:**
```javascript
const searchFilter = new SearchFilterManager();
searchFilter.setFilter('active');
searchFilter.setSearch('프로젝트');
const filtered = searchFilter.apply(todos);
```

---

## 타입 정의

### Todo

```typescript
interface Todo {
    id: number;
    text: string;
    completed: boolean;
    createdAt: string; // ISO 8601
    emoji: string | null;
    pinned?: boolean;
}
```

### Profile

```typescript
interface Profile {
    level: number;
    xp: number;
    totalXP: number;
    streak: number;
    maxStreak: number;
    lastCompletedDate: string | null;
    totalCompleted: number;
    achievements: string[];
    earlyBird: boolean;
    nightOwl: boolean;
    maxDailyCompleted: number;
    dailyCompleted: number;
    dailyDate: string | null;
}
```

### Settings

```typescript
interface Settings {
    theme: string;
    soundEnabled: boolean;
    notificationEnabled: boolean;
    opacity: number;
    alwaysOnTop: boolean;
    minimalMode: boolean;
}
```

---

## 이벤트

앱에서 발생하는 주요 이벤트입니다.

### 커스텀 이벤트 (향후 추가 예정)

```javascript
// 할 일 추가 이벤트
window.dispatchEvent(new CustomEvent('todo:added', { detail: { todo } }));

// 레벨업 이벤트
window.dispatchEvent(new CustomEvent('profile:levelup', { detail: { level } }));

// 업적 달성 이벤트
window.dispatchEvent(new CustomEvent('achievement:unlocked', { detail: { achievement } }));
```

---

## 문의

API 문서에 대한 질문이나 제안은 GitHub Issues로 부탁드립니다.
