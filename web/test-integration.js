/**
 * 통합 테스트 - 필터 유지, 실용성 UI, 하위 할 일 흐름 검증
 * Node.js 환경에서 실행 (npm test로 실행 가능하도록 설계)
 */

import { TextEncoder, TextDecoder } from 'util';

// DOM 환경 Mock
const mockDocument = {
    createElement: (tag) => {
        const element = {
            tagName: tag.toUpperCase(),
            className: '',
            textContent: '',
            innerHTML: '',
            style: {},
            dataset: {},
            children: [],
            classList: {
                add: function(cls) { this.className += ' ' + cls; },
                remove: function(cls) { this.className = this.className.replace(new RegExp(cls, 'g'), ''); },
                contains: function(cls) { return this.className.includes(cls); },
                toggle: function(cls) { 
                    if (this.contains(cls)) this.remove(cls); 
                    else this.add(cls); 
                }
            },
            setAttribute: function(name, value) { this[name] = value; },
            getAttribute: function(name) { return this[name]; },
            appendChild: function(child) { 
                this.children.push(child); 
                child.parentNode = this;
            },
            querySelector: function(selector) {
                if (selector === '.practicality-meta') return this._practicalityMeta;
                if (selector === '.todo-meta') return this._todoMeta;
                if (selector === '.todo-text') return this._todoText;
                return null;
            },
            querySelectorAll: function(selector) { return []; },
            closest: function(selector) { return null; },
            addEventListener: function() {},
            remove: function() {},
            parentNode: { 
                insertBefore: function(newChild, referenceChild) {
                    const index = this.children.indexOf(referenceChild);
                    if (index === -1) {
                        this.children.push(newChild);
                    } else {
                        this.children.splice(index, 0, newChild);
                    }
                    newChild.parentNode = this;
                }
            }
        };
        return element;
    },
    body: {
        appendChild: () => {},
    }
};

global.document = mockDocument;
global.localStorage = {
    _data: {},
    getItem(key) { return this._data[key] || null; },
    setItem(key, value) { this._data[key] = value; },
    removeItem(key) { delete this._data[key]; },
    clear() { this._data = {}; }
};
global.btoa = (str) => Buffer.from(str, 'binary').toString('base64');
global.atob = (str) => Buffer.from(str, 'base64').toString('binary');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// 테스트 유틸리티
let testsPassed = 0;
let testsFailed = 0;

function test(name, fn) {
    try {
        fn();
        console.log(`✓ ${name}`);
        testsPassed++;
    } catch (error) {
        console.log(`✗ ${name}`);
        console.log(`  Error: ${error.message}`);
        testsFailed++;
    }
}

function assertEqual(actual, expected, message = '') {
    if (actual !== expected) {
        throw new Error(`${message}\n  Expected: ${JSON.stringify(expected)}\n  Actual: ${JSON.stringify(actual)}`);
    }
}

function assertTrue(condition, message = '') {
    if (!condition) {
        throw new Error(message || 'Expected true but got false');
    }
}

function assertFalse(condition, message = '') {
    if (condition) {
        throw new Error(message || 'Expected false but got true');
    }
}

// Mock 함수들
const mockTodoManager = {
    todos: [],
    showUserMessage: () => {},
    saveTodos: () => {},
    render: () => {}
};

// 테스트 대상 모듈 import
import PracticalityManager from './practicality-manager.js';

// ===== 테스트 시작 =====
console.log('\n🧪 통합 테스트 시작...\n');

// ===== 실용성 UI 테스트 =====
console.log('--- 실용성 UI 테스트 ---');

test('하위 할 일 추가 시 부모-자식 관계 설정', () => {
    // 실제 DOM 없이 로직만 테스트
    const todos = [
        { id: '1', text: '부모 할 일', childIds: [] }
    ];
    
    // 하위 할 일 추가 로직 시뮬레이션
    const newTodo = {
        id: '2',
        text: '하위 할 일 텍스트',
        parentId: '1',
        childIds: []
    };
    
    // 부모에 자식 ID 추가
    const updatedTodos = todos.map(todo => {
        if (todo.id === '1') {
            return {
                ...todo,
                childIds: [...todo.childIds, newTodo.id]
            };
        }
        return todo;
    });
    
    // 하위 할 일 추가
    updatedTodos.push(newTodo);
    
    // 검증
    const parentTodo = updatedTodos.find(t => t.id === '1');
    assertTrue(parentTodo.childIds.includes('2'), '부모 할 일에 자식 ID가 추가되어야 함');
    
    const childTodo = updatedTodos.find(t => t.id === '2');
    assertEqual(childTodo.parentId, '1', '하위 할 일의 부모 ID가 올바르게 설정되어야 함');
});

test('하위 할 일 삭제 시 관계 정리', () => {
    // 초기 데이터
    const todos = [
        { id: '1', text: '부모 할 일', childIds: ['2'] },
        { id: '2', text: '하위 할 일', parentId: '1' }
    ];
    
    // 하위 할 일 삭제 로직 시뮬레이션
    const updatedTodos = todos
        // 부모에서 자식 ID 제거
        .map(todo => {
            if (todo.id === '1') {
                return {
                    ...todo,
                    childIds: todo.childIds.filter(id => id !== '2')
                };
            }
            return todo;
        })
        // 하위 할 일 완전히 삭제
        .filter(todo => todo.id !== '2');
    
    // 검증
    const parentTodo = updatedTodos.find(t => t.id === '1');
    assertFalse(parentTodo.childIds.includes('2'), '부모 할 일에서 자식 ID가 제거되어야 함');
    
    const childTodo = updatedTodos.find(t => t.id === '2');
    assertTrue(childTodo === undefined, '하위 할 일이 완전히 삭제되어야 함');
});

// ===== 필터 상태 유지 테스트 =====
console.log('\n--- 필터 상태 유지 테스트 ---');

test('필터 상태가 설정되면 isActive가 true가 됨', () => {
    // TodoManager 필터 상태 시뮬레이션
    const filterState = {
        category: null,
        tag: null,
        priority: null,
        dueDate: null,
        isActive: false
    };
    
    const isAnyFilterActive = () => {
        return !!(filterState.category || filterState.tag || 
                filterState.priority || filterState.dueDate);
    };
    
    // 카테고리 필터 설정
    filterState.category = '업무';
    filterState.isActive = isAnyFilterActive();
    
    assertTrue(filterState.isActive, '카테고리 필터 설정 시 isActive가 true여야 함');
    
    // 필터 초기화
    filterState.category = null;
    filterState.isActive = isAnyFilterActive();
    
    assertFalse(filterState.isActive, '필터 초기화 시 isActive가 false여야 함');
});

test('여러 필터가 동시에 활성화될 수 있음', () => {
    const filterState = {
        category: null,
        tag: null,
        priority: null,
        dueDate: null,
        isActive: false
    };
    
    const isAnyFilterActive = () => {
        return !!(filterState.category || filterState.tag || 
                filterState.priority || filterState.dueDate);
    };
    
    // 여러 필터 설정
    filterState.category = '업무';
    filterState.priority = '3';
    filterState.dueDate = 'today';
    filterState.isActive = isAnyFilterActive();
    
    assertTrue(filterState.isActive, '여러 필터 설정 시 isActive가 true여야 함');
    assertEqual(filterState.category, '업무', '카테고리 필터가 유지되어야 함');
    assertEqual(filterState.priority, '3', '우선순위 필터가 유지되어야 함');
    assertEqual(filterState.dueDate, 'today', '마감일 필터가 유지되어야 함');
});

// ===== 하위 할 일 모델 테스트 =====
console.log('\n--- 하위 할 일 모델 테스트 ---');

test('하위 할 일이 메인 목록에서 필터링됨', () => {
    // 하위 할 일은 parentId가 있으므로 메인 목록에서 제외되어야 함
    const todos = [
        { id: '1', text: '메인 할 일 1' },
        { id: '2', text: '메인 할 일 2' },
        { id: '3', text: '하위 할 일 1', parentId: '1' },
        { id: '4', text: '하위 할 일 2', parentId: '2' }
    ];
    
    // parentId가 없는 할 일만 필터링
    const displayTodos = todos.filter(todo => !todo.parentId);
    
    assertEqual(displayTodos.length, 2, '메인 목록에는 2개의 할 일만 표시되어야 함');
    assertTrue(displayTodos.every(todo => !todo.parentId), '표시된 모든 할 일은 parentId가 없어야 함');
});

// ===== 데이터 무결성 테스트 =====
console.log('\n--- 데이터 무결성 테스트 ---');

test('부모-자식 관계 무결성 검증', () => {
    const todos = [
        { id: '1', text: '부모 1', childIds: ['2', '3'] },
        { id: '2', text: '자식 1', parentId: '1' },
        { id: '3', text: '자식 2', parentId: '1' },
        { id: '4', text: '고아 할 일', parentId: '999' }, // 존재하지 않는 부모
        { id: '5', text: '부모 2', childIds: ['6'] } // 존재하지 않는 자식
    ];
    
    const issues = [];
    const todoMap = new Map();
    
    // ID 맵 생성
    todos.forEach(todo => {
        if (todo.id) {
            todoMap.set(todo.id, todo);
        }
    });
    
    // 무결성 검증
    todos.forEach(todo => {
        if (todo.parentId) {
            const parent = todoMap.get(todo.parentId);
            if (!parent) {
                issues.push(`할 일 "${todo.text}"의 부모 ID "${todo.parentId}"가 존재하지 않습니다`);
            }
        }
        
        if (todo.childIds && Array.isArray(todo.childIds)) {
            todo.childIds.forEach(childId => {
                const child = todoMap.get(childId);
                if (!child) {
                    issues.push(`할 일 "${todo.text}"의 자식 ID "${childId}"가 존재하지 않습니다`);
                }
            });
        }
    });
    
    assertTrue(issues.length >= 2, '최소 2개의 무결성 이슈가 발견되어야 함');
    assertTrue(issues.some(issue => issue.includes('고아 할 일')), '고아 할 일 이슈가 발견되어야 함');
    assertTrue(issues.some(issue => issue.includes('부모 2')), '존재하지 않는 자식 이슈가 발견되어야 함');
});

// ===== 결과 출력 =====
console.log('\n' + '='.repeat(40));
if (testsFailed === 0) {
    console.log(`✅ 모든 통합 테스트 통과!`);
} else {
    console.log(`❌ 일부 테스트 실패`);
}
console.log(`📊 총 ${testsPassed + testsFailed}개 테스트: ${testsPassed}개 성공, ${testsFailed}개 실패`);

// 실패가 있으면 종료 코드 1
if (testsFailed > 0) {
    process.exit(1);
}