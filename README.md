# 뿌듯

게이미피케이션이 적용된 macOS 스타일 할 일 관리 앱. Tauri와 웹 기술로 제작되었습니다.

![Tauri](https://img.shields.io/badge/Tauri-1.x-blue) ![License](https://img.shields.io/badge/license-MIT-green)

## 특징

### 핵심 기능
- 할 일 추가, 완료 토글, 삭제
- 드래그 앤 드롭으로 순서 변경
- 더블클릭으로 할 일 편집
- 핀 고정 (중요한 할 일 상단 고정)
- localStorage 자동 저장

### 게이미피케이션
- **레벨 & XP 시스템**: 할 일 완료 시 경험치 획득
- **스트릭**: 연속 달성 일수 추적
- **업적 시스템**: 12가지 업적 달성 가능
- **Confetti 애니메이션**: 할 일 완료 시 축하 효과

### 감성 & 무드
- **6가지 테마 색상**: 기본, 핑크, 오렌지, 그린, 퍼플, 민트
- **이모지 태그**: 할 일에 이모지 추가
- **동기부여 명언**: 할 일이 없을 때 랜덤 명언 표시
- **효과음**: Web Audio API 기반 사운드 피드백

### 스마트 기능
- **뽀모도로 타이머**: 25/15/5/45분 프리셋
- **할 일 나이 표시**: 오래된 할 일 시각화
- **통계 대시보드**: 완료 수, 최대 스트릭, 총 XP, 업적 현황
- **할 일 룰렛**: 랜덤으로 할 일 선택

### UI/UX
- macOS 스타일 디자인
- 부드러운 애니메이션 효과
- 키보드 접근성 지원
- Always on Top 지원

## 설치

### 필수 요구사항

- [Node.js](https://nodejs.org/) v16 이상
- [Rust](https://rustup.rs/) 최신 안정 버전
- [Tauri CLI](https://tauri.app/v1/guides/getting-started/prerequisites)

### 설치 방법

```bash
# 저장소 클론
git clone <repository-url>
cd todo-sticker

# 의존성 설치
npm install

# 개발 모드 실행
npm run tauri dev

# 프로덕션 빌드
npm run tauri build
```

## 사용법

| 동작 | 방법 |
|------|------|
| 할 일 추가 | 입력창에 텍스트 입력 후 Enter |
| 완료 표시 | 할 일 항목 클릭 |
| 편집 | 할 일 항목 더블클릭 |
| 삭제 | 항목 우측 X 버튼 클릭 |
| 핀 고정 | 항목 좌측 핀 버튼 클릭 |
| 순서 변경 | 드래그 앤 드롭 |
| 뽀모도로 | 항목 우측 타이머 버튼 클릭 |
| 랜덤 선택 | 하단 주사위 버튼 클릭 |
| 완료 항목 삭제 | 하단 "완료 항목 삭제" 클릭 |

## 업적 목록

| 업적 | 조건 |
|------|------|
| 첫 걸음 | 첫 번째 할 일 완료 |
| 꾸준함의 시작 | 10개 할 일 완료 |
| 할 일 마스터 | 50개 할 일 완료 |
| 전설의 시작 | 100개 할 일 완료 |
| 3일 연속 | 3일 연속 달성 |
| 일주일 챔피언 | 7일 연속 달성 |
| 한 달 전사 | 30일 연속 달성 |
| 레벨 5 달성 | 레벨 5 도달 |
| 레벨 10 달성 | 레벨 10 도달 |
| 아침형 인간 | 오전 6시 이전 완료 |
| 올빼미족 | 자정 이후 완료 |
| 스피드 러너 | 생성 후 1분 내 완료 |

## 개발

```bash
# ESLint 실행
npm run lint

# 테스트 실행
npm test
```

## 프로젝트 구조

```
todo-sticker/
├── web/                  # 프론트엔드
│   ├── index.html       # 메인 HTML
│   ├── styles.css       # 스타일시트
│   ├── main.js          # TodoManager 클래스
│   └── todo-core.js     # 핵심 로직 (테스트용)
├── src-tauri/           # 백엔드 (Rust/Tauri)
│   ├── src/main.rs      # Tauri 진입점
│   └── tauri.conf.json  # Tauri 설정
└── .github/workflows/   # CI 설정
```

## 라이선스

MIT License
