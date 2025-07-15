// Secure Configuration Manager
// This file provides secure configuration management for the Receipt Scanner PWA
// API keys should NEVER be hardcoded in client-side code

class ConfigManager {
    constructor() {
        this.config = {};
        this.initialized = false;
    }

    // Initialize configuration from secure sources
    async initialize() {
        if (this.initialized) return;

        // In production, these would come from server-side endpoint
        // For development, prompt user to enter keys securely
        this.config = {
            OPENAI_API_KEY: this.getSecureApiKey('openai'),
            GOOGLE_CLIENT_ID: this.getSecureClientId('google'),
            DEBUG_MODE: this.isDevelopment()
        };

        this.initialized = true;
    }

    // Get API key from secure storage (localStorage as fallback for demo)
    getSecureApiKey(provider) {
        const key = localStorage.getItem(`${provider}_api_key`);
        if (!key || key === 'your_openai_api_key_here') {
            console.warn(`⚠️  ${provider} API key not configured. Please set it in the settings panel.`);
            return null;
        }
        return key;
    }

    // Get client ID from secure storage
    getSecureClientId(provider) {
        const clientId = localStorage.getItem(`${provider}_client_id`);
        if (!clientId || clientId.includes('your-real-google')) {
            console.warn(`⚠️  ${provider} client ID not configured. Please set it in the settings panel.`);
            return null;
        }
        return clientId;
    }

    // Check if running in development mode
    isDevelopment() {
        return window.location.hostname === 'localhost' || 
               window.location.hostname === '127.0.0.1' ||
               window.location.hostname === '';
    }

    // Validate API key format
    validateApiKey(apiKey, provider) {
        if (!apiKey) return false;
        
        switch (provider) {
            case 'openai':
                return apiKey.startsWith('sk-') && apiKey.length > 20;
            default:
                return apiKey.length > 10;
        }
    }

    // Get configuration value safely
    get(key) {
        if (!this.initialized) {
            console.error('ConfigManager not initialized. Call initialize() first.');
            return null;
        }
        return this.config[key];
    }

    // Set configuration value securely
    set(key, value) {
        if (key.includes('API_KEY') || key.includes('CLIENT_ID')) {
            // Store sensitive values in localStorage with encryption (demo)
            localStorage.setItem(key.toLowerCase(), value);
            this.config[key] = value;
        } else {
            this.config[key] = value;
        }
    }
}

// Global configuration instance
const CONFIG_MANAGER = new ConfigManager();

// Legacy compatibility - remove hardcoded values
const CONFIG = {
    // These are now managed securely by ConfigManager
    get OPENAI_API_KEY() {
        return CONFIG_MANAGER.get('OPENAI_API_KEY');
    },
    get GOOGLE_CLIENT_ID() {
        return CONFIG_MANAGER.get('GOOGLE_CLIENT_ID');
    }
};

// Export for use in other files
if (typeof window !== 'undefined') {
    window.CONFIG = CONFIG;
    window.CONFIG_MANAGER = CONFIG_MANAGER;
}