/**
 * 사운드 관리 모듈
 * Web Audio API를 사용한 사운드 효과 재생
 */

import './types.js';

/**
 * 사운드 효과 매니저
 * Web Audio API를 사용하여 간단한 효과음 생성
 */
export class SoundManager {
    constructor() {
        /** @type {boolean} - 사운드 활성화 여부 */
        this.enabled = true;
        /** @type {AudioContext|null} - Web Audio Context */
        this.audioContext = null;
    }

    /**
     * AudioContext 초기화
     */
    init() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch {
            this.enabled = false;
        }
    }

    /**
     * 사운드 효과 재생
     * @param {'complete'|'levelup'|'achievement'|'click'} type - 사운드 타입
     */
    play(type) {
        if (!this.enabled || !this.audioContext) return;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        const now = this.audioContext.currentTime;
        
        switch (type) {
            case 'complete':
                oscillator.frequency.setValueAtTime(523.25, now); // C5
                oscillator.frequency.setValueAtTime(659.25, now + 0.1); // E5
                oscillator.frequency.setValueAtTime(783.99, now + 0.2); // G5
                gainNode.gain.setValueAtTime(0.3, now);
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
                oscillator.start(now);
                oscillator.stop(now + 0.4);
                break;
            case 'levelup':
                oscillator.frequency.setValueAtTime(523.25, now);
                oscillator.frequency.setValueAtTime(659.25, now + 0.1);
                oscillator.frequency.setValueAtTime(783.99, now + 0.2);
                oscillator.frequency.setValueAtTime(1046.50, now + 0.3);
                gainNode.gain.setValueAtTime(0.4, now);
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
                oscillator.start(now);
                oscillator.stop(now + 0.6);
                break;
            case 'achievement':
                oscillator.type = 'triangle';
                oscillator.frequency.setValueAtTime(880, now);
                oscillator.frequency.setValueAtTime(1108.73, now + 0.15);
                oscillator.frequency.setValueAtTime(1318.51, now + 0.3);
                gainNode.gain.setValueAtTime(0.3, now);
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
                oscillator.start(now);
                oscillator.stop(now + 0.5);
                break;
            case 'click':
                oscillator.frequency.setValueAtTime(800, now);
                gainNode.gain.setValueAtTime(0.1, now);
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
                oscillator.start(now);
                oscillator.stop(now + 0.05);
                break;
        }
    }

    /**
     * 사운드 활성화/비활성화
     * @param {boolean} enabled - 활성화 여부
     */
    setEnabled(enabled) {
        this.enabled = enabled;
    }

    /**
     * 리소스 정리
     */
    destroy() {
        if (this.audioContext) {
            this.audioContext.close().catch(() => {});
            this.audioContext = null;
        }
    }
}
