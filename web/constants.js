/**
 * Todo Sticker - 상수 정의
 * 앱 전체에서 사용되는 상수들을 중앙 관리
 */

// ===== 이모지 =====
export const EMOJIS = [
    '📝', '🎯', '💪', '🔥', '⭐', '💡', '📚', '🎨', 
    '🏃', '🍎', '☕', '🎵', '🌟', '💎', '🚀', '🌈'
];

// ===== 동기부여 명언 =====
export const MOTIVATIONAL_QUOTES = [
    { text: "작은 진전도 진전이다.", author: "Unknown" },
    { text: "오늘 할 수 있는 일을 내일로 미루지 마라.", author: "벤자민 프랭클린" },
    { text: "시작이 반이다.", author: "아리스토텔레스" },
    { text: "꿈을 계속 간직하고 있으면 반드시 실현할 때가 온다.", author: "괴테" },
    { text: "할 수 있다고 믿는 순간, 방법이 보인다.", author: "Unknown" },
    { text: "천 리 길도 한 걸음부터.", author: "노자" },
    { text: "지금 이 순간이 가장 좋은 시작점이다.", author: "Unknown" },
    { text: "작은 습관이 큰 변화를 만든다.", author: "제임스 클리어" },
];

// ===== 업적 정의 =====
export const ACHIEVEMENTS = [
    { id: 'first_todo', name: '첫 걸음', desc: '첫 번째 할 일 완료', icon: '🎉', condition: (s) => s.totalCompleted >= 1 },
    { id: 'ten_todos', name: '시작이 좋아', desc: '10개의 할 일 완료', icon: '🌟', condition: (s) => s.totalCompleted >= 10 },
    { id: 'fifty_todos', name: '꾸준함의 힘', desc: '50개의 할 일 완료', icon: '💪', condition: (s) => s.totalCompleted >= 50 },
    { id: 'hundred_todos', name: '센추리온', desc: '100개의 할 일 완료', icon: '🏆', condition: (s) => s.totalCompleted >= 100 },
    { id: 'streak_3', name: '3일 연속', desc: '3일 연속 할 일 완료', icon: '🔥', condition: (s) => s.maxStreak >= 3 },
    { id: 'streak_7', name: '일주일 마스터', desc: '7일 연속 할 일 완료', icon: '⚡', condition: (s) => s.maxStreak >= 7 },
    { id: 'streak_30', name: '한 달의 기적', desc: '30일 연속 할 일 완료', icon: '👑', condition: (s) => s.maxStreak >= 30 },
    { id: 'level_5', name: '성장 중', desc: '레벨 5 달성', icon: '📈', condition: (s) => s.level >= 5 },
    { id: 'level_10', name: '베테랑', desc: '레벨 10 달성', icon: '🎖️', condition: (s) => s.level >= 10 },
    { id: 'early_bird', name: '얼리버드', desc: '오전 6시 이전에 할 일 완료', icon: '🌅', condition: (s) => s.earlyBird },
    { id: 'night_owl', name: '올빼미', desc: '자정 이후에 할 일 완료', icon: '🦉', condition: (s) => s.nightOwl },
    { id: 'speed_demon', name: '스피드 데몬', desc: '하루에 10개 이상 완료', icon: '⚡', condition: (s) => s.maxDailyCompleted >= 10 },
];

// ===== 레벨별 필요 XP =====
export const LEVEL_XP = [
    0,      // Lv.1 (시작)
    100,    // Lv.2
    250,    // Lv.3
    450,    // Lv.4
    700,    // Lv.5
    1000,   // Lv.6
    1400,   // Lv.7
    1900,   // Lv.8
    2500,   // Lv.9
    3200,   // Lv.10
    4000,   // Lv.11
    5000,   // Lv.12
    6200,   // Lv.13
    7600,   // Lv.14
    9200,   // Lv.15
    11000,  // Lv.16
    13000,  // Lv.17
    15500,  // Lv.18
    18500,  // Lv.19
    22000,  // Lv.20
    26000   // Lv.21 (최대)
];

// ===== 기본 설정값 =====
export const DEFAULT_PROFILE = {
    level: 1,
    xp: 0,
    totalXP: 0,
    streak: 0,
    maxStreak: 0,
    lastCompletedDate: null,
    totalCompleted: 0,
    achievements: [],
    earlyBird: false,
    nightOwl: false,
    maxDailyCompleted: 0,
    dailyCompleted: 0,
    dailyDate: null,
};

export const DEFAULT_SETTINGS = {
    theme: 'default',
    soundEnabled: true,
    notificationEnabled: true,
    opacity: 100,
    alwaysOnTop: true,
    minimalMode: false,
};

// ===== 스토리지 키 =====
export const STORAGE_KEYS = {
    TODOS: 'todos',
    PROFILE: 'todo-profile',
    SETTINGS: 'todo-settings',
};

// ===== 시간 상수 =====
export const TIME = {
    MS_PER_SECOND: 1000,
    MS_PER_MINUTE: 60 * 1000,
    MS_PER_HOUR: 60 * 60 * 1000,
    MS_PER_DAY: 24 * 60 * 60 * 1000,
    POMODORO_DEFAULT_MINUTES: 25,
};

// ===== 유효성 검사 =====
export const VALIDATION = {
    TODO_MAX_LENGTH: 200,
    TODO_MIN_LENGTH: 1,
};
