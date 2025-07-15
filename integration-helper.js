// Integration Helper for Receipt Scanner PWA
// Provides compatibility layer between old and new systems

class IntegrationHelper {
    constructor() {
        this.isReady = false;
        this.modules = {};
        this.legacyCompat = true;
    }

    // Initialize all enhanced modules
    async initializeModules() {
        try {
            console.log('🚀 Enhanced modules initialization starting...');

            // Check module availability
            this.modules = {
                cameraManager: typeof CameraManager !== 'undefined',
                uiManager: typeof UI_MANAGER !== 'undefined',
                storageManager: typeof STORAGE_MANAGER !== 'undefined',
                imageProcessor: typeof IMAGE_PROCESSOR !== 'undefined',
                errorHandler: typeof ERROR_HANDLER !== 'undefined',
                securityUtils: typeof SecurityUtils !== 'undefined',
                configManager: typeof CONFIG_MANAGER !== 'undefined'
            };

            console.log('📋 Module availability:', this.modules);

            // Initialize configuration if available
            if (this.modules.configManager) {
                await CONFIG_MANAGER.initialize();
                console.log('✅ Configuration manager initialized');
            }

            // Initialize storage if available
            if (this.modules.storageManager) {
                await STORAGE_MANAGER.init();
                console.log('✅ Storage manager initialized');
            }

            this.isReady = true;
            console.log('🎉 All enhanced modules initialized successfully');

            return true;

        } catch (error) {
            console.error('❌ Module initialization failed:', error);
            this.legacyCompat = true;
            return false;
        }
    }

    // Enhanced photo capture with new modules
    async capturePhotoEnhanced() {
        if (!this.modules.cameraManager || !window.cameraManager) {
            console.log('📸 Falling back to legacy capture');
            return this.captureLegacy();
        }

        try {
            console.log('📸 Enhanced photo capture starting...');

            // Show loading with UI manager
            if (this.modules.uiManager) {
                UI_MANAGER.showLoading('写真を撮影中...', 0);
            }

            // Capture with camera manager
            const captureResult = await window.cameraManager.capturePhoto({
                quality: 0.8,
                format: 'image/jpeg'
            });

            console.log('📷 Photo captured:', {
                size: captureResult.size,
                dimensions: `${captureResult.width}x${captureResult.height}`
            });

            // Process image if processor available
            let processedImage = captureResult.blob;
            if (this.modules.imageProcessor) {
                UI_MANAGER.updateProgress(30, '画像を最適化中...');
                
                const processingResult = await IMAGE_PROCESSOR.processImage(captureResult.blob, {
                    maxDimension: 1920,
                    quality: 0.8,
                    enhance: true
                });

                processedImage = processingResult.blob;
                console.log('🖼️ Image processed:', {
                    originalSize: processingResult.originalSize,
                    processedSize: processingResult.processedSize,
                    compression: Math.round(processingResult.compressionRatio * 100) + '%'
                });
            }

            // Store locally if storage manager available
            if (this.modules.storageManager) {
                UI_MANAGER.updateProgress(60, 'ローカルに保存中...');
                
                const receiptId = `temp_${Date.now()}`;
                await STORAGE_MANAGER.saveImage(processedImage, receiptId);
                console.log('💾 Image saved locally');
            }

            if (this.modules.uiManager) {
                UI_MANAGER.updateProgress(100, '完了');
                setTimeout(() => UI_MANAGER.hideLoading(), 500);
            }

            return {
                success: true,
                blob: processedImage,
                dataUrl: captureResult.dataUrl,
                enhanced: true
            };

        } catch (error) {
            console.error('❌ Enhanced capture failed:', error);
            
            if (this.modules.uiManager) {
                UI_MANAGER.hideLoading();
            }

            if (this.modules.errorHandler) {
                ERROR_HANDLER.handleError('CAPTURE_ERROR', {
                    message: error.message,
                    error: error
                });
            }

            // Fallback to legacy
            return this.captureLegacy();
        }
    }

    // Legacy photo capture fallback
    captureLegacy() {
        console.log('📸 Legacy photo capture');
        
        try {
            const video = document.getElementById('video');
            const canvas = document.getElementById('canvas');
            
            if (!video || !canvas || !video.videoWidth) {
                throw new Error('Video not ready');
            }

            const ctx = canvas.getContext('2d');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0);

            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
            
            return new Promise((resolve) => {
                canvas.toBlob((blob) => {
                    resolve({
                        success: true,
                        blob: blob,
                        dataUrl: dataUrl,
                        enhanced: false
                    });
                }, 'image/jpeg', 0.8);
            });

        } catch (error) {
            console.error('❌ Legacy capture failed:', error);
            return { success: false, error: error.message };
        }
    }

    // Enhanced camera initialization
    async initializeCameraEnhanced() {
        if (!this.modules.cameraManager) {
            console.log('📷 Falling back to legacy camera init');
            return false;
        }

        try {
            const video = document.getElementById('video');
            const canvas = document.getElementById('canvas');

            if (!video || !canvas) {
                throw new Error('Video or canvas element not found');
            }

            // Create camera manager if not exists
            if (!window.cameraManager) {
                window.cameraManager = new CameraManager();
            }

            const result = await window.cameraManager.initialize(video, canvas);

            if (result.success) {
                console.log('✅ Enhanced camera initialized:', result.camera);
                
                if (this.modules.uiManager) {
                    UI_MANAGER.showNotification(
                        `カメラが準備できました (${result.camera})`,
                        'success'
                    );
                }
                
                return true;
            } else {
                throw new Error(result.error);
            }

        } catch (error) {
            console.error('❌ Enhanced camera init failed:', error);
            
            if (this.modules.errorHandler) {
                ERROR_HANDLER.handleError('CAMERA_ERROR', {
                    message: error.message,
                    error: error
                });
            }
            
            return false;
        }
    }

    // Enhanced form validation
    validateFormEnhanced(formData) {
        if (!this.modules.securityUtils) {
            return { valid: true, sanitized: formData };
        }

        return SecurityUtils.validateFormData(formData);
    }

    // Enhanced storage operations
    async saveReceiptEnhanced(receiptData, imageBlob) {
        if (!this.modules.storageManager) {
            console.log('💾 Storage manager not available, skipping local save');
            return null;
        }

        try {
            // Validate data first
            if (this.modules.securityUtils) {
                const validation = SecurityUtils.validateFormData(receiptData);
                if (!validation.valid) {
                    throw new Error('Invalid receipt data: ' + validation.errors.join(', '));
                }
                receiptData = validation.sanitized;
            }

            // Save receipt with image
            const receipt = await STORAGE_MANAGER.saveReceipt(receiptData);
            
            if (imageBlob) {
                await STORAGE_MANAGER.saveImage(imageBlob, receipt.id);
            }

            console.log('💾 Receipt saved locally:', receipt.id);
            return receipt;

        } catch (error) {
            console.error('❌ Enhanced save failed:', error);
            
            if (this.modules.errorHandler) {
                ERROR_HANDLER.handleError('STORAGE_ERROR', {
                    message: error.message,
                    error: error
                });
            }
            
            return null;
        }
    }

    // Get module status for debugging
    getStatus() {
        return {
            ready: this.isReady,
            legacyCompat: this.legacyCompat,
            modules: this.modules,
            cameraManager: window.cameraManager ? window.cameraManager.getStatus() : null
        };
    }

    // Show enhanced UI for unsupported features
    showFeatureUnavailable(feature) {
        if (this.modules.uiManager) {
            UI_MANAGER.showNotification(
                `${feature}機能は現在利用できません。基本機能を使用します。`,
                'warning'
            );
        } else {
            console.warn(`${feature} feature unavailable, using basic functionality`);
        }
    }
}

// Global integration helper
const INTEGRATION_HELPER = new IntegrationHelper();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        INTEGRATION_HELPER.initializeModules();
    });
} else {
    INTEGRATION_HELPER.initializeModules();
}

// Export for global use
if (typeof window !== 'undefined') {
    window.INTEGRATION_HELPER = INTEGRATION_HELPER;
}