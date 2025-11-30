/**
 * UI 유틸리티 - 모달, 토스트, 애니메이션 등
 */

import './types.js';

/**
 * 모달 관리 클래스
 */
export class ModalManager {
    /**
     * @param {string} modalId - 모달 엘리먼트 ID
     */
    constructor(modalId) {
        this.modal = document.getElementById(modalId);
        this.isOpen = false;
        this.onClose = null;
    }

    /**
     * 모달 열기
     * @param {Function} [onCloseCallback] - 닫힐 때 실행할 콜백
     */
    open(onCloseCallback) {
        if (!this.modal) return;
        
        this.modal.style.display = 'flex';
        this.isOpen = true;
        this.onClose = onCloseCallback;

        // ESC 키로 닫기
        this.escapeListener = (e) => {
            if (e.key === 'Escape') {
                this.close();
            }
        };
        document.addEventListener('keydown', this.escapeListener);
    }

    /**
     * 모달 닫기
     */
    close() {
        if (!this.modal) return;
        
        this.modal.style.display = 'none';
        this.isOpen = false;

        if (this.escapeListener) {
            document.removeEventListener('keydown', this.escapeListener);
            this.escapeListener = null;
        }

        if (this.onClose) {
            this.onClose();
            this.onClose = null;
        }
    }

    /**
     * 모달 토글
     */
    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    /**
     * 모달 내용 설정
     * @param {Object} content - 설정할 내용
     */
    setContent(content) {
        if (!this.modal) return;

        Object.entries(content).forEach(([selector, value]) => {
            const element = this.modal.querySelector(selector);
            if (element) {
                if (typeof value === 'string') {
                    element.textContent = value;
                } else if (value instanceof HTMLElement) {
                    element.innerHTML = '';
                    element.appendChild(value);
                }
            }
        });
    }
}

/**
 * 토스트 메시지 표시
 * @param {string} message - 메시지
 * @param {Object} options - 옵션
 * @param {string} [options.type='info'] - 타입 (success, error, warning, info)
 * @param {number} [options.duration=3000] - 표시 시간 (ms)
 * @param {string} [options.position='bottom'] - 위치 (top, bottom)
 */
export function showToast(message, options = {}) {
    const {
        type = 'info',
        duration = 3000,
        position = 'bottom',
    } = options;

    const colors = {
        success: '#34c759',
        error: '#ff3b30',
        warning: '#ff9500',
        info: '#007aff',
    };

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        ${position}: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: ${colors[type] || colors.info};
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        z-index: 10000;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        animation: toast-slide-in 0.3s ease, toast-slide-out 0.3s ease ${(duration - 300) / 1000}s forwards;
        pointer-events: none;
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, duration);
}

/**
 * 확인 다이얼로그 표시
 * @param {string} message - 메시지
 * @param {Object} options - 옵션
 * @returns {Promise<boolean>} - 확인 여부
 */
export function showConfirm(message, options = {}) {
    const {
        title = '확인',
        confirmText = '확인',
        cancelText = '취소',
    } = options;

    return new Promise((resolve) => {
        // 간단한 네이티브 confirm 사용
        // 향후 커스텀 다이얼로그로 대체 가능
        const result = confirm(`${title}\n\n${message}`);
        resolve(result);
    });
}

/**
 * 애니메이션 유틸리티
 */
export class AnimationUtils {
    /**
     * 페이드 인 애니메이션
     * @param {HTMLElement} element - 대상 엘리먼트
     * @param {number} [duration=300] - 지속 시간 (ms)
     */
    static fadeIn(element, duration = 300) {
        element.style.opacity = '0';
        element.style.display = 'block';
        
        let start = null;
        
        const animate = (timestamp) => {
            if (!start) start = timestamp;
            const progress = timestamp - start;
            const opacity = Math.min(progress / duration, 1);
            
            element.style.opacity = opacity.toString();
            
            if (progress < duration) {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
    }

    /**
     * 페이드 아웃 애니메이션
     * @param {HTMLElement} element - 대상 엘리먼트
     * @param {number} [duration=300] - 지속 시간 (ms)
     * @returns {Promise<void>}
     */
    static fadeOut(element, duration = 300) {
        return new Promise((resolve) => {
            let start = null;
            
            const animate = (timestamp) => {
                if (!start) start = timestamp;
                const progress = timestamp - start;
                const opacity = 1 - Math.min(progress / duration, 1);
                
                element.style.opacity = opacity.toString();
                
                if (progress < duration) {
                    requestAnimationFrame(animate);
                } else {
                    element.style.display = 'none';
                    resolve();
                }
            };
            
            requestAnimationFrame(animate);
        });
    }

    /**
     * 슬라이드 다운 애니메이션
     * @param {HTMLElement} element - 대상 엘리먼트
     * @param {number} [duration=300] - 지속 시간 (ms)
     */
    static slideDown(element, duration = 300) {
        element.style.height = '0';
        element.style.overflow = 'hidden';
        element.style.display = 'block';
        
        const targetHeight = element.scrollHeight;
        let start = null;
        
        const animate = (timestamp) => {
            if (!start) start = timestamp;
            const progress = timestamp - start;
            const height = Math.min((progress / duration) * targetHeight, targetHeight);
            
            element.style.height = height + 'px';
            
            if (progress < duration) {
                requestAnimationFrame(animate);
            } else {
                element.style.height = 'auto';
                element.style.overflow = '';
            }
        };
        
        requestAnimationFrame(animate);
    }

    /**
     * 펄스 애니메이션
     * @param {HTMLElement} element - 대상 엘리먼트
     * @param {number} [count=1] - 반복 횟수
     */
    static pulse(element, count = 1) {
        const originalTransform = element.style.transform;
        let iteration = 0;
        
        const animate = () => {
            element.style.transform = 'scale(1.05)';
            
            setTimeout(() => {
                element.style.transform = 'scale(1)';
                iteration++;
                
                if (iteration < count) {
                    setTimeout(animate, 100);
                } else {
                    element.style.transform = originalTransform;
                }
            }, 150);
        };
        
        animate();
    }
}

/**
 * DOM 조작 유틸리티
 */
export class DOMUtils {
    /**
     * 엘리먼트 생성
     * @param {string} tag - 태그 이름
     * @param {Object} [attributes] - 속성
     * @param {string|HTMLElement|HTMLElement[]} [children] - 자식 엘리먼트
     * @returns {HTMLElement}
     */
    static createElement(tag, attributes = {}, children = null) {
        const element = document.createElement(tag);
        
        // 속성 설정
        Object.entries(attributes).forEach(([key, value]) => {
            if (key === 'className') {
                element.className = value;
            } else if (key === 'style' && typeof value === 'object') {
                Object.assign(element.style, value);
            } else if (key.startsWith('on') && typeof value === 'function') {
                const eventName = key.substring(2).toLowerCase();
                element.addEventListener(eventName, value);
            } else {
                element.setAttribute(key, value);
            }
        });
        
        // 자식 추가
        if (children) {
            if (typeof children === 'string') {
                element.textContent = children;
            } else if (children instanceof HTMLElement) {
                element.appendChild(children);
            } else if (Array.isArray(children)) {
                children.forEach(child => {
                    if (child instanceof HTMLElement) {
                        element.appendChild(child);
                    }
                });
            }
        }
        
        return element;
    }

    /**
     * 가장 가까운 부모 엘리먼트 찾기
     * @param {HTMLElement} element - 시작 엘리먼트
     * @param {string} selector - 선택자
     * @returns {HTMLElement|null}
     */
    static closest(element, selector) {
        return element.closest(selector);
    }

    /**
     * 스무스 스크롤
     * @param {HTMLElement} element - 대상 엘리먼트
     * @param {Object} [options] - 옵션
     */
    static smoothScroll(element, options = {}) {
        const {
            behavior = 'smooth',
            block = 'center',
            inline = 'nearest',
        } = options;

        element.scrollIntoView({ behavior, block, inline });
    }

    /**
     * 엘리먼트가 뷰포트에 있는지 확인
     * @param {HTMLElement} element - 확인할 엘리먼트
     * @returns {boolean}
     */
    static isInViewport(element) {
        const rect = element.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    }
}

/**
 * CSS 애니메이션 스타일 추가 (동적)
 */
export function injectAnimationStyles() {
    const styleId = 'ui-utils-animations';
    
    // 이미 추가되었으면 스킵
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
        @keyframes toast-slide-in {
            from {
                opacity: 0;
                transform: translateX(-50%) translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateX(-50%) translateY(0);
            }
        }

        @keyframes toast-slide-out {
            from {
                opacity: 1;
                transform: translateX(-50%) translateY(0);
            }
            to {
                opacity: 0;
                transform: translateX(-50%) translateY(20px);
            }
        }
    `;

    document.head.appendChild(style);
}

// 페이지 로드 시 애니메이션 스타일 주입
if (typeof window !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectAnimationStyles);
    } else {
        injectAnimationStyles();
    }
}
