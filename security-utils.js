// Security Utilities for Receipt Scanner PWA
// Provides input validation, sanitization, and security helpers

class SecurityUtils {
    // Input validation patterns
    static PATTERNS = {
        OPENAI_API_KEY: /^sk-[a-zA-Z0-9]{20,}$/,
        GOOGLE_CLIENT_ID: /^\d{12}-[a-zA-Z0-9]{32}\.apps\.googleusercontent\.com$/,
        FILENAME: /^[a-zA-Z0-9._-]{1,255}$/,
        SAFE_STRING: /^[a-zA-Z0-9\s._-]{1,1000}$/
    };

    // Sanitize user input to prevent XSS
    static sanitizeInput(input) {
        if (typeof input !== 'string') return '';
        
        return input
            .trim()
            .replace(/[<>'"&]/g, function(match) {
                const escape = {
                    '<': '&lt;',
                    '>': '&gt;',
                    '"': '&quot;',
                    "'": '&#x27;',
                    '&': '&amp;'
                };
                return escape[match];
            });
    }

    // Validate API key format
    static validateApiKey(apiKey) {
        if (!apiKey || typeof apiKey !== 'string') {
            return { valid: false, error: 'API key is required' };
        }

        const sanitized = this.sanitizeInput(apiKey);
        
        if (!this.PATTERNS.OPENAI_API_KEY.test(sanitized)) {
            return { 
                valid: false, 
                error: 'Invalid API key format. Must start with "sk-" and be at least 20 characters long.' 
            };
        }

        return { valid: true, sanitized };
    }

    // Validate Google Client ID
    static validateClientId(clientId) {
        if (!clientId || typeof clientId !== 'string') {
            return { valid: false, error: 'Client ID is required' };
        }

        const sanitized = this.sanitizeInput(clientId);
        
        if (!this.PATTERNS.GOOGLE_CLIENT_ID.test(sanitized)) {
            return { 
                valid: false, 
                error: 'Invalid Google Client ID format. Must end with .apps.googleusercontent.com' 
            };
        }

        return { valid: true, sanitized };
    }

    // Validate filename for safe file uploads
    static validateFilename(filename) {
        if (!filename || typeof filename !== 'string') {
            return { valid: false, error: 'Filename is required' };
        }

        const sanitized = this.sanitizeInput(filename);
        
        if (!this.PATTERNS.FILENAME.test(sanitized)) {
            return { 
                valid: false, 
                error: 'Invalid filename. Only alphanumeric characters, dots, underscores, and hyphens allowed.' 
            };
        }

        return { valid: true, sanitized };
    }

    // Validate and sanitize form data
    static validateFormData(data) {
        const errors = [];
        const sanitized = {};

        for (const [key, value] of Object.entries(data)) {
            if (typeof value === 'string') {
                const cleanValue = this.sanitizeInput(value);
                
                // Additional validation based on field type
                switch (key) {
                    case 'date':
                        if (!/^\d{4}-\d{2}-\d{2}$/.test(cleanValue)) {
                            errors.push(`Invalid date format for ${key}`);
                        }
                        break;
                    case 'price':
                        if (!/^\d+$/.test(cleanValue)) {
                            errors.push(`Invalid price format for ${key}`);
                        }
                        break;
                    default:
                        if (!this.PATTERNS.SAFE_STRING.test(cleanValue)) {
                            errors.push(`Invalid characters in ${key}`);
                        }
                }
                
                sanitized[key] = cleanValue;
            } else {
                sanitized[key] = value;
            }
        }

        return {
            valid: errors.length === 0,
            errors,
            sanitized
        };
    }

    // Rate limiting helper
    static createRateLimiter(maxRequests = 10, windowMs = 60000) {
        const requests = new Map();
        
        return function(identifier) {
            const now = Date.now();
            const windowStart = now - windowMs;
            
            // Clean old entries
            for (const [key, timestamps] of requests.entries()) {
                requests.set(key, timestamps.filter(t => t > windowStart));
                if (requests.get(key).length === 0) {
                    requests.delete(key);
                }
            }
            
            // Check current requests
            const userRequests = requests.get(identifier) || [];
            
            if (userRequests.length >= maxRequests) {
                return { allowed: false, resetTime: Math.min(...userRequests) + windowMs };
            }
            
            userRequests.push(now);
            requests.set(identifier, userRequests);
            
            return { allowed: true, remaining: maxRequests - userRequests.length };
        };
    }

    // Content Security Policy helper
    static generateCSPNonce() {
        const array = new Uint8Array(16);
        crypto.getRandomValues(array);
        return btoa(String.fromCharCode.apply(null, array));
    }

    // Secure random string generation
    static generateSecureId(length = 32) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        const array = new Uint8Array(length);
        crypto.getRandomValues(array);
        
        return Array.from(array, byte => chars[byte % chars.length]).join('');
    }

    // Check if running on secure context
    static isSecureContext() {
        return window.isSecureContext || window.location.protocol === 'https:' || 
               window.location.hostname === 'localhost';
    }

    // Basic protection against common attacks
    static protectAgainstCommonAttacks() {
        // Prevent clickjacking
        if (window.self !== window.top) {
            window.top.location = window.self.location;
        }

        // Basic XSS protection
        document.addEventListener('DOMContentLoaded', function() {
            // Remove any potentially dangerous attributes
            const dangerousElements = document.querySelectorAll('[onclick], [onload], [onerror]');
            dangerousElements.forEach(el => {
                el.removeAttribute('onclick');
                el.removeAttribute('onload');
                el.removeAttribute('onerror');
            });
        });
    }
}

// Initialize security protection
if (typeof window !== 'undefined') {
    window.SecurityUtils = SecurityUtils;
    SecurityUtils.protectAgainstCommonAttacks();
}