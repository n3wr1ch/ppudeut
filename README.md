# 뿌듯 (Ppudeut)

<div align="center">

![뿌듯 로고](app-icon.svg)

**게이미피케이션이 적용된 macOS 스타일 할 일 관리 앱**

Tauri와 웹 기술로 제작된 경량 데스크톱 애플리케이션

![Tauri](https://img.shields.io/badge/Tauri-1.x-blue) ![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-yellow) ![License](https://img.shields.io/badge/license-MIT-green)

[기능](#특징) • [설치](#설치) • [사용법](#사용법) • [키보드 단축키](#키보드-단축키) • [개발](#개발)

</div>

---

## ✨ 특징

### 🎯 핵심 기능
- ✅ **할 일 관리**: 추가, 완료, 편집, 삭제
- 🖱️ **드래그 앤 드롭**: 순서 변경
- ✏️ **인라인 편집**: 더블클릭으로 즉시 수정
- 📌 **핀 고정**: 중요한 할 일을 상단에 고정
- 💾 **자동 저장**: localStorage에 실시간 저장

### 🎮 게이미피케이션
- **⭐ 레벨 & XP 시스템**: 할 일 완료 시 경험치 획득
  - 빠른 완료 보너스 (1시간 이내 +50% XP)
  - 오래된 할 일 페널티 (48시간 이후 -50% XP)
- **🔥 스트릭**: 연속 달성 일수 추적 및 시각화
- **🏆 업적 시스템**: 12가지 업적 달성 가능
- **🎊 Confetti 애니메이션**: 할 일 완료 시 축하 효과
- **🎵 효과음**: Web Audio API 기반 사운드 피드백

### 🎨 감성 & 무드
- **🌈 6가지 테마 색상**: 기본, 핑크, 오렌지, 그린, 퍼플, 민트
- **😊 이모지 태그**: 할 일에 이모지 추가로 시각적 구분
- **💬 동기부여 명언**: 할 일이 없을 때 랜덤 명언 표시
- **🎼 효과음**: 완료, 레벨업, 업적 달성 시 사운드

### 🚀 스마트 기능
- **🍅 뽀모도로 타이머**: 25/15/5/45분 프리셋
- **⏰ 할 일 나이 표시**: 오래된 할 일을 시각적으로 강조
- **📊 통계 대시보드**: 완료 수, 최대 스트릭, 총 XP, 업적 현황
- **🎲 할 일 룰렛**: 랜덤으로 할 일 선택
- **💾 데이터 백업/복원**: JSON 형식으로 내보내기/가져오기
- **🔄 자동 백업**: 7일마다 자동으로 백업 생성

### 🛡️ 보안 & 성능
- **🔒 입력 검증**: XSS 방지 및 새니타이징
- **🚫 CSP 정책**: 강화된 Content Security Policy
- **⚡ 성능 최적화**: 
  - requestAnimationFrame 기반 렌더링
  - 배치 업데이트 큐
  - debounce/throttle 적용
- **💿 안전한 데이터 저장**: 에러 핸들링 및 복구 로직

### ♿ 접근성
- **⌨️ 키보드 단축키**: 모든 주요 기능에 단축키 지원
- **🎤 스크린 리더**: ARIA 레이블 및 Live Region 지원
- **🔍 포커스 관리**: 키보드 네비게이션 최적화
- **🎨 색상 대비**: WCAG 2.1 AA 준수

### 🎯 UI/UX
- **🍎 macOS 스타일**: 네이티브 느낌의 디자인
- **✨ 부드러운 애니메이션**: 60fps 목표 최적화
- **🌓 다크 모드**: 시스템 설정 자동 감지
- **📱 반응형**: 다양한 화면 크기 대응
- **👁️ 투명도 조절**: 0-100% 자유로운 조절
- **📍 항상 위**: Always on Top 기능
- **📐 미니멀 모드**: 타이틀바 더블클릭으로 전환

---

## 📥 설치

### 필수 요구사항

- [Node.js](https://nodejs.org/) v16 이상
- [Rust](https://rustup.rs/) 최신 안정 버전
- [Tauri CLI](https://tauri.app/v1/guides/getting-started/prerequisites)

### 설치 방법

```bash
# 저장소 클론
git clone https://github.com/n3wr1ch/ppudeut.git
cd ppudeut

# 의존성 설치
npm install

# 개발 모드 실행
npm run tauri dev

# 프로덕션 빌드
npm run tauri build
```

### 바이너리 다운로드

> 곧 제공 예정

---

## 📖 사용법

### 기본 조작

| 동작 | 방법 |
|------|------|
| 할 일 추가 | 입력창에 텍스트 입력 후 `Enter` |
| 완료 표시 | 할 일 항목 클릭 또는 체크박스 선택 |
| 편집 | 할 일 항목 더블클릭 (또는 `F2`) |
| 삭제 | 항목 우측 `×` 버튼 클릭 (또는 `Delete`) |
| 핀 고정 | 항목 좌측 📌 버튼 클릭 |
| 순서 변경 | 드래그 앤 드롭 |
| 뽀모도로 | 항목 우측 🍅 버튼 클릭 |
| 랜덤 선택 | 하단 🎲 버튼 클릭 |
| 완료 항목 삭제 | 하단 "완료 항목 삭제" 클릭 |

### ⌨️ 키보드 단축키

| 단축키 | 기능 |
|--------|------|
| `Ctrl+N` (macOS: `⌘N`) | 새 할 일 입력 |
| `Ctrl+,` (macOS: `⌘,`) | 설정 열기 |
| `Ctrl+Shift+D` | 완료된 항목 삭제 |
| `Ctrl+M` (macOS: `⌘M`) | 미니멀 모드 전환 |
| `F1` 또는 `Shift+/` | 도움말 표시 |
| `Enter` | 할 일 완료 토글 (포커스 시) |
| `F2` | 할 일 편집 (포커스 시) |
| `Delete` | 할 일 삭제 (포커스 시) |
| `↑` `↓` | 할 일 목록 네비게이션 |
| `Esc` | 모달/편집 취소 |

> 💡 **팁**: 콘솔(`F12`)에서 `showKeyboardHelp()`를 실행하면 전체 단축키 목록을 볼 수 있습니다.

### 💾 데이터 백업/복원

#### 백업 내보내기
1. 설정(⚙️) 열기
2. "데이터 관리" 섹션에서 "💾 백업 내보내기" 클릭
3. JSON 파일이 다운로드됩니다

#### 백업 가져오기
1. 설정(⚙️) 열기
2. "데이터 관리" 섹션에서 "📥 백업 가져오기" 클릭
3. 이전에 내보낸 JSON 파일 선택
4. 확인 후 복원 (현재 데이터는 덮어씌워짐)

> ⚠️ **주의**: 백업 가져오기는 현재 데이터를 완전히 대체합니다. 중요한 데이터는 먼저 백업하세요.

#### 자동 백업
- 앱은 7일마다 자동으로 백업을 생성합니다
- 자동 백업은 localStorage에 저장됩니다
- 수동 백업을 권장합니다

---

## 🏆 업적 목록

| 업적 | 아이콘 | 조건 |
|------|--------|------|
| 첫 걸음 | 🎉 | 첫 번째 할 일 완료 |
| 시작이 좋아 | 🌟 | 10개 할 일 완료 |
| 꾸준함의 힘 | 💪 | 50개 할 일 완료 |
| 센추리온 | 🏆 | 100개 할 일 완료 |
| 3일 연속 | 🔥 | 3일 연속 할 일 완료 |
| 일주일 마스터 | ⚡ | 7일 연속 할 일 완료 |
| 한 달의 기적 | 👑 | 30일 연속 할 일 완료 |
| 성장 중 | 📈 | 레벨 5 달성 |
| 베테랑 | 🎖️ | 레벨 10 달성 |
| 얼리버드 | 🌅 | 오전 6시 이전에 완료 |
| 올빼미 | 🦉 | 자정 이후에 완료 |
| 스피드 데몬 | ⚡ | 하루에 10개 이상 완료 |

---

## 🛠️ 개발

### 스크립트

```bash
# 개발 서버 실행
npm run tauri dev

# 프로덕션 빌드
npm run tauri build

# ESLint 실행
npm run lint

# 테스트 실행 (todo-core.js 유닛 테스트)
npm test
```

### 프로젝트 구조

```
todo-sticker/
├── web/                      # 프론트엔드
│   ├── index.html           # 메인 HTML
│   ├── styles.css           # 스타일시트
│   ├── main.js              # TodoManager 클래스
│   ├── todo-core.js         # 핵심 비즈니스 로직 (순수 함수)
│   ├── security-utils.js    # 보안 유틸리티 (XSS 방지, 암호화)
│   ├── performance-utils.js # 성능 최적화 (debounce, throttle)
│   ├── ui-utils.js          # UI 유틸리티 (모달, 애니메이션)
│   ├── accessibility.js     # 접근성 (키보드 단축키, ARIA)
│   ├── backup-utils.js      # 백업/복원 (JSON 내보내기/가져오기)
│   ├── types.js             # JSDoc 타입 정의
│   └── test-todo-core.js    # 유닛 테스트
├── src-tauri/               # 백엔드 (Rust/Tauri)
│   ├── src/
│   │   └── main.rs          # Tauri 진입점
│   ├── tauri.conf.json      # Tauri 설정
│   └── icons/               # 앱 아이콘
├── .github/
│   └── workflows/
│       └── ci.yml           # GitHub Actions CI
├── IMPROVEMENT_CHECKLIST.md # 개선 체크리스트
└── README.md                # 이 파일
```

### 기술 스택

**프론트엔드**
- Vanilla JavaScript (ES6+)
- CSS3 (CSS Variables, Flexbox, Grid)
- Web Audio API (효과음)
- Canvas API (Confetti 애니메이션)

**백엔드**
- Rust
- Tauri 1.x
- serde (JSON 직렬화)

**개발 도구**
- ESLint (코드 품질)
- Husky + lint-staged (Git 훅)
- Node.js assert (테스트)

### 아키텍처 원칙

1. **순수 함수 우선**: 비즈니스 로직은 `todo-core.js`에 순수 함수로 작성
2. **모듈화**: 각 기능을 독립적인 모듈로 분리
3. **타입 안전성**: JSDoc으로 타입 주석 추가
4. **접근성 우선**: ARIA 속성 및 키보드 네비게이션 지원
5. **보안**: 모든 사용자 입력 검증 및 새니타이징
6. **성능**: requestAnimationFrame 및 배치 업데이트

---

## 🧪 테스트

### 유닛 테스트

```bash
npm test
```

현재 `todo-core.js`의 13개 순수 함수에 대한 유닛 테스트가 작성되어 있습니다:

- ✅ 할 일 추가
- ✅ 할 일 완료 토글
- ✅ 할 일 이동
- ✅ 할 일 삭제
- ✅ 텍스트 수정
- ✅ 핀 고정/해제
- ✅ 완료된 항목 제거
- ✅ 할 일 정렬
- ✅ 활성/완료 카운트
- ✅ 할 일 검색
- ✅ 할 일 필터링
- ✅ 할 일 나이 텍스트
- ✅ XP 계산

---

## 🐛 트러블슈팅

### 앱이 실행되지 않아요

1. **Tauri 요구사항 확인**
   ```bash
   # Rust 설치 확인
   rustc --version
   
   # Node.js 설치 확인
   node --version
   ```

2. **의존성 재설치**
   ```bash
   rm -rf node_modules
   npm install
   ```

3. **캐시 삭제**
   ```bash
   cd src-tauri
   cargo clean
   cd ..
   ```

### 데이터가 사라졌어요

1. **localStorage 확인**
   - 개발자 도구(F12) → Application → Local Storage
   - `todos`, `todo-profile`, `todo-settings` 키 확인

2. **자동 백업 복원**
   - localStorage에서 `auto-backup` 키 확인
   - 설정에서 백업 가져오기로 복원

3. **브라우저 캐시 문제**
   - macOS: `~/Library/Application Support/[앱 이름]`
   - Windows: `%APPDATA%/[앱 이름]`

### 투명도가 작동하지 않아요

- Tauri 설정에서 `transparent: true` 확인
- macOS에서는 "투명도 감소" 옵션이 꺼져 있어야 합니다
  - 시스템 환경설정 → 손쉬운 사용 → 디스플레이 → "투명도 감소" 비활성화

### 키보드 단축키가 작동하지 않아요

- 입력 필드에 포커스가 있으면 단축키가 비활성화됩니다
- `Esc`를 눌러 입력 필드 포커스를 해제하세요

---

## 🤝 기여하기

기여를 환영합니다! 다음 절차를 따라주세요:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### 코드 스타일

- ESLint 규칙을 따라주세요
- 모든 함수에 JSDoc 주석을 추가해주세요
- 순수 함수는 `todo-core.js`에 작성해주세요
- 테스트를 추가해주세요

---

## 📝 변경 로그

### v1.0.0 (2025-11-30)
- 🎉 초기 릴리즈
- 🔒 보안 개선 (XSS 방지, CSP 강화)
- ⚡ 성능 최적화 (렌더링, 배치 업데이트)
- ♿ 접근성 대폭 개선 (ARIA, 키보드 단축키)
- 💾 데이터 백업/복원 기능
- 📝 타입 안전성 (JSDoc)
- 🧪 유닛 테스트 (13개)

---

## 📄 라이선스

MIT License - 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

---

## 🙏 감사의 말

- [Tauri](https://tauri.app/) - 크로스 플랫폼 데스크톱 앱 프레임워크
- [SF Symbols](https://developer.apple.com/sf-symbols/) - macOS 스타일 아이콘 영감
- 모든 기여자분들께 감사드립니다

---

<div align="center">

**Made with 💘 by n-toktok**

⭐ 이 프로젝트가 마음에 드신다면 Star를 눌러주세요!

</div>
