/**
 * 타입 정의 파일 (JSDoc)
 * TypeScript로 전환 시 이 파일을 기반으로 .d.ts 파일 생성
 */

/**
 * @typedef {Object} Todo
 * @property {number} id - 할 일 고유 ID
 * @property {string} text - 할 일 내용
 * @property {boolean} completed - 완료 여부
 * @property {string} createdAt - 생성 시간 (ISO 8601)
 * @property {string|null} emoji - 이모지
 * @property {boolean} [pinned] - 고정 여부
 */

/**
 * @typedef {Object} Profile
 * @property {number} level - 현재 레벨
 * @property {number} xp - 현재 XP
 * @property {number} totalXP - 누적 XP
 * @property {number} streak - 연속 달성 일수
 * @property {number} maxStreak - 최대 연속 달성 일수
 * @property {string|null} lastCompletedDate - 마지막 완료 날짜
 * @property {number} totalCompleted - 총 완료 개수
 * @property {string[]} achievements - 획득한 업적 ID 목록
 * @property {boolean} earlyBird - 얼리버드 달성 여부
 * @property {boolean} nightOwl - 올빼미 달성 여부
 * @property {number} maxDailyCompleted - 하루 최대 완료 개수
 * @property {number} dailyCompleted - 오늘 완료 개수
 * @property {string|null} dailyDate - 일일 통계 날짜
 */

/**
 * @typedef {Object} Settings
 * @property {string} theme - 테마 (default, pink, orange, green, purple, mint)
 * @property {boolean} soundEnabled - 사운드 활성화
 * @property {boolean} notificationEnabled - 알림 활성화
 * @property {number} opacity - 투명도 (0-100)
 * @property {boolean} alwaysOnTop - 항상 위 표시
 * @property {boolean} minimalMode - 미니멀 모드
 */

/**
 * @typedef {Object} Achievement
 * @property {string} id - 업적 ID
 * @property {string} name - 업적 이름
 * @property {string} desc - 업적 설명
 * @property {string} icon - 업적 아이콘 (이모지)
 * @property {function(Profile): boolean} condition - 업적 달성 조건 함수
 */

/**
 * @typedef {Object} PomodoroState
 * @property {number|null} todoId - 연결된 할 일 ID
 * @property {number} duration - 타이머 지속 시간 (초)
 * @property {number} remaining - 남은 시간 (초)
 * @property {boolean} isRunning - 실행 중 여부
 * @property {number|null} intervalId - setInterval ID
 */

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} valid - 유효성 여부
 * @property {string} sanitized - 새니타이징된 텍스트
 * @property {string} [error] - 에러 메시지 (실패 시)
 */

/**
 * @typedef {Object} MotivationalQuote
 * @property {string} text - 명언 텍스트
 * @property {string} author - 저자
 */

/**
 * @typedef {Object} MemoryInfo
 * @property {string} used - 사용 중인 메모리
 * @property {string} total - 전체 메모리
 * @property {string} limit - 메모리 한계
 */

/**
 * @callback CleanupFunction
 * @returns {void}
 */

/**
 * @callback RenderCallback
 * @returns {void}
 */

/**
 * @callback CreateElementFunction
 * @param {Todo} todo - 할 일 객체
 * @returns {HTMLElement}
 */

/**
 * @callback GetKeyFunction
 * @param {Todo} todo - 할 일 객체
 * @returns {number|string}
 */

export {};
