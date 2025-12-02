/**
 * 스와이프 제스처 관리자
 * 터치 기반 환경에서 할 일 아이템 스와이프로 액션 수행
 */

export class SwipeGestureManager {
    constructor(todoManager) {
        this.todoManager = todoManager;
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.touchStartTime = 0;
        this.swipeThreshold = 50; // 스와이프로 인식할 최소 거리 (px)
        this.swipeTimeout = 300; // 스와이프 최대 시간 (ms)
        this.currentSwipedItem = null;
        this.swipeActions = null;
    }

    /**
     * 할 일 아이템에 스와이프 이벤트 바인딩
     */
    bindSwipeEvents(todoItem, todoId) {
        if (!todoItem) return;

        // 터치 시작
        todoItem.addEventListener('touchstart', (e) => {
            this.handleTouchStart(e, todoItem, todoId);
        }, { passive: false });

        // 터치 이동
        todoItem.addEventListener('touchmove', (e) => {
            this.handleTouchMove(e, todoItem);
        }, { passive: false });

        // 터치 종료
        todoItem.addEventListener('touchend', (e) => {
            this.handleTouchEnd(e, todoItem, todoId);
        }, { passive: false });
    }

    /**
     * 터치 시작 핸들러
     */
    handleTouchStart(e, todoItem, todoId) {
        // 기존 스와이프 액션이 있으면 제거
        this.resetSwipe();

        const touch = e.touches[0];
        this.touchStartX = touch.clientX;
        this.touchStartY = touch.clientY;
        this.touchStartTime = Date.now();
        this.currentSwipedItem = { element: todoItem, id: todoId };
    }

    /**
     * 터치 이동 핸들러
     */
    handleTouchMove(e, todoItem) {
        if (!this.currentSwipedItem) return;

        const touch = e.touches[0];
        const deltaX = touch.clientX - this.touchStartX;
        const deltaY = touch.clientY - this.touchStartY;

        // 세로 스크롤이 우세하면 스와이프 취소
        if (Math.abs(deltaY) > Math.abs(deltaX)) {
            return;
        }

        // 가로 스와이프 진행 중이면 스크롤 방지
        if (Math.abs(deltaX) > 10) {
            e.preventDefault();
        }

        // 스와이프 방향에 따라 아이템 이동
        if (Math.abs(deltaX) > 20) {
            todoItem.style.transform = `translateX(${deltaX}px)`;
            todoItem.style.transition = 'none';
        }
    }

    /**
     * 터치 종료 핸들러
     */
    handleTouchEnd(e, todoItem, todoId) {
        if (!this.currentSwipedItem) return;

        const touch = e.changedTouches[0];
        const deltaX = touch.clientX - this.touchStartX;
        const deltaY = touch.clientY - this.touchStartY;
        const deltaTime = Date.now() - this.touchStartTime;

        // 세로 이동이 더 크면 스와이프 무시
        if (Math.abs(deltaY) > Math.abs(deltaX)) {
            this.resetSwipe();
            return;
        }

        // 스와이프 거리와 시간 체크
        if (Math.abs(deltaX) > this.swipeThreshold && deltaTime < this.swipeTimeout) {
            if (deltaX > 0) {
                // 오른쪽 스와이프: 완료/핀 액션
                this.showRightSwipeActions(todoItem, todoId);
            } else {
                // 왼쪽 스와이프: 삭제/뽀모도로 액션
                this.showLeftSwipeActions(todoItem, todoId);
            }
        } else {
            // 스와이프 취소
            this.resetSwipe();
        }
    }

    /**
     * 오른쪽 스와이프 액션 표시 (완료)
     */
    showRightSwipeActions(todoItem, todoId) {
        const todo = this.todoManager.todos.find(t => t.id === todoId);
        if (!todo) {
            this.resetSwipe();
            return;
        }

        // 액션 컨테이너 생성
        this.swipeActions = document.createElement('div');
        this.swipeActions.className = 'swipe-actions swipe-actions-right';

        // 완료/미완료 버튼
        const completeBtn = document.createElement('button');
        completeBtn.className = 'swipe-action-btn swipe-complete';
        completeBtn.innerHTML = todo.completed ? 
            '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg>' : 
            '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>';
        completeBtn.addEventListener('click', () => {
            this.todoManager.toggleTodo(todoId);
            this.resetSwipe();
        });

        this.swipeActions.appendChild(completeBtn);

        todoItem.parentElement.style.position = 'relative';
        todoItem.parentElement.appendChild(this.swipeActions);

        // 아이템을 오른쪽으로 이동
        todoItem.style.transition = 'transform 0.3s ease';
        todoItem.style.transform = 'translateX(70px)';
    }

    /**
     * 왼쪽 스와이프 액션 표시 (삭제)
     */
    showLeftSwipeActions(todoItem, todoId) {
        // 액션 컨테이너 생성
        this.swipeActions = document.createElement('div');
        this.swipeActions.className = 'swipe-actions swipe-actions-left';

        // 삭제 버튼
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'swipe-action-btn swipe-delete';
        deleteBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>';
        deleteBtn.addEventListener('click', () => {
            this.todoManager.deleteTodo(todoId);
            this.resetSwipe();
        });

        this.swipeActions.appendChild(deleteBtn);

        todoItem.parentElement.style.position = 'relative';
        todoItem.parentElement.appendChild(this.swipeActions);

        // 아이템을 왼쪽으로 이동
        todoItem.style.transition = 'transform 0.3s ease';
        todoItem.style.transform = 'translateX(-70px)';
    }

    /**
     * 스와이프 상태 초기화
     */
    resetSwipe() {
        if (this.currentSwipedItem) {
            const item = this.currentSwipedItem.element;
            item.style.transition = 'transform 0.3s ease';
            item.style.transform = 'translateX(0)';
            
            setTimeout(() => {
                item.style.transition = '';
            }, 300);
        }

        if (this.swipeActions) {
            this.swipeActions.remove();
            this.swipeActions = null;
        }

        this.currentSwipedItem = null;
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.touchStartTime = 0;
    }

    /**
     * 모든 스와이프 초기화 (렌더링 시 호출)
     */
    resetAllSwipes() {
        this.resetSwipe();
    }
}
