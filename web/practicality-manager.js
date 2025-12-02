/**
 * 실용성 기능 관리 모듈
 * 미룬 시간 배지 + 내일로 미룸 버튼
 */

import { getTodoAgeText } from './todo-core.js';

/**
 * 실용성 매니저 클래스
 */
export class PracticalityManager {
    constructor(todoManager) {
        this.todoManager = todoManager;
        this.updateTimer = null;
        this.initializeUI();
        this.startAutoUpdate();
    }

    /**
     * UI 초기화
     */
    initializeUI() {
        this.createStyles();
        this.bindEvents();
    }

    /**
     * 1분마다 미룬 시간 자동 갱신 시작
     */
    startAutoUpdate() {
        // 기존 타이머 정리
        if (this.updateTimer) {
            clearInterval(this.updateTimer);
        }

        // 1분(60000ms)마다 업데이트
        this.updateTimer = setInterval(() => {
            this.updateAllAgeBadges();
        }, 60000);
    }

    /**
     * 자동 갱신 중지
     */
    stopAutoUpdate() {
        if (this.updateTimer) {
            clearInterval(this.updateTimer);
            this.updateTimer = null;
        }
    }

    /**
     * 화면에 표시된 모든 미룬 시간 배지 업데이트
     */
    updateAllAgeBadges() {
        const todoItems = document.querySelectorAll('.todo-item:not(.completed)');
        
        todoItems.forEach(item => {
            const todoId = item.dataset.id;
            const todo = this.todoManager.todos.find(t => t.id === todoId);
            
            if (!todo || todo.completed) return;

            const ageBadge = item.querySelector('.age-badge');
            if (ageBadge) {
                const badgeInfo = this.getBadgeInfo(todo);
                
                // 클래스 업데이트
                ageBadge.className = `meta-badge age-badge ${badgeInfo.className}`;
                
                // 내용 업데이트
                ageBadge.innerHTML = `${badgeInfo.icon} ${badgeInfo.text}`;
            }
        });
    }

    /**
     * 내일로 미뤘는지 확인
     */
    isPostponedToTomorrow(todo) {
        if (!todo.postponedUntil) return false;
        
        const now = new Date();
        const postponedDate = new Date(todo.postponedUntil);
        
        // 미룬 날짜가 아직 안 지났으면 true
        return now < postponedDate;
    }

    /**
     * 배지 정보 가져오기 (내일로 미룸 vs 미룬 시간)
     */
    getBadgeInfo(todo) {
        // 내일로 미뤄진 상태인지 확인
        if (this.isPostponedToTomorrow(todo)) {
            return {
                className: 'level-postponed',
                icon: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>',
                text: '내일로 미룸'
            };
        }

        // 일반 미룬 시간 표시
        const ageInfo = getTodoAgeText(todo.createdAt);
        return {
            className: `level-${ageInfo.level}`,
            icon: this.getAgeIcon(ageInfo.level),
            text: ageInfo.text
        };
    }

    /**
     * CSS 스타일 추가
     */
    createStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .todo-item {
                position: relative;
            }
            
            .practicality-meta {
                display: flex;
                gap: 6px;
                margin-top: 6px;
                flex-wrap: wrap;
                align-items: center;
            }
            
            .meta-badge {
                padding: 3px 8px;
                border-radius: 4px;
                border: 1px solid #e5e7eb;
                background: white;
                font-size: 11px;
                transition: all 0.2s;
                display: inline-flex;
                align-items: center;
                gap: 4px;
                font-weight: 500;
            }
            
            /* 내일로 미룸 버튼 */
            .postpone-btn {
                cursor: pointer;
                color: #6b7280;
            }
            
            .postpone-btn:hover {
                background: #fef3c7;
                color: #d97706;
                border-color: #fcd34d;
            }
            
            /* 미룬 시간 배지 */
            .age-badge {
                cursor: default;
            }
            
            .age-badge.level-0 {
                background: #f0fdf4;
                color: #16a34a;
                border-color: #bbf7d0;
            }
            
            .age-badge.level-1 {
                background: #eff6ff;
                color: #2563eb;
                border-color: #bfdbfe;
            }
            
            .age-badge.level-2 {
                background: #fffbeb;
                color: #d97706;
                border-color: #fde68a;
            }
            
            .age-badge.level-3 {
                background: #fff7ed;
                color: #ea580c;
                border-color: #fed7aa;
            }
            
            .age-badge.level-4 {
                background: #fef2f2;
                color: #dc2626;
                border-color: #fecaca;
            }
            
            .age-badge.level-5 {
                background: #dc2626;
                color: white;
                border-color: #dc2626;
            }

            /* 내일로 미룸 상태 */
            .age-badge.level-postponed {
                background: #f0f9ff;
                color: #0284c7;
                border-color: #7dd3fc;
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * 이벤트 바인딩
     */
    bindEvents() {
        document.addEventListener('click', (e) => {
            const postponeBtn = e.target.closest('.postpone-btn');
            
            if (postponeBtn) {
                e.stopPropagation();
                const todoItem = postponeBtn.closest('.todo-item');
                if (todoItem) {
                    this.postponeToTomorrow(todoItem.dataset.id);
                }
            }
        });
    }

    /**
     * 미룬 시간에 맞는 SVG 아이콘
     */
    getAgeIcon(level) {
        switch(level) {
            case 0: // 방금 추가
                return '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>';
            case 1: // 조금 미룸
                return '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>';
            case 2: // 좀 미룸
                return '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>';
            case 3: // 많이 미룸
                return '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
            case 4: // 오래 미룸
                return '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
            case 5: // 화석화
                return '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>';
            default:
                return '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>';
        }
    }

    /**
     * 할 일 아이템 확장 (미룬 시간 + 내일로 미룸)
     */
    enhanceTodoItem(todoElement, todo) {
        // 기존 UI 제거
        const existingMeta = todoElement.querySelector('.practicality-meta');
        if (existingMeta) {
            existingMeta.remove();
        }

        // 완료된 항목은 배지 표시 안함
        if (todo.completed) {
            return todoElement;
        }

        const metaContainer = document.createElement('div');
        metaContainer.className = 'practicality-meta';

        // 배지 정보 가져오기 (내일로 미룸 vs 미룬 시간)
        const badgeInfo = this.getBadgeInfo(todo);
        const ageBadge = document.createElement('span');
        ageBadge.className = `meta-badge age-badge ${badgeInfo.className}`;
        ageBadge.innerHTML = `${badgeInfo.icon} ${badgeInfo.text}`;
        metaContainer.appendChild(ageBadge);

        // 내일로 버튼 (이미 내일로 미뤄진 상태가 아닐 때만 표시)
        if (!this.isPostponedToTomorrow(todo)) {
            const postponeBtn = document.createElement('button');
            postponeBtn.className = 'meta-badge postpone-btn';
            postponeBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg> 내일로`;
            metaContainer.appendChild(postponeBtn);
        }
        
        // content-wrapper에 추가
        const contentWrapper = todoElement.querySelector('.todo-content-wrapper');
        if (contentWrapper) {
            contentWrapper.appendChild(metaContainer);
        }

        return todoElement;
    }

    /**
     * 내일로 미루기 - postponedUntil을 내일 자정으로 설정
     */
    postponeToTomorrow(todoId) {
        const todo = this.todoManager.todos.find(t => t.id === todoId);
        if (!todo) return;

        // 내일 자정 시간 계산
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);

        // 내일로 미룸 설정
        todo.postponedUntil = tomorrow.toISOString();
        
        this.todoManager.saveTodos();
        this.todoManager.render();
        this.todoManager.sound.play('click');
    }

    /**
     * 리소스 정리
     */
    destroy() {
        this.stopAutoUpdate();
    }
}

export default PracticalityManager;
