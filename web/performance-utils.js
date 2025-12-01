/**
 * 성능 최적화 유틸리티
 */

// ===== WeakMap/WeakSet 기반 메모리 관리 =====

/**
 * 이벤트 리스너 추적 - WeakMap 활용으로 메모리 누수 방지
 * @type {WeakMap<HTMLElement, Map<string, Function[]>>}
 */
const elementListeners = new WeakMap();

/**
 * 타이머 추적 - WeakMap 활용
 * @type {WeakMap<Object, Set<number>>}
 */
const objectTimers = new WeakMap();

/**
 * 요소에 이벤트 리스너 추가 및 추적
 * @param {HTMLElement} element - 대상 엘리먼트
 * @param {string} eventType - 이벤트 타입
 * @param {Function} handler - 핸들러 함수
 * @param {Object} [options] - addEventListener 옵션
 * @returns {Function} - cleanup 함수
 */
export function addTrackedEventListener(element, eventType, handler, options) {
    if (!element || typeof handler !== 'function') return () => {};

    // 리스너 맵 초기화
    if (!elementListeners.has(element)) {
        elementListeners.set(element, new Map());
    }

    const listenersMap = elementListeners.get(element);
    
    if (!listenersMap.has(eventType)) {
        listenersMap.set(eventType, []);
    }

    listenersMap.get(eventType).push(handler);
    element.addEventListener(eventType, handler, options);

    // cleanup 함수 반환
    return () => {
        element.removeEventListener(eventType, handler, options);
        const handlers = listenersMap.get(eventType);
        if (handlers) {
            const index = handlers.indexOf(handler);
            if (index > -1) {
                handlers.splice(index, 1);
            }
        }
    };
}

/**
 * 요소의 모든 이벤트 리스너 제거
 * @param {HTMLElement} element - 대상 엘리먼트
 */
export function removeAllTrackedListeners(element) {
    if (!elementListeners.has(element)) return;

    const listenersMap = elementListeners.get(element);
    
    listenersMap.forEach((handlers, eventType) => {
        handlers.forEach(handler => {
            element.removeEventListener(eventType, handler);
        });
    });

    elementListeners.delete(element);
}

/**
 * 객체에 타이머 추가 및 추적
 * @param {Object} owner - 타이머 소유 객체
 * @param {Function} callback - 콜백 함수
 * @param {number} delay - 지연 시간 (ms)
 * @returns {{timerId: number, cleanup: Function}} - 타이머 ID와 cleanup 함수
 */
export function addTrackedTimeout(owner, callback, delay) {
    if (!objectTimers.has(owner)) {
        objectTimers.set(owner, new Set());
    }

    const timers = objectTimers.get(owner);
    const timerId = setTimeout(() => {
        callback();
        timers.delete(timerId);
    }, delay);

    timers.add(timerId);

    return {
        timerId,
        cleanup: () => {
            clearTimeout(timerId);
            timers.delete(timerId);
        }
    };
}

/**
 * 객체에 인터벌 추가 및 추적
 * @param {Object} owner - 인터벌 소유 객체
 * @param {Function} callback - 콜백 함수
 * @param {number} interval - 인터벌 시간 (ms)
 * @returns {{intervalId: number, cleanup: Function}} - 인터벌 ID와 cleanup 함수
 */
export function addTrackedInterval(owner, callback, interval) {
    if (!objectTimers.has(owner)) {
        objectTimers.set(owner, new Set());
    }

    const timers = objectTimers.get(owner);
    const intervalId = setInterval(callback, interval);
    timers.add(intervalId);

    return {
        intervalId,
        cleanup: () => {
            clearInterval(intervalId);
            timers.delete(intervalId);
        }
    };
}

/**
 * 객체의 모든 타이머/인터벌 정리
 * @param {Object} owner - 타이머 소유 객체
 */
export function clearAllTrackedTimers(owner) {
    if (!objectTimers.has(owner)) return;

    const timers = objectTimers.get(owner);
    timers.forEach(id => {
        clearTimeout(id);
        clearInterval(id);
    });

    objectTimers.delete(owner);
}

/**
 * 메모리 누수 체커 유틸리티
 */
export class MemoryLeakChecker {
    constructor() {
        /** @type {WeakSet<Object>} - 추적 중인 객체들 */
        this.trackedObjects = new WeakSet();
        /** @type {Map<string, number>} - 카운터 (디버그용) */
        this.counters = new Map();
    }

    /**
     * 객체 추적 시작
     * @param {Object} obj - 추적할 객체
     * @param {string} [label] - 디버그 라벨
     */
    track(obj, label = 'unknown') {
        if (obj && typeof obj === 'object') {
            this.trackedObjects.add(obj);
            this.counters.set(label, (this.counters.get(label) || 0) + 1);
        }
    }

    /**
     * 객체 추적 해제
     * @param {Object} obj - 해제할 객체
     * @param {string} [label] - 디버그 라벨
     */
    untrack(obj, label = 'unknown') {
        if (obj && typeof obj === 'object') {
            this.trackedObjects.delete(obj);
            const count = this.counters.get(label) || 0;
            if (count > 0) {
                this.counters.set(label, count - 1);
            }
        }
    }

    /**
     * 현재 추적 상태 리포트 (디버그용)
     * @returns {Object} - 추적 통계
     */
    getReport() {
        const report = {};
        this.counters.forEach((count, label) => {
            report[label] = count;
        });
        return report;
    }

    /**
     * 카운터 초기화
     */
    reset() {
        this.counters.clear();
    }
}

// 전역 메모리 누수 체커 인스턴스
export const memoryLeakChecker = new MemoryLeakChecker();

/**
 * Debounce 함수 - 연속 호출 방지
 * @param {Function} func - 실행할 함수
 * @param {number} wait - 대기 시간 (ms)
 * @returns {Function} - debounced 함수
 */
export function debounce(func, wait = 300) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Throttle 함수 - 일정 시간마다만 실행
 * @param {Function} func - 실행할 함수  
 * @param {number} limit - 제한 시간 (ms)
 * @returns {Function} - throttled 함수
 */
export function throttle(func, limit = 300) {
    let inThrottle;
    return function executedFunction(...args) {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * requestAnimationFrame을 사용한 최적화된 렌더링
 * @param {Function} callback - 렌더링 콜백
 * @returns {Function} - 최적화된 렌더링 함수
 */
export function rafThrottle(callback) {
    let rafId = null;
    let lastArgs = null;

    return function throttled(...args) {
        lastArgs = args;
        
        if (rafId === null) {
            rafId = requestAnimationFrame(() => {
                callback(...lastArgs);
                rafId = null;
            });
        }
    };
}

/**
 * 가상 DOM 비교 및 업데이트 (간단한 구현)
 * @param {HTMLElement} container - 컨테이너 엘리먼트
 * @param {Array} oldItems - 이전 항목들
 * @param {Array} newItems - 새 항목들
 * @param {Function} createElementFn - 엘리먼트 생성 함수
 * @param {Function} getKeyFn - 키 추출 함수
 */
export function updateListIncremental(container, oldItems, newItems, createElementFn, getKeyFn) {
    const oldMap = new Map();
    const existingElements = Array.from(container.children);

    // 기존 엘리먼트를 맵으로 저장
    existingElements.forEach((el, index) => {
        if (oldItems[index]) {
            const key = getKeyFn(oldItems[index]);
            oldMap.set(key, { element: el, item: oldItems[index] });
        }
    });

    // 새 항목들 처리
    const fragment = document.createDocumentFragment();
    const usedElements = new Set();

    newItems.forEach((newItem, index) => {
        const key = getKeyFn(newItem);
        const existing = oldMap.get(key);

        if (existing) {
            // 기존 엘리먼트 재사용
            const oldItem = existing.item;
            
            // 데이터가 변경되었는지 확인
            if (JSON.stringify(oldItem) !== JSON.stringify(newItem)) {
                // 변경되었으면 새로 생성
                const newElement = createElementFn(newItem);
                fragment.appendChild(newElement);
            } else {
                // 변경 없으면 기존 엘리먼트 재사용
                fragment.appendChild(existing.element);
            }
            usedElements.add(key);
        } else {
            // 새 항목이면 생성
            const newElement = createElementFn(newItem);
            fragment.appendChild(newElement);
        }
    });

    // 컨테이너 업데이트
    container.innerHTML = '';
    container.appendChild(fragment);

    // 사용되지 않은 엘리먼트 정리 (메모리 누수 방지)
    oldMap.forEach((value, key) => {
        if (!usedElements.has(key)) {
            // 이벤트 리스너 정리 등 필요한 경우 여기서 처리
            value.element.remove();
        }
    });
}

/**
 * 메모리 사용량 모니터링 (개발 환경)
 * @returns {Object} - 메모리 정보
 */
export function getMemoryInfo() {
    if (performance.memory) {
        return {
            used: (performance.memory.usedJSHeapSize / 1048576).toFixed(2) + ' MB',
            total: (performance.memory.totalJSHeapSize / 1048576).toFixed(2) + ' MB',
            limit: (performance.memory.jsHeapSizeLimit / 1048576).toFixed(2) + ' MB',
        };
    }
    return null;
}

/**
 * 이벤트 위임 헬퍼
 * @param {HTMLElement} parent - 부모 엘리먼트
 * @param {string} eventType - 이벤트 타입
 * @param {string} selector - 선택자
 * @param {Function} handler - 핸들러 함수
 * @returns {Function} - cleanup 함수
 */
export function delegateEvent(parent, eventType, selector, handler) {
    const listener = (event) => {
        const target = event.target.closest(selector);
        if (target && parent.contains(target)) {
            handler.call(target, event);
        }
    };

    parent.addEventListener(eventType, listener);

    // cleanup 함수 반환
    return () => {
        parent.removeEventListener(eventType, listener);
    };
}

/**
 * 배치 업데이트 큐 - 여러 업데이트를 모아서 한 번에 처리
 */
export class BatchUpdateQueue {
    constructor(updateFn, delay = 16) {
        this.updateFn = updateFn;
        this.delay = delay;
        this.queue = new Set();
        this.timeout = null;
    }

    add(item) {
        this.queue.add(item);
        this.scheduleFlush();
    }

    scheduleFlush() {
        if (this.timeout) return;

        this.timeout = setTimeout(() => {
            this.flush();
        }, this.delay);
    }

    flush() {
        if (this.queue.size === 0) return;

        const items = Array.from(this.queue);
        this.queue.clear();
        this.timeout = null;

        // requestAnimationFrame으로 렌더링 최적화
        requestAnimationFrame(() => {
            this.updateFn(items);
        });
    }

    clear() {
        this.queue.clear();
        if (this.timeout) {
            clearTimeout(this.timeout);
            this.timeout = null;
        }
    }
}

/**
 * 지연 로딩 이미지 (Intersection Observer 활용)
 * @param {HTMLElement} container - 컨테이너
 * @param {string} selector - 이미지 선택자
 */
export function lazyLoadImages(container, selector = 'img[data-src]') {
    const images = container.querySelectorAll(selector);
    
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                    imageObserver.unobserve(img);
                }
            });
        });

        images.forEach(img => imageObserver.observe(img));
        
        return () => imageObserver.disconnect();
    } else {
        // 폴백: 즉시 로드
        images.forEach(img => {
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
        });
    }
}
