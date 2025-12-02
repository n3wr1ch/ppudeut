/**
 * Todo 핵심 로직 - 순수 함수
 * 상태 변경 없이 새로운 배열/객체 반환
 */

import './types.js';

/**
 * 새 할 일 추가
 * @param {Todo[]} todos - 기존 할 일 목록
 * @param {string} text - 할 일 텍스트
 * @returns {Todo[]} - 새 할 일 목록
 */
export function addTodoList(todos, text) {
    const t = (text || '').trim();
    if (!t) return todos.slice();
    if (t.length > 200) return todos.slice();
    
    const todo = { 
        id: crypto.randomUUID(),
        text: t, 
        completed: false, 
        createdAt: new Date().toISOString(),
    };
    
    return [todo, ...todos];
}

/**
 * 할 일 완료 상태 토글
 * @param {Todo[]} todos - 할 일 목록
 * @param {number} id - 할 일 ID
 * @returns {Todo[]} - 새 할 일 목록
 */
export function toggleTodoById(todos, id) {
    return todos.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
}

/**
 * 할 일 삭제
 * @param {Todo[]} todos - 할 일 목록
 * @param {number} id - 할 일 ID
 * @returns {Todo[]} - 새 할 일 목록
 */
export function deleteTodoById(todos, id) {
    return todos.filter(t => t.id !== id);
}

/**
 * 할 일 이동 (위/아래)
 * @param {Todo[]} todos - 할 일 목록
 * @param {number} id - 할 일 ID
 * @param {string} direction - 방향 ('up' | 'down')
 * @returns {Todo[]} - 새 할 일 목록
 */
export function moveTodoById(todos, id, direction) {
    const idx = todos.findIndex(t => t.id === id);
    if (idx === -1) return todos.slice();
    const newIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= todos.length) return todos.slice();
    const copy = todos.slice();
    const [item] = copy.splice(idx, 1);
    copy.splice(newIdx, 0, item);
    return copy;
}

/**
 * 할 일 텍스트 수정
 * @param {Todo[]} todos - 할 일 목록
 * @param {number} id - 할 일 ID
 * @param {string} newText - 새 텍스트
 * @returns {Todo[]} - 새 할 일 목록
 */
export function updateTodoText(todos, id, newText) {
    const text = (newText || '').trim();
    if (!text || text.length > 200) return todos.slice();
    
    return todos.map(t => t.id === id ? { ...t, text } : t);
}



/**
 * 완료된 할 일 제거
 * @param {Todo[]} todos - 할 일 목록
 * @returns {Todo[]} - 새 할 일 목록
 */
export function clearCompleted(todos) {
    return todos.filter(t => !t.completed);
}

/**
 * 할 일 정렬
 * @param {Todo[]} todos - 할 일 목록
 * @returns {Todo[]} - 정렬된 할 일 목록
 */
export function sortTodos(todos) {
    return [...todos];
}

/**
 * 활성 할 일 개수 계산
 * @param {Todo[]} todos - 할 일 목록
 * @returns {number} - 활성 할 일 개수
 */
export function getActiveCount(todos) {
    return todos.filter(t => !t.completed).length;
}

/**
 * 완료된 할 일 개수 계산
 * @param {Todo[]} todos - 할 일 목록
 * @returns {number} - 완료된 할 일 개수
 */
export function getCompletedCount(todos) {
    return todos.filter(t => t.completed).length;
}

/**
 * 할 일 검색
 * @param {Todo[]} todos - 할 일 목록
 * @param {string} query - 검색어
 * @returns {Todo[]} - 검색 결과
 */
export function searchTodos(todos, query) {
    const q = (query || '').trim().toLowerCase();
    if (!q) return todos;
    
    return todos.filter(t => t.text.toLowerCase().includes(q));
}

/**
 * 할 일 필터링
 * @param {Todo[]} todos - 할 일 목록
 * @param {string} filter - 필터 ('all' | 'active' | 'completed')
 * @returns {Todo[]} - 필터링된 목록
 */
export function filterTodos(todos, filter) {
    switch (filter) {
        case 'active':
            return todos.filter(t => !t.completed);
        case 'completed':
            return todos.filter(t => t.completed);
        case 'all':
        default:
            return todos;
    }
}

/**
 * 할 일 나이 계산 (시간)
 * @param {string} createdAt - 생성 시간 (ISO 8601)
 * @returns {number} - 시간 (hours)
 */
export function getTodoAgeHours(createdAt) {
    const created = new Date(createdAt);
    const now = new Date();
    return (now - created) / (1000 * 60 * 60);
}

/**
 * 할 일 나이를 재미있는 텍스트로 변환 (미룬 시간 표현)
 * @param {string} createdAt - 생성 시간 (ISO 8601)
 * @returns {{text: string, level: number}} - 텍스트와 레벨 (0-5, 높을수록 오래됨)
 */
export function getTodoAgeText(createdAt) {
    const hours = getTodoAgeHours(createdAt);
    const minutes = Math.floor((hours % 1) * 60);
    
    if (hours < 1) {
        if (minutes < 1) return { text: '방금 추가!', level: 0 };
        if (minutes < 5) return { text: '잠깐 미룸', level: 0 };
        if (minutes < 15) return { text: `${minutes}분 미룸`, level: 0 };
        if (minutes < 30) return { text: '슬슬 해볼까?', level: 1 };
        return { text: '30분째 눈치봄', level: 1 };
    }
    
    const floorHours = Math.floor(hours);
    if (hours < 2) return { text: '1시간 미룸', level: 1 };
    if (hours < 3) return { text: '2시간째 미적미적', level: 2 };
    if (hours < 6) return { text: `${floorHours}시간 미룸`, level: 2 };
    if (hours < 12) return { text: '반나절 묵힘', level: 2 };
    if (hours < 24) return { text: '하루종일 미룸', level: 3 };
    
    const days = Math.floor(hours / 24);
    if (days === 1) return { text: '어제부터 미룸', level: 3 };
    if (days === 2) return { text: '이틀째 방치중', level: 3 };
    if (days < 7) return { text: `${days}일째 숙성중`, level: 4 };
    if (days < 14) return { text: '일주일 묵은 것', level: 4 };
    if (days < 30) return { text: `${Math.floor(days / 7)}주째 잠자는 중`, level: 5 };
    if (days < 60) return { text: '한달 묵은 골동품', level: 5 };
    return { text: `${Math.floor(days / 30)}달째 화석화 중`, level: 5 };
}

/**
 * XP 계산 (할 일 나이에 따라 보너스/페널티)
 * @param {string} createdAt - 생성 시간
 * @returns {number} - XP
 */
export function calculateXP(createdAt) {
    const ageHours = getTodoAgeHours(createdAt);
    let xp = 10;
    
    if (ageHours < 1) {
        xp = 15; // 빠른 완료 보너스
    } else if (ageHours > 48) {
        xp = 5; // 오래된 할 일 감소
    }
    
    return xp;
}

