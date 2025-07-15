// Image Processing and Optimization for Receipt Scanner PWA
// Provides image compression, enhancement, and optimization

class ImageProcessor {
    constructor() {
        this.canvas = null;
        this.context = null;
        this.maxDimension = 1920; // Max width/height for processing
        this.quality = 0.8; // Default JPEG quality
        this.compressionRatio = 0.7; // Target compression ratio
        
        this.init();
    }

    // Initialize canvas for image processing
    init() {
        this.canvas = document.createElement('canvas');
        this.context = this.canvas.getContext('2d');
        console.log('Image processor initialized');
    }

    // Process image with compression and optimization
    async processImage(imageBlob, options = {}) {
        try {
            const {
                maxDimension = this.maxDimension,
                quality = this.quality,
                format = 'image/jpeg',
                enhance = true,
                autoRotate = true
            } = options;

            console.log(`Processing image: ${imageBlob.size} bytes`);
            
            // Load image
            const img = await this.loadImage(imageBlob);
            
            // Auto-rotate if needed
            let processedImg = img;
            if (autoRotate) {
                processedImg = await this.autoRotateImage(img, imageBlob);
            }

            // Resize if needed
            const dimensions = this.calculateOptimalDimensions(
                processedImg.width, 
                processedImg.height, 
                maxDimension
            );

            this.canvas.width = dimensions.width;
            this.canvas.height = dimensions.height;

            // Clear canvas
            this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);

            // Draw and enhance image
            if (enhance) {
                this.enhanceImage(processedImg, dimensions);
            } else {
                this.context.drawImage(
                    processedImg, 
                    0, 0, 
                    dimensions.width, 
                    dimensions.height
                );
            }

            // Convert to blob with compression
            const processedBlob = await this.canvasToBlob(format, quality);
            
            const compressionRatio = processedBlob.size / imageBlob.size;
            console.log(
                `Image processed: ${imageBlob.size} → ${processedBlob.size} bytes ` +
                `(${Math.round(compressionRatio * 100)}% of original)`
            );

            return {
                blob: processedBlob,
                originalSize: imageBlob.size,
                processedSize: processedBlob.size,
                compressionRatio,
                dimensions: dimensions,
                enhanced: enhance
            };

        } catch (error) {
            console.error('Image processing failed:', error);
            ERROR_HANDLER.handleError('PROCESSING_ERROR', {
                message: 'Failed to process image',
                error: error
            });
            throw error;
        }
    }

    // Load image from blob
    loadImage(blob) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const url = URL.createObjectURL(blob);

            img.onload = () => {
                URL.revokeObjectURL(url);
                resolve(img);
            };

            img.onerror = () => {
                URL.revokeObjectURL(url);
                reject(new Error('Failed to load image'));
            };

            img.src = url;
        });
    }

    // Auto-rotate image based on EXIF data
    async autoRotateImage(img, blob) {
        try {
            const orientation = await this.getImageOrientation(blob);
            
            if (orientation === 1) {
                return img; // No rotation needed
            }

            // Create temporary canvas for rotation
            const tempCanvas = document.createElement('canvas');
            const tempContext = tempCanvas.getContext('2d');

            // Calculate rotated dimensions
            const { width, height } = this.getRotatedDimensions(
                img.width, 
                img.height, 
                orientation
            );

            tempCanvas.width = width;
            tempCanvas.height = height;

            // Apply rotation transformation
            this.applyRotationTransform(tempContext, width, height, orientation);

            // Draw rotated image
            tempContext.drawImage(img, 0, 0);

            // Create new image from rotated canvas
            const rotatedImg = new Image();
            return new Promise((resolve) => {
                rotatedImg.onload = () => resolve(rotatedImg);
                rotatedImg.src = tempCanvas.toDataURL();
            });

        } catch (error) {
            console.warn('Auto-rotation failed, using original image:', error);
            return img;
        }
    }

    // Get image orientation from EXIF data
    getImageOrientation(blob) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                const view = new DataView(e.target.result);
                
                if (view.getUint16(0, false) !== 0xFFD8) {
                    resolve(1); // Not a JPEG
                    return;
                }

                const length = view.byteLength;
                let offset = 2;

                while (offset < length) {
                    if (view.getUint16(offset + 2, false) <= 8) break;
                    
                    const marker = view.getUint16(offset, false);
                    offset += 2;

                    if (marker === 0xFFE1) {
                        if (view.getUint32(offset += 2, false) !== 0x45786966) break;
                        
                        const little = view.getUint16(offset += 6, false) === 0x4949;
                        offset += view.getUint32(offset + 4, little);
                        const tags = view.getUint16(offset, little);
                        offset += 2;

                        for (let i = 0; i < tags; i++) {
                            if (view.getUint16(offset + (i * 12), little) === 0x0112) {
                                resolve(view.getUint16(offset + (i * 12) + 8, little));
                                return;
                            }
                        }
                    } else if ((marker & 0xFF00) !== 0xFF00) {
                        break;
                    } else {
                        offset += view.getUint16(offset, false);
                    }
                }
                
                resolve(1); // Default orientation
            };

            reader.readAsArrayBuffer(blob);
        });
    }

    // Get rotated dimensions based on orientation
    getRotatedDimensions(width, height, orientation) {
        switch (orientation) {
            case 5:
            case 6:
            case 7:
            case 8:
                return { width: height, height: width };
            default:
                return { width, height };
        }
    }

    // Apply rotation transform to context
    applyRotationTransform(context, width, height, orientation) {
        switch (orientation) {
            case 2:
                context.transform(-1, 0, 0, 1, width, 0);
                break;
            case 3:
                context.transform(-1, 0, 0, -1, width, height);
                break;
            case 4:
                context.transform(1, 0, 0, -1, 0, height);
                break;
            case 5:
                context.transform(0, 1, 1, 0, 0, 0);
                break;
            case 6:
                context.transform(0, 1, -1, 0, height, 0);
                break;
            case 7:
                context.transform(0, -1, -1, 0, height, width);
                break;
            case 8:
                context.transform(0, -1, 1, 0, 0, width);
                break;
        }
    }

    // Calculate optimal dimensions for resize
    calculateOptimalDimensions(width, height, maxDimension) {
        if (width <= maxDimension && height <= maxDimension) {
            return { width, height };
        }

        const aspectRatio = width / height;
        
        if (width > height) {
            return {
                width: maxDimension,
                height: Math.round(maxDimension / aspectRatio)
            };
        } else {
            return {
                width: Math.round(maxDimension * aspectRatio),
                height: maxDimension
            };
        }
    }

    // Enhance image for better OCR recognition
    enhanceImage(img, dimensions) {
        // Draw image
        this.context.drawImage(img, 0, 0, dimensions.width, dimensions.height);

        // Apply image enhancements
        const imageData = this.context.getImageData(0, 0, dimensions.width, dimensions.height);
        const data = imageData.data;

        // Enhance contrast and brightness for receipts
        for (let i = 0; i < data.length; i += 4) {
            // Apply contrast enhancement
            data[i] = this.enhancePixel(data[i]);     // Red
            data[i + 1] = this.enhancePixel(data[i + 1]); // Green
            data[i + 2] = this.enhancePixel(data[i + 2]); // Blue
            // Alpha channel (data[i + 3]) remains unchanged
        }

        this.context.putImageData(imageData, 0, 0);

        // Apply sharpening filter
        this.applySharpeningFilter();
    }

    // Enhance individual pixel for better contrast
    enhancePixel(value) {
        // Increase contrast for receipt text
        const contrast = 1.2;
        const brightness = 10;
        
        let enhanced = ((value - 128) * contrast) + 128 + brightness;
        return Math.max(0, Math.min(255, enhanced));
    }

    // Apply sharpening filter
    applySharpeningFilter() {
        const imageData = this.context.getImageData(0, 0, this.canvas.width, this.canvas.height);
        const data = imageData.data;
        const width = this.canvas.width;
        const height = this.canvas.height;

        // Sharpening kernel
        const kernel = [
            0, -1, 0,
            -1, 5, -1,
            0, -1, 0
        ];

        const output = new Uint8ClampedArray(data);

        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                for (let c = 0; c < 3; c++) { // RGB channels only
                    let sum = 0;
                    
                    for (let ky = -1; ky <= 1; ky++) {
                        for (let kx = -1; kx <= 1; kx++) {
                            const pixel = ((y + ky) * width + (x + kx)) * 4 + c;
                            const kernelIndex = (ky + 1) * 3 + (kx + 1);
                            sum += data[pixel] * kernel[kernelIndex];
                        }
                    }
                    
                    const outputPixel = (y * width + x) * 4 + c;
                    output[outputPixel] = Math.max(0, Math.min(255, sum));
                }
            }
        }

        const outputImageData = new ImageData(output, width, height);
        this.context.putImageData(outputImageData, 0, 0);
    }

    // Convert canvas to blob
    canvasToBlob(format, quality) {
        return new Promise((resolve) => {
            this.canvas.toBlob(resolve, format, quality);
        });
    }

    // Compress image to target file size
    async compressToTargetSize(imageBlob, targetSizeKB, options = {}) {
        const targetBytes = targetSizeKB * 1024;
        let quality = options.startQuality || 0.9;
        let attempts = 0;
        const maxAttempts = 10;

        while (attempts < maxAttempts) {
            const result = await this.processImage(imageBlob, {
                ...options,
                quality
            });

            if (result.processedSize <= targetBytes || quality <= 0.1) {
                return result;
            }

            // Adjust quality for next attempt
            const ratio = targetBytes / result.processedSize;
            quality *= Math.max(0.1, Math.min(0.9, ratio));
            attempts++;
        }

        // Return best attempt
        return await this.processImage(imageBlob, { ...options, quality });
    }

    // Create thumbnail
    async createThumbnail(imageBlob, size = 200) {
        return await this.processImage(imageBlob, {
            maxDimension: size,
            quality: 0.7,
            enhance: false
        });
    }

    // Detect if image is likely a receipt
    async analyzeReceiptLikelihood(imageBlob) {
        try {
            const img = await this.loadImage(imageBlob);
            
            // Resize for analysis
            const analysisSize = 300;
            const dimensions = this.calculateOptimalDimensions(
                img.width, 
                img.height, 
                analysisSize
            );

            this.canvas.width = dimensions.width;
            this.canvas.height = dimensions.height;
            this.context.drawImage(img, 0, 0, dimensions.width, dimensions.height);

            const imageData = this.context.getImageData(0, 0, dimensions.width, dimensions.height);
            const data = imageData.data;

            // Analyze image characteristics
            let whitePixels = 0;
            let textLikePixels = 0;
            const totalPixels = data.length / 4;

            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                
                const brightness = (r + g + b) / 3;
                
                if (brightness > 240) {
                    whitePixels++;
                } else if (brightness < 100) {
                    textLikePixels++;
                }
            }

            const whiteRatio = whitePixels / totalPixels;
            const textRatio = textLikePixels / totalPixels;

            // Receipt characteristics: mostly white background with black text
            const isReceiptLike = whiteRatio > 0.6 && textRatio > 0.05 && textRatio < 0.3;
            
            return {
                isReceiptLike,
                confidence: isReceiptLike ? Math.min(whiteRatio + textRatio, 1) : 0,
                whiteRatio,
                textRatio
            };

        } catch (error) {
            console.error('Receipt analysis failed:', error);
            return { isReceiptLike: true, confidence: 0.5 }; // Default to assume it's a receipt
        }
    }

    // Get processing capabilities
    getCapabilities() {
        return {
            maxDimension: this.maxDimension,
            supportedFormats: ['image/jpeg', 'image/png', 'image/webp'],
            features: {
                compression: true,
                enhancement: true,
                autoRotation: true,
                thumbnails: true,
                receiptAnalysis: true
            }
        };
    }
}

// Global image processor instance
const IMAGE_PROCESSOR = new ImageProcessor();

// Export for use in other files
if (typeof window !== 'undefined') {
    window.IMAGE_PROCESSOR = IMAGE_PROCESSOR;
}