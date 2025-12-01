/**
 * Confetti 효과 모듈
 * Canvas를 사용한 축하 파티클 효과
 */

import './types.js';

/**
 * Confetti 파티클 속성
 * @typedef {Object} ConfettiParticle
 * @property {number} x - X 좌표
 * @property {number} y - Y 좌표
 * @property {number} vx - X 속도
 * @property {number} vy - Y 속도
 * @property {string} color - 색상
 * @property {number} size - 크기
 * @property {number} rotation - 회전 각도
 * @property {number} rotationSpeed - 회전 속도
 * @property {number} gravity - 중력
 * @property {number} friction - 마찰력
 */

/**
 * Confetti 효과 매니저
 */
export class ConfettiManager {
    /**
     * @param {HTMLCanvasElement} canvas - Canvas 엘리먼트
     */
    constructor(canvas) {
        /** @type {HTMLCanvasElement} */
        this.canvas = canvas;
        /** @type {CanvasRenderingContext2D} */
        this.ctx = canvas.getContext('2d');
        /** @type {ConfettiParticle[]} */
        this.particles = [];
        /** @type {boolean} */
        this.animating = false;
        /** @type {number|null} */
        this.animationFrameId = null;
    }

    /**
     * Canvas 크기 조정
     */
    resize() {
        this.canvas.width = this.canvas.offsetWidth;
        this.canvas.height = this.canvas.offsetHeight;
    }

    /**
     * Confetti 발사
     * @param {number} [intensity=50] - 파티클 수
     */
    launch(intensity = 50) {
        this.resize();
        const colors = ['#ff3b30', '#ff9500', '#ffcc00', '#34c759', '#007aff', '#af52de', '#ff2d55'];
        
        for (let i = 0; i < intensity; i++) {
            this.particles.push({
                x: this.canvas.width / 2 + (Math.random() - 0.5) * 100,
                y: this.canvas.height / 2,
                vx: (Math.random() - 0.5) * 15,
                vy: Math.random() * -15 - 5,
                color: colors[Math.floor(Math.random() * colors.length)],
                size: Math.random() * 8 + 4,
                rotation: Math.random() * 360,
                rotationSpeed: (Math.random() - 0.5) * 10,
                gravity: 0.3,
                friction: 0.99,
            });
        }
        
        if (!this.animating) {
            this.animating = true;
            this.animate();
        }
    }

    /**
     * 애니메이션 프레임 처리
     */
    animate() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.particles = this.particles.filter(p => {
            p.vy += p.gravity;
            p.vx *= p.friction;
            p.x += p.vx;
            p.y += p.vy;
            p.rotation += p.rotationSpeed;
            
            this.ctx.save();
            this.ctx.translate(p.x, p.y);
            this.ctx.rotate(p.rotation * Math.PI / 180);
            this.ctx.fillStyle = p.color;
            this.ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
            this.ctx.restore();
            
            return p.y < this.canvas.height + 20;
        });
        
        if (this.particles.length > 0) {
            this.animationFrameId = requestAnimationFrame(() => this.animate());
        } else {
            this.animating = false;
            this.animationFrameId = null;
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }

    /**
     * 리소스 정리
     */
    destroy() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        this.particles = [];
        this.animating = false;
        if (this.ctx) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }
}
