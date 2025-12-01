/**
 * Security Utils 테스트
 * Node.js 환경에서 실행 (npm test로 실행 가능하도록 설계)
 */

import { TextEncoder, TextDecoder } from 'util';

// DOM 환경 Mock
const mockDocument = {
    createElement: (tag) => ({
        textContent: '',
        innerHTML: '',
        get innerHTML() {
            // textContent를 HTML 이스케이프된 형태로 반환
            return this.textContent
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
        },
        set textContent(val) {
            this._textContent = val;
        },
        get textContent() {
            return this._textContent || '';
        }
    }),
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

// 테스트 대상 모듈 import
import {
    escapeHtml,
    validateAndSanitizeInput,
    simpleEncrypt,
    simpleDecrypt,
    safeLocalStorageSet,
    safeLocalStorageGet,
    logError,
} from './security-utils.js';

// ===== 테스트 유틸리티 =====
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

// ===== 테스트 시작 =====
console.log('\n🔒 Security Utils 테스트 시작...\n');

// ===== escapeHtml 테스트 =====
console.log('--- escapeHtml ---');

test('일반 텍스트는 그대로 반환', () => {
    assertEqual(escapeHtml('Hello World'), 'Hello World');
});

test('HTML 태그 이스케이프', () => {
    const result = escapeHtml('<script>alert("xss")</script>');
    assertTrue(result.includes('&lt;'), 'Should escape <');
    assertTrue(result.includes('&gt;'), 'Should escape >');
    assertFalse(result.includes('<script>'), 'Should not contain raw script tag');
});

test('특수문자 이스케이프', () => {
    const result = escapeHtml('"test" & \'value\'');
    assertTrue(result.includes('&amp;'), 'Should escape &');
});

test('null/undefined 처리', () => {
    assertEqual(escapeHtml(null), '');
    assertEqual(escapeHtml(undefined), '');
    assertEqual(escapeHtml(123), '');
});

// ===== validateAndSanitizeInput 테스트 =====
console.log('\n--- validateAndSanitizeInput ---');

test('유효한 입력 통과', () => {
    const result = validateAndSanitizeInput('할 일 추가');
    assertTrue(result.valid);
    assertEqual(result.sanitized, '할 일 추가');
});

test('공백만 있는 입력 거부 (minLength 1)', () => {
    const result = validateAndSanitizeInput('   ', { minLength: 1 });
    assertFalse(result.valid);
    assertTrue(result.error.includes('최소'));
});

test('null 입력 거부', () => {
    const result = validateAndSanitizeInput(null);
    assertFalse(result.valid);
    assertEqual(result.error, '입력값이 비어있습니다.');
});

test('undefined 입력 거부', () => {
    const result = validateAndSanitizeInput(undefined);
    assertFalse(result.valid);
});

test('최대 길이 초과 거부', () => {
    const longText = 'a'.repeat(201);
    const result = validateAndSanitizeInput(longText, { maxLength: 200 });
    assertFalse(result.valid);
    assertTrue(result.error.includes('최대'));
});

test('최소 길이 미달 거부', () => {
    const result = validateAndSanitizeInput('ab', { minLength: 3 });
    assertFalse(result.valid);
    assertTrue(result.error.includes('최소'));
});

test('XSS 스크립트 태그 거부', () => {
    const result = validateAndSanitizeInput('<script>alert("xss")</script>');
    assertFalse(result.valid);
    assertTrue(result.error.includes('허용되지 않는'));
});

test('javascript: 프로토콜 거부', () => {
    const result = validateAndSanitizeInput('javascript:alert(1)');
    assertFalse(result.valid);
});

test('onclick 이벤트 핸들러 거부', () => {
    const result = validateAndSanitizeInput('test onclick=alert(1)');
    assertFalse(result.valid);
});

test('iframe 태그 거부', () => {
    const result = validateAndSanitizeInput('<iframe src="evil.com">');
    assertFalse(result.valid);
});

test('개행 문자 제거 (기본값)', () => {
    const result = validateAndSanitizeInput('line1\nline2\rline3');
    assertTrue(result.valid);
    assertFalse(result.sanitized.includes('\n'), 'Should not contain newline');
    assertFalse(result.sanitized.includes('\r'), 'Should not contain carriage return');
});

test('개행 문자 허용 (옵션)', () => {
    const result = validateAndSanitizeInput('line1\nline2', { allowNewlines: true });
    assertTrue(result.valid);
    assertTrue(result.sanitized.includes('\n'), 'Should contain newline');
});

test('앞뒤 공백 제거', () => {
    const result = validateAndSanitizeInput('  hello world  ');
    assertTrue(result.valid);
    assertEqual(result.sanitized, 'hello world');
});

test('빈 문자열은 minLength 0일 때 유효', () => {
    const result = validateAndSanitizeInput('', { minLength: 0 });
    assertTrue(result.valid);
    assertEqual(result.sanitized, '');
});

// ===== simpleEncrypt/simpleDecrypt 테스트 =====
console.log('\n--- simpleEncrypt/simpleDecrypt ---');

test('암호화 후 복호화 시 원본 복원', () => {
    const original = 'Hello, 세계! 🌍';
    const encrypted = simpleEncrypt(original);
    const decrypted = simpleDecrypt(encrypted);
    assertEqual(decrypted, original);
});

test('빈 문자열 처리', () => {
    const encrypted = simpleEncrypt('');
    const decrypted = simpleDecrypt(encrypted);
    assertEqual(decrypted, '');
});

test('긴 텍스트 처리', () => {
    const original = 'a'.repeat(1000);
    const encrypted = simpleEncrypt(original);
    const decrypted = simpleDecrypt(encrypted);
    assertEqual(decrypted, original);
});

test('특수문자 포함 텍스트', () => {
    const original = '!@#$%^&*()_+-=[]{}|;:\'",.<>?/\\`~';
    const encrypted = simpleEncrypt(original);
    const decrypted = simpleDecrypt(encrypted);
    assertEqual(decrypted, original);
});

test('JSON 데이터 처리', () => {
    const original = JSON.stringify({ name: '테스트', value: 123, nested: { a: 1 } });
    const encrypted = simpleEncrypt(original);
    const decrypted = simpleDecrypt(encrypted);
    assertEqual(decrypted, original);
});

test('커스텀 키 사용', () => {
    const original = 'secret data';
    const customKey = 'my-custom-key-12345';
    const encrypted = simpleEncrypt(original, customKey);
    const decrypted = simpleDecrypt(encrypted, customKey);
    assertEqual(decrypted, original);
});

test('다른 키로 복호화 시 원본과 다름', () => {
    const original = 'secret data';
    const encrypted = simpleEncrypt(original, 'key1');
    const decrypted = simpleDecrypt(encrypted, 'key2');
    assertTrue(decrypted !== original, 'Different keys should produce different results');
});

// ===== safeLocalStorageSet/Get 테스트 =====
console.log('\n--- safeLocalStorageSet/Get ---');

// localStorage 초기화
localStorage.clear();

test('문자열 저장 및 읽기', () => {
    safeLocalStorageSet('test-string', 'hello');
    const result = safeLocalStorageGet('test-string');
    assertEqual(result, 'hello');
});

test('객체 저장 및 읽기 (JSON)', () => {
    const obj = { name: 'test', value: 123 };
    safeLocalStorageSet('test-object', obj);
    const result = safeLocalStorageGet('test-object');
    assertEqual(result.name, obj.name);
    assertEqual(result.value, obj.value);
});

test('배열 저장 및 읽기', () => {
    const arr = [1, 2, 3, 'four', { five: 5 }];
    safeLocalStorageSet('test-array', arr);
    const result = safeLocalStorageGet('test-array');
    assertEqual(result.length, arr.length);
    assertEqual(result[3], 'four');
});

test('존재하지 않는 키 읽기 시 기본값 반환', () => {
    const result = safeLocalStorageGet('non-existent-key', 'default');
    assertEqual(result, 'default');
});

test('null 기본값', () => {
    const result = safeLocalStorageGet('non-existent-key-2');
    assertEqual(result, null);
});

test('암호화 저장 및 읽기', () => {
    const data = { secret: 'password123' };
    safeLocalStorageSet('encrypted-data', data, true);
    const result = safeLocalStorageGet('encrypted-data', null, true);
    assertEqual(result.secret, data.secret);
});

test('암호화된 데이터 직접 읽기 시 다른 값', () => {
    const data = { secret: 'password123' };
    safeLocalStorageSet('encrypted-data-2', data, true);
    const rawValue = localStorage.getItem('encrypted-data-2');
    assertTrue(rawValue !== JSON.stringify(data), 'Raw value should be encrypted');
});

// ===== logError 테스트 =====
console.log('\n--- logError ---');

test('에러 로깅 시 에러 로그 저장', () => {
    localStorage.clear();
    const error = new Error('Test error');
    logError('test-context', error, { extra: 'data' });
    
    const logs = JSON.parse(localStorage.getItem('error-logs') || '[]');
    assertTrue(logs.length > 0, 'Should have at least one log');
    assertEqual(logs[0].context, 'test-context');
    assertEqual(logs[0].message, 'Test error');
    assertEqual(logs[0].extra, 'data');
});

test('에러 로그 50개 제한', () => {
    localStorage.clear();
    
    // 60개 에러 로깅
    for (let i = 0; i < 60; i++) {
        logError(`context-${i}`, new Error(`error-${i}`));
    }
    
    const logs = JSON.parse(localStorage.getItem('error-logs') || '[]');
    assertTrue(logs.length <= 50, `Should have at most 50 logs, but has ${logs.length}`);
});

// ===== 결과 출력 =====
console.log('\n' + '='.repeat(40));
if (testsFailed === 0) {
    console.log(`✅ 모든 테스트 통과!`);
} else {
    console.log(`❌ 일부 테스트 실패`);
}
console.log(`📊 총 ${testsPassed + testsFailed}개 테스트: ${testsPassed}개 성공, ${testsFailed}개 실패`);

// 실패가 있으면 종료 코드 1
if (testsFailed > 0) {
    process.exit(1);
}
