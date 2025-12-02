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
    getActiveCount,
    getCompletedCount,
    getTodoAgeHours,
    getTodoAgeText,
    addTodoList,
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
import PracticalityManager from './practicality-manager.js';
import { SwipeGestureManager } from './swipe-gestures.js';

import './types.js';

// ===== 상수 import =====
import {
    MOTIVATIONAL_QUOTES,
    ACHIEVEMENTS,
    DEFAULT_PROFILE,
    DEFAULT_SETTINGS,
    VALIDATION,
    PPUDEUT_MESSAGES,
} from './constants.js';

// ===== 메인 Todo Manager =====
class TodoManager {
    constructor() {
        this.todos = [];
        this.profile = this.loadProfile();
        this.settings = this.loadSettings();
        this.draggedItem = null;

        this.sound = new SoundManager();
        this.confetti = null;

        // 새로운 매니저들 초기화
        this.practicalityManager = null;
        this.swipeGestureManager = null;

        // 필터 상태 관리
        this.filterState = {
            status: 'all',
            isActive: false
        };

        // 집중 모드 상태
        this.focusMode = {
            isActive: false,
            startTime: null,
            timer: null,
            lastActivityTime: Date.now(),
        };

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

        // 새로운 매니저들 초기화
        this.practicalityManager = new PracticalityManager(this);
        this.swipeGestureManager = new SwipeGestureManager(this);

        this.bindEvents();
        this.setupKeyboardShortcuts();
        this.setupAutoBackup();
        this.updateStreak();
        this.render();
        this.renderProfile();
        this.checkAchievements(true); // 초기 체크 (조용히)

        // 집중 모드 초기화 (설정에 따라)
        if (this.settings.alwaysOnTop) {
            this.toggleFocusMode(true, true); // silent mode
        }
    }

    // ===== 집중 모드 =====
    toggleFocusMode(forceState = null, silent = false) {
        const newState = forceState !== null ? forceState : !this.focusMode.isActive;
        this.focusMode.isActive = newState;

        const focusToggle = document.getElementById('focusToggle');
        const focusIconOff = document.getElementById('focusIconOff');
        const focusIconOn = document.getElementById('focusIconOn');
        const focusTimer = document.getElementById('focusTimer');
        const container = document.querySelector('.sticker-container');

        if (newState) {
            // 집중 모드 ON
            this.focusMode.startTime = Date.now();
            this.focusMode.lastActivityTime = Date.now();
            
            focusToggle?.classList.add('active');
            if (focusIconOff) focusIconOff.style.display = 'none';
            if (focusIconOn) focusIconOn.style.display = 'block';
            if (focusTimer) focusTimer.style.display = 'flex';
            container?.classList.add('focus-mode');
            
            // 타이머 시작
            this.startFocusTimer();
            
            // Tauri API로 always on top 설정
            this.setAlwaysOnTop(true);
            
            if (!silent) {
                this.showFocusModeMessage(true);
                this.sound.play('click');
            }
        } else {
            // 집중 모드 OFF
            this.stopFocusTimer();
            
            focusToggle?.classList.remove('active');
            if (focusIconOff) focusIconOff.style.display = 'block';
            if (focusIconOn) focusIconOn.style.display = 'none';
            if (focusTimer) focusTimer.style.display = 'none';
            container?.classList.remove('focus-mode');
            
            // Tauri API로 always on top 해제
            this.setAlwaysOnTop(false);
            
            if (!silent) {
                this.showFocusModeMessage(false);
                this.sound.play('click');
            }
        }

        // 설정 저장
        this.settings.alwaysOnTop = newState;
        this.saveSettings();
    }

    startFocusTimer() {
        // 기존 타이머 정리
        if (this.focusMode.timer) {
            clearInterval(this.focusMode.timer);
        }

        // 1분마다 업데이트
        this.focusMode.timer = setInterval(() => {
            this.updateFocusStatus();
        }, 60000); // 1분

        // 즉시 한번 업데이트
        this.updateFocusStatus();
    }

    stopFocusTimer() {
        if (this.focusMode.timer) {
            clearInterval(this.focusMode.timer);
            this.focusMode.timer = null;
        }
        this.focusMode.startTime = null;
    }

    updateFocusStatus() {
        if (!this.focusMode.isActive || !this.focusMode.startTime) return;

        const focusTimeEl = document.getElementById('focusTime');
        
        // 집중 시간 계산
        const elapsed = Date.now() - this.focusMode.startTime;
        const minutes = Math.floor(elapsed / 60000);
        
        // 시간 텍스트
        let timeText;
        if (minutes < 60) {
            timeText = `${minutes}분`;
        } else {
            const hours = Math.floor(minutes / 60);
            const mins = minutes % 60;
            timeText = mins > 0 ? `${hours}시간 ${mins}분` : `${hours}시간`;
        }
        
        if (focusTimeEl) {
            focusTimeEl.textContent = timeText;
        }
    }

    // 활동 기록 (할 일 완료, 추가 등)
    recordActivity() {
        this.focusMode.lastActivityTime = Date.now();
        if (this.focusMode.isActive) {
            this.updateFocusStatus();
        }
    }

    showFocusModeMessage(isOn) {
        const existingBox = document.querySelector('.focus-mode-message');
        if (existingBox) existingBox.remove();

        const box = document.createElement('div');
        box.className = 'focus-mode-message';
        
        // SVG 아이콘 (이모지 대신)
        const lockIcon = `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>`;
        
        const coffeeIcon = `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 8h1a4 4 0 0 1 0 8h-1"/>
            <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/>
            <line x1="6" y1="1" x2="6" y2="4"/>
            <line x1="10" y1="1" x2="10" y2="4"/>
            <line x1="14" y1="1" x2="14" y2="4"/>
        </svg>`;
        
        if (isOn) {
            box.innerHTML = `
                <span class="focus-msg-icon focus-msg-icon-on">${lockIcon}</span>
                <div class="focus-msg-content">
                    <div class="focus-msg-text">집중 모드 ON!</div>
                    <div class="focus-msg-subtext">방해 금지, 뿌듯 시작!</div>
                </div>
            `;
        } else {
            box.innerHTML = `
                <span class="focus-msg-icon focus-msg-icon-off">${coffeeIcon}</span>
                <div class="focus-msg-content">
                    <div class="focus-msg-text">잠깐 쉬어가기</div>
                    <div class="focus-msg-subtext">휴식도 중요해요!</div>
                </div>
            `;
        }

        const container = document.querySelector('.sticker-container');
        container.appendChild(box);

        setTimeout(() => {
            box.classList.add('fade-out');
            setTimeout(() => box.remove(), 300);
        }, 2000);
    }

    async setAlwaysOnTop(value) {
        if (window.__TAURI__) {
            try {
                const appWindow = window.__TAURI__.window.appWindow;
                await appWindow.setAlwaysOnTop(value);
            } catch {
                // Tauri API 오류 무시
            }
        }
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
                    createdAt: todo.createdAt || new Date().toISOString(),
                    completed: Boolean(todo.completed),
                };
            }).filter(todo => todo !== null); // null 제거

            // 데이터 무결성 검증 (간단한 체크만)
            this.validateTodoIntegrity();

            this.saveTodos();
        } catch (error) {
            logError('migrateData', error);
            showUserMessage('데이터 마이그레이션 중 오류가 발생했습니다.', 'warning');
        }
    }

    /**
     * 할 일 데이터 무결성 검증 (간단한 필드 체크)
     */
    validateTodoIntegrity() {
        const issues = [];

        // 각 할 일 검증
        this.todos.forEach(todo => {
            // ID 검증
            if (!todo.id) {
                issues.push(`ID가 없는 할 일: "${todo.text}"`);
            }

            // 텍스트 검증
            if (!todo.text || typeof todo.text !== 'string') {
                issues.push(`텍스트가 올바르지 않은 할 일: ID ${todo.id}`);
            }
        });

        // 이슈가 있으면 로그 기록
        if (issues.length > 0) {
            logError('validateTodoIntegrity', new Error('데이터 무결성 이슈 발견'), { issues });
            // eslint-disable-next-line no-console
            console.warn('데이터 무결성 이슈:', issues);
        }

        return issues.length === 0;
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
        const rouletteBtn = document.getElementById('rouletteBtn');
        const opacitySlider = document.getElementById('opacitySlider');

        // 입력
        todoInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.addTodo(todoInput.value);

                // 입력 필드 초기화
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

        // 설정 탭 전환
        const settingsTabs = document.querySelectorAll('.settings-tab');
        settingsTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.dataset.tab;

                // 탭 활성화
                settingsTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                // 콘텐츠 표시
                document.querySelectorAll('.settings-tab-content').forEach(content => {
                    content.classList.remove('active');
                    content.style.display = 'none';
                });

                const activeContent = document.getElementById(`${tabName}Tab`);
                if (activeContent) {
                    activeContent.classList.add('active');
                    activeContent.style.display = 'block';
                }

                this.sound.play('click');
            });
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

        // 룰렛
        rouletteBtn?.addEventListener('click', () => this.spinRoulette());

        // 검색 입력
        const searchInput = document.getElementById('searchInput');
        const searchToggleBtn = document.getElementById('searchToggleBtn');
        const searchBarContainer = document.getElementById('searchBar');

        searchToggleBtn?.addEventListener('click', () => {
            const isVisible = searchBarContainer.style.display === 'block';
            searchBarContainer.style.display = isVisible ? 'none' : 'block';
            if (!isVisible) setTimeout(() => searchInput?.focus(), 100);
        });

        searchInput?.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            this.performSearch(query);
        });

        // 필터 칩
        const filterChips = document.querySelectorAll('.filter-chip');
        filterChips.forEach(chip => {
            chip.addEventListener('click', () => {
                filterChips.forEach(c => c.classList.remove('active'));
                chip.classList.add('active');

                const filterType = chip.dataset.filter;
                this.filterState.status = filterType;
                this.renderThrottled();
            });
        });

        // 투명도 슬라이더
        if (opacitySlider) {
            opacitySlider.value = this.settings.opacity;
            opacitySlider.addEventListener('input', (e) => {
                this.setOpacity(parseInt(e.target.value));
            });
        }

        // 뿌듯 카운트 클릭 시 멘트 표시
        const todayStats = document.getElementById('todayStats');
        todayStats?.addEventListener('click', () => {
            this.showPpudeutMessage();
            this.sound.play('click');
        });

        // 집중 모드 토글
        const focusToggle = document.getElementById('focusToggle');
        focusToggle?.addEventListener('click', () => {
            this.toggleFocusMode();
        });

        // 창 컨트롤
        if (window.__TAURI__) {
            const appWindow = window.__TAURI__.window.appWindow;
            closeBtn?.addEventListener('click', () => appWindow.close().catch(() => { }));
            minimizeBtn?.addEventListener('click', () => appWindow.minimize().catch(() => { }));
            maximizeBtn?.addEventListener('click', () => appWindow.toggleMaximize().catch(() => { }));
        }
    }

    // ===== todoList 이벤트 위임 =====
    bindTodoListEvents(todoList) {
        if (!todoList) return;

        // 꾹 누르기 상태 관리
        this.longPressState = {
            timer: null,
            startTime: 0,
            targetId: null,
            isPressed: false,
            progressInterval: null
        };

        const LONG_PRESS_DURATION = 400; // 0.4초

        // 꾹 누르기 시작
        const startLongPress = (e, id, btnEl) => {
            if (this.longPressState.isPressed) return;
            
            const todo = this.todos.find(t => t.id === id);
            if (todo?.completed) return; // 이미 완료된 항목은 무시
            
            e.preventDefault();
            this.longPressState.isPressed = true;
            this.longPressState.targetId = id;
            this.longPressState.startTime = Date.now();
            
            // 프로그레스 시작
            btnEl.classList.add('pressing');
            
            // 프로그레스 업데이트
            this.longPressState.progressInterval = setInterval(() => {
                const elapsed = Date.now() - this.longPressState.startTime;
                const progress = Math.min(elapsed / LONG_PRESS_DURATION, 1);
                btnEl.style.setProperty('--progress', progress);
                
                if (progress >= 1) {
                    clearInterval(this.longPressState.progressInterval);
                }
            }, 16);
            
            // 완료 타이머
            this.longPressState.timer = setTimeout(() => {
                if (this.longPressState.isPressed && this.longPressState.targetId === id) {
                    // 완료 처리
                    btnEl.classList.remove('pressing');
                    btnEl.classList.add('completed-pop');
                    this.sound.play('complete');
                    
                    setTimeout(() => {
                        this.toggleTodo(id);
                        btnEl.classList.remove('completed-pop');
                    }, 150);
                }
                resetLongPress(btnEl);
            }, LONG_PRESS_DURATION);
        };

        // 꾹 누르기 취소/종료
        const resetLongPress = (btnEl) => {
            if (this.longPressState.timer) {
                globalThis.clearTimeout(this.longPressState.timer);
                this.longPressState.timer = null;
            }
            if (this.longPressState.progressInterval) {
                clearInterval(this.longPressState.progressInterval);
                this.longPressState.progressInterval = null;
            }
            if (btnEl) {
                btnEl.classList.remove('pressing');
                btnEl.style.setProperty('--progress', 0);
            }
            this.longPressState.isPressed = false;
            this.longPressState.targetId = null;
        };

        // 클릭 이벤트 위임
        todoList.addEventListener('click', (e) => {
            const todoItem = e.target.closest('.todo-item');
            if (!todoItem) return;

            const id = todoItem.dataset.id;
            if (!id) return;

            // 뿌듯 버튼 클릭 (완료된 항목 해제용)
            if (e.target.closest('.ppudeut-btn')) {
                const todo = this.todos.find(t => t.id === id);
                if (todo?.completed) {
                    e.stopPropagation();
                    this.toggleTodo(id);
                }
                return;
            }

            // 삭제 버튼 클릭 (없을 수도 있음, 디자인 변경됨)
            if (e.target.closest('.delete-btn')) {
                e.stopPropagation();
                this.deleteTodo(id);
                return;
            }

            // 그 외 영역 클릭 시 토글하지 않음 (뿌듯 버튼으로만)
        });

        // 꾹 누르기 이벤트 (마우스)
        todoList.addEventListener('mousedown', (e) => {
            const ppudeutBtn = e.target.closest('.ppudeut-btn');
            if (!ppudeutBtn) return;
            
            const todoItem = ppudeutBtn.closest('.todo-item');
            if (!todoItem) return;
            
            const id = todoItem.dataset.id;
            if (id) startLongPress(e, id, ppudeutBtn);
        });

        todoList.addEventListener('mouseup', (e) => {
            const ppudeutBtn = e.target.closest('.ppudeut-btn');
            resetLongPress(ppudeutBtn);
        });

        todoList.addEventListener('mouseleave', () => {
            if (this.longPressState.isPressed) {
                const ppudeutBtn = document.querySelector('.ppudeut-btn.pressing');
                resetLongPress(ppudeutBtn);
            }
        });

        // 꾹 누르기 이벤트 (터치)
        todoList.addEventListener('touchstart', (e) => {
            const ppudeutBtn = e.target.closest('.ppudeut-btn');
            if (!ppudeutBtn) return;
            
            const todoItem = ppudeutBtn.closest('.todo-item');
            if (!todoItem) return;
            
            const id = todoItem.dataset.id;
            if (id) startLongPress(e, id, ppudeutBtn);
        }, { passive: false });

        todoList.addEventListener('touchend', (e) => {
            const ppudeutBtn = e.target.closest('.ppudeut-btn');
            resetLongPress(ppudeutBtn);
        });

        todoList.addEventListener('touchcancel', () => {
            const ppudeutBtn = document.querySelector('.ppudeut-btn.pressing');
            resetLongPress(ppudeutBtn);
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

    setOpacity(value, save = true) {
        this.settings.opacity = value;

        // Tauri API로 투명도 설정 (웹뷰 자체는 CSS로)
        const container = document.querySelector('.sticker-container');
        if (container) {
            container.style.opacity = value / 100;
        }

        if (save) {
            this.saveSettings();
        }
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

        // todo-core 함수 사용
        this.todos = addTodoList(this.todos, validation.sanitized);

        this.saveTodos();
        this.renderThrottled();

        // 활동 기록 (집중 모드)
        this.recordActivity();

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
        // 활동 기록 (집중 모드)
        this.recordActivity();

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
        
        // 뿌듯 격려 멘트 표시
        this.showEncouragement(todo.id);

        // 뿌듯 개수 멘트 업데이트 (헤더)
        this.showPpudeutMessage();

        // 업적 체크
        this.checkAchievements();
    }

    /**
     * 뿌듯 격려 멘트 표시 (할 일 항목에 떠오르는 멘트)
     */
    showEncouragement(targetId) {
        const encouragements = [
            '뿌듯! ✨',
            '해냈다! 🎉',
            '대단해! 💪',
            '멋져! 🌟',
            '최고! 🔥',
            '짝짝짝! 👏',
            '훌륭해! 💫',
            '잘했어! 🙌',
        ];
        
        const randomMsg = encouragements[Math.floor(Math.random() * encouragements.length)];
        
        const todoEl = document.querySelector(`[data-id="${targetId}"]`);
        if (!todoEl) return;

        const float = document.createElement('div');
        float.className = 'encouragement-float';
        float.textContent = randomMsg;

        const rect = todoEl.getBoundingClientRect();
        const container = document.querySelector('.sticker-container');
        const containerRect = container.getBoundingClientRect();

        float.style.left = `${rect.left - containerRect.left + rect.width / 2}px`;
        float.style.top = `${rect.top - containerRect.top}px`;

        container.appendChild(float);
        setTimeout(() => float.remove(), 1200);
    }

    /**
     * 뿌듯 개수에 따른 멘트 표시 (헤더 클릭 시 또는 완료 시)
     */
    showPpudeutMessage() {
        const count = this.getTodayCompletedCount();
        const messageData = PPUDEUT_MESSAGES[count] || PPUDEUT_MESSAGES.many;
        
        // 기존 메시지 박스 제거
        const existingBox = document.querySelector('.ppudeut-message-box');
        if (existingBox) existingBox.remove();

        // 새 메시지 박스 생성
        const box = document.createElement('div');
        box.className = 'ppudeut-message-box';
        box.innerHTML = `
            <span class="ppudeut-msg-emoji">${messageData.emoji}</span>
            <div class="ppudeut-msg-content">
                <div class="ppudeut-msg-text">${messageData.text}</div>
                <div class="ppudeut-msg-subtext">${messageData.subtext}</div>
            </div>
        `;

        const container = document.querySelector('.sticker-container');
        container.appendChild(box);

        // 2초 후 제거
        setTimeout(() => {
            box.classList.add('fade-out');
            setTimeout(() => box.remove(), 300);
        }, 2000);
    }

    /**
     * 오늘 완료한 개수 가져오기
     */
    getTodayCompletedCount() {
        const today = new Date().toDateString();
        if (this.profile.dailyDate !== today) {
            return 0;
        }
        return this.profile.dailyCompleted || 0;
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
        // 삭제할 할 일 확인
        const todoToDelete = this.todos.find(t => t.id === id);
        if (!todoToDelete) return;

        // todo-core 함수 사용 (새 배열 반환)
        this.todos = deleteTodoById(this.todos, id);

        this.saveTodos();
        this.renderThrottled();
        this.sound.play('delete');
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
        if (activeTodos.length === 0) {
            this.showRouletteModal(null);
            return;
        }

        this.sound.play('click');

        // 랜덤 선택
        const randomIndex = Math.floor(Math.random() * activeTodos.length);
        const selectedTodo = activeTodos[randomIndex];

        // 모달로 표시
        this.showRouletteModal(selectedTodo);
    }

    showRouletteModal(todo) {
        // 기존 모달 제거
        const existingModal = document.querySelector('.roulette-modal');
        const existingBackdrop = document.querySelector('.roulette-backdrop');
        if (existingModal) existingModal.remove();
        if (existingBackdrop) existingBackdrop.remove();

        const backdrop = document.createElement('div');
        backdrop.className = 'roulette-backdrop';

        const modal = document.createElement('div');
        modal.className = 'roulette-modal';

        // 뿌듯 멘트들
        const encouragements = [
            '이거 해볼까요? 💪',
            '이거 어때요? ✨',
            '지금 딱 이거! 🎯',
            '뿌듯해질 준비! 🌟',
            '오늘의 뿌듯 후보! 🎲',
            '이거 하면 기분 좋을 듯! 😊',
            '한번 도전해봐요! 🚀',
        ];
        const randomEncouragement = encouragements[Math.floor(Math.random() * encouragements.length)];

        if (todo) {
            modal.innerHTML = `
                <div class="roulette-icon">🎲</div>
                <div class="roulette-encouragement">${randomEncouragement}</div>
                <div class="roulette-todo-text">${todo.text}</div>
                <div class="roulette-actions">
                    <button class="roulette-btn roulette-retry">🎲 다시 뽑기</button>
                    <button class="roulette-btn roulette-start">시작할게요!</button>
                </div>
            `;
        } else {
            modal.innerHTML = `
                <div class="roulette-icon">📭</div>
                <div class="roulette-encouragement">할 일이 없어요!</div>
                <div class="roulette-todo-text">새로운 할 일을 추가해보세요</div>
                <div class="roulette-actions">
                    <button class="roulette-btn roulette-close">확인</button>
                </div>
            `;
        }

        document.body.appendChild(backdrop);
        document.body.appendChild(modal);

        // 이벤트 바인딩
        const closeModal = () => {
            modal.classList.add('closing');
            backdrop.classList.add('closing');
            setTimeout(() => {
                modal.remove();
                backdrop.remove();
            }, 200);
        };

        backdrop.addEventListener('click', closeModal);

        const retryBtn = modal.querySelector('.roulette-retry');
        const startBtn = modal.querySelector('.roulette-start');
        const closeBtn = modal.querySelector('.roulette-close');

        if (retryBtn) {
            retryBtn.addEventListener('click', () => {
                closeModal();
                setTimeout(() => this.spinRoulette(), 250);
            });
        }

        if (startBtn) {
            startBtn.addEventListener('click', () => {
                closeModal();
                // 선택된 항목으로 스크롤
                const selectedEl = document.querySelector(`[data-id="${todo.id}"]`);
                if (selectedEl) {
                    selectedEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    selectedEl.classList.add('roulette-selected');
                    setTimeout(() => selectedEl.classList.remove('roulette-selected'), 2000);
                }
            });
        }

        if (closeBtn) {
            closeBtn.addEventListener('click', closeModal);
        }

        // 컨펫티 효과
        if (todo) {
            this.confetti?.launch(20);
        }
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
                textEl.textContent = todo.text;

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
                textEl.textContent = todo.text;
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

    getAgeLevel(createdAt) {
        const ageInfo = getTodoAgeText(createdAt);
        return ageInfo.level;
    }

    // ===== 렌더링 =====
    renderProfile() {
        // 오늘 완료 개수 업데이트
        this.updateTodayCount();
    }

    /**
     * 오늘 완료한 뿌듯 개수 업데이트
     */
    updateTodayCount() {
        const todayCountEl = document.getElementById('todayCount');
        if (!todayCountEl) return;

        const count = this.getTodayCompletedCount();
        todayCountEl.textContent = count;
    }

    renderSettings() {
        const soundToggle = document.getElementById('soundToggle');
        const notificationToggle = document.getElementById('notificationToggle');

        if (soundToggle) soundToggle.checked = this.settings.soundEnabled;
        if (notificationToggle) notificationToggle.checked = this.settings.notificationEnabled;

        // 통계
        document.getElementById('statTotalCompleted').textContent = this.profile.totalCompleted;
        document.getElementById('statMaxStreak').textContent = this.profile.maxStreak;

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
        // 기존 스와이프 초기화
        if (this.swipeGestureManager) {
            this.swipeGestureManager.resetAllSwipes();
        }

        // 필터 상태가 활성화되면 필터링된 목록 렌더링
        if (this.filterState.status !== 'all') {
            this.renderWithFilter();
            return;
        }

        const todoList = document.getElementById('todoList');
        const todoCount = document.getElementById('todoCount');
        const emptyState = document.getElementById('emptyState');
        const clearCompletedBtn = document.getElementById('clearCompletedBtn');
        const emptyText = document.getElementById('emptyText');
        const emptyHint = document.getElementById('emptyHint');

        const displayTodos = this.todos;

        if (displayTodos.length === 0) {
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
            displayTodos.forEach(todo => {
                fragment.appendChild(this.createTodoElement(todo));
            });
            todoList.innerHTML = '';
            todoList.appendChild(fragment);
        }

        // todo-core 함수 사용
        const activeCount = getActiveCount(displayTodos);
        const completedCount = getCompletedCount(displayTodos);
        todoCount.textContent = activeCount > 0 ? `뿌듯할 일 ${activeCount}개` : '오늘도 뿌듯하게!';
        clearCompletedBtn.style.display = completedCount > 0 ? 'block' : 'none';
    }

    /**
     * 필터 상태를 반영하여 렌더링
     */
    renderWithFilter() {
        let filtered = [...this.todos];

        // 상태 필터 (all, active, completed)
        if (this.filterState.status === 'active') {
            filtered = filtered.filter(todo => !todo.completed);
        } else if (this.filterState.status === 'completed') {
            filtered = filtered.filter(todo => todo.completed);
        }

        const displayTodos = filtered;

        // 직접 렌더링
        const todoList = document.getElementById('todoList');
        const todoCount = document.getElementById('todoCount');
        const emptyState = document.getElementById('emptyState');
        const clearCompletedBtn = document.getElementById('clearCompletedBtn');
        const emptyText = document.getElementById('emptyText');
        const emptyHint = document.getElementById('emptyHint');

        if (displayTodos.length === 0) {
            emptyState.style.display = 'flex';
            todoList.style.display = 'none';
            todoList.innerHTML = '';

            if (emptyText) emptyText.textContent = '필터에 맞는 할 일이 없습니다';
            if (emptyHint) emptyHint.textContent = '필터를 변경하거나 새 할 일을 추가해보세요';
        } else {
            emptyState.style.display = 'none';
            todoList.style.display = 'flex';

            const fragment = document.createDocumentFragment();
            displayTodos.forEach(todo => {
                fragment.appendChild(this.createTodoElement(todo));
            });
            todoList.innerHTML = '';
            todoList.appendChild(fragment);
        }

        // todo-core 함수 사용
        const activeCount = getActiveCount(displayTodos);
        const completedCount = getCompletedCount(displayTodos);
        todoCount.textContent = activeCount > 0 ? `뿌듯할 일 ${activeCount}개` : '오늘도 뿌듯하게!';
        clearCompletedBtn.style.display = completedCount > 0 ? 'block' : 'none';
    }

    /**
     * 필터 상태 설정
     */
    setFilterState(filterType, value) {
        this.filterState[filterType] = value;
        this.render();
    }

    /**
     * 모든 필터 초기화
     */
    clearAllFilters() {
        this.filterState = {
            status: 'all',
            isActive: false
        };

        // 필터 UI 초기화
        document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
        document.querySelector('.filter-chip[data-filter="all"]')?.classList.add('active');

        this.render();
    }

    /**
     * 검색 수행
     */
    performSearch(query) {
        const todoList = document.getElementById('todoList');
        if (!todoList) return;

        // 검색어가 없으면 모든 항목 표시
        if (!query) {
            const items = todoList.querySelectorAll('.todo-item');
            items.forEach(item => {
                item.style.display = '';
            });
            return;
        }

        const lowerQuery = query.toLowerCase();
        const items = todoList.querySelectorAll('.todo-item');

        items.forEach(item => {
            const todoId = item.dataset.id;
            const todo = this.todos.find(t => t.id === todoId);

            if (!todo) {
                item.style.display = 'none';
                return;
            }

            // 텍스트에서 검색
            const textMatch = todo.text.toLowerCase().includes(lowerQuery);

            if (textMatch) {
                item.style.display = '';
            } else {
                item.style.display = 'none';
            }
        });
    }

    createTodoElement(todo) {
        const li = document.createElement('li');
        li.className = `todo-item${todo.completed ? ' completed' : ''}`;
        li.draggable = true;
        li.tabIndex = 0;
        li.dataset.id = String(todo.id);

        // 삭제 버튼 (우측 상단)
        const del = document.createElement('button');
        del.className = 'delete-btn';
        del.setAttribute('aria-label', '삭제');
        del.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';

        // 뿌듯 버튼 (꾹 누르기)
        const ppudeutBtn = document.createElement('button');
        ppudeutBtn.className = 'ppudeut-btn' + (todo.completed ? ' done' : '');
        ppudeutBtn.setAttribute('aria-label', todo.completed ? '완료됨' : '꾹 눌러서 완료');
        ppudeutBtn.innerHTML = `
            <svg class="ppudeut-circle" viewBox="0 0 36 36">
                <circle class="bg" cx="18" cy="18" r="16"/>
                <circle class="progress" cx="18" cy="18" r="16"/>
            </svg>
            <span class="ppudeut-check">✓</span>
        `;

        // 콘텐츠 래퍼
        const contentWrapper = document.createElement('div');
        contentWrapper.className = 'todo-content-wrapper';

        // 텍스트
        const span = document.createElement('span');
        span.className = 'todo-text';
        span.appendChild(document.createTextNode(todo.text));
        contentWrapper.appendChild(span);

        li.appendChild(del);
        li.appendChild(ppudeutBtn);
        li.appendChild(contentWrapper);

        // 마감일 + 미룬 시간 배지 추가
        if (this.practicalityManager) {
            const enhancedLi = this.practicalityManager.enhanceTodoItem(li, todo);

            // 스와이프 제스처 바인딩
            if (this.swipeGestureManager) {
                this.swipeGestureManager.bindSwipeEvents(enhancedLi, todo.id);
            }

            return enhancedLi;
        }

        // 스와이프 제스처 바인딩
        if (this.swipeGestureManager) {
            this.swipeGestureManager.bindSwipeEvents(li, todo.id);
        }

        return li;
    }

    /**
     * 리소스 정리 (메모리 누수 방지)
     */
    destroy() {
        // 타이머 정리
        clearAllTrackedTimers(this);

        // 집중 모드 타이머 정리
        this.stopFocusTimer();

        // 실용성 매니저 정리
        if (this.practicalityManager) {
            this.practicalityManager.destroy();
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
