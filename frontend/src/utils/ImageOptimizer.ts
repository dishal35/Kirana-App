/**
 * Image Optimization Utilities for Product Photos
 * 
 * This utility provides image compression and optimization features
 * to reduce memory usage and storage requirements for product photos.
 */

export interface ImageOptimizationConfig {
  maxWidth: number;
  maxHeight: number;
  quality: number;
  format: 'webp' | 'jpeg' | 'png';
  enableProgressive: boolean;
}

export interface OptimizedImage {
  blob: Blob;
  dataUrl: string;
  originalSize: number;
  optimizedSize: number;
  compressionRatio: number;
  width: number;
  height: number;
}

export class ImageOptimizer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private defaultConfig: ImageOptimizationConfig;

  constructor(config: Partial<ImageOptimizationConfig> = {}) {
    this.canvas = document.createElement('canvas');
    const ctx = this.canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas 2D context not supported');
    }
    this.ctx = ctx;

    this.defaultConfig = {
      maxWidth: config.maxWidth ?? 800,
      maxHeight: config.maxHeight ?? 600,
      quality: config.quality ?? 0.8,
      format: config.format ?? 'webp',
      enableProgressive: config.enableProgressive ?? true,
    };
  }

  /**
   * Optimize an image file or blob
   */
  async optimizeImage(
    file: File | Blob,
    config: Partial<ImageOptimizationConfig> = {}
  ): Promise<OptimizedImage> {
    const finalConfig = { ...this.defaultConfig, ...config };
    const originalSize = file.size;

    // Load image
    const img = await this.loadImage(file);
    
    // Calculate new dimensions
    const { width, height } = this.calculateDimensions(
      img.width,
      img.height,
      finalConfig.maxWidth,
      finalConfig.maxHeight
    );

    // Resize and compress
    this.canvas.width = width;
    this.canvas.height = height;

    // Use high-quality scaling
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';

    // Draw resized image
    this.ctx.drawImage(img, 0, 0, width, height);

    // Convert to optimized format
    const { blob, dataUrl } = await this.canvasToBlob(finalConfig);
    
    const optimizedSize = blob.size;
    const compressionRatio = originalSize > 0 ? optimizedSize / originalSize : 1;

    return {
      blob,
      dataUrl,
      originalSize,
      optimizedSize,
      compressionRatio,
      width,
      height,
    };
  }

  /**
   * Create thumbnail from image
   */
  async createThumbnail(
    file: File | Blob,
    size: number = 150
  ): Promise<OptimizedImage> {
    return this.optimizeImage(file, {
      maxWidth: size,
      maxHeight: size,
      quality: 0.7,
      format: 'webp',
    });
  }

  /**
   * Batch optimize multiple images
   */
  async optimizeImages(
    files: (File | Blob)[],
    config: Partial<ImageOptimizationConfig> = {},
    onProgress?: (completed: number, total: number) => void
  ): Promise<OptimizedImage[]> {
    const results: OptimizedImage[] = [];
    
    for (let i = 0; i < files.length; i++) {
      try {
        const optimized = await this.optimizeImage(files[i], config);
        results.push(optimized);
        
        if (onProgress) {
          onProgress(i + 1, files.length);
        }
      } catch (error) {
        console.error(`Failed to optimize image ${i}:`, error);
        // Continue with other images
      }
    }

    return results;
  }

  /**
   * Load image from file/blob
   */
  private loadImage(file: File | Blob): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);

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

  /**
   * Calculate optimal dimensions while maintaining aspect ratio
   */
  private calculateDimensions(
    originalWidth: number,
    originalHeight: number,
    maxWidth: number,
    maxHeight: number
  ): { width: number; height: number } {
    let { width, height } = { width: originalWidth, height: originalHeight };

    // Calculate scaling factor
    const widthRatio = maxWidth / width;
    const heightRatio = maxHeight / height;
    const scalingFactor = Math.min(widthRatio, heightRatio, 1); // Don't upscale

    width = Math.round(width * scalingFactor);
    height = Math.round(height * scalingFactor);

    return { width, height };
  }

  /**
   * Convert canvas to blob with specified format and quality
   */
  private canvasToBlob(config: ImageOptimizationConfig): Promise<{ blob: Blob; dataUrl: string }> {
    return new Promise((resolve, reject) => {
      // Get data URL first
      const dataUrl = this.canvas.toDataURL(`image/${config.format}`, config.quality);

      // Convert to blob
      this.canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve({ blob, dataUrl });
          } else {
            reject(new Error('Failed to create blob from canvas'));
          }
        },
        `image/${config.format}`,
        config.quality
      );
    });
  }

  /**
   * Check if WebP is supported
   */
  static isWebPSupported(): boolean {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  }

  /**
   * Get optimal format based on browser support
   */
  static getOptimalFormat(): 'webp' | 'jpeg' {
    return ImageOptimizer.isWebPSupported() ? 'webp' : 'jpeg';
  }

  /**
   * Estimate memory usage for image
   */
  static estimateMemoryUsage(width: number, height: number): number {
    // 4 bytes per pixel (RGBA)
    return width * height * 4;
  }

  /**
   * Validate image file
   */
  static validateImageFile(file: File): { valid: boolean; error?: string } {
    // Check file type
    if (!file.type.startsWith('image/')) {
      return { valid: false, error: 'File is not an image' };
    }

    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return { valid: false, error: 'Image file too large (max 10MB)' };
    }

    // Check supported formats
    const supportedFormats = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!supportedFormats.includes(file.type)) {
      return { valid: false, error: 'Unsupported image format' };
    }

    return { valid: true };
  }
}

// Export singleton instance (lazy initialization to avoid test issues)
let _imageOptimizer: ImageOptimizer | null = null;

export const getImageOptimizer = (): ImageOptimizer => {
  if (!_imageOptimizer) {
    _imageOptimizer = new ImageOptimizer();
  }
  return _imageOptimizer;
};

// For backward compatibility
export const imageOptimizer = {
  get instance() {
    return getImageOptimizer();
  }
};