/**
 * Todo Sticker - 상수 정의
 * 앱 전체에서 사용되는 상수들을 중앙 관리
 */

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
    { id: 'early_bird', name: '얼리버드', desc: '오전 6시 이전에 할 일 완료', icon: '🌅', condition: (s) => s.earlyBird },
    { id: 'night_owl', name: '올빼미', desc: '자정 이후에 할 일 완료', icon: '🦉', condition: (s) => s.nightOwl },
    { id: 'speed_demon', name: '스피드 데몬', desc: '하루에 10개 이상 완료', icon: '⚡', condition: (s) => s.maxDailyCompleted >= 10 },
];

// ===== 뿌듯 개수별 멘트 =====
export const PPUDEUT_MESSAGES = {
    0: { emoji: '😴', text: '아직 시작 전!', subtext: '첫 뿌듯을 만들어볼까요?' },
    1: { emoji: '🌱', text: '첫 뿌듯!', subtext: '좋은 시작이에요!' },
    2: { emoji: '🌿', text: '두 번째 뿌듯!', subtext: '슬슬 엔진 가동 중~' },
    3: { emoji: '🌻', text: '벌써 세 개!', subtext: '오늘 좀 치는데요?' },
    4: { emoji: '🔥', text: '네 개 돌파!', subtext: '불이 붙었어요!' },
    5: { emoji: '💪', text: '다섯 개!', subtext: '오늘 진짜 잘하고 있어요!' },
    6: { emoji: '🚀', text: '여섯 개 클리어!', subtext: '로켓 발사 준비 완료!' },
    7: { emoji: '⚡', text: '일곱 개!', subtext: '번개처럼 해치우는 중!' },
    8: { emoji: '🎯', text: '여덟 개 적중!', subtext: '목표 달성 머신이시네요!' },
    9: { emoji: '🌟', text: '아홉 개!', subtext: '오늘의 스타는 바로 당신!' },
    10: { emoji: '🏆', text: '열 개 달성!', subtext: '대단해요! 챔피언!' },
    many: { emoji: '👑', text: '와 대박!', subtext: '오늘 완전 뿌듯왕이시네요!' },
};

// ===== 집중 모드 멘트 =====
export const FOCUS_STATUS = {
    // 시간대별 멘트
    time: [
        { min: 0, emoji: '🔥', text: '집중 시작!' },
        { min: 5, emoji: '💪', text: '워밍업 중' },
        { min: 15, emoji: '🚀', text: '본격 집중!' },
        { min: 30, emoji: '⚡', text: '몰입 중!' },
        { min: 45, emoji: '🌟', text: '집중의 달인' },
        { min: 60, emoji: '👑', text: '1시간 돌파!' },
        { min: 90, emoji: '🏆', text: '대단해요!' },
        { min: 120, emoji: '🦸', text: '집중 영웅!' },
    ],
    // 활동 상태 멘트
    activity: {
        active: { emoji: '🔥', text: '불타는 중!' },
        idle: { emoji: '☕', text: '잠깐 쉬는 중?' },
        sleeping: { emoji: '😴', text: '졸고 있나요?' },
    }
};

// ===== 기본 설정값 =====
export const DEFAULT_PROFILE = {
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
    profileCollapsed: false,
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
};

// ===== 유효성 검사 =====
export const VALIDATION = {
    TODO_MAX_LENGTH: 200,
    TODO_MIN_LENGTH: 1,
};
