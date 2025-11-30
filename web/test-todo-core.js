/**
 * Todo Core 테스트
 */

import assert from 'assert';
import { 
    addTodoList, 
    toggleTodoById, 
    deleteTodoById, 
    moveTodoById,
    updateTodoText,
    togglePinById,
    clearCompleted,
    sortTodos,
    getActiveCount,
    getCompletedCount,
    searchTodos,
    filterTodos,
    getTodoAgeText,
    calculateXP,
} from './todo-core.js';

function runTests() {
    console.log('🧪 Todo Core 테스트 시작...\n');

    // 테스트 1: 할 일 추가
    console.log('✓ 테스트 1: 할 일 추가');
    let todos = [];
    todos = addTodoList(todos, 'Task 1');
    assert.strictEqual(todos.length, 1);
    assert.strictEqual(todos[0].text, 'Task 1');
    assert.strictEqual(todos[0].completed, false);
    
    todos = addTodoList(todos, 'Task 2', { emoji: '🎯' });
    assert.strictEqual(todos.length, 2);
    assert.strictEqual(todos[0].text, 'Task 2');
    assert.strictEqual(todos[0].emoji, '🎯');
    
    // 빈 텍스트는 무시
    const beforeLength = todos.length;
    todos = addTodoList(todos, '');
    assert.strictEqual(todos.length, beforeLength);

    // 테스트 2: 할 일 토글
    console.log('✓ 테스트 2: 할 일 완료 토글');
    const id1 = todos[0].id;
    todos = toggleTodoById(todos, id1);
    assert.strictEqual(todos[0].completed, true);
    todos = toggleTodoById(todos, id1);
    assert.strictEqual(todos[0].completed, false);

    // 테스트 3: 할 일 이동
    console.log('✓ 테스트 3: 할 일 이동');
    const id2 = todos[1].id;
    todos = moveTodoById(todos, id2, 'up');
    assert.strictEqual(todos[0].id, id2);
    assert.strictEqual(todos[1].id, id1);

    // 테스트 4: 할 일 삭제
    console.log('✓ 테스트 4: 할 일 삭제');
    todos = deleteTodoById(todos, id1);
    assert.strictEqual(todos.find(t => t.id === id1), undefined);
    assert.strictEqual(todos.length, 1);

    // 테스트 5: 텍스트 수정
    console.log('✓ 테스트 5: 텍스트 수정');
    todos = updateTodoText(todos, id2, 'Updated Task');
    assert.strictEqual(todos[0].text, 'Updated Task');

    // 테스트 6: 핀 고정
    console.log('✓ 테스트 6: 핀 고정/해제');
    todos = togglePinById(todos, id2);
    assert.strictEqual(todos[0].pinned, true);
    todos = togglePinById(todos, id2);
    assert.strictEqual(todos[0].pinned, false);

    // 테스트 7: 완료된 항목 제거
    console.log('✓ 테스트 7: 완료된 항목 제거');
    todos = addTodoList(todos, 'Task 3');
    todos = addTodoList(todos, 'Task 4');
    const id3 = todos[0].id;
    todos = toggleTodoById(todos, id3); // Task 4 완료
    const activeBefore = getActiveCount(todos);
    todos = clearCompleted(todos);
    assert.strictEqual(todos.find(t => t.id === id3), undefined);
    assert.strictEqual(getActiveCount(todos), activeBefore);

    // 테스트 8: 정렬 (고정 우선)
    console.log('✓ 테스트 8: 할 일 정렬');
    const id4 = todos[0].id;
    todos = togglePinById(todos, id4);
    todos = sortTodos(todos);
    assert.strictEqual(todos[0].pinned, true);

    // 테스트 9: 카운트
    console.log('✓ 테스트 9: 활성/완료 카운트');
    const activeCount = getActiveCount(todos);
    const completedCount = getCompletedCount(todos);
    assert.strictEqual(activeCount + completedCount, todos.length);

    // 테스트 10: 검색
    console.log('✓ 테스트 10: 할 일 검색');
    todos = addTodoList(todos, 'Buy groceries');
    todos = addTodoList(todos, 'Buy milk');
    const searchResults = searchTodos(todos, 'buy');
    assert.strictEqual(searchResults.length >= 2, true);

    // 테스트 11: 필터링
    console.log('✓ 테스트 11: 할 일 필터링');
    todos = addTodoList(todos, 'Task to complete');
    const lastId = todos[0].id;
    todos = toggleTodoById(todos, lastId);
    
    const active = filterTodos(todos, 'active');
    const completed = filterTodos(todos, 'completed');
    const all = filterTodos(todos, 'all');
    
    assert.strictEqual(active.every(t => !t.completed), true);
    assert.strictEqual(completed.every(t => t.completed), true);
    assert.strictEqual(all.length, todos.length);

    // 테스트 12: 나이 텍스트
    console.log('✓ 테스트 12: 할 일 나이 텍스트');
    const ageText = getTodoAgeText(new Date().toISOString());
    assert.strictEqual(ageText, '방금 전');

    // 테스트 13: XP 계산
    console.log('✓ 테스트 13: XP 계산');
    const recentXP = calculateXP(new Date().toISOString());
    assert.strictEqual(recentXP, 15); // 빠른 완료 보너스
    
    const oldDate = new Date(Date.now() - 50 * 60 * 60 * 1000).toISOString(); // 50시간 전
    const oldXP = calculateXP(oldDate);
    assert.strictEqual(oldXP, 5); // 오래된 할 일

    console.log('\n✅ 모든 테스트 통과!');
    console.log(`📊 총 ${13}개 테스트 완료`);
}

try {
    runTests();
} catch (error) {
    console.error('\n❌ 테스트 실패:', error.message);
    console.error(error.stack);
    process.exit(1);
}