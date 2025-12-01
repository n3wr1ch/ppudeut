/**
 * Todo 핵심 로직 - 순수 함수
 * 상태 변경 없이 새로운 배열/객체 반환
 */

import './types.js';

/**
 * 새 할 일 추가
 * @param {Todo[]} todos - 기존 할 일 목록
 * @param {string} text - 할 일 텍스트
 * @param {Object} [options] - 추가 옵션
 * @param {string|null} [options.emoji] - 이모지
 * @returns {Todo[]} - 새 할 일 목록
 */
export function addTodoList(todos, text, options = {}) {
    const t = (text || '').trim();
    if (!t) return todos.slice();
    if (t.length > 200) return todos.slice();
    
    const { emoji = null } = options;
    
    const todo = { 
        id: crypto.randomUUID(),
        text: t, 
        completed: false, 
        createdAt: new Date().toISOString(),
        emoji,
        pinned: false,
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
 * 할 일 고정/고정 해제
 * @param {Todo[]} todos - 할 일 목록
 * @param {number} id - 할 일 ID
 * @returns {Todo[]} - 새 할 일 목록
 */
export function togglePinById(todos, id) {
    return todos.map(t => t.id === id ? { ...t, pinned: !t.pinned } : t);
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
 * 할 일 정렬 (고정된 항목 우선)
 * @param {Todo[]} todos - 할 일 목록
 * @returns {Todo[]} - 정렬된 할 일 목록
 */
export function sortTodos(todos) {
    return [...todos].sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return 0;
    });
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
 * 할 일 나이를 읽기 쉬운 텍스트로 변환
 * @param {string} createdAt - 생성 시간 (ISO 8601)
 * @returns {string} - 나이 텍스트
 */
export function getTodoAgeText(createdAt) {
    const hours = getTodoAgeHours(createdAt);
    if (hours < 1) return '방금 전';
    if (hours < 24) return `${Math.floor(hours)}시간 전`;
    const days = Math.floor(hours / 24);
    if (days === 1) return '어제';
    if (days < 7) return `${days}일 전`;
    if (days < 30) return `${Math.floor(days / 7)}주 전`;
    return `${Math.floor(days / 30)}달 전`;
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