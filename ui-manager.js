// UI/UX Manager for Receipt Scanner PWA
// Provides enhanced user interface components and state management

class UIManager {
    constructor() {
        this.loadingStates = new Map();
        this.notifications = [];
        this.maxNotifications = 5;
        this.init();
    }

    // Initialize UI enhancements
    init() {
        this.createLoadingOverlay();
        this.createNotificationContainer();
        this.setupGlobalStyles();
        this.setupKeyboardShortcuts();
    }

    // Create loading overlay component
    createLoadingOverlay() {
        const overlay = document.createElement('div');
        overlay.id = 'loading-overlay';
        overlay.className = 'loading-overlay hidden';
        overlay.innerHTML = `
            <div class="loading-content">
                <div class="loading-spinner"></div>
                <div class="loading-text">処理中...</div>
                <div class="loading-progress">
                    <div class="progress-bar">
                        <div class="progress-fill"></div>
                    </div>
                    <div class="progress-text">0%</div>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
    }

    // Create notification container
    createNotificationContainer() {
        const container = document.createElement('div');
        container.id = 'notification-container';
        container.className = 'notification-container';
        document.body.appendChild(container);
    }

    // Setup global UI styles
    setupGlobalStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .loading-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                backdrop-filter: blur(4px);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 9999;
                transition: opacity 0.3s ease;
            }
            
            .loading-overlay.hidden {
                opacity: 0;
                pointer-events: none;
            }
            
            .loading-content {
                background: white;
                padding: 30px;
                border-radius: 16px;
                text-align: center;
                box-shadow: 0 10px 30px rgba(0,0,0,0.3);
                max-width: 300px;
                width: 90%;
            }
            
            .loading-spinner {
                width: 40px;
                height: 40px;
                border: 4px solid #f3f3f3;
                border-top: 4px solid #007bff;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin: 0 auto 15px;
            }
            
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            
            .loading-text {
                font-size: 16px;
                font-weight: 600;
                color: #2d3748;
                margin-bottom: 15px;
            }
            
            .loading-progress {
                margin-top: 15px;
            }
            
            .progress-bar {
                width: 100%;
                height: 8px;
                background: #e2e8f0;
                border-radius: 4px;
                overflow: hidden;
                margin-bottom: 8px;
            }
            
            .progress-fill {
                height: 100%;
                background: linear-gradient(45deg, #007bff, #0056b3);
                width: 0%;
                transition: width 0.3s ease;
                border-radius: 4px;
            }
            
            .progress-text {
                font-size: 14px;
                color: #718096;
            }
            
            .notification-container {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                max-width: 350px;
            }
            
            .notification {
                background: white;
                border-radius: 8px;
                padding: 16px;
                margin-bottom: 10px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                border-left: 4px solid #007bff;
                animation: slideInRight 0.3s ease-out;
                position: relative;
                overflow: hidden;
            }
            
            .notification.success { border-left-color: #38a169; }
            .notification.warning { border-left-color: #ed8936; }
            .notification.error { border-left-color: #f56565; }
            .notification.info { border-left-color: #4299e1; }
            
            .notification-content {
                display: flex;
                align-items: flex-start;
                gap: 12px;
            }
            
            .notification-icon {
                font-size: 20px;
                flex-shrink: 0;
                margin-top: 2px;
            }
            
            .notification-text {
                flex: 1;
                font-size: 14px;
                line-height: 1.4;
            }
            
            .notification-title {
                font-weight: 600;
                margin-bottom: 4px;
                color: #2d3748;
            }
            
            .notification-message {
                color: #4a5568;
            }
            
            .notification-close {
                position: absolute;
                top: 8px;
                right: 8px;
                background: none;
                border: none;
                font-size: 18px;
                cursor: pointer;
                color: #a0aec0;
                padding: 4px;
                line-height: 1;
            }
            
            .notification-close:hover {
                color: #2d3748;
            }
            
            .notification-actions {
                margin-top: 12px;
                display: flex;
                gap: 8px;
            }
            
            .notification-btn {
                padding: 6px 12px;
                border: none;
                border-radius: 4px;
                font-size: 12px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s ease;
            }
            
            .notification-btn.primary {
                background: #007bff;
                color: white;
            }
            
            .notification-btn.secondary {
                background: #e2e8f0;
                color: #4a5568;
            }
            
            .notification-btn:hover {
                transform: translateY(-1px);
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            
            @keyframes slideInRight {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            
            @keyframes slideOutRight {
                to {
                    transform: translateX(100%);
                    opacity: 0;
                }
            }
            
            .pulse {
                animation: pulse 2s infinite;
            }
            
            @keyframes pulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.05); }
                100% { transform: scale(1); }
            }
            
            .fade-in {
                animation: fadeIn 0.5s ease-out;
            }
            
            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(20px); }
                to { opacity: 1; transform: translateY(0); }
            }
            
            .shake {
                animation: shake 0.5s ease-in-out;
            }
            
            @keyframes shake {
                0%, 100% { transform: translateX(0); }
                25% { transform: translateX(-5px); }
                75% { transform: translateX(5px); }
            }
        `;
        document.head.appendChild(style);
    }

    // Setup keyboard shortcuts
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (event) => {
            // Space bar to capture photo
            if (event.code === 'Space' && !event.repeat) {
                event.preventDefault();
                const captureBtn = document.getElementById('capture-btn');
                if (captureBtn && !captureBtn.disabled) {
                    captureBtn.click();
                }
            }
            
            // Enter to save/submit
            if (event.code === 'Enter' && event.ctrlKey) {
                event.preventDefault();
                const saveBtn = document.querySelector('.btn-success');
                if (saveBtn && !saveBtn.disabled) {
                    saveBtn.click();
                }
            }
            
            // Escape to close modals
            if (event.code === 'Escape') {
                this.hideLoading();
                this.closeAllNotifications();
            }
        });
    }

    // Show loading state
    showLoading(text = '処理中...', progress = null) {
        const overlay = document.getElementById('loading-overlay');
        const textEl = overlay.querySelector('.loading-text');
        const progressEl = overlay.querySelector('.progress-fill');
        const progressText = overlay.querySelector('.progress-text');
        
        textEl.textContent = text;
        
        if (progress !== null) {
            progressEl.style.width = `${Math.min(100, Math.max(0, progress))}%`;
            progressText.textContent = `${Math.round(progress)}%`;
            overlay.querySelector('.loading-progress').style.display = 'block';
        } else {
            overlay.querySelector('.loading-progress').style.display = 'none';
        }
        
        overlay.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }

    // Hide loading state
    hideLoading() {
        const overlay = document.getElementById('loading-overlay');
        overlay.classList.add('hidden');
        document.body.style.overflow = '';
    }

    // Update loading progress
    updateProgress(progress, text = null) {
        const overlay = document.getElementById('loading-overlay');
        const progressEl = overlay.querySelector('.progress-fill');
        const progressText = overlay.querySelector('.progress-text');
        const textEl = overlay.querySelector('.loading-text');
        
        if (progress !== null) {
            progressEl.style.width = `${Math.min(100, Math.max(0, progress))}%`;
            progressText.textContent = `${Math.round(progress)}%`;
        }
        
        if (text) {
            textEl.textContent = text;
        }
    }

    // Show notification
    showNotification(message, type = 'info', options = {}) {
        const {
            title = null,
            duration = 5000,
            actions = [],
            persistent = false
        } = options;

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };

        notification.innerHTML = `
            <div class="notification-content">
                <div class="notification-icon">${icons[type] || icons.info}</div>
                <div class="notification-text">
                    ${title ? `<div class="notification-title">${title}</div>` : ''}
                    <div class="notification-message">${message}</div>
                </div>
            </div>
            ${actions.length > 0 ? `
                <div class="notification-actions">
                    ${actions.map(action => 
                        `<button class="notification-btn ${action.type || 'secondary'}" 
                                onclick="(${action.handler})()">${action.text}</button>`
                    ).join('')}
                </div>
            ` : ''}
            <button class="notification-close" onclick="this.parentElement.remove()">×</button>
        `;

        const container = document.getElementById('notification-container');
        container.appendChild(notification);

        // Auto-remove after duration
        if (!persistent && duration > 0) {
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.style.animation = 'slideOutRight 0.3s ease-in';
                    setTimeout(() => notification.remove(), 300);
                }
            }, duration);
        }

        // Manage notification count
        this.notifications.push(notification);
        if (this.notifications.length > this.maxNotifications) {
            const oldest = this.notifications.shift();
            if (oldest.parentNode) {
                oldest.remove();
            }
        }

        return notification;
    }

    // Close all notifications
    closeAllNotifications() {
        const container = document.getElementById('notification-container');
        const notifications = container.querySelectorAll('.notification');
        notifications.forEach(notification => notification.remove());
        this.notifications = [];
    }

    // Add animation class to element
    animate(element, animationClass, duration = 1000) {
        element.classList.add(animationClass);
        setTimeout(() => {
            element.classList.remove(animationClass);
        }, duration);
    }

    // Update button state
    updateButtonState(button, state, text = null) {
        const states = {
            loading: { disabled: true, class: 'loading' },
            success: { disabled: false, class: 'success' },
            error: { disabled: false, class: 'error' },
            normal: { disabled: false, class: '' }
        };

        const config = states[state] || states.normal;
        
        button.disabled = config.disabled;
        button.className = button.className.replace(/\b(loading|success|error)\b/g, '');
        if (config.class) {
            button.classList.add(config.class);
        }
        
        if (text) {
            button.textContent = text;
        }
    }

    // Create confirm dialog
    showConfirm(message, title = '確認', options = {}) {
        return new Promise((resolve) => {
            const {
                confirmText = 'OK',
                cancelText = 'キャンセル',
                type = 'warning'
            } = options;

            this.showNotification(message, type, {
                title,
                persistent: true,
                actions: [
                    {
                        text: confirmText,
                        type: 'primary',
                        handler: () => {
                            resolve(true);
                            document.querySelector('.notification').remove();
                        }
                    },
                    {
                        text: cancelText,
                        type: 'secondary',
                        handler: () => {
                            resolve(false);
                            document.querySelector('.notification').remove();
                        }
                    }
                ]
            });
        });
    }

    // Highlight element
    highlight(element, duration = 2000) {
        element.style.transition = 'box-shadow 0.3s ease';
        element.style.boxShadow = '0 0 0 3px rgba(66, 153, 225, 0.5)';
        
        setTimeout(() => {
            element.style.boxShadow = '';
        }, duration);
    }

    // Smooth scroll to element
    scrollTo(element, options = {}) {
        const { offset = -20, behavior = 'smooth' } = options;
        const elementPosition = element.offsetTop + offset;
        
        window.scrollTo({
            top: elementPosition,
            behavior
        });
    }
}

// Global UI manager instance
const UI_MANAGER = new UIManager();

// Export for use in other files
if (typeof window !== 'undefined') {
    window.UI_MANAGER = UI_MANAGER;
}