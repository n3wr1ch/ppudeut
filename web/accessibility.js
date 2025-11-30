/**
 * 키보드 단축키 관리
 */

import './types.js';

/**
 * 키보드 단축키 매니저
 */
export class KeyboardShortcutManager {
    constructor() {
        this.shortcuts = new Map();
        this.enabled = true;
        this.handleKeyDown = this.handleKeyDown.bind(this);
    }

    /**
     * 단축키 등록
     * @param {string} key - 키 조합 (예: 'ctrl+s', 'alt+n')
     * @param {Function} handler - 핸들러 함수
     * @param {string} [description] - 설명
     */
    register(key, handler, description = '') {
        const normalizedKey = this.normalizeKey(key);
        this.shortcuts.set(normalizedKey, { handler, description });
    }

    /**
     * 단축키 해제
     * @param {string} key - 키 조합
     */
    unregister(key) {
        const normalizedKey = this.normalizeKey(key);
        this.shortcuts.delete(normalizedKey);
    }

    /**
     * 모든 단축키 해제
     */
    unregisterAll() {
        this.shortcuts.clear();
    }

    /**
     * 단축키 활성화
     */
    enable() {
        if (!this.enabled) {
            this.enabled = true;
            document.addEventListener('keydown', this.handleKeyDown);
        }
    }

    /**
     * 단축키 비활성화
     */
    disable() {
        if (this.enabled) {
            this.enabled = false;
            document.removeEventListener('keydown', this.handleKeyDown);
        }
    }

    /**
     * 키 이벤트 처리
     * @param {KeyboardEvent} event - 키보드 이벤트
     */
    handleKeyDown(event) {
        if (!this.enabled) return;

        // 입력 필드에서는 단축키 비활성화
        const target = event.target;
        if (
            target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            target.isContentEditable
        ) {
            return;
        }

        const key = this.getKeyFromEvent(event);
        const shortcut = this.shortcuts.get(key);

        if (shortcut) {
            event.preventDefault();
            shortcut.handler(event);
        }
    }

    /**
     * 이벤트에서 키 조합 추출
     * @param {KeyboardEvent} event - 키보드 이벤트
     * @returns {string} - 키 조합
     */
    getKeyFromEvent(event) {
        const parts = [];

        if (event.ctrlKey || event.metaKey) parts.push('ctrl');
        if (event.altKey) parts.push('alt');
        if (event.shiftKey) parts.push('shift');

        const key = event.key.toLowerCase();
        parts.push(key);

        return parts.join('+');
    }

    /**
     * 키 조합 정규화
     * @param {string} key - 키 조합
     * @returns {string} - 정규화된 키 조합
     */
    normalizeKey(key) {
        const parts = key.toLowerCase().split('+').map(p => p.trim());
        const modifiers = [];
        let mainKey = '';

        parts.forEach(part => {
            if (part === 'ctrl' || part === 'cmd' || part === 'meta') {
                if (!modifiers.includes('ctrl')) modifiers.push('ctrl');
            } else if (part === 'alt' || part === 'option') {
                if (!modifiers.includes('alt')) modifiers.push('alt');
            } else if (part === 'shift') {
                if (!modifiers.includes('shift')) modifiers.push('shift');
            } else {
                mainKey = part;
            }
        });

        // 정렬: ctrl, alt, shift 순서
        modifiers.sort((a, b) => {
            const order = ['ctrl', 'alt', 'shift'];
            return order.indexOf(a) - order.indexOf(b);
        });

        return [...modifiers, mainKey].join('+');
    }

    /**
     * 등록된 단축키 목록 반환
     * @returns {Array<{key: string, description: string}>}
     */
    getShortcuts() {
        const result = [];
        this.shortcuts.forEach((value, key) => {
            result.push({
                key: this.formatKey(key),
                description: value.description,
            });
        });
        return result;
    }

    /**
     * 키 조합을 읽기 쉬운 형식으로 변환
     * @param {string} key - 키 조합
     * @returns {string} - 포맷된 키 조합
     */
    formatKey(key) {
        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        
        return key
            .split('+')
            .map(part => {
                switch (part) {
                    case 'ctrl':
                        return isMac ? '⌘' : 'Ctrl';
                    case 'alt':
                        return isMac ? '⌥' : 'Alt';
                    case 'shift':
                        return isMac ? '⇧' : 'Shift';
                    case 'enter':
                        return '⏎';
                    case 'escape':
                        return 'Esc';
                    case 'arrowup':
                        return '↑';
                    case 'arrowdown':
                        return '↓';
                    case 'arrowleft':
                        return '←';
                    case 'arrowright':
                        return '→';
                    default:
                        return part.toUpperCase();
                }
            })
            .join(isMac ? '' : '+');
    }
}

/**
 * 접근성 헬퍼 함수들
 */
export class AccessibilityHelper {
    /**
     * 포커스 트랩 설정 (모달 등에서 사용)
     * @param {HTMLElement} container - 컨테이너 엘리먼트
     * @returns {Function} - cleanup 함수
     */
    static trapFocus(container) {
        const focusableElements = container.querySelectorAll(
            'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        const handleKeyDown = (e) => {
            if (e.key !== 'Tab') return;

            if (e.shiftKey) {
                // Shift + Tab
                if (document.activeElement === firstElement) {
                    e.preventDefault();
                    lastElement.focus();
                }
            } else {
                // Tab
                if (document.activeElement === lastElement) {
                    e.preventDefault();
                    firstElement.focus();
                }
            }
        };

        container.addEventListener('keydown', handleKeyDown);

        // 첫 번째 요소에 포커스
        if (firstElement) {
            firstElement.focus();
        }

        // cleanup 함수 반환
        return () => {
            container.removeEventListener('keydown', handleKeyDown);
        };
    }

    /**
     * 스크린 리더 전용 텍스트 공지
     * @param {string} message - 공지할 메시지
     * @param {string} [priority='polite'] - 우선순위 ('polite' | 'assertive')
     */
    static announce(message, priority = 'polite') {
        let announcer = document.getElementById('screen-reader-announcer');
        
        if (!announcer) {
            announcer = document.createElement('div');
            announcer.id = 'screen-reader-announcer';
            announcer.setAttribute('aria-live', priority);
            announcer.setAttribute('aria-atomic', 'true');
            announcer.style.cssText = `
                position: absolute;
                left: -10000px;
                width: 1px;
                height: 1px;
                overflow: hidden;
            `;
            document.body.appendChild(announcer);
        } else {
            announcer.setAttribute('aria-live', priority);
        }

        // 내용 업데이트
        announcer.textContent = message;

        // 1초 후 초기화
        setTimeout(() => {
            announcer.textContent = '';
        }, 1000);
    }

    /**
     * 키보드 네비게이션 가능한 리스트 생성
     * @param {HTMLElement} listElement - 리스트 엘리먼트
     * @param {Object} [options] - 옵션
     * @returns {Function} - cleanup 함수
     */
    static makeListNavigable(listElement, options = {}) {
        const {
            itemSelector = 'li',
            onSelect = null,
            loop = true,
        } = options;

        const handleKeyDown = (e) => {
            const items = Array.from(listElement.querySelectorAll(itemSelector));
            const currentIndex = items.indexOf(document.activeElement);

            let nextIndex = currentIndex;

            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    nextIndex = currentIndex + 1;
                    if (nextIndex >= items.length) {
                        nextIndex = loop ? 0 : items.length - 1;
                    }
                    break;

                case 'ArrowUp':
                    e.preventDefault();
                    nextIndex = currentIndex - 1;
                    if (nextIndex < 0) {
                        nextIndex = loop ? items.length - 1 : 0;
                    }
                    break;

                case 'Home':
                    e.preventDefault();
                    nextIndex = 0;
                    break;

                case 'End':
                    e.preventDefault();
                    nextIndex = items.length - 1;
                    break;

                case 'Enter':
                case ' ':
                    if (onSelect && currentIndex >= 0) {
                        e.preventDefault();
                        onSelect(items[currentIndex], currentIndex);
                    }
                    break;

                default:
                    return;
            }

            if (nextIndex !== currentIndex && items[nextIndex]) {
                items[nextIndex].focus();
            }
        };

        listElement.addEventListener('keydown', handleKeyDown);

        return () => {
            listElement.removeEventListener('keydown', handleKeyDown);
        };
    }

    /**
     * 색상 대비 확인
     * @param {string} foreground - 전경색 (hex)
     * @param {string} background - 배경색 (hex)
     * @returns {Object} - { ratio: number, wcagAA: boolean, wcagAAA: boolean }
     */
    static checkColorContrast(foreground, background) {
        const getLuminance = (hex) => {
            const rgb = parseInt(hex.slice(1), 16);
            const r = ((rgb >> 16) & 0xff) / 255;
            const g = ((rgb >> 8) & 0xff) / 255;
            const b = (rgb & 0xff) / 255;

            const [rs, gs, bs] = [r, g, b].map(c => 
                c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
            );

            return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
        };

        const l1 = getLuminance(foreground);
        const l2 = getLuminance(background);
        const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);

        return {
            ratio: Math.round(ratio * 100) / 100,
            wcagAA: ratio >= 4.5,
            wcagAAA: ratio >= 7,
        };
    }
}
