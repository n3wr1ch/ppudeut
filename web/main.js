/**
 * Todo Sticker - 게이미피케이션 할 일 관리 앱
 */

import { 
    validateAndSanitizeInput, 
    escapeHtml,
    safeLocalStorageSet,
    safeLocalStorageGet,
    logError,
    showUserMessage 
} from './security-utils.js';

import {
    debounce,
    throttle,
    rafThrottle,
    delegateEvent,
    BatchUpdateQueue
} from './performance-utils.js';

// ===== 상수 정의 =====
const EMOJIS = ['📝', '🎯', '💪', '🔥', '⭐', '💡', '📚', '🎨', '🏃', '🍎', '☕', '🎵', '🌟', '💎', '🚀', '🌈'];

const MOTIVATIONAL_QUOTES = [
    { text: "작은 진전도 진전이다.", author: "Unknown" },
    { text: "오늘 할 수 있는 일을 내일로 미루지 마라.", author: "벤자민 프랭클린" },
    { text: "시작이 반이다.", author: "아리스토텔레스" },
    { text: "꿈을 계속 간직하고 있으면 반드시 실현할 때가 온다.", author: "괴테" },
    { text: "할 수 있다고 믿는 순간, 방법이 보인다.", author: "Unknown" },
    { text: "천 리 길도 한 걸음부터.", author: "노자" },
    { text: "지금 이 순간이 가장 좋은 시작점이다.", author: "Unknown" },
    { text: "작은 습관이 큰 변화를 만든다.", author: "제임스 클리어" },
];

const ACHIEVEMENTS = [
    { id: 'first_todo', name: '첫 걸음', desc: '첫 번째 할 일 완료', icon: '🎉', condition: (s) => s.totalCompleted >= 1 },
    { id: 'ten_todos', name: '시작이 좋아', desc: '10개의 할 일 완료', icon: '🌟', condition: (s) => s.totalCompleted >= 10 },
    { id: 'fifty_todos', name: '꾸준함의 힘', desc: '50개의 할 일 완료', icon: '💪', condition: (s) => s.totalCompleted >= 50 },
    { id: 'hundred_todos', name: '센추리온', desc: '100개의 할 일 완료', icon: '🏆', condition: (s) => s.totalCompleted >= 100 },
    { id: 'streak_3', name: '3일 연속', desc: '3일 연속 할 일 완료', icon: '🔥', condition: (s) => s.maxStreak >= 3 },
    { id: 'streak_7', name: '일주일 마스터', desc: '7일 연속 할 일 완료', icon: '⚡', condition: (s) => s.maxStreak >= 7 },
    { id: 'streak_30', name: '한 달의 기적', desc: '30일 연속 할 일 완료', icon: '👑', condition: (s) => s.maxStreak >= 30 },
    { id: 'level_5', name: '성장 중', desc: '레벨 5 달성', icon: '📈', condition: (s) => s.level >= 5 },
    { id: 'level_10', name: '베테랑', desc: '레벨 10 달성', icon: '🎖️', condition: (s) => s.level >= 10 },
    { id: 'early_bird', name: '얼리버드', desc: '오전 6시 이전에 할 일 완료', icon: '🌅', condition: (s) => s.earlyBird },
    { id: 'night_owl', name: '올빼미', desc: '자정 이후에 할 일 완료', icon: '🦉', condition: (s) => s.nightOwl },
    { id: 'speed_demon', name: '스피드 데몬', desc: '하루에 10개 이상 완료', icon: '⚡', condition: (s) => s.maxDailyCompleted >= 10 },
];

const LEVEL_XP = [0, 100, 250, 450, 700, 1000, 1400, 1900, 2500, 3200, 4000, 5000, 6200, 7600, 9200, 11000, 13000, 15500, 18500, 22000, 26000];

// ===== 사운드 효과 (Web Audio API) =====
class SoundManager {
    constructor() {
        this.enabled = true;
        this.audioContext = null;
    }

    init() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch {
            this.enabled = false;
        }
    }

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

    setEnabled(enabled) {
        this.enabled = enabled;
    }
}

// ===== Confetti 효과 =====
class ConfettiManager {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.particles = [];
        this.animating = false;
    }

    resize() {
        this.canvas.width = this.canvas.offsetWidth;
        this.canvas.height = this.canvas.offsetHeight;
    }

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
            requestAnimationFrame(() => this.animate());
        } else {
            this.animating = false;
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }
}

// ===== 메인 Todo Manager =====
class TodoManager {
    constructor() {
        this.todos = [];
        this.profile = this.loadProfile();
        this.settings = this.loadSettings();
        this.draggedItem = null;
        this.selectedEmoji = null;
        
        // 뽀모도로 상태
        this.pomodoro = {
            todoId: null,
            duration: 25 * 60, // 25분 (초)
            remaining: 25 * 60,
            isRunning: false,
            intervalId: null,
        };
        
        this.sound = new SoundManager();
        this.confetti = null;
        
        // 성능 최적화: 렌더링 최적화
        this.lastTodosSnapshot = [];
        this.renderThrottled = rafThrottle(() => this.render());
        
        // 배치 업데이트 큐
        this.updateQueue = new BatchUpdateQueue((items) => {
            this.render();
        });
        
        // 이벤트 리스너 정리 함수들
        this.eventCleanupFunctions = [];
        
        this.init();
    }

    init() {
        this.todos = this.loadTodos();
        this.migrateData();
        this.sound.init();
        this.sound.setEnabled(this.settings.soundEnabled);
        
        const canvas = document.getElementById('confettiCanvas');
        if (canvas) {
            this.confetti = new ConfettiManager(canvas);
        }
        
        this.applyTheme();
        this.applyWindowSettings();
        this.bindEvents();
        this.updateStreak();
        this.render();
        this.renderProfile();
        this.checkAchievements(true); // 초기 체크 (조용히)
    }

    // ===== 데이터 관리 =====
    getDefaultProfile() {
        return {
            level: 1,
            xp: 0,
            totalXP: 0,
            streak: 0,
            maxStreak: 0,
            lastCompletedDate: null,
            totalCompleted: 0,
            achievements: [],
            earlyBird: false,
            nightOwl: false,
            maxDailyCompleted: 0,
            dailyCompleted: 0,
            dailyDate: null,
        };
    }

    getDefaultSettings() {
        return {
            theme: 'default',
            soundEnabled: true,
            notificationEnabled: true,
            opacity: 100,
            alwaysOnTop: true,
            minimalMode: false,
        };
    }

    loadProfile() {
        try {
            const saved = safeLocalStorageGet('todo-profile', null, false);
            return saved ? { ...this.getDefaultProfile(), ...saved } : this.getDefaultProfile();
        } catch (error) {
            logError('loadProfile', error);
            return this.getDefaultProfile();
        }
    }

    saveProfile() {
        const success = safeLocalStorageSet('todo-profile', this.profile, false);
        if (!success) {
            logError('saveProfile', new Error('프로필 저장 실패'));
            showUserMessage('프로필 저장에 실패했습니다.', 'error');
        }
    }

    loadSettings() {
        try {
            const saved = safeLocalStorageGet('todo-settings', null, false);
            return saved ? { ...this.getDefaultSettings(), ...saved } : this.getDefaultSettings();
        } catch (error) {
            logError('loadSettings', error);
            return this.getDefaultSettings();
        }
    }

    saveSettings() {
        const success = safeLocalStorageSet('todo-settings', this.settings, false);
        if (!success) {
            logError('saveSettings', new Error('설정 저장 실패'));
        }
    }

    loadTodos() {
        try {
            const saved = safeLocalStorageGet('todos', null, false);
            return saved || [];
        } catch (error) {
            logError('loadTodos', error);
            return [];
        }
    }

    saveTodos() {
        const success = safeLocalStorageSet('todos', this.todos, false);
        if (!success) {
            logError('saveTodos', new Error('할 일 목록 저장 실패'));
            showUserMessage('할 일 목록 저장에 실패했습니다.', 'error');
        }
    }

    migrateData() {
        try {
            // 기존 할 일에 새 필드 추가 및 데이터 검증
            this.todos = this.todos.map(todo => {
                // 필수 필드 검증
                if (!todo || typeof todo !== 'object') {
                    logError('migrateData', new Error('잘못된 todo 객체'), { todo });
                    return null;
                }

                // ID가 없으면 새로 생성
                if (!todo.id) {
                    todo.id = Date.now() + Math.random();
                }

                // 텍스트가 없으면 기본값
                if (!todo.text || typeof todo.text !== 'string') {
                    todo.text = '(텍스트 없음)';
                }

                // 텍스트 새니타이징
                const validation = validateAndSanitizeInput(todo.text, { 
                    maxLength: 200 
                });
                
                return {
                    ...todo,
                    text: validation.valid ? validation.sanitized : todo.text,
                    emoji: todo.emoji || null,
                    createdAt: todo.createdAt || new Date().toISOString(),
                    pinned: todo.pinned || false,
                    completed: Boolean(todo.completed),
                };
            }).filter(todo => todo !== null); // null 제거

            this.saveTodos();
        } catch (error) {
            logError('migrateData', error);
            showUserMessage('데이터 마이그레이션 중 오류가 발생했습니다.', 'warning');
        }
    }

    // ===== 이벤트 바인딩 =====
    bindEvents() {
        const todoInput = document.getElementById('todoInput');
        const closeBtn = document.getElementById('closeBtn');
        const minimizeBtn = document.getElementById('minimizeBtn');
        const maximizeBtn = document.getElementById('maximizeBtn');
        const clearCompletedBtn = document.getElementById('clearCompletedBtn');
        const todoList = document.getElementById('todoList');
        const settingsBtn = document.getElementById('settingsBtn');
        const closeSettings = document.getElementById('closeSettings');
        const settingsPanel = document.getElementById('settingsPanel');
        const themePicker = document.getElementById('themePicker');
        const soundToggle = document.getElementById('soundToggle');
        const notificationToggle = document.getElementById('notificationToggle');
        const resetDataBtn = document.getElementById('resetDataBtn');
        const levelUpClose = document.getElementById('levelUpClose');
        const emojiPickerBtn = document.getElementById('emojiPickerBtn');
        const emojiPicker = document.getElementById('emojiPicker');
        const rouletteBtn = document.getElementById('rouletteBtn');
        const opacitySlider = document.getElementById('opacitySlider');
        const alwaysOnTopBtn = document.getElementById('alwaysOnTopBtn');
        const titleBar = document.querySelector('.title-bar');

        // 입력
        todoInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.addTodo(todoInput.value);
                todoInput.value = '';
            }
        });

        // 완료 삭제
        clearCompletedBtn?.addEventListener('click', () => {
            this.todos = this.todos.filter(t => !t.completed);
            this.saveTodos();
            this.render();
            this.sound.play('click');
        });

        // 드래그 앤 드롭
        todoList?.addEventListener('dragover', (e) => e.preventDefault());
        todoList?.addEventListener('drop', (e) => this.handleListDrop(e));

        // 설정 패널
        settingsBtn?.addEventListener('click', () => {
            settingsPanel.style.display = 'flex';
            this.renderSettings();
        });
        closeSettings?.addEventListener('click', () => {
            settingsPanel.style.display = 'none';
        });

        // 테마 선택
        themePicker?.addEventListener('click', (e) => {
            const btn = e.target.closest('.theme-btn');
            if (btn) {
                const theme = btn.dataset.theme;
                this.settings.theme = theme;
                this.saveSettings();
                this.applyTheme();
                themePicker.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.sound.play('click');
            }
        });

        // 사운드 토글
        soundToggle?.addEventListener('change', (e) => {
            this.settings.soundEnabled = e.target.checked;
            this.sound.setEnabled(e.target.checked);
            this.saveSettings();
            if (e.target.checked) this.sound.play('click');
        });

        // 알림 토글
        notificationToggle?.addEventListener('change', (e) => {
            this.settings.notificationEnabled = e.target.checked;
            this.saveSettings();
        });

        // 데이터 초기화
        resetDataBtn?.addEventListener('click', () => {
            if (confirm('모든 데이터를 초기화하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
                localStorage.clear();
                location.reload();
            }
        });

        // 레벨업 모달 닫기
        levelUpClose?.addEventListener('click', () => {
            document.getElementById('levelUpModal').style.display = 'none';
        });

        // 이모지 피커
        emojiPickerBtn?.addEventListener('click', () => {
            const isVisible = emojiPicker.style.display === 'block';
            emojiPicker.style.display = isVisible ? 'none' : 'block';
            if (!isVisible) this.renderEmojiPicker();
        });

        // 이모지 피커 외부 클릭 시 닫기
        document.addEventListener('click', (e) => {
            if (!emojiPickerBtn?.contains(e.target) && !emojiPicker?.contains(e.target)) {
                if (emojiPicker) emojiPicker.style.display = 'none';
            }
        });

        // 룰렛
        rouletteBtn?.addEventListener('click', () => this.spinRoulette());

        // 투명도 슬라이더
        if (opacitySlider) {
            opacitySlider.value = this.settings.opacity;
            opacitySlider.addEventListener('input', (e) => {
                this.setOpacity(parseInt(e.target.value));
            });
        }

        // 항상 위 토글
        if (alwaysOnTopBtn) {
            alwaysOnTopBtn.classList.toggle('active', this.settings.alwaysOnTop);
            alwaysOnTopBtn.addEventListener('click', () => {
                this.toggleAlwaysOnTop();
            });
        }

        // 미니멀 모드 (타이틀바 더블클릭)
        titleBar?.addEventListener('dblclick', (e) => {
            // 트래픽 라이트나 설정 버튼 클릭은 제외
            if (e.target.closest('.traffic-lights') || e.target.closest('.window-actions')) return;
            this.toggleMinimalMode();
        });

        // 뽀모도로 관련
        this.bindPomodoroEvents();

        // 창 컨트롤
        if (window.__TAURI__) {
            const appWindow = window.__TAURI__.window.appWindow;
            closeBtn?.addEventListener('click', () => appWindow.close().catch(() => {}));
            minimizeBtn?.addEventListener('click', () => appWindow.minimize().catch(() => {}));
            maximizeBtn?.addEventListener('click', () => appWindow.toggleMaximize().catch(() => {}));
        }
    }

    // ===== 테마 =====
    applyTheme() {
        document.body.setAttribute('data-theme', this.settings.theme);
        const activeBtn = document.querySelector(`.theme-btn[data-theme="${this.settings.theme}"]`);
        if (activeBtn) {
            document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
            activeBtn.classList.add('active');
        }
    }

    // ===== 윈도우 설정 =====
    applyWindowSettings() {
        // 투명도 적용
        this.setOpacity(this.settings.opacity, false);
        
        // 항상 위 적용
        this.setAlwaysOnTop(this.settings.alwaysOnTop, false);
        
        // 미니멀 모드 적용
        if (this.settings.minimalMode) {
            document.querySelector('.sticker-container')?.classList.add('minimal-mode');
        }
    }

    setOpacity(value, save = true) {
        this.settings.opacity = value;
        
        // Tauri API로 투명도 설정 (웹뷰 자체는 CSS로)
        const container = document.querySelector('.sticker-container');
        if (container) {
            container.style.opacity = value / 100;
            
            // 매우 낮은 투명도일 때 배경 효과 제거
            if (value <= 5) {
                container.setAttribute('data-very-low-opacity', 'true');
            } else {
                container.removeAttribute('data-very-low-opacity');
            }
        }
        
        if (save) {
            this.saveSettings();
            this.sound.play('click');
        }
    }

    setAlwaysOnTop(value, save = true) {
        this.settings.alwaysOnTop = value;
        
        if (window.__TAURI__) {
            const appWindow = window.__TAURI__.window.appWindow;
            appWindow.setAlwaysOnTop(value).catch(() => {});
        }
        
        // 버튼 상태 업데이트
        const btn = document.getElementById('alwaysOnTopBtn');
        if (btn) {
            btn.classList.toggle('active', value);
        }
        
        if (save) {
            this.saveSettings();
        }
    }

    toggleAlwaysOnTop() {
        this.setAlwaysOnTop(!this.settings.alwaysOnTop);
        this.sound.play('click');
    }

    toggleMinimalMode() {
        this.settings.minimalMode = !this.settings.minimalMode;
        const container = document.querySelector('.sticker-container');
        
        if (container) {
            container.classList.toggle('minimal-mode', this.settings.minimalMode);
            
            // 창 크기 조절
            if (window.__TAURI__) {
                const appWindow = window.__TAURI__.window.appWindow;
                const { LogicalSize } = window.__TAURI__.window;
                
                if (this.settings.minimalMode) {
                    // 미니멀 모드: 작은 크기
                    appWindow.setSize(new LogicalSize(340, 200)).catch(() => {});
                    appWindow.setMinSize(new LogicalSize(200, 100)).catch(() => {});
                } else {
                    // 일반 모드: 원래 크기
                    appWindow.setSize(new LogicalSize(340, 480)).catch(() => {});
                    appWindow.setMinSize(new LogicalSize(300, 400)).catch(() => {});
                }
            }
        }
        
        this.saveSettings();
        this.sound.play('click');
    }

    // ===== 이모지 피커 =====
    renderEmojiPicker() {
        const grid = document.getElementById('emojiGrid');
        if (!grid) return;
        
        grid.innerHTML = EMOJIS.map(emoji => 
            `<button class="emoji-option" data-emoji="${emoji}">${emoji}</button>`
        ).join('');
        
        grid.addEventListener('click', (e) => {
            const btn = e.target.closest('.emoji-option');
            if (btn) {
                this.selectedEmoji = btn.dataset.emoji;
                document.getElementById('emojiPickerBtn').textContent = this.selectedEmoji;
                document.getElementById('emojiPicker').style.display = 'none';
            }
        });
    }

    // ===== 할 일 관리 =====
    addTodo(text) {
        // 입력 검증 및 새니타이징
        const validation = validateAndSanitizeInput(text, { 
            maxLength: 200, 
            minLength: 1 
        });

        if (!validation.valid) {
            if (validation.error) {
                showUserMessage(validation.error, 'warning');
            }
            return;
        }

        const todo = {
            id: Date.now(),
            text: validation.sanitized,
            completed: false,
            createdAt: new Date().toISOString(),
            emoji: this.selectedEmoji,
        };

        this.todos.unshift(todo);
        this.saveTodos();
        this.render();
        
        // 이모지 선택 초기화
        this.selectedEmoji = null;
        const emojiBtn = document.getElementById('emojiPickerBtn');
        if (emojiBtn) emojiBtn.textContent = '😊';
        
        this.sound.play('click');
    }

    toggleTodo(id) {
        const todo = this.todos.find(t => t.id === id);
        if (!todo) return;

        const wasCompleted = todo.completed;
        todo.completed = !todo.completed;
        this.saveTodos();

        if (!wasCompleted && todo.completed) {
            // 완료 시 XP 및 스트릭 처리
            this.onTodoComplete(todo);
        }

        this.render();
    }

    onTodoComplete(todo) {
        // XP 계산 (할 일 나이에 따라 보너스)
        const ageHours = this.getAgeHours(todo.createdAt);
        let xpGain = 10;
        if (ageHours < 1) xpGain = 15; // 빠른 완료 보너스
        else if (ageHours > 48) xpGain = 5; // 오래된 할 일 감소

        this.addXP(xpGain, todo.id);
        
        // 스트릭 업데이트
        this.updateStreak(true);
        
        // 통계 업데이트
        this.profile.totalCompleted++;
        this.updateDailyStats();
        
        // 시간대 체크
        const hour = new Date().getHours();
        if (hour < 6) this.profile.earlyBird = true;
        if (hour >= 0 && hour < 4) this.profile.nightOwl = true;
        
        this.saveProfile();
        this.renderProfile();
        
        // 효과
        this.sound.play('complete');
        this.confetti?.launch(30);
        this.showXPFloat(xpGain, todo.id);
        
        // 업적 체크
        this.checkAchievements();
    }

    updateDailyStats() {
        const today = new Date().toDateString();
        if (this.profile.dailyDate !== today) {
            this.profile.dailyDate = today;
            this.profile.dailyCompleted = 0;
        }
        this.profile.dailyCompleted++;
        if (this.profile.dailyCompleted > this.profile.maxDailyCompleted) {
            this.profile.maxDailyCompleted = this.profile.dailyCompleted;
        }
    }

    deleteTodo(id) {
        this.todos = this.todos.filter(t => t.id !== id);
        this.saveTodos();
        this.render();
        this.sound.play('click');
    }

    // ===== XP 시스템 =====
    addXP(amount) {
        const oldLevel = this.profile.level;
        this.profile.xp += amount;
        this.profile.totalXP += amount;

        // 레벨업 체크
        while (this.profile.level < LEVEL_XP.length - 1 && 
               this.profile.xp >= LEVEL_XP[this.profile.level]) {
            this.profile.xp -= LEVEL_XP[this.profile.level];
            this.profile.level++;
        }

        if (this.profile.level > oldLevel) {
            this.onLevelUp(this.profile.level);
        }

        this.saveProfile();
        this.renderProfile();
    }

    showXPFloat(amount, targetId) {
        const todoEl = document.querySelector(`[data-id="${targetId}"]`);
        if (!todoEl) return;

        const float = document.createElement('div');
        float.className = 'xp-float';
        float.textContent = `+${amount} XP`;
        
        const rect = todoEl.getBoundingClientRect();
        const container = document.querySelector('.sticker-container');
        const containerRect = container.getBoundingClientRect();
        
        float.style.left = `${rect.right - containerRect.left - 50}px`;
        float.style.top = `${rect.top - containerRect.top}px`;
        
        container.appendChild(float);
        setTimeout(() => float.remove(), 1000);
    }

    onLevelUp(newLevel) {
        if (!this.settings.notificationEnabled) return;
        
        this.sound.play('levelup');
        this.confetti?.launch(80);
        
        const modal = document.getElementById('levelUpModal');
        const levelEl = document.getElementById('levelUpLevel');
        const messageEl = document.getElementById('levelUpMessage');
        
        if (modal && levelEl && messageEl) {
            levelEl.textContent = `Lv.${newLevel}`;
            const messages = [
                '대단해요! 계속 성장 중!',
                '멈추지 않는 도전! 멋져요!',
                '새로운 레벨에 도달했습니다!',
                '꾸준함이 빛을 발하고 있어요!',
            ];
            messageEl.textContent = messages[Math.floor(Math.random() * messages.length)];
            modal.style.display = 'flex';
        }
        
        this.checkAchievements();
    }

    // ===== 스트릭 =====
    updateStreak(justCompleted = false) {
        const today = new Date().toDateString();
        const yesterday = new Date(Date.now() - 86400000).toDateString();
        
        if (justCompleted) {
            if (this.profile.lastCompletedDate === today) {
                // 오늘 이미 완료한 적 있음 - 변화 없음
            } else if (this.profile.lastCompletedDate === yesterday) {
                // 어제 완료 - 스트릭 증가
                this.profile.streak++;
            } else if (!this.profile.lastCompletedDate) {
                // 처음 완료
                this.profile.streak = 1;
            } else {
                // 스트릭 끊김 - 다시 시작
                this.profile.streak = 1;
            }
            
            this.profile.lastCompletedDate = today;
            if (this.profile.streak > this.profile.maxStreak) {
                this.profile.maxStreak = this.profile.streak;
            }
        } else {
            // 앱 시작 시 스트릭 체크
            if (this.profile.lastCompletedDate && 
                this.profile.lastCompletedDate !== today && 
                this.profile.lastCompletedDate !== yesterday) {
                this.profile.streak = 0;
            }
        }
        
        this.saveProfile();
        this.renderProfile();
    }

    // ===== 업적 =====
    checkAchievements(silent = false) {
        const newAchievements = [];
        
        for (const achievement of ACHIEVEMENTS) {
            if (!this.profile.achievements.includes(achievement.id)) {
                if (achievement.condition(this.profile)) {
                    this.profile.achievements.push(achievement.id);
                    newAchievements.push(achievement);
                }
            }
        }
        
        if (newAchievements.length > 0) {
            this.saveProfile();
            if (!silent) {
                this.showAchievementToast(newAchievements[0]);
            }
        }
    }

    showAchievementToast(achievement) {
        this.sound.play('achievement');
        
        const toast = document.getElementById('achievementToast');
        const iconEl = document.getElementById('achievementIcon');
        const nameEl = document.getElementById('achievementName');
        
        if (toast && iconEl && nameEl) {
            iconEl.textContent = achievement.icon;
            nameEl.textContent = achievement.name;
            toast.style.display = 'flex';
            
            // 애니메이션 리셋
            toast.style.animation = 'none';
            toast.offsetHeight; // 리플로우 강제
            toast.style.animation = 'toast-in 0.3s ease, toast-out 0.3s ease 2.7s forwards';
            
            setTimeout(() => {
                toast.style.display = 'none';
            }, 3000);
        }
    }

    // ===== 룰렛 =====
    spinRoulette() {
        const activeTodos = this.todos.filter(t => !t.completed);
        if (activeTodos.length === 0) return;
        
        this.sound.play('click');
        
        // 랜덤 선택
        const randomIndex = Math.floor(Math.random() * activeTodos.length);
        const selectedTodo = activeTodos[randomIndex];
        
        // 모든 항목 하이라이트 제거
        document.querySelectorAll('.todo-item').forEach(el => {
            el.style.background = '';
        });
        
        // 선택된 항목 하이라이트
        const selectedEl = document.querySelector(`[data-id="${selectedTodo.id}"]`);
        if (selectedEl) {
            selectedEl.style.background = 'var(--mac-accent-light)';
            selectedEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // 3초 후 하이라이트 제거
            setTimeout(() => {
                selectedEl.style.background = '';
            }, 3000);
        }
    }

    // ===== 뽀모도로 타이머 =====
    bindPomodoroEvents() {
        const closePomodoroBtn = document.getElementById('closePomodoroBtn');
        const pomodoroStartBtn = document.getElementById('pomodoroStartBtn');
        const pomodoroPauseBtn = document.getElementById('pomodoroPauseBtn');
        const pomodoroResetBtn = document.getElementById('pomodoroResetBtn');
        const presetBtns = document.querySelectorAll('.preset-btn');

        closePomodoroBtn?.addEventListener('click', () => this.closePomodoroModal());
        pomodoroStartBtn?.addEventListener('click', () => this.startPomodoro());
        pomodoroPauseBtn?.addEventListener('click', () => this.pausePomodoro());
        pomodoroResetBtn?.addEventListener('click', () => this.resetPomodoro());

        presetBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const minutes = parseInt(btn.dataset.minutes);
                this.setPomodoroDuration(minutes);
                presetBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });
    }

    openPomodoroModal(todoId) {
        const todo = this.todos.find(t => t.id === todoId);
        if (!todo) return;

        this.pomodoro.todoId = todoId;
        this.resetPomodoro();

        const modal = document.getElementById('pomodoroModal');
        const taskEl = document.getElementById('pomodoroTask');
        
        if (modal && taskEl) {
            taskEl.textContent = todo.emoji ? `${todo.emoji} ${todo.text}` : todo.text;
            modal.style.display = 'flex';
        }
        
        this.sound.play('click');
    }

    closePomodoroModal() {
        const modal = document.getElementById('pomodoroModal');
        if (modal) modal.style.display = 'none';
        this.pausePomodoro();
    }

    setPomodoroDuration(minutes) {
        this.pomodoro.duration = minutes * 60;
        this.pomodoro.remaining = minutes * 60;
        this.updatePomodoroDisplay();
    }

    startPomodoro() {
        if (this.pomodoro.isRunning) return;
        
        this.pomodoro.isRunning = true;
        document.getElementById('pomodoroStartBtn').style.display = 'none';
        document.getElementById('pomodoroPauseBtn').style.display = 'inline-block';
        document.getElementById('pomodoroTimer').classList.add('running');
        
        this.pomodoro.intervalId = setInterval(() => {
            this.pomodoro.remaining--;
            this.updatePomodoroDisplay();
            
            if (this.pomodoro.remaining <= 0) {
                this.completePomodoro();
            }
        }, 1000);
    }

    pausePomodoro() {
        if (!this.pomodoro.isRunning) return;
        
        this.pomodoro.isRunning = false;
        clearInterval(this.pomodoro.intervalId);
        
        document.getElementById('pomodoroStartBtn').style.display = 'inline-block';
        document.getElementById('pomodoroPauseBtn').style.display = 'none';
        document.getElementById('pomodoroTimer').classList.remove('running');
    }

    resetPomodoro() {
        this.pausePomodoro();
        this.pomodoro.remaining = this.pomodoro.duration;
        this.updatePomodoroDisplay();
        document.getElementById('pomodoroTimer').classList.remove('finished');
    }

    completePomodoro() {
        this.pausePomodoro();
        
        const timerEl = document.getElementById('pomodoroTimer');
        timerEl.classList.remove('running');
        timerEl.classList.add('finished');
        timerEl.textContent = '완료!';
        
        this.sound.play('levelup');
        this.confetti?.launch(50);
        
        // 보너스 XP
        this.addXP(20);
        this.renderProfile();
    }

    updatePomodoroDisplay() {
        const minutes = Math.floor(this.pomodoro.remaining / 60);
        const seconds = this.pomodoro.remaining % 60;
        const timerEl = document.getElementById('pomodoroTimer');
        const progressBar = document.getElementById('pomodoroProgressBar');
        
        if (timerEl) {
            timerEl.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        }
        
        if (progressBar) {
            const progress = ((this.pomodoro.duration - this.pomodoro.remaining) / this.pomodoro.duration) * 100;
            progressBar.style.width = `${progress}%`;
        }
    }

    // ===== 핀 고정 =====
    togglePin(id) {
        const todo = this.todos.find(t => t.id === id);
        if (!todo) return;

        todo.pinned = !todo.pinned;
        this.sortTodos();
        this.saveTodos();
        this.render();
        this.sound.play('click');
    }

    sortTodos() {
        // 핀 고정된 항목을 상단으로
        this.todos.sort((a, b) => {
            if (a.pinned && !b.pinned) return -1;
            if (!a.pinned && b.pinned) return 1;
            return 0;
        });
    }

    // ===== 더블클릭 편집 =====
    startEditing(id, textEl) {
        const todo = this.todos.find(t => t.id === id);
        if (!todo || todo.completed) return;

        // 이미 편집 중이면 무시
        if (textEl.getAttribute('contenteditable') === 'true') return;

        textEl.setAttribute('contenteditable', 'true');
        textEl.classList.add('editing');
        textEl.focus();

        // 텍스트 선택
        const range = document.createRange();
        range.selectNodeContents(textEl);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);

        const finishEditing = () => {
            textEl.setAttribute('contenteditable', 'false');
            textEl.classList.remove('editing');
            
            const newText = textEl.textContent.trim();
            
            // 입력 검증
            const validation = validateAndSanitizeInput(newText, { 
                maxLength: 200, 
                minLength: 1 
            });

            if (validation.valid && validation.sanitized !== todo.text) {
                todo.text = validation.sanitized;
                this.saveTodos();
            } else {
                // 원래 텍스트로 복원
                textEl.textContent = todo.emoji ? todo.emoji + ' ' + todo.text : todo.text;
                
                if (!validation.valid && validation.error) {
                    showUserMessage(validation.error, 'warning');
                }
            }
        };

        textEl.addEventListener('blur', finishEditing, { once: true });
        textEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                textEl.blur();
            } else if (e.key === 'Escape') {
                textEl.textContent = todo.emoji ? todo.emoji + ' ' + todo.text : todo.text;
                textEl.blur();
            }
        });
    }

    // ===== 드래그 앤 드롭 =====
    handleDragStart(e, id) {
        this.draggedItem = this.todos.find(t => t.id === id);
        e.target.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', id.toString());
    }

    handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        const item = e.target.closest('.todo-item');
        if (item && !item.classList.contains('dragging')) {
            item.classList.add('drag-over');
        }
    }

    handleDragLeave(e) {
        const item = e.target.closest('.todo-item');
        if (item) item.classList.remove('drag-over');
    }

    handleDrop(e, targetId) {
        e.preventDefault();
        e.stopPropagation();

        document.querySelectorAll('.todo-item').forEach(item => {
            item.classList.remove('dragging', 'drag-over');
        });

        if (!this.draggedItem || this.draggedItem.id === targetId) return;

        const fromIndex = this.todos.findIndex(t => t.id === this.draggedItem.id);
        const toIndex = this.todos.findIndex(t => t.id === targetId);

        if (fromIndex > -1 && toIndex > -1 && fromIndex !== toIndex) {
            const [item] = this.todos.splice(fromIndex, 1);
            this.todos.splice(toIndex, 0, item);
            this.saveTodos();
            this.render();
        }

        this.draggedItem = null;
    }

    handleListDrop(e) {
        e.preventDefault();
        const itemEl = e.target.closest('.todo-item');
        if (itemEl) return;
        
        const idStr = e.dataTransfer.getData('text/plain');
        if (!idStr) return;
        
        const id = Number(idStr);
        const fromIndex = this.todos.findIndex(t => t.id === id);
        if (fromIndex > -1) {
            const [item] = this.todos.splice(fromIndex, 1);
            this.todos.push(item);
            this.saveTodos();
            this.render();
        }
    }

    // ===== 유틸리티 =====
    getAgeHours(createdAt) {
        const created = new Date(createdAt);
        const now = new Date();
        return (now - created) / (1000 * 60 * 60);
    }

    getAgeText(createdAt) {
        const hours = this.getAgeHours(createdAt);
        if (hours < 1) return '방금 전';
        if (hours < 24) return `${Math.floor(hours)}시간 전`;
        const days = Math.floor(hours / 24);
        if (days === 1) return '어제';
        if (days < 7) return `${days}일 전`;
        if (days < 30) return `${Math.floor(days / 7)}주 전`;
        return `${Math.floor(days / 30)}달 전`;
    }

    getAgeClass(createdAt) {
        const hours = this.getAgeHours(createdAt);
        if (hours > 72) return 'very-old';
        if (hours > 24) return 'old';
        return '';
    }

    // ===== 렌더링 =====
    renderProfile() {
        const levelBadge = document.getElementById('levelBadge');
        const xpFill = document.getElementById('xpFill');
        const xpText = document.getElementById('xpText');
        const streakBadge = document.getElementById('streakBadge');
        const streakCount = document.getElementById('streakCount');

        if (levelBadge) levelBadge.textContent = `Lv.${this.profile.level}`;
        
        const maxXP = LEVEL_XP[this.profile.level] || LEVEL_XP[LEVEL_XP.length - 1];
        const xpPercent = Math.min((this.profile.xp / maxXP) * 100, 100);
        if (xpFill) xpFill.style.width = `${xpPercent}%`;
        if (xpText) xpText.textContent = `${this.profile.xp} / ${maxXP} XP`;
        
        if (streakCount) streakCount.textContent = this.profile.streak;
        if (streakBadge) {
            streakBadge.classList.toggle('active', this.profile.streak > 0);
        }
    }

    renderSettings() {
        const soundToggle = document.getElementById('soundToggle');
        const notificationToggle = document.getElementById('notificationToggle');
        
        if (soundToggle) soundToggle.checked = this.settings.soundEnabled;
        if (notificationToggle) notificationToggle.checked = this.settings.notificationEnabled;
        
        // 통계
        document.getElementById('statTotalCompleted').textContent = this.profile.totalCompleted;
        document.getElementById('statMaxStreak').textContent = this.profile.maxStreak;
        document.getElementById('statTotalXP').textContent = this.profile.totalXP;
        document.getElementById('statAchievements').textContent = this.profile.achievements.length;
        
        // 업적 목록
        const achievementsList = document.getElementById('achievementsList');
        if (achievementsList) {
            achievementsList.innerHTML = ACHIEVEMENTS.map(a => {
                const unlocked = this.profile.achievements.includes(a.id);
                return `
                    <div class="achievement-item ${unlocked ? '' : 'locked'}">
                        <span class="icon">${a.icon}</span>
                        <div class="info">
                            <div class="name">${a.name}</div>
                            <div class="desc">${a.desc}</div>
                        </div>
                    </div>
                `;
            }).join('');
        }
    }

    render() {
        const todoList = document.getElementById('todoList');
        const todoCount = document.getElementById('todoCount');
        const emptyState = document.getElementById('emptyState');
        const clearCompletedBtn = document.getElementById('clearCompletedBtn');
        const emptyText = document.getElementById('emptyText');
        const emptyHint = document.getElementById('emptyHint');

        if (this.todos.length === 0) {
            emptyState.style.display = 'flex';
            todoList.style.display = 'none';
            todoList.innerHTML = '';
            
            // 랜덤 명언
            const quote = MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)];
            if (emptyText) emptyText.textContent = `"${quote.text}"`;
            if (emptyHint) emptyHint.textContent = `- ${quote.author}`;
        } else {
            emptyState.style.display = 'none';
            todoList.style.display = 'flex';

            const fragment = document.createDocumentFragment();
            this.todos.forEach(todo => {
                fragment.appendChild(this.createTodoElement(todo));
            });
            todoList.innerHTML = '';
            todoList.appendChild(fragment);
        }

        const activeCount = this.todos.filter(t => !t.completed).length;
        const completedCount = this.todos.length - activeCount;
        todoCount.textContent = `${activeCount}개 남음`;
        clearCompletedBtn.style.display = completedCount > 0 ? 'block' : 'none';
    }

    createTodoElement(todo) {
        const li = document.createElement('li');
        li.className = `todo-item${todo.completed ? ' completed' : ''}${todo.pinned ? ' pinned' : ''}`;
        li.draggable = true;
        li.tabIndex = 0;
        li.dataset.id = String(todo.id);

        // 체크박스
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'todo-checkbox';
        checkbox.checked = todo.completed;
        checkbox.setAttribute('aria-label', '완료 여부');

        // 콘텐츠 래퍼
        const contentWrapper = document.createElement('div');
        contentWrapper.className = 'todo-content-wrapper';

        const span = document.createElement('span');
        span.className = 'todo-text';
        if (todo.emoji) {
            const emojiSpan = document.createElement('span');
            emojiSpan.className = 'todo-emoji';
            emojiSpan.textContent = todo.emoji;
            span.appendChild(emojiSpan);
        }
        span.appendChild(document.createTextNode(todo.text));
        contentWrapper.appendChild(span);

        // 메타 정보 (나이)
        if (!todo.completed) {
            const meta = document.createElement('div');
            meta.className = 'todo-meta';
            
            const age = document.createElement('span');
            age.className = `todo-age ${this.getAgeClass(todo.createdAt)}`;
            age.textContent = this.getAgeText(todo.createdAt);
            meta.appendChild(age);
            
            contentWrapper.appendChild(meta);
        }

        // 액션 버튼 그룹
        const actions = document.createElement('div');
        actions.className = 'todo-actions';

        // 핀 버튼
        const pinBtn = document.createElement('button');
        pinBtn.className = `pin-btn${todo.pinned ? ' pinned' : ''}`;
        pinBtn.setAttribute('aria-label', '고정');
        pinBtn.textContent = '📌';
        pinBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.togglePin(todo.id);
        });

        // 뽀모도로 버튼 (완료되지 않은 항목만)
        if (!todo.completed) {
            const pomodoroBtn = document.createElement('button');
            pomodoroBtn.className = 'pomodoro-start-btn';
            pomodoroBtn.setAttribute('aria-label', '뽀모도로');
            pomodoroBtn.textContent = '🍅';
            pomodoroBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.openPomodoroModal(todo.id);
            });
            actions.appendChild(pomodoroBtn);
        }

        actions.appendChild(pinBtn);

        // 삭제 버튼
        const del = document.createElement('button');
        del.className = 'delete-btn';
        del.setAttribute('aria-label', '삭제');
        del.textContent = '×';

        actions.appendChild(del);

        li.appendChild(checkbox);
        li.appendChild(contentWrapper);
        li.appendChild(actions);

        // 이벤트 리스너
        li.addEventListener('dragstart', (e) => this.handleDragStart(e, todo.id));
        li.addEventListener('dragover', (e) => this.handleDragOver(e));
        li.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        li.addEventListener('drop', (e) => this.handleDrop(e, todo.id));
        li.addEventListener('dragend', () => {
            document.querySelectorAll('.todo-item').forEach(item => {
                item.classList.remove('dragging', 'drag-over');
            });
            this.draggedItem = null;
        });

        // 더블클릭 편집
        span.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            this.startEditing(todo.id, span);
        });

        // 키보드 접근성
        li.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.toggleTodo(todo.id);
            } else if (e.key === 'Delete' || e.key === 'Backspace') {
                e.preventDefault();
                this.deleteTodo(todo.id);
            } else if (e.key === 'F2') {
                e.preventDefault();
                this.startEditing(todo.id, span);
            }
        });

        checkbox.addEventListener('change', (e) => {
            e.stopPropagation();
            li.classList.add('completing');
            setTimeout(() => {
                this.toggleTodo(todo.id);
            }, 200);
        });

        del.addEventListener('click', (e) => {
            e.stopPropagation();
            this.deleteTodo(todo.id);
        });

        li.addEventListener('click', (e) => {
            if (e.target === checkbox || e.target === del || 
                e.target.classList.contains('pin-btn') || 
                e.target.classList.contains('pomodoro-start-btn')) return;
            li.classList.add('completing');
            setTimeout(() => {
                this.toggleTodo(todo.id);
            }, 200);
        });

        return li;
    }
}

// ===== 초기화 =====
document.addEventListener('DOMContentLoaded', () => {
    new TodoManager();
});
