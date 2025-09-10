const sharp = require('sharp')
const fs = require('fs-extra')
const path = require('path')

class ImageCompressionService {
  constructor() {
    this.compressionOptions = {
      quality: 80, // JPEG quality (0-100)
      maxWidth: 1920, // Maximum width
      maxHeight: 1080, // Maximum height
      format: 'jpeg', // Output format
      progressive: true // Progressive JPEG for better loading
    }
  }

  /**
   * Compress an image file
   * @param {string} inputPath - Path to input image
   * @param {string} outputPath - Path to save compressed image
   * @param {Object} options - Compression options
   * @returns {Promise<Object>} - Compression result with metadata
   */
  async compressImage(inputPath, outputPath, options = {}) {
    try {
      const compressionOptions = { ...this.compressionOptions, ...options }
      
      // Ensure output directory exists
      await fs.ensureDir(path.dirname(outputPath))
      
      // Get original image metadata
      const originalMetadata = await sharp(inputPath).metadata()
      
      // Calculate new dimensions while maintaining aspect ratio
      const { width, height } = this.calculateDimensions(
        originalMetadata.width,
        originalMetadata.height,
        compressionOptions.maxWidth,
        compressionOptions.maxHeight
      )
      
      // Compress and resize image
      const compressedBuffer = await sharp(inputPath)
        .resize(width, height, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({
          quality: compressionOptions.quality,
          progressive: compressionOptions.progressive,
          mozjpeg: true // Better compression
        })
        .toBuffer()
      
      // Write compressed image
      await fs.writeFile(outputPath, compressedBuffer)
      
      // Get compressed image metadata
      const compressedMetadata = await sharp(compressedBuffer).metadata()
      
      // Calculate compression ratio
      const originalSize = await fs.stat(inputPath)
      const compressedSize = await fs.stat(outputPath)
      const compressionRatio = ((originalSize.size - compressedSize.size) / originalSize.size * 100).toFixed(2)
      
      return {
        success: true,
        originalSize: originalSize.size,
        compressedSize: compressedSize.size,
        compressionRatio: parseFloat(compressionRatio),
        originalDimensions: {
          width: originalMetadata.width,
          height: originalMetadata.height
        },
        compressedDimensions: {
          width: compressedMetadata.width,
          height: compressedMetadata.height
        },
        outputPath
      }
    } catch (error) {
      console.error('Image compression failed:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Calculate new dimensions while maintaining aspect ratio
   */
  calculateDimensions(originalWidth, originalHeight, maxWidth, maxHeight) {
    let { width, height } = { width: originalWidth, height: originalHeight }
    
    // Calculate aspect ratio
    const aspectRatio = width / height
    
    // Resize if image is larger than max dimensions
    if (width > maxWidth) {
      width = maxWidth
      height = Math.round(width / aspectRatio)
    }
    
    if (height > maxHeight) {
      height = maxHeight
      width = Math.round(height * aspectRatio)
    }
    
    return { width, height }
  }

  /**
   * Compress multiple images in parallel
   * @param {Array} images - Array of image objects with inputPath and outputPath
   * @param {number} concurrency - Number of images to process in parallel
   * @returns {Promise<Array>} - Array of compression results
   */
  async compressImages(images, concurrency = 3) {
    const results = []
    
    for (let i = 0; i < images.length; i += concurrency) {
      const batch = images.slice(i, i + concurrency)
      const batchPromises = batch.map(image => 
        this.compressImage(image.inputPath, image.outputPath, image.options)
      )
      
      const batchResults = await Promise.all(batchPromises)
      results.push(...batchResults)
    }
    
    return results
  }

  /**
   * Generate thumbnail for an image
   * @param {string} inputPath - Path to input image
   * @param {string} outputPath - Path to save thumbnail
   * @param {Object} options - Thumbnail options
   * @returns {Promise<Object>} - Thumbnail generation result
   */
  async generateThumbnail(inputPath, outputPath, options = {}) {
    const thumbnailOptions = {
      maxWidth: 300,
      maxHeight: 200,
      quality: 70,
      format: 'jpeg',
      ...options
    }
    
    return this.compressImage(inputPath, outputPath, thumbnailOptions)
  }

  /**
   * Check if image needs compression
   * @param {string} imagePath - Path to image file
   * @param {Object} thresholds - Size and dimension thresholds
   * @returns {Promise<boolean>} - Whether compression is needed
   */
  async needsCompression(imagePath, thresholds = {}) {
    try {
      const { maxSize = 1024 * 1024, maxWidth = 1920, maxHeight = 1080 } = thresholds
      
      const stats = await fs.stat(imagePath)
      const metadata = await sharp(imagePath).metadata()
      
      return stats.size > maxSize || 
             metadata.width > maxWidth || 
             metadata.height > maxHeight
    } catch (error) {
      console.error('Error checking compression need:', error)
      return false
    }
  }

  /**
   * Get compression statistics
   * @param {string} directory - Directory to analyze
   * @returns {Promise<Object>} - Compression statistics
   */
  async getCompressionStats(directory) {
    try {
      const files = await fs.readdir(directory)
      const imageFiles = files.filter(file => 
        /\.(jpg|jpeg|png|gif|bmp)$/i.test(file)
      )
      
      let totalOriginalSize = 0
      let totalCompressedSize = 0
      let processedCount = 0
      
      for (const file of imageFiles) {
        const filePath = path.join(directory, file)
        const stats = await fs.stat(filePath)
        totalOriginalSize += stats.size
        
        // Check if compressed version exists
        const compressedPath = filePath.replace(/\.(jpg|jpeg|png|gif|bmp)$/i, '_compressed.jpg')
        if (await fs.pathExists(compressedPath)) {
          const compressedStats = await fs.stat(compressedPath)
          totalCompressedSize += compressedStats.size
          processedCount++
        }
      }
      
      const totalSavings = totalOriginalSize - totalCompressedSize
      const savingsPercentage = totalOriginalSize > 0 ? (totalSavings / totalOriginalSize * 100).toFixed(2) : 0
      
      return {
        totalFiles: imageFiles.length,
        processedFiles: processedCount,
        totalOriginalSize,
        totalCompressedSize,
        totalSavings,
        savingsPercentage: parseFloat(savingsPercentage)
      }
    } catch (error) {
      console.error('Error getting compression stats:', error)
      return null
    }
  }
}

module.exports = new ImageCompressionService()
