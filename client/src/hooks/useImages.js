import {useCallback, useEffect, useState} from 'react'
import {imageService} from '../services'
import useApi from './useApi'

const useImages = (options = {}) => {
  const {
    autoFetch = true,
    initialLimit = 20,
    initialFilters = {},
    refreshInterval = null
  } = options

  // Images state
  const imagesApi = useApi([])
  const [images, setImages] = useState([])
  const [filteredImages, setFilteredImages] = useState([])

  // Pagination state
  const [pagination, setPagination] = useState({
    page: 1,
    limit: initialLimit,
    total: 0,
    hasMore: false
  })

  // Filters state
  const [filters, setFilters] = useState({
    camera_id: '',
    showLatestOnly: false,
    date_from: '',
    date_to: '',
    min_vehicles: '',
    max_vehicles: '',
    vehicle_type: '',
    confidence_threshold: '',
    traffic_density: '',
    has_analysis: 'all',
    ...initialFilters
  })

  // Selected images for batch operations
  const [selectedImages, setSelectedImages] = useState(new Set())

  // Analysis state
  const [analyzingImages, setAnalyzingImages] = useState(new Set())

  // Fetch images with current filters and pagination
  const fetchImages = useCallback(async (resetPagination = false, preserveData = false) => {
    const currentPage = resetPagination ? 1 : pagination.page
    const offset = (currentPage - 1) * pagination.limit

    await imagesApi.execute(
      () => imageService.getFilteredImages(filters, { page: currentPage, limit: pagination.limit }),
      {
        resetState: resetPagination,
        preserveData,
        onSuccess: (data, result) => {
          // Update pagination
          const total = result.count || data.length
          const hasMore = offset + data.length < total

          setPagination(prev => ({
            ...prev,
            page: currentPage,
            total,
            hasMore
          }))
        }
      }
    )
  }, [imagesApi, filters, pagination.page, pagination.limit])

  // Load more images (pagination)
  const loadMoreImages = useCallback(async () => {
    if (!pagination.hasMore || imagesApi.loading) return

    const nextPage = pagination.page + 1
    setPagination(prev => ({ ...prev, page: nextPage }))

    await fetchImages(false, true)
  }, [pagination.hasMore, pagination.page, imagesApi.loading, fetchImages])

  // Get recent images
  const getRecentImages = useCallback(async (limit = initialLimit, changedOnly = false) => {
    const result = await imageService.getRecentImages({ limit, changedOnly })
    if (result.success) {
      setImages(result.data)
      setFilteredImages(result.data)
      setPagination(prev => ({
        ...prev,
        total: result.count || result.data.length,
        hasMore: false
      }))
      return result
    }
    throw new Error(result.error)
  }, [initialLimit])

  // Get camera images
  const getCameraImages = useCallback(async (cameraId, imageOptions = {}) => {
    const result = await imageService.getCameraImages(cameraId, imageOptions)
    if (result.success) {
      setImages(result.data)
      setFilteredImages(result.data)
      setPagination(prev => ({
        ...prev,
        total: result.count || result.data.length,
        hasMore: false
      }))
      return result
    }
    throw new Error(result.error)
  }, [])

  // Get image by ID
  const getImageById = useCallback(async (imageId) => {
    const result = await imageService.getImageById(imageId)
    if (result.success) {
      return result.data
    }
    throw new Error(result.error)
  }, [])

  // Get vehicle detection data
  const getVehicleDetection = useCallback(async (imageId) => {
    const result = await imageService.getVehicleDetection(imageId)
    if (result.success) {
      return result.data
    }
    throw new Error(result.error)
  }, [])

  // Analyze image
  const analyzeImage = useCallback(async (imageId) => {
    setAnalyzingImages(prev => new Set(prev).add(imageId))

    try {
      const result = await imageService.analyzeImage(imageId)
      if (result.success) {
        // Update local image state
        setImages(prev =>
          prev.map(img =>
            img.id === imageId
              ? { ...img, analysis_status: 'pending' }
              : img
          )
        )
        return result
      }
      throw new Error(result.error)
    } finally {
      setAnalyzingImages(prev => {
        const newSet = new Set(prev)
        newSet.delete(imageId)
        return newSet
      })
    }
  }, [])

  // Reanalyze image
  const reanalyzeImage = useCallback(async (imageId) => {
    setAnalyzingImages(prev => new Set(prev).add(imageId))

    try {
      const result = await imageService.reanalyzeImage(imageId)
      if (result.success) {
        // Update local image state
        setImages(prev =>
          prev.map(img =>
            img.id === imageId
              ? { ...img, analysis_status: 'pending' }
              : img
          )
        )
        return result
      }
      throw new Error(result.error)
    } finally {
      setAnalyzingImages(prev => {
        const newSet = new Set(prev)
        newSet.delete(imageId)
        return newSet
      })
    }
  }, [])

  // Delete image
  const deleteImage = useCallback(async (imageId) => {
    const result = await imageService.deleteImage(imageId)
    if (result.success) {
      // Remove from local state
      setImages(prev => prev.filter(img => img.id !== imageId))
      setSelectedImages(prev => {
        const newSet = new Set(prev)
        newSet.delete(imageId)
        return newSet
      })
      return result
    }
    throw new Error(result.error)
  }, [])

  // Delete all images
  const deleteAllImages = useCallback(async () => {
    const result = await imageService.deleteAllImages()
    if (result.success) {
      setImages([])
      setFilteredImages([])
      setSelectedImages(new Set())
      setPagination(prev => ({ ...prev, total: 0, hasMore: false }))
      return result
    }
    throw new Error(result.error)
  }, [])

  // Batch analyze images
  const batchAnalyzeImages = useCallback(async (imageIds) => {
    if (imageIds.length === 0) return

    // Add to analyzing set
    setAnalyzingImages(prev => new Set([...prev, ...imageIds]))

    try {
      const result = await imageService.batchAnalyzeImages(imageIds)
      if (result.success) {
        // Update local image state
        setImages(prev =>
          prev.map(img =>
            imageIds.includes(img.id)
              ? { ...img, analysis_status: 'pending' }
              : img
          )
        )
        return result
      }
      throw new Error(result.error)
    } finally {
      // Remove from analyzing set
      setAnalyzingImages(prev => {
        const newSet = new Set(prev)
        imageIds.forEach(id => newSet.delete(id))
        return newSet
      })
    }
  }, [])

  // Batch delete images
  const batchDeleteImages = useCallback(async (imageIds) => {
    if (imageIds.length === 0) return

    const result = await imageService.batchDeleteImages(imageIds)
    if (result.success) {
      // Remove from local state
      setImages(prev => prev.filter(img => !imageIds.includes(img.id)))
      setSelectedImages(prev => {
        const newSet = new Set(prev)
        imageIds.forEach(id => newSet.delete(id))
        return newSet
      })
      return result
    }
    throw new Error(result.error)
  }, [])

  // Download image
  const downloadImage = useCallback(async (imagePath, filename) => {
    const result = await imageService.downloadImage(imagePath, filename)
    if (result.success) {
      return result
    }
    throw new Error(result.error)
  }, [])

  // Get image statistics
  const getImageStats = useCallback(async (options = {}) => {
    const result = await imageService.getImageStats(options)
    if (result.success) {
      return result.data
    }
    throw new Error(result.error)
  }, [])

  // Get traffic analysis
  const getTrafficAnalysis = useCallback(async (options = {}) => {
    const result = await imageService.getTrafficAnalysis(options)
    if (result.success) {
      return result.data
    }
    throw new Error(result.error)
  }, [])

  // Update filters
  const updateFilters = useCallback((newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
    setPagination(prev => ({ ...prev, page: 1 }))
  }, [])

  // Clear filters
  const clearFilters = useCallback(() => {
    setFilters({
      camera_id: '',
      showLatestOnly: false,
      date_from: '',
      date_to: '',
      min_vehicles: '',
      max_vehicles: '',
      vehicle_type: '',
      confidence_threshold: '',
      traffic_density: '',
      has_analysis: 'all'
    })
    setPagination(prev => ({ ...prev, page: 1 }))
  }, [])

  // Select/deselect image
  const toggleImageSelection = useCallback((imageId) => {
    setSelectedImages(prev => {
      const newSet = new Set(prev)
      if (newSet.has(imageId)) {
        newSet.delete(imageId)
      } else {
        newSet.add(imageId)
      }
      return newSet
    })
  }, [])

  // Select all images
  const selectAllImages = useCallback(() => {
    setSelectedImages(new Set(images.map(img => img.id)))
  }, [images])

  // Deselect all images
  const deselectAllImages = useCallback(() => {
    setSelectedImages(new Set())
  }, [])

  // Update pagination
  const updatePagination = useCallback((newPagination) => {
    setPagination(prev => ({ ...prev, ...newPagination }))
  }, [])

  // Apply filters to images
  useEffect(() => {
    let filtered = images

    // Filter by camera ID
    if (filters.camera_id) {
      filtered = filtered.filter(img => img.camera_id === filters.camera_id)
    }

    // Filter by analysis status
    if (filters.has_analysis !== 'all') {
      if (filters.has_analysis === 'analyzed') {
        filtered = filtered.filter(img => img.analysis_status === 'completed')
      } else if (filters.has_analysis === 'not-analyzed') {
        filtered = filtered.filter(img => !img.analysis_status || img.analysis_status === 'not-analyzed')
      }
    }

    // Filter by vehicle count
    if (filters.min_vehicles) {
      filtered = filtered.filter(img => img.vehicle_count >= parseInt(filters.min_vehicles))
    }
    if (filters.max_vehicles) {
      filtered = filtered.filter(img => img.vehicle_count <= parseInt(filters.max_vehicles))
    }

    // Filter by confidence threshold
    if (filters.confidence_threshold) {
      filtered = filtered.filter(img => img.confidence_score >= parseFloat(filters.confidence_threshold))
    }

    // Filter by date range
    if (filters.date_from) {
      filtered = filtered.filter(img => new Date(img.created_at) >= new Date(filters.date_from))
    }
    if (filters.date_to) {
      filtered = filtered.filter(img => new Date(img.created_at) <= new Date(filters.date_to))
    }

    setFilteredImages(filtered)
  }, [images, filters])

  // Update images when API data changes
  useEffect(() => {
    if (imagesApi.data) {
      setImages(imagesApi.data)
    }
  }, [imagesApi.data])

  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetch) {
      fetchImages(true)
    }
  }, [autoFetch, fetchImages])

  // Set up refresh interval
  useEffect(() => {
    if (refreshInterval) {
      const interval = setInterval(() => {
        fetchImages(false, true)
      }, refreshInterval)

      return () => clearInterval(interval)
    }
  }, [refreshInterval, fetchImages])

  return {
    // State
    images,
    filteredImages,
    pagination,
    filters,
    selectedImages,
    analyzingImages,

    // API state
    loading: imagesApi.loading,
    error: imagesApi.error,
    success: imagesApi.success,

    // Actions
    fetchImages,
    loadMoreImages,
    getRecentImages,
    getCameraImages,
    getImageById,
    getVehicleDetection,
    analyzeImage,
    reanalyzeImage,
    deleteImage,
    deleteAllImages,
    batchAnalyzeImages,
    batchDeleteImages,
    downloadImage,
    getImageStats,
    getTrafficAnalysis,

    // Filtering
    updateFilters,
    clearFilters,

    // Selection
    toggleImageSelection,
    selectAllImages,
    deselectAllImages,

    // Pagination
    updatePagination,

    // Utility
    selectedCount: selectedImages.size,
    hasSelection: selectedImages.size > 0,
    isAllSelected: selectedImages.size === images.length && images.length > 0,
    isPartiallySelected: selectedImages.size > 0 && selectedImages.size < images.length,
    isAnalyzing: (imageId) => analyzingImages.has(imageId)
  }
}

export default useImages
