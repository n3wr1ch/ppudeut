/**
 * 성능 최적화 유틸리티
 */

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
