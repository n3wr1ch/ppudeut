/**
 * 보안 유틸리티 - XSS 방지 및 입력 새니타이징
 */

/**
 * HTML 특수 문자 이스케이프
 * @param {string} text - 이스케이프할 텍스트
 * @returns {string} - 이스케이프된 안전한 텍스트
 */
export function escapeHtml(text) {
    if (typeof text !== 'string') return '';
    
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * 사용자 입력 검증 및 새니타이징
 * @param {string} input - 검증할 입력
 * @param {Object} options - 검증 옵션
 * @returns {Object} - { valid: boolean, sanitized: string, error?: string }
 */
export function validateAndSanitizeInput(input, options = {}) {
    const {
        maxLength = 200,
        minLength = 0,
        allowHtml = false,
        allowNewlines = false,
    } = options;

    // null/undefined 체크
    if (input == null) {
        return { valid: false, sanitized: '', error: '입력값이 비어있습니다.' };
    }

    // 문자열로 변환
    let sanitized = String(input);

    // 공백 제거
    sanitized = sanitized.trim();

    // 길이 검증
    if (sanitized.length < minLength) {
        return { 
            valid: false, 
            sanitized: '', 
            error: `최소 ${minLength}자 이상 입력해주세요.` 
        };
    }

    if (sanitized.length > maxLength) {
        return { 
            valid: false, 
            sanitized: '', 
            error: `최대 ${maxLength}자까지 입력 가능합니다.` 
        };
    }

    // 개행 문자 처리
    if (!allowNewlines) {
        sanitized = sanitized.replace(/[\r\n]+/g, ' ');
    }

    // HTML 이스케이프 (기본값)
    if (!allowHtml) {
        sanitized = escapeHtml(sanitized);
    }

    // 위험한 문자 패턴 체크
    const dangerousPatterns = [
        /<script[^>]*>.*?<\/script>/gi,
        /javascript:/gi,
        /on\w+\s*=/gi, // onclick, onerror 등
        /<iframe/gi,
        /<object/gi,
        /<embed/gi,
    ];

    for (const pattern of dangerousPatterns) {
        if (pattern.test(input)) {
            return {
                valid: false,
                sanitized: '',
                error: '허용되지 않는 문자가 포함되어 있습니다.',
            };
        }
    }

    return { valid: true, sanitized };
}

/**
 * localStorage 데이터 난독화(Obfuscation)
 * 
 * ⚠️ 보안 경고 ⚠️
 * 이것은 암호화가 아닙니다! 단순 난독화(obfuscation)일 뿐입니다.
 * - 키가 소스코드에 하드코딩되어 있어 누구나 복호화 가능
 * - XOR 암호화는 암호학적으로 안전하지 않음
 * - 민감한 데이터 보호에는 적합하지 않음
 * 
 * 진짜 암호화가 필요하다면:
 * - Web Crypto API (SubtleCrypto) 사용
 * - 또는 서버 측 암호화 권장
 * 
 * 이 함수는 캐주얼한 관찰자로부터의 난독화 용도로만 사용하세요.
 */
const OBFUSCATION_KEY = 'ppudeut-obfuscation-key-2025';

/**
 * 간단한 XOR 난독화 (암호화 아님!)
 * @deprecated 보안이 필요하면 Web Crypto API 사용 권장
 * @param {string} text - 난독화할 텍스트
 * @param {string} key - 난독화 키
 * @returns {string} - Base64 인코딩된 난독화 텍스트
 */
export function simpleEncrypt(text, key = OBFUSCATION_KEY) {
    try {
        const textBytes = new TextEncoder().encode(text);
        const keyBytes = new TextEncoder().encode(key);
        
        const obfuscated = new Uint8Array(textBytes.length);
        for (let i = 0; i < textBytes.length; i++) {
            obfuscated[i] = textBytes[i] ^ keyBytes[i % keyBytes.length];
        }
        
        // Base64 인코딩
        return btoa(String.fromCharCode(...obfuscated));
    } catch (error) {
        console.error('난독화 실패:', error);
        return text; // 실패 시 원본 반환 (폴백)
    }
}

/**
 * 간단한 XOR 난독화 해제 (복호화 아님!)
 * @deprecated 보안이 필요하면 Web Crypto API 사용 권장
 * @param {string} obfuscated - Base64 인코딩된 난독화 텍스트
 * @param {string} key - 난독화 키
 * @returns {string} - 원본 텍스트
 */
export function simpleDecrypt(obfuscated, key = OBFUSCATION_KEY) {
    try {
        // Base64 디코딩
        const obfuscatedBytes = Uint8Array.from(atob(obfuscated), c => c.charCodeAt(0));
        const keyBytes = new TextEncoder().encode(key);
        
        const decoded = new Uint8Array(obfuscatedBytes.length);
        for (let i = 0; i < obfuscatedBytes.length; i++) {
            decoded[i] = obfuscatedBytes[i] ^ keyBytes[i % keyBytes.length];
        }
        
        return new TextDecoder().decode(decoded);
    } catch (error) {
        console.error('난독화 해제 실패:', error);
        return obfuscated; // 실패 시 원본 반환 (폴백)
    }
}

/**
 * 안전한 localStorage 저장
 * @param {string} key - 저장 키
 * @param {*} value - 저장할 값
 * @param {boolean} encrypt - 암호화 여부
 * @returns {boolean} - 성공 여부
 */
export function safeLocalStorageSet(key, value, encrypt = false) {
    try {
        let stringValue = typeof value === 'string' ? value : JSON.stringify(value);
        
        if (encrypt) {
            stringValue = simpleEncrypt(stringValue);
        }
        
        localStorage.setItem(key, stringValue);
        return true;
    } catch (error) {
        console.error(`localStorage 저장 실패 [${key}]:`, error);
        return false;
    }
}

/**
 * 안전한 localStorage 읽기
 * @param {string} key - 읽을 키
 * @param {*} defaultValue - 기본값
 * @param {boolean} decrypt - 복호화 여부
 * @returns {*} - 읽은 값 또는 기본값
 */
export function safeLocalStorageGet(key, defaultValue = null, decrypt = false) {
    try {
        let value = localStorage.getItem(key);
        
        if (value === null) {
            return defaultValue;
        }
        
        if (decrypt) {
            value = simpleDecrypt(value);
        }
        
        // JSON 파싱 시도
        try {
            return JSON.parse(value);
        } catch {
            // JSON이 아니면 문자열 그대로 반환
            return value;
        }
    } catch (error) {
        console.error(`localStorage 읽기 실패 [${key}]:`, error);
        return defaultValue;
    }
}

/**
 * 에러 로깅 유틸리티
 * @param {string} context - 에러 발생 컨텍스트
 * @param {Error} error - 에러 객체
 * @param {Object} metadata - 추가 메타데이터
 */
export function logError(context, error, metadata = {}) {
    const errorLog = {
        timestamp: new Date().toISOString(),
        context,
        message: error?.message || String(error),
        stack: error?.stack,
        ...metadata,
    };

    // 콘솔 출력 (개발 환경)
    console.error(`[${context}]`, error, metadata);

    // 나중에 Sentry 등 에러 추적 서비스와 통합 가능
    // Sentry.captureException(error, { contexts: { custom: errorLog } });

    // localStorage에 에러 로그 저장 (최근 50개)
    try {
        const logs = JSON.parse(localStorage.getItem('error-logs') || '[]');
        logs.unshift(errorLog);
        localStorage.setItem('error-logs', JSON.stringify(logs.slice(0, 50)));
    } catch {
        // 로깅 실패는 무시
    }
}

/**
 * 사용자 친화적 에러 메시지 표시
 * @param {string} message - 표시할 메시지
 * @param {string} type - 메시지 타입 (error, warning, info)
 */
export function showUserMessage(message, type = 'error') {
    // 간단한 토스트 메시지 구현
    const toast = document.createElement('div');
    toast.className = `user-message user-message-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: ${type === 'error' ? '#ff3b30' : type === 'warning' ? '#ff9500' : '#007aff'};
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        font-size: 14px;
        z-index: 10000;
        animation: slide-up 0.3s ease, fade-out 0.3s ease 2.7s forwards;
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3000);
}
