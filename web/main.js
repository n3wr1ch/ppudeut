/**
 * Todo Sticker - 게이미피케이션 할 일 관리 앱
 */

import { 
    validateAndSanitizeInput, 
    safeLocalStorageSet,
    safeLocalStorageGet,
    logError,
    showUserMessage 
} from './security-utils.js';

import {
    rafThrottle,
    BatchUpdateQueue,
    clearAllTrackedTimers
} from './performance-utils.js';

import {
    showToast
} from './ui-utils.js';

import {
    toggleTodoById,
    deleteTodoById,
    clearCompleted,
    sortTodos,
    getActiveCount,
    getCompletedCount,
    getTodoAgeHours,
    getTodoAgeText,
    calculateXP,
    togglePinById,
} from './todo-core.js';

import {
    KeyboardShortcutManager,
    AccessibilityHelper,
} from './accessibility.js';

import {
    BackupManager,
    SearchFilterManager,
} from './backup-utils.js';

import { SoundManager } from './sound-manager.js';
import { ConfettiManager } from './confetti-manager.js';

import './types.js';

// ===== 상수 import =====
import {
    EMOJIS,
    MOTIVATIONAL_QUOTES,
    ACHIEVEMENTS,
    LEVEL_XP,
    DEFAULT_PROFILE,
    DEFAULT_SETTINGS,
    VALIDATION,
} from './constants.js';

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
        this.updateQueue = new BatchUpdateQueue(() => {
            this.renderThrottled();
        });
        
        // 이벤트 리스너 정리 함수들
        this.eventCleanupFunctions = [];
        
        // 키보드 단축키 매니저
        this.shortcuts = new KeyboardShortcutManager();
        
        // 백업 매니저
        this.backupManager = new BackupManager();
        
        // 검색/필터 매니저
        this.searchFilter = new SearchFilterManager();
        
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
        this.setupKeyboardShortcuts();
        this.setupAutoBackup();
        this.updateStreak();
        this.render();
        this.renderProfile();
        this.checkAchievements(true); // 초기 체크 (조용히)
    }

    // ===== 자동 백업 설정 =====
    setupAutoBackup() {
        // 7일마다 자동 백업
        this.backupManager.setupAutoBackup(7);
    }

    // ===== 키보드 단축키 설정 =====
    setupKeyboardShortcuts() {
        // 새 할 일 추가 (Ctrl+N)
        this.shortcuts.register('ctrl+n', () => {
            const input = document.getElementById('todoInput');
            input?.focus();
        }, '새 할 일 입력');

        // 설정 열기 (Ctrl+,)
        this.shortcuts.register('ctrl+,', () => {
            const settingsPanel = document.getElementById('settingsPanel');
            if (settingsPanel) {
                settingsPanel.style.display = 'flex';
                this.renderSettings();
            }
        }, '설정 열기');

        // 완료된 항목 삭제 (Ctrl+Shift+D)
        this.shortcuts.register('ctrl+shift+d', () => {
            const completedCount = getCompletedCount(this.todos);
            if (completedCount > 0) {
                this.todos = clearCompleted(this.todos);
                this.saveTodos();
                this.render();
                this.sound.play('click');
                AccessibilityHelper.announce(`${completedCount}개의 완료된 할 일이 삭제되었습니다.`);
            }
        }, '완료된 항목 삭제');

        // 미니멀 모드 토글 (Ctrl+M)
        this.shortcuts.register('ctrl+m', () => {
            this.toggleMinimalMode();
        }, '미니멀 모드 전환');

        // 도움말 표시 (F1 또는 ?)
        this.shortcuts.register('f1', () => {
            this.showKeyboardHelp();
        }, '도움말 표시');

        this.shortcuts.register('shift+/', () => {
            this.showKeyboardHelp();
        }, '도움말 표시');

        // 단축키 활성화
        this.shortcuts.enable();
    }

    // 키보드 단축키 도움말 표시
    showKeyboardHelp() {
        const shortcuts = this.shortcuts.getShortcuts();
        const helpText = shortcuts
            .map(s => `${s.key}: ${s.description}`)
            .join('\n');
        
        showToast('키보드 단축키 도움말을 콘솔에서 확인하세요.', { type: 'info' });
        // eslint-disable-next-line no-console
        console.info('=== 키보드 단축키 ===\n' + helpText);
        
        AccessibilityHelper.announce('키보드 단축키 목록이 콘솔에 표시되었습니다.');
    }

    // ===== 데이터 관리 =====
    getDefaultProfile() {
        return { ...DEFAULT_PROFILE };
    }

    getDefaultSettings() {
        return { ...DEFAULT_SETTINGS };
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
                    todo.id = globalThis.crypto.randomUUID();
                }

                // 텍스트가 없으면 기본값
                if (!todo.text || typeof todo.text !== 'string') {
                    todo.text = '(텍스트 없음)';
                }

                // 텍스트 새니타이징
                const validation = validateAndSanitizeInput(todo.text, { 
                    maxLength: VALIDATION.TODO_MAX_LENGTH 
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
            // todo-core 함수 사용
            this.todos = clearCompleted(this.todos);
            this.saveTodos();
            this.renderThrottled();
            this.sound.play('click');
        });

        // 드래그 앤 드롭 (이벤트 위임)
        todoList?.addEventListener('dragover', (e) => e.preventDefault());
        todoList?.addEventListener('drop', (e) => this.handleListDrop(e));
        
        // ===== 이벤트 위임: todoList의 모든 이벤트를 여기서 처리 =====
        this.bindTodoListEvents(todoList);

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

        // 백업 내보내기
        const exportBackupBtn = document.getElementById('exportBackupBtn');
        exportBackupBtn?.addEventListener('click', () => {
            this.backupManager.exportToFile();
        });

        // 백업 가져오기
        const importBackupBtn = document.getElementById('importBackupBtn');
        const importBackupFile = document.getElementById('importBackupFile');
        
        importBackupBtn?.addEventListener('click', () => {
            importBackupFile?.click();
        });

        importBackupFile?.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            try {
                const backup = await this.backupManager.importFromFile(file);
                
                if (confirm('백업을 복원하시겠습니까? 현재 데이터는 덮어씌워집니다.')) {
                    this.backupManager.restore(backup);
                }
            } catch (error) {
                showUserMessage(error.message, 'error');
            } finally {
                // 파일 입력 초기화
                importBackupFile.value = '';
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

    // ===== todoList 이벤트 위임 =====
    bindTodoListEvents(todoList) {
        if (!todoList) return;

        // 클릭 이벤트 위임
        todoList.addEventListener('click', (e) => {
            const todoItem = e.target.closest('.todo-item');
            if (!todoItem) return;
            
            const id = todoItem.dataset.id;
            if (!id) return;

            // 체크박스 클릭
            if (e.target.classList.contains('todo-checkbox')) {
                e.stopPropagation();
                todoItem.classList.add('completing');
                setTimeout(() => this.toggleTodo(id), 200);
                return;
            }

            // 삭제 버튼 클릭
            if (e.target.classList.contains('delete-btn')) {
                e.stopPropagation();
                this.deleteTodo(id);
                return;
            }

            // 핀 버튼 클릭
            if (e.target.classList.contains('pin-btn')) {
                e.stopPropagation();
                this.togglePin(id);
                return;
            }

            // 뽀모도로 버튼 클릭
            if (e.target.classList.contains('pomodoro-start-btn')) {
                e.stopPropagation();
                this.openPomodoroModal(id);
                return;
            }

            // 그 외 영역 클릭 시 토글 (단, todo-text 내부가 아닐 때만)
            if (!e.target.closest('.todo-text[contenteditable="true"]')) {
                todoItem.classList.add('completing');
                setTimeout(() => this.toggleTodo(id), 200);
            }
        });

        // 더블클릭 이벤트 위임 (편집)
        todoList.addEventListener('dblclick', (e) => {
            const textEl = e.target.closest('.todo-text');
            if (!textEl) return;
            
            const todoItem = textEl.closest('.todo-item');
            if (!todoItem) return;
            
            const id = todoItem.dataset.id;
            if (id) {
                e.stopPropagation();
                this.startEditing(id, textEl);
            }
        });

        // 키보드 이벤트 위임
        todoList.addEventListener('keydown', (e) => {
            const todoItem = e.target.closest('.todo-item');
            if (!todoItem) return;
            
            const id = todoItem.dataset.id;
            if (!id) return;

            if (e.key === 'Enter') {
                this.toggleTodo(id);
            } else if (e.key === 'Delete' || e.key === 'Backspace') {
                e.preventDefault();
                this.deleteTodo(id);
            } else if (e.key === 'F2') {
                e.preventDefault();
                const textEl = todoItem.querySelector('.todo-text');
                if (textEl) this.startEditing(id, textEl);
            }
        });

        // 드래그 이벤트 위임
        todoList.addEventListener('dragstart', (e) => {
            const todoItem = e.target.closest('.todo-item');
            if (!todoItem) return;
            
            const id = todoItem.dataset.id;
            if (id) this.handleDragStart(e, id);
        });

        todoList.addEventListener('dragover', (e) => {
            const todoItem = e.target.closest('.todo-item');
            if (todoItem) this.handleDragOver(e);
        });

        todoList.addEventListener('dragleave', (e) => {
            const todoItem = e.target.closest('.todo-item');
            if (todoItem) this.handleDragLeave(e);
        });

        todoList.addEventListener('drop', (e) => {
            const todoItem = e.target.closest('.todo-item');
            if (!todoItem) return;
            
            const id = todoItem.dataset.id;
            if (id) this.handleDrop(e, id);
        });

        todoList.addEventListener('dragend', () => {
            document.querySelectorAll('.todo-item').forEach(item => {
                item.classList.remove('dragging', 'drag-over');
            });
            this.draggedItem = null;
        });
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
        
        // innerHTML 대신 안전한 DOM API 사용
        grid.textContent = ''; // 기존 내용 제거
        
        EMOJIS.forEach(emoji => {
            const btn = document.createElement('button');
            btn.className = 'emoji-option';
            btn.dataset.emoji = emoji;
            btn.textContent = emoji;
            grid.appendChild(btn);
        });
        
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
            maxLength: VALIDATION.TODO_MAX_LENGTH, 
            minLength: VALIDATION.TODO_MIN_LENGTH 
        });

        if (!validation.valid) {
            if (validation.error) {
                showUserMessage(validation.error, 'warning');
            }
            return;
        }

        const todo = {
            id: globalThis.crypto.randomUUID(),
            text: validation.sanitized,
            completed: false,
            createdAt: new Date().toISOString(),
            emoji: this.selectedEmoji,
        };

        this.todos.unshift(todo);
        this.saveTodos();
        this.renderThrottled();
        
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
        
        // todo-core 함수 사용 (새 배열 반환)
        this.todos = toggleTodoById(this.todos, id);
        this.saveTodos();

        // 완료되지 않은 상태에서 토글 = 완료됨
        if (!wasCompleted) {
            const updatedTodo = this.todos.find(t => t.id === id);
            if (updatedTodo?.completed) {
                this.onTodoComplete(updatedTodo);
            }
        }

        this.renderThrottled();
    }

    onTodoComplete(todo) {
        // todo-core의 calculateXP 사용
        const xpGain = calculateXP(todo.createdAt);

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
        // todo-core 함수 사용
        this.todos = deleteTodoById(this.todos, id);
        this.saveTodos();
        this.renderThrottled();
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
        // todo-core 함수 사용
        this.todos = togglePinById(this.todos, id);
        this.todos = sortTodos(this.todos);
        this.saveTodos();
        this.renderThrottled();
        this.sound.play('click');
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
                maxLength: VALIDATION.TODO_MAX_LENGTH, 
                minLength: VALIDATION.TODO_MIN_LENGTH 
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
            this.renderThrottled();
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
            this.renderThrottled();
        }
    }

    // ===== 유틸리티 =====
    getAgeHours(createdAt) {
        // todo-core 함수 사용
        return getTodoAgeHours(createdAt);
    }

    getAgeText(createdAt) {
        // todo-core 함수 사용
        return getTodoAgeText(createdAt);
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
        
        // 업적 목록 - innerHTML 대신 안전한 DOM API 사용
        const achievementsList = document.getElementById('achievementsList');
        if (achievementsList) {
            achievementsList.textContent = ''; // 기존 내용 제거
            
            ACHIEVEMENTS.forEach(a => {
                const unlocked = this.profile.achievements.includes(a.id);
                
                const div = document.createElement('div');
                div.className = `achievement-item ${unlocked ? '' : 'locked'}`;
                
                const iconSpan = document.createElement('span');
                iconSpan.className = 'icon';
                iconSpan.textContent = a.icon;
                
                const infoDiv = document.createElement('div');
                infoDiv.className = 'info';
                
                const nameDiv = document.createElement('div');
                nameDiv.className = 'name';
                nameDiv.textContent = a.name;
                
                const descDiv = document.createElement('div');
                descDiv.className = 'desc';
                descDiv.textContent = a.desc;
                
                infoDiv.appendChild(nameDiv);
                infoDiv.appendChild(descDiv);
                div.appendChild(iconSpan);
                div.appendChild(infoDiv);
                achievementsList.appendChild(div);
            });
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

        // todo-core 함수 사용
        const activeCount = getActiveCount(this.todos);
        const completedCount = getCompletedCount(this.todos);
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
        // 이벤트는 bindTodoListEvents에서 위임 처리

        // 뽀모도로 버튼 (완료되지 않은 항목만)
        if (!todo.completed) {
            const pomodoroBtn = document.createElement('button');
            pomodoroBtn.className = 'pomodoro-start-btn';
            pomodoroBtn.setAttribute('aria-label', '뽀모도로');
            pomodoroBtn.textContent = '🍅';
            // 이벤트는 bindTodoListEvents에서 위임 처리
            actions.appendChild(pomodoroBtn);
        }

        actions.appendChild(pinBtn);

        // 삭제 버튼
        const del = document.createElement('button');
        del.className = 'delete-btn';
        del.setAttribute('aria-label', '삭제');
        del.textContent = '×';
        // 이벤트는 bindTodoListEvents에서 위임 처리

        actions.appendChild(del);

        li.appendChild(checkbox);
        li.appendChild(contentWrapper);
        li.appendChild(actions);

        // 모든 이벤트는 bindTodoListEvents에서 위임 처리됨
        // (개별 리스너 제거로 메모리 효율 개선)

        return li;
    }

    /**
     * 리소스 정리 (메모리 누수 방지)
     */
    destroy() {
        // 타이머 정리
        clearAllTrackedTimers(this);
        
        // 뽀모도로 타이머 정리
        if (this.pomodoro.intervalId) {
            clearInterval(this.pomodoro.intervalId);
            this.pomodoro.intervalId = null;
        }
        
        // 이벤트 리스너 정리
        this.eventCleanupFunctions.forEach(cleanup => cleanup());
        this.eventCleanupFunctions = [];
        
        // 키보드 단축키 비활성화
        this.shortcuts.disable();
        
        // 사운드 및 Confetti 정리
        this.sound?.destroy();
        this.confetti?.destroy();
        
        // 배치 큐 정리
        this.updateQueue.clear();
    }
}

// ===== 초기화 =====
document.addEventListener('DOMContentLoaded', () => {
    new TodoManager();
});
