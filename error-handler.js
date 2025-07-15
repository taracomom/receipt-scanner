// Error Handling System for Receipt Scanner PWA
// Provides centralized error handling, user notifications, and recovery mechanisms

class ErrorHandler {
    constructor() {
        this.errorLog = [];
        this.maxLogSize = 100;
        this.retryAttempts = new Map();
        this.maxRetries = 3;
        
        // Initialize global error handling
        this.initializeGlobalHandlers();
    }

    // Initialize global error handlers
    initializeGlobalHandlers() {
        // Handle unhandled JavaScript errors
        window.addEventListener('error', (event) => {
            this.handleError('JavaScript Error', {
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                error: event.error
            });
        });

        // Handle unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            this.handleError('Unhandled Promise Rejection', {
                reason: event.reason,
                promise: event.promise
            });
            event.preventDefault(); // Prevent console spam
        });
    }

    // Central error handling method
    handleError(type, details, options = {}) {
        const error = {
            id: this.generateErrorId(),
            type,
            details,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href,
            severity: options.severity || 'error',
            userId: this.getUserId()
        };

        // Log the error
        this.logError(error);

        // Handle based on error type
        switch (type) {
            case 'API_ERROR':
                return this.handleApiError(error, options);
            case 'CAMERA_ERROR':
                return this.handleCameraError(error, options);
            case 'STORAGE_ERROR':
                return this.handleStorageError(error, options);
            case 'NETWORK_ERROR':
                return this.handleNetworkError(error, options);
            case 'VALIDATION_ERROR':
                return this.handleValidationError(error, options);
            default:
                return this.handleGenericError(error, options);
        }
    }

    // API error handling with retry logic
    handleApiError(error, options) {
        const { details } = error;
        
        // Check if this is a retryable error
        if (this.isRetryableApiError(details)) {
            const retryKey = `${options.endpoint || 'unknown'}_${Date.now()}`;
            const currentRetries = this.retryAttempts.get(retryKey) || 0;
            
            if (currentRetries < this.maxRetries) {
                this.retryAttempts.set(retryKey, currentRetries + 1);
                this.showUserMessage(
                    `API request failed. Retrying... (${currentRetries + 1}/${this.maxRetries})`,
                    'warning'
                );
                
                // Exponential backoff
                const delay = Math.pow(2, currentRetries) * 1000;
                setTimeout(() => {
                    if (options.retryCallback) {
                        options.retryCallback();
                    }
                }, delay);
                
                return { shouldRetry: true, delay };
            }
        }

        // Max retries reached or non-retryable error
        let userMessage = 'API request failed. ';
        
        if (details.status === 401) {
            userMessage += 'Please check your API key and try again.';
            this.clearAuthData();
        } else if (details.status === 429) {
            userMessage += 'Too many requests. Please wait a moment and try again.';
        } else if (details.status === 402) {
            userMessage += 'API quota exceeded. Please check your billing.';
        } else {
            userMessage += 'Please try again later.';
        }

        this.showUserMessage(userMessage, 'error');
        return { shouldRetry: false };
    }

    // Camera error handling
    handleCameraError(error, options) {
        const { details } = error;
        let userMessage = 'Camera error: ';
        let actions = [];

        switch (details.name) {
            case 'NotAllowedError':
                userMessage += 'Camera permission denied. Please allow camera access in your browser settings.';
                actions.push({ text: 'Settings Help', action: () => this.showCameraPermissionHelp() });
                break;
            case 'NotFoundError':
                userMessage += 'No camera found. Please connect a camera or use a different device.';
                break;
            case 'NotReadableError':
                userMessage += 'Camera is being used by another application.';
                actions.push({ text: 'Retry', action: () => options.retryCallback?.() });
                break;
            case 'OverconstrainedError':
                userMessage += 'Camera settings not supported. Trying fallback options...';
                if (options.retryCallback) {
                    setTimeout(() => options.retryCallback(), 1000);
                }
                break;
            default:
                userMessage += 'Unknown camera error. Please try again.';
                actions.push({ text: 'Retry', action: () => options.retryCallback?.() });
        }

        this.showUserMessage(userMessage, 'error', actions);
        return { handled: true };
    }

    // Storage error handling
    handleStorageError(error, options) {
        const { details } = error;
        let userMessage = 'Storage error: ';

        if (details.code === 'QUOTA_EXCEEDED') {
            userMessage += 'Storage quota exceeded. Please free up space or use a different storage option.';
        } else if (details.code === 'NETWORK_ERROR') {
            userMessage += 'Network error while saving. Please check your connection and try again.';
        } else {
            userMessage += 'Failed to save data. Please try again.';
        }

        this.showUserMessage(userMessage, 'error');
        return { handled: true };
    }

    // Network error handling
    handleNetworkError(error, options) {
        const userMessage = 'Network connection error. Please check your internet connection and try again.';
        this.showUserMessage(userMessage, 'error', [
            { text: 'Retry', action: () => options.retryCallback?.() }
        ]);
        return { handled: true };
    }

    // Validation error handling
    handleValidationError(error, options) {
        const { details } = error;
        const userMessage = `Input validation error: ${details.message || 'Please check your input and try again.'}`;
        this.showUserMessage(userMessage, 'warning');
        return { handled: true };
    }

    // Generic error handling
    handleGenericError(error, options) {
        const userMessage = 'An unexpected error occurred. Please try again.';
        this.showUserMessage(userMessage, 'error', [
            { text: 'Retry', action: () => window.location.reload() }
        ]);
        return { handled: true };
    }

    // Check if API error is retryable
    isRetryableApiError(details) {
        const retryableStatuses = [408, 429, 500, 502, 503, 504];
        return retryableStatuses.includes(details.status) || 
               details.code === 'NETWORK_ERROR' ||
               details.code === 'TIMEOUT';
    }

    // Show user-friendly message
    showUserMessage(message, type = 'info', actions = []) {
        // Remove existing messages
        const existing = document.querySelector('.error-message');
        if (existing) existing.remove();

        // Create message element
        const messageEl = document.createElement('div');
        messageEl.className = `error-message error-${type}`;
        messageEl.innerHTML = `
            <div class="message-content">
                <span class="message-text">${message}</span>
                <div class="message-actions">
                    ${actions.map(action => 
                        `<button class="btn btn-sm" onclick="this.parentElement.parentElement.parentElement.remove(); (${action.action})()">${action.text}</button>`
                    ).join('')}
                    <button class="btn btn-sm" onclick="this.parentElement.parentElement.parentElement.remove()">✕</button>
                </div>
            </div>
        `;

        // Add styles
        messageEl.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 10000;
            max-width: 90%;
            background: ${type === 'error' ? '#f56565' : type === 'warning' ? '#ed8936' : '#4299e1'};
            color: white;
            padding: 15px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            animation: slideDown 0.3s ease-out;
        `;

        document.body.appendChild(messageEl);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (messageEl.parentNode) {
                messageEl.remove();
            }
        }, 5000);
    }

    // Show camera permission help
    showCameraPermissionHelp() {
        const help = `
            Camera Permission Help:
            
            Safari (iOS/Mac):
            1. Go to Settings > Safari > Camera
            2. Allow camera access for this site
            
            Chrome:
            1. Click the camera icon in the address bar
            2. Allow camera access
            
            Firefox:
            1. Click the shield icon in the address bar
            2. Allow camera permissions
        `;
        alert(help);
    }

    // Clear authentication data
    clearAuthData() {
        localStorage.removeItem('openai_api_key');
        localStorage.removeItem('google_client_id');
        localStorage.removeItem('google_access_token');
    }

    // Log error to internal log
    logError(error) {
        this.errorLog.push(error);
        
        // Keep log size manageable
        if (this.errorLog.length > this.maxLogSize) {
            this.errorLog.splice(0, this.errorLog.length - this.maxLogSize);
        }

        // Console log for debugging
        console.error(`[${error.type}]`, error.details);
    }

    // Generate unique error ID
    generateErrorId() {
        return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Get user ID for error tracking
    getUserId() {
        let userId = localStorage.getItem('user_id');
        if (!userId) {
            userId = 'anon_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('user_id', userId);
        }
        return userId;
    }

    // Get error log for debugging
    getErrorLog() {
        return this.errorLog;
    }

    // Export error log
    exportErrorLog() {
        const blob = new Blob([JSON.stringify(this.errorLog, null, 2)], 
                             { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `error-log-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }
}

// Global error handler instance
const ERROR_HANDLER = new ErrorHandler();

// Export for use in other files
if (typeof window !== 'undefined') {
    window.ERROR_HANDLER = ERROR_HANDLER;
}

// Add CSS for error messages
const style = document.createElement('style');
style.textContent = `
    @keyframes slideDown {
        from { transform: translateX(-50%) translateY(-100%); opacity: 0; }
        to { transform: translateX(-50%) translateY(0); opacity: 1; }
    }
    
    .error-message .message-content {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
    }
    
    .error-message .message-actions {
        display: flex;
        gap: 5px;
    }
    
    .error-message .btn {
        background: rgba(255,255,255,0.2);
        border: 1px solid rgba(255,255,255,0.3);
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
    }
    
    .error-message .btn:hover {
        background: rgba(255,255,255,0.3);
    }
`;
document.head.appendChild(style);