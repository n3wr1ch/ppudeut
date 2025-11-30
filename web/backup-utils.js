/**
 * 데이터 백업 및 복원 유틸리티
 */

import { 
    safeLocalStorageGet,
    logError,
    showUserMessage 
} from './security-utils.js';

import './types.js';

/**
 * 백업 데이터 구조
 * @typedef {Object} BackupData
 * @property {string} version - 백업 버전
 * @property {string} timestamp - 백업 시간
 * @property {Todo[]} todos - 할 일 목록
 * @property {Profile} profile - 프로필 데이터
 * @property {Settings} settings - 설정 데이터
 */

/**
 * 데이터 백업 매니저
 */
export class BackupManager {
    constructor() {
        this.version = '1.0.0';
    }

    /**
     * 데이터 백업 생성
     * @returns {BackupData} - 백업 데이터
     */
    createBackup() {
        try {
            const backup = {
                version: this.version,
                timestamp: new Date().toISOString(),
                todos: safeLocalStorageGet('todos', []),
                profile: safeLocalStorageGet('todo-profile', {}),
                settings: safeLocalStorageGet('todo-settings', {}),
            };

            return backup;
        } catch (error) {
            logError('createBackup', error);
            throw new Error('백업 생성에 실패했습니다.');
        }
    }

    /**
     * JSON 파일로 백업 내보내기
     */
    exportToFile() {
        try {
            const backup = this.createBackup();
            const json = JSON.stringify(backup, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            
            const filename = `ppudeut-backup-${new Date().toISOString().split('T')[0]}.json`;
            this.downloadBlob(blob, filename);
            
            showUserMessage('백업 파일이 다운로드되었습니다.', 'success');
        } catch (error) {
            logError('exportToFile', error);
            showUserMessage('백업 내보내기에 실패했습니다.', 'error');
        }
    }

    /**
     * JSON 파일에서 백업 가져오기
     * @param {File} file - 백업 파일
     * @returns {Promise<BackupData>} - 백업 데이터
     */
    async importFromFile(file) {
        return new Promise((resolve, reject) => {
            if (!file || file.type !== 'application/json') {
                reject(new Error('유효한 JSON 파일을 선택해주세요.'));
                return;
            }

            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    
                    // 백업 데이터 유효성 검증
                    if (!this.validateBackup(data)) {
                        reject(new Error('백업 파일 형식이 올바르지 않습니다.'));
                        return;
                    }
                    
                    resolve(data);
                } catch (error) {
                    reject(new Error('백업 파일을 읽을 수 없습니다.'));
                }
            };

            reader.onerror = () => {
                reject(new Error('파일 읽기에 실패했습니다.'));
            };

            reader.readAsText(file);
        });
    }

    /**
     * 백업 데이터 복원
     * @param {BackupData} backup - 백업 데이터
     */
    restore(backup) {
        try {
            if (!this.validateBackup(backup)) {
                throw new Error('백업 데이터가 유효하지 않습니다.');
            }

            // 기존 데이터 백업 (혹시 모를 복원 실패 대비)
            const rollback = this.createBackup();

            try {
                // 데이터 복원
                localStorage.setItem('todos', JSON.stringify(backup.todos || []));
                localStorage.setItem('todo-profile', JSON.stringify(backup.profile || {}));
                localStorage.setItem('todo-settings', JSON.stringify(backup.settings || {}));

                showUserMessage('백업이 성공적으로 복원되었습니다. 페이지를 새로고침합니다.', 'success');
                
                // 2초 후 페이지 새로고침
                setTimeout(() => {
                    window.location.reload();
                }, 2000);
            } catch (error) {
                // 복원 실패 시 롤백
                localStorage.setItem('todos', JSON.stringify(rollback.todos));
                localStorage.setItem('todo-profile', JSON.stringify(rollback.profile));
                localStorage.setItem('todo-settings', JSON.stringify(rollback.settings));
                
                throw new Error('복원 중 오류가 발생하여 이전 상태로 되돌렸습니다.');
            }
        } catch (error) {
            logError('restore', error);
            showUserMessage(error.message, 'error');
        }
    }

    /**
     * 백업 데이터 유효성 검증
     * @param {BackupData} backup - 백업 데이터
     * @returns {boolean} - 유효 여부
     */
    validateBackup(backup) {
        if (!backup || typeof backup !== 'object') {
            return false;
        }

        // 필수 필드 확인
        if (!backup.version || !backup.timestamp) {
            return false;
        }

        // todos 배열 확인
        if (backup.todos && !Array.isArray(backup.todos)) {
            return false;
        }

        // profile 객체 확인
        if (backup.profile && typeof backup.profile !== 'object') {
            return false;
        }

        // settings 객체 확인
        if (backup.settings && typeof backup.settings !== 'object') {
            return false;
        }

        return true;
    }

    /**
     * Blob 다운로드 헬퍼
     * @param {Blob} blob - 다운로드할 Blob
     * @param {string} filename - 파일명
     */
    downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.style.display = 'none';
        
        document.body.appendChild(a);
        a.click();
        
        // cleanup
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
    }

    /**
     * 자동 백업 설정
     * @param {number} intervalDays - 백업 간격 (일)
     */
    setupAutoBackup(intervalDays = 7) {
        const BACKUP_KEY = 'last-auto-backup';
        const lastBackup = localStorage.getItem(BACKUP_KEY);
        
        if (lastBackup) {
            const lastDate = new Date(lastBackup);
            const now = new Date();
            const daysDiff = (now - lastDate) / (1000 * 60 * 60 * 24);
            
            if (daysDiff < intervalDays) {
                // 아직 백업 시간이 아님
                return;
            }
        }

        // 자동 백업 생성
        try {
            const backup = this.createBackup();
            localStorage.setItem('auto-backup', JSON.stringify(backup));
            localStorage.setItem(BACKUP_KEY, new Date().toISOString());
            
            console.log('자동 백업이 생성되었습니다.');
        } catch (error) {
            logError('setupAutoBackup', error);
        }
    }

    /**
     * 자동 백업 가져오기
     * @returns {BackupData|null} - 자동 백업 데이터
     */
    getAutoBackup() {
        try {
            const backup = safeLocalStorageGet('auto-backup', null);
            return backup && this.validateBackup(backup) ? backup : null;
        } catch (error) {
            logError('getAutoBackup', error);
            return null;
        }
    }
}

/**
 * 검색 및 필터 유틸리티
 */
export class SearchFilterManager {
    constructor() {
        this.currentFilter = 'all'; // 'all' | 'active' | 'completed'
        this.currentSearch = '';
    }

    /**
     * 필터 설정
     * @param {string} filter - 필터 타입
     */
    setFilter(filter) {
        this.currentFilter = filter;
    }

    /**
     * 검색어 설정
     * @param {string} query - 검색어
     */
    setSearch(query) {
        this.currentSearch = (query || '').trim();
    }

    /**
     * 할 일 목록 필터링 및 검색
     * @param {Todo[]} todos - 할 일 목록
     * @returns {Todo[]} - 필터링된 목록
     */
    apply(todos) {
        let filtered = todos;

        // 필터 적용
        switch (this.currentFilter) {
            case 'active':
                filtered = filtered.filter(t => !t.completed);
                break;
            case 'completed':
                filtered = filtered.filter(t => t.completed);
                break;
            default:
                // 'all' - 모든 항목
                break;
        }

        // 검색 적용
        if (this.currentSearch) {
            const query = this.currentSearch.toLowerCase();
            filtered = filtered.filter(t => 
                t.text.toLowerCase().includes(query)
            );
        }

        return filtered;
    }

    /**
     * 필터/검색 초기화
     */
    reset() {
        this.currentFilter = 'all';
        this.currentSearch = '';
    }
}
