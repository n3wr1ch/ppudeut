# 기여 가이드 (Contributing Guide)

뿌듯(Ppudeut) 프로젝트에 기여해주셔서 감사합니다! 🎉

이 문서는 프로젝트에 기여하는 방법을 안내합니다.

## 목차

- [행동 강령](#행동-강령)
- [시작하기](#시작하기)
- [개발 워크플로우](#개발-워크플로우)
- [코드 스타일](#코드-스타일)
- [커밋 메시지](#커밋-메시지)
- [Pull Request](#pull-request)
- [이슈 리포팅](#이슈-리포팅)

---

## 행동 강령

이 프로젝트는 모든 기여자가 존중받는 환경을 유지하기 위해 노력합니다.

- 존중과 배려를 바탕으로 소통해주세요
- 건설적인 피드백을 제공해주세요
- 다양한 의견과 경험을 존중해주세요

---

## 시작하기

### 1. 저장소 Fork

GitHub에서 프로젝트를 Fork하세요.

### 2. 로컬에 클론

```bash
git clone https://github.com/YOUR-USERNAME/ppudeut.git
cd ppudeut
```

### 3. 의존성 설치

```bash
npm install
```

### 4. 개발 서버 실행

```bash
npm run tauri dev
```

---

## 개발 워크플로우

### 브랜치 전략

- `main`: 안정 버전
- `feature/*`: 새 기능 개발
- `fix/*`: 버그 수정
- `docs/*`: 문서 수정
- `refactor/*`: 리팩토링

### 브랜치 생성 예시

```bash
# 새 기능
git checkout -b feature/add-search-functionality

# 버그 수정
git checkout -b fix/resolve-todo-deletion-bug

# 문서 수정
git checkout -b docs/update-readme
```

---

## 코드 스타일

### JavaScript

1. **ESLint 규칙 준수**
   ```bash
   npm run lint
   ```

2. **JSDoc 주석 작성**
   ```javascript
   /**
    * 할 일 추가
    * @param {Todo[]} todos - 기존 할 일 목록
    * @param {string} text - 할 일 텍스트
    * @param {Object} [options] - 추가 옵션
    * @returns {Todo[]} - 새 할 일 목록
    */
   export function addTodoList(todos, text, options = {}) {
       // 구현...
   }
   ```

3. **순수 함수 우선**
   - 비즈니스 로직은 `todo-core.js`에 순수 함수로 작성
   - 부수 효과는 `main.js`에서 관리

4. **명명 규칙**
   - 변수/함수: `camelCase`
   - 클래스: `PascalCase`
   - 상수: `UPPER_SNAKE_CASE`
   - 파일: `kebab-case.js`

### CSS

1. **CSS Variables 사용**
   ```css
   .my-element {
       color: var(--mac-text-primary);
       background: var(--mac-bg-glass);
   }
   ```

2. **BEM 네이밍 (권장)**
   ```css
   .block {}
   .block__element {}
   .block--modifier {}
   ```

3. **반응형 디자인**
   ```css
   @media (max-width: 360px) {
       /* 모바일 스타일 */
   }
   ```

### 접근성

1. **ARIA 속성 추가**
   ```html
   <button aria-label="할 일 삭제" aria-expanded="false">
       ×
   </button>
   ```

2. **키보드 네비게이션**
   - 모든 인터랙티브 요소는 키보드로 접근 가능해야 합니다
   - `tabindex`를 적절히 사용하세요

3. **의미론적 HTML**
   ```html
   <main role="main">
       <section aria-label="할 일 목록">
           <ul role="list">
               <!-- 항목들 -->
           </ul>
       </section>
   </main>
   ```

---

## 커밋 메시지

### 형식

```
<type>: <subject>

<body (선택)>

<footer (선택)>
```

### 타입 (Type)

- `feat`: 새 기능
- `fix`: 버그 수정
- `docs`: 문서 변경
- `style`: 코드 포맷팅 (기능 변경 없음)
- `refactor`: 리팩토링
- `test`: 테스트 추가/수정
- `chore`: 빌드 프로세스, 의존성 업데이트 등

### 예시

```
feat: 할 일 검색 기능 추가

사용자가 할 일을 텍스트로 검색할 수 있는 기능을 추가했습니다.
- 검색 입력창 UI 추가
- searchTodos 함수 구현
- 대소문자 구분 없이 검색 가능

Closes #123
```

```
fix: 투명도 0% 버그 수정

투명도를 0%로 설정해도 배경이 완전히 투명해지지 않는 문제를 수정했습니다.
- 슬라이더 최소값을 30에서 0으로 변경
- 매우 낮은 투명도일 때 배경 효과 제거

Fixes #456
```

---

## Pull Request

### PR 생성 전 체크리스트

- [ ] 코드가 ESLint 규칙을 통과하는가?
- [ ] 모든 함수에 JSDoc 주석이 있는가?
- [ ] 테스트가 통과하는가? (`npm test`)
- [ ] 접근성 고려했는가? (ARIA, 키보드)
- [ ] 문서를 업데이트했는가? (필요 시)

### PR 템플릿

```markdown
## 변경 사항

<!-- 무엇을 변경했는지 설명 -->

## 변경 이유

<!-- 왜 이 변경이 필요한지 설명 -->

## 테스트 방법

<!-- 이 변경사항을 어떻게 테스트할 수 있는지 설명 -->

## 스크린샷 (있는 경우)

<!-- UI 변경이 있다면 스크린샷 첨부 -->

## 체크리스트

- [ ] ESLint 통과
- [ ] 테스트 통과
- [ ] JSDoc 주석 추가
- [ ] 접근성 고려
- [ ] 문서 업데이트
```

### 리뷰 프로세스

1. PR 생성 후 리뷰 요청
2. 리뷰어의 피드백 확인
3. 필요한 수정 사항 반영
4. 승인 후 main 브랜치에 병합

---

## 이슈 리포팅

### 버그 리포트

```markdown
**버그 설명**
<!-- 버그에 대한 명확하고 간결한 설명 -->

**재현 방법**
1. '...'로 이동
2. '...' 클릭
3. '...' 입력
4. 오류 발생

**예상 동작**
<!-- 어떻게 동작해야 하는지 설명 -->

**실제 동작**
<!-- 실제로 어떻게 동작하는지 설명 -->

**스크린샷**
<!-- 있다면 첨부 -->

**환경**
- OS: [예: macOS 13.0]
- 앱 버전: [예: 1.0.0]
- Node 버전: [예: 18.0.0]
```

### 기능 제안

```markdown
**기능 설명**
<!-- 제안하는 기능에 대한 명확한 설명 -->

**왜 필요한가?**
<!-- 이 기능이 왜 유용한지 설명 -->

**대안**
<!-- 고려한 다른 방법이 있다면 설명 -->

**추가 컨텍스트**
<!-- 기타 정보 -->
```

---

## 개발 팁

### 디버깅

```javascript
// 콘솔 로깅
console.log('Todo added:', todo);

// 에러 로깅 (security-utils.js)
logError('addTodo', error, { todo });
```

### 테스트 추가

`web/test-todo-core.js`에 테스트 추가:

```javascript
// 테스트 N: 새 기능 테스트
console.log('✓ 테스트 N: 새 기능');
const result = myNewFunction(input);
assert.strictEqual(result, expected);
```

### 성능 측정

```javascript
console.time('render');
this.render();
console.timeEnd('render');
```

---

## 질문이 있으신가요?

- GitHub Issues를 통해 질문해주세요
- 또는 이메일로 연락주세요

---

**다시 한 번 기여해주셔서 감사합니다! 🙏**
