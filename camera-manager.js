// Enhanced Camera Manager for Receipt Scanner PWA
// Provides robust camera functionality with fallback options and error recovery

class CameraManager {
    constructor() {
        this.stream = null;
        this.video = null;
        this.canvas = null;
        this.context = null;
        this.isInitialized = false;
        this.currentCamera = 'environment'; // 'user' or 'environment'
        this.constraints = this.getDefaultConstraints();
        this.retryAttempts = 0;
        this.maxRetries = 3;
    }

    // Get default camera constraints with progressive fallback
    getDefaultConstraints() {
        return {
            video: {
                facingMode: { ideal: 'environment' },
                width: { ideal: 1920, min: 640 },
                height: { ideal: 1080, min: 480 },
                aspectRatio: { ideal: 16/9 }
            },
            audio: false
        };
    }

    // Get fallback constraints for problematic devices
    getFallbackConstraints() {
        return [
            // Try basic environment camera
            {
                video: {
                    facingMode: 'environment',
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                },
                audio: false
            },
            // Try any rear camera
            {
                video: {
                    facingMode: { exact: 'environment' }
                },
                audio: false
            },
            // Try front camera as last resort
            {
                video: {
                    facingMode: 'user',
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                },
                audio: false
            },
            // Basic video without constraints
            {
                video: true,
                audio: false
            }
        ];
    }

    // Initialize camera with robust error handling
    async initialize(videoElement, canvasElement) {
        try {
            this.video = videoElement;
            this.canvas = canvasElement;
            this.context = this.canvas.getContext('2d');

            // Check for camera support
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('Camera not supported in this browser');
            }

            // Initialize with progressive fallback
            await this.startCameraWithFallback();
            
            this.isInitialized = true;
            this.setupVideoEventHandlers();
            
            return { success: true, camera: this.currentCamera };

        } catch (error) {
            console.error('Camera initialization failed:', error);
            ERROR_HANDLER.handleError('CAMERA_ERROR', {
                name: error.name,
                message: error.message,
                code: error.code
            }, {
                retryCallback: () => this.initialize(videoElement, canvasElement)
            });
            
            return { success: false, error: error.message };
        }
    }

    // Start camera with progressive fallback options
    async startCameraWithFallback() {
        const constraintOptions = [this.constraints, ...this.getFallbackConstraints()];
        
        for (let i = 0; i < constraintOptions.length; i++) {
            try {
                console.log(`Attempting camera start with constraints ${i + 1}/${constraintOptions.length}`);
                
                this.stream = await navigator.mediaDevices.getUserMedia(constraintOptions[i]);
                this.video.srcObject = this.stream;
                
                // Update current camera type
                const videoTrack = this.stream.getVideoTracks()[0];
                const settings = videoTrack.getSettings();
                this.currentCamera = settings.facingMode || 'unknown';
                
                console.log(`Camera started successfully with ${this.currentCamera} camera`);
                return;
                
            } catch (error) {
                console.log(`Camera attempt ${i + 1} failed:`, error.message);
                
                if (i === constraintOptions.length - 1) {
                    throw error; // Last attempt failed
                }
                
                // Stop any partial stream before next attempt
                if (this.stream) {
                    this.stream.getTracks().forEach(track => track.stop());
                    this.stream = null;
                }
            }
        }
    }

    // Setup video event handlers
    setupVideoEventHandlers() {
        this.video.addEventListener('loadedmetadata', () => {
            console.log('Camera metadata loaded');
            this.updateCanvasSize();
            this.dispatchCameraEvent('ready');
        });

        this.video.addEventListener('error', (error) => {
            console.error('Video element error:', error);
            ERROR_HANDLER.handleError('CAMERA_ERROR', {
                name: 'VideoError',
                message: 'Video element error',
                error: error
            });
        });

        // Handle stream ending (camera disconnected, etc.)
        if (this.stream) {
            this.stream.getTracks().forEach(track => {
                track.addEventListener('ended', () => {
                    console.log('Camera track ended');
                    this.dispatchCameraEvent('ended');
                });
            });
        }
    }

    // Update canvas size to match video
    updateCanvasSize() {
        if (this.video && this.canvas) {
            this.canvas.width = this.video.videoWidth;
            this.canvas.height = this.video.videoHeight;
            console.log(`Canvas updated to ${this.canvas.width}x${this.canvas.height}`);
        }
    }

    // Switch between front/rear camera
    async switchCamera() {
        if (!this.isInitialized) {
            throw new Error('Camera not initialized');
        }

        try {
            // Stop current stream
            await this.stop();
            
            // Toggle camera
            this.currentCamera = this.currentCamera === 'environment' ? 'user' : 'environment';
            this.constraints.video.facingMode = { ideal: this.currentCamera };
            
            // Restart with new constraints
            await this.startCameraWithFallback();
            this.setupVideoEventHandlers();
            
            this.dispatchCameraEvent('switched', { camera: this.currentCamera });
            return { success: true, camera: this.currentCamera };
            
        } catch (error) {
            console.error('Camera switch failed:', error);
            ERROR_HANDLER.handleError('CAMERA_ERROR', {
                name: error.name,
                message: 'Failed to switch camera',
                originalError: error
            });
            
            return { success: false, error: error.message };
        }
    }

    // Capture photo with enhanced quality
    capturePhoto(options = {}) {
        if (!this.isInitialized || !this.video.videoWidth) {
            throw new Error('Camera not ready for capture');
        }

        try {
            // Update canvas size if needed
            this.updateCanvasSize();
            
            // Draw video frame to canvas
            this.context.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
            
            // Get image data with specified quality
            const quality = options.quality || 0.8;
            const format = options.format || 'image/jpeg';
            
            const imageDataUrl = this.canvas.toDataURL(format, quality);
            
            // Convert to blob for upload
            return new Promise((resolve) => {
                this.canvas.toBlob((blob) => {
                    const result = {
                        dataUrl: imageDataUrl,
                        blob: blob,
                        width: this.canvas.width,
                        height: this.canvas.height,
                        size: blob.size,
                        camera: this.currentCamera
                    };
                    
                    this.dispatchCameraEvent('captured', result);
                    resolve(result);
                }, format, quality);
            });
            
        } catch (error) {
            console.error('Photo capture failed:', error);
            ERROR_HANDLER.handleError('CAMERA_ERROR', {
                name: 'CaptureError',
                message: 'Failed to capture photo',
                error: error
            });
            throw error;
        }
    }

    // Get camera capabilities and constraints
    getCapabilities() {
        if (!this.stream) return null;
        
        const videoTrack = this.stream.getVideoTracks()[0];
        return {
            capabilities: videoTrack.getCapabilities ? videoTrack.getCapabilities() : null,
            settings: videoTrack.getSettings(),
            constraints: videoTrack.getConstraints()
        };
    }

    // Apply zoom if supported
    async setZoom(zoomLevel) {
        if (!this.stream) return false;
        
        const videoTrack = this.stream.getVideoTracks()[0];
        const capabilities = videoTrack.getCapabilities ? videoTrack.getCapabilities() : {};
        
        if (capabilities.zoom) {
            try {
                await videoTrack.applyConstraints({
                    advanced: [{ zoom: zoomLevel }]
                });
                return true;
            } catch (error) {
                console.error('Zoom not supported:', error);
                return false;
            }
        }
        return false;
    }

    // Get available cameras
    static async getAvailableCameras() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            return devices.filter(device => device.kind === 'videoinput');
        } catch (error) {
            console.error('Failed to enumerate cameras:', error);
            return [];
        }
    }

    // Request camera permissions explicitly
    static async requestPermissions() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            stream.getTracks().forEach(track => track.stop());
            return true;
        } catch (error) {
            console.error('Camera permission denied:', error);
            return false;
        }
    }

    // Stop camera stream
    async stop() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => {
                track.stop();
                console.log('Camera track stopped');
            });
            this.stream = null;
        }
        
        if (this.video) {
            this.video.srcObject = null;
        }
        
        this.dispatchCameraEvent('stopped');
    }

    // Cleanup resources
    destroy() {
        this.stop();
        this.video = null;
        this.canvas = null;
        this.context = null;
        this.isInitialized = false;
    }

    // Dispatch custom camera events
    dispatchCameraEvent(type, detail = {}) {
        const event = new CustomEvent(`camera-${type}`, {
            detail: { ...detail, manager: this }
        });
        document.dispatchEvent(event);
    }

    // Get status information
    getStatus() {
        return {
            initialized: this.isInitialized,
            hasStream: !!this.stream,
            currentCamera: this.currentCamera,
            resolution: this.canvas ? `${this.canvas.width}x${this.canvas.height}` : null,
            capabilities: this.getCapabilities()
        };
    }
}

// Export for global use
if (typeof window !== 'undefined') {
    window.CameraManager = CameraManager;
}