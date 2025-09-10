import React, {useCallback, useEffect, useState} from 'react'
import {Link, useParams} from 'react-router-dom'
import {
    ArrowLeft,
    BarChart3,
    Camera,
    Clock,
    ExternalLink,
    GalleryHorizontal,
    ImageIcon,
    Info,
    MapPin,
    Navigation,
    RefreshCw
} from 'lucide-react'
import {parseSQLiteDate} from '../utils/dateUtils'
import axios from 'axios'
import ImageCard from '../components/ImageCard'
import BoundingBoxCanvas from '../components/BoundingBoxCanvas'
import VehicleCountChart from '../components/charts/VehicleCountChart'

const CameraDetail = () => {
  const { id } = useParams()
  const [camera, setCamera] = useState(null)
  const [images, setImages] = useState([])
  const [loading, setLoading] = useState(true)
  const [imagesLoading, setImagesLoading] = useState(false)
  const [loadingMoreImages, setLoadingMoreImages] = useState(false)
  const [error, setError] = useState(null)

  const [imageFilters, setImageFilters] = useState({
    limit: 10,
    offset: 0
  })
  const [totalImageCount, setTotalImageCount] = useState(0)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [refreshInterval, setRefreshInterval] = useState(null)
  const [lastRefreshTime, setLastRefreshTime] = useState(null)
  const [cameraStats, setCameraStats] = useState({
    totalImages: 0,
    lastImageTime: null,
    firstImageTime: null
  })
  const [showImageModal, setShowImageModal] = useState(false)
  const [selectedImage, setSelectedImage] = useState(null)
  const [vehicleDetectionData, setVehicleDetectionData] = useState(null)
  const [vehicleCountData, setVehicleCountData] = useState([])
  const [vehicleCountLoading, setVehicleCountLoading] = useState(false)
  const [abortController, setAbortController] = useState(null)
  const [isCheckingForNewImages, setIsCheckingForNewImages] = useState(false)
  const [successMessage, setSuccessMessage] = useState(null)
  const [isMounted, setIsMounted] = useState(true)
  const [analyzingImages, setAnalyzingImages] = useState(new Set())
  const [analysisAbortControllers, setAnalysisAbortControllers] = useState(new Map())
  const [isTogglingCamera, setIsTogglingCamera] = useState(false)
  const [isTogglingAI, setIsTogglingAI] = useState(false)
  const [isUpdatingStats, setIsUpdatingStats] = useState(false)
  const [aggregationInterval, setAggregationInterval] = useState(600000) // Default to 10 minutes

  // Centralized function to update camera stats
  const updateCameraStats = useCallback((newStats) => {
    if (isMounted && !isUpdatingStats) {
      setIsUpdatingStats(true)

      // Use setTimeout to ensure state updates are batched
      setTimeout(() => {
        if (isMounted) {
          setCameraStats(prev => ({
            ...prev,
            ...newStats
          }))
          setIsUpdatingStats(false)
        }
      }, 0)
    }
  }, [isMounted, isUpdatingStats])

  // Helper function to format error messages consistently
  const formatErrorMessage = useCallback((operation, error) => {
    if (error.response?.data?.error) {
      return `${operation}: ${error.response.data.error}`
    }
    if (error.message) {
      return `${operation}: ${error.message}`
    }
    return `${operation}: An unexpected error occurred`
  }, [])

  // Helper function to validate API responses
  const validateApiResponse = useCallback((response, endpoint) => {
    if (!response || !response.data) {
      throw new Error(`Invalid response from ${endpoint}: No data received`)
    }

    if (response.data.success === false) {
      throw new Error(`API error from ${endpoint}: ${response.data.error || 'Unknown error'}`)
    }

    return response.data
  }, [])

  // Inline functions to avoid circular dependencies - defined FIRST
  const updateImageStatusesInline = useCallback(async () => {
    try {
      if (images.length === 0) return

      // Only update if we have images and auto-refresh is enabled
      if (!autoRefresh) return

      // Get current images with updated statuses - use a smaller limit for efficiency
      const params = {
        limit: Math.min(images.length, 20), // Limit to prevent excessive API calls
        offset: 0
      }

      const response = await axios.get(`/api/images/camera/${id}`, { params })

      // Add proper response validation
      if (!response.data || !response.data.data || !Array.isArray(response.data.data)) {
        console.error('Invalid response format from status update API:', response.data)
        return
      }

      const updatedImages = response.data.data

      // Update only the status-related fields, preserve current order and pagination
      if (isMounted) {
        setImages(prevImages =>
          prevImages.map(prevImg => {
            const updatedImg = updatedImages.find(updImg => updImg.id === prevImg.id)
            if (updatedImg) {
              return {
                ...prevImg,
                analysis_status: updatedImg.analysis_status || prevImg.analysis_status,
                vehicle_count: updatedImg.vehicle_count ?? prevImg.vehicle_count,
                confidence_score: updatedImg.confidence_score ?? prevImg.confidence_score,
                processed_at: updatedImg.processed_at || prevImg.processed_at
              }
            }
            return prevImg
          })
        )
      }
    } catch (error) {
      if (error.name !== 'CanceledError') {
        console.error('Error updating image statuses:', error)
        // Don't set error state for background status updates to avoid disrupting user experience
      }
    }
  }, [id, images.length, autoRefresh, isMounted])

  const fetchVehicleCountData = useCallback(async () => {
    try {
      setVehicleCountLoading(true)

      // Cancel any existing request and cleanup
      if (abortController) {
        abortController.abort()
        setAbortController(null)
      }

      const newAbortController = new AbortController()
      setAbortController(newAbortController)

      const response = await axios.get(`/api/vehicle-detection/counts-by-minute?camera_id=${id}&hours=24`, {
        signal: newAbortController.signal
      })

      if (response.data && response.data.success && response.data.data) {
        setVehicleCountData(response.data.data)

        // Extract aggregation interval from response for chart configuration
        if (response.data.aggregationInterval) {
          setAggregationInterval(response.data.aggregationInterval)
        }
      } else {
        console.warn('No vehicle count data available or invalid response format')
        setVehicleCountData([])
      }
    } catch (error) {
      if (error.name !== 'CanceledError') {
        console.error('Error fetching vehicle count data:', error)
        if (isMounted) {
          setError(`Failed to fetch vehicle count data: ${error.message}`)
        }
        setVehicleCountData([])
      }
    } finally {
      if (isMounted) {
        setVehicleCountLoading(false)
      }
    }
  }, [id, abortController, isMounted])

  const fetchImages = useCallback(async (resetOffset = false) => {
    try {
      // Don't start a new fetch if one is already in progress
      if (imagesLoading) return

      setImagesLoading(true)

      // Reset offset if requested or if filters changed
      if (resetOffset) {
        setImageFilters(prev => ({ ...prev, offset: 0 }))
      }

      const params = {
        limit: imageFilters.limit,
        offset: resetOffset ? 0 : imageFilters.offset
      }

      // Fetching images with specified parameters

      const response = await axios.get(`/api/images/camera/${id}`, { params })

      // Add null checks for response data
      if (!response.data || !response.data.data) {
        console.error('Invalid response format from images API')
        return
      }

      const filteredImages = response.data.data
      const totalCount = response.data.count || filteredImages.length

      // Received images from API

      if (resetOffset) {
        setImages(filteredImages)
      } else {
        setImages(prev => [...prev, ...filteredImages])
      }

      setTotalImageCount(totalCount)
      setLastRefreshTime(new Date())

      // Update camera stats with actual image count
      if (filteredImages.length > 0) {
        // Update stats directly here to avoid circular dependency
        setCameraStats(prev => ({
          ...prev,
          totalImages: totalCount,
          lastImageTime: filteredImages[0]?.created_at || prev.lastImageTime,
          firstImageTime: filteredImages[filteredImages.length - 1]?.created_at || prev.firstImageTime
        }))
      }
    } catch (error) {
      if (error.name !== 'CanceledError') {
        console.error('Error fetching images:', error)
        // Set error state for UI feedback
        if (isMounted) {
          setError(`Failed to fetch images: ${error.message}`)
        }
      }
    } finally {
      if (isMounted) {
        setImagesLoading(false)
      }
    }
  }, [id, imagesLoading, imageFilters.limit, imageFilters.offset, isMounted])

  const fetchCameraStats = useCallback(async () => {
    try {
      const response = await axios.get(`/api/images/stats/summary?hours=168&camera_id=${id}`)
      if (response.data && response.data.success) {
        const stats = response.data.data
        updateCameraStats({
          totalImages: stats?.total_images || 0,
          lastImageTime: stats?.last_capture || null,
          firstImageTime: stats?.first_capture || null
        })
      }
    } catch (error) {
      if (error.name !== 'CanceledError') {
        console.error('Error fetching camera stats:', error)
      }
    }
  }, [id, updateCameraStats])

  const fetchCameraData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null) // Clear any previous errors

      const response = await axios.get(`/api/cameras/${id}`)

      // Validate camera data structure
      if (!response.data || !response.data.data) {
        throw new Error('Invalid camera data received')
      }

      const cameraData = response.data.data

      // Validate required camera fields
      if (!cameraData.id || !cameraData.camera_id) {
        throw new Error('Camera data missing required fields')
      }

      // Validate optional fields have correct types
      if (cameraData.latitude && isNaN(Number(cameraData.latitude))) {
        console.warn('Invalid latitude value:', cameraData.latitude)
      }
      if (cameraData.longitude && isNaN(Number(cameraData.longitude))) {
        console.warn('Invalid longitude value:', cameraData.longitude)
      }
      if (cameraData.enabled !== undefined && typeof cameraData.enabled !== 'boolean') {
        console.warn('Invalid enabled value:', cameraData.enabled)
      }
      if (cameraData.ai_analysis_enabled !== undefined && typeof cameraData.ai_analysis_enabled !== 'boolean') {
        console.warn('Invalid ai_analysis_enabled value:', cameraData.ai_analysis_enabled)
      }

      if (isMounted) {
        setCamera(cameraData)
      }
    } catch (error) {
      console.error('Error fetching camera data:', error)
      if (isMounted) {
        setError(error.response?.data?.error || error.message || 'Failed to load camera data')
      }
    } finally {
      if (isMounted) {
        setLoading(false)
      }
    }
  }, [id, isMounted])

  const checkForNewImagesInline = useCallback(async () => {
    try {
      // Prevent multiple simultaneous calls
      if (isCheckingForNewImages || images.length === 0 || imagesLoading) return

      setIsCheckingForNewImages(true)

      // Get the timestamp of our most recent image
      const mostRecentTimestamp = images[0]?.created_at
      if (!mostRecentTimestamp) return

      // Check for newer images by querying with a small limit and checking timestamps
      const params = {
        limit: 10, // Small limit to check recent images
        offset: 0
      }

      const response = await axios.get(`/api/images/camera/${id}`, { params })

      // Add comprehensive data validation
      if (!response.data || !response.data.data || !Array.isArray(response.data.data)) {
        console.error('Invalid response format from new images check API:', response.data)
        return
      }

      const newImages = response.data.data

      // Validate each image object has required fields
      const validImages = newImages.filter(img => {
        if (!img || typeof img !== 'object') return false
        if (!img.id || !img.created_at) return false
        if (isNaN(new Date(img.created_at).getTime())) return false
        return true
      })

      if (validImages.length === 0) {
        console.warn('No valid images found in response')
        return
      }

      if (validImages.length > 0) {
        // Check if we have any new images
        const hasNewImages = validImages.some(newImg =>
          new Date(newImg.created_at) > new Date(mostRecentTimestamp)
        )

        if (hasNewImages) {
          // Fetch from beginning to get all images including new ones
          // Use a direct function call to avoid dependency issues
          const fetchImagesDirect = async () => {
            try {
              setImagesLoading(true)

              const fetchParams = {
                limit: imageFilters.limit,
                offset: 0
              }

              const fetchResponse = await axios.get(`/api/images/camera/${id}`, { params: fetchParams })

              if (!fetchResponse.data || !fetchResponse.data.data) {
                console.error('Invalid response format from images API')
                return
              }

              const filteredImages = fetchResponse.data.data

              // Validate each image object has required fields
              const validFilteredImages = filteredImages.filter(img => {
                if (!img || typeof img !== 'object') return false
                if (!img.id || !img.created_at) return false
                if (isNaN(new Date(img.created_at).getTime())) return false
                return true
              })

              if (validFilteredImages.length === 0) {
                console.warn('No valid images found in fetch response')
                return
              }

              const totalCount = fetchResponse.data.count || validFilteredImages.length

              if (isMounted) {
                setImages(validFilteredImages)
                setTotalImageCount(totalCount)
                setLastRefreshTime(new Date())
              }

              // Remove duplicate cameraStats update - let the useEffect handle it
            } catch (error) {
              if (error.name !== 'CanceledError') {
                console.error('Error fetching images:', error)
                setError(`Failed to fetch images: ${error.message}`)
              }
            } finally {
              setImagesLoading(false)
            }
          }

          await fetchImagesDirect()
        } else {
          // Just update statuses of existing images without changing the view
          // Use a direct function call to avoid dependency issues
          const updateStatusesDirect = async () => {
            try {
              if (images.length === 0) return

              // Only fetch status updates for images that might have changed
              const recentImages = images.slice(0, Math.min(images.length, 10))
              const statusParams = {
                limit: recentImages.length,
                offset: 0,
                status_only: true // Request only status fields if API supports it
              }

              const statusResponse = await axios.get(`/api/images/camera/${id}`, { params: statusParams })

              if (!statusResponse.data || !statusResponse.data.data) {
                console.error('Invalid response format from status update API')
                return
              }

              const updatedImages = statusResponse.data.data

              // Validate status update data
              const validStatusUpdates = updatedImages.filter(img => {
                if (!img || typeof img !== 'object') return false
                if (!img.id) return false
                return true
              })

              if (isMounted && validStatusUpdates.length > 0) {
                setImages(prevImages =>
                  prevImages.map(prevImg => {
                    const updatedImg = validStatusUpdates.find(updImg => updImg.id === prevImg.id)
                    if (updatedImg) {
                      return {
                        ...prevImg,
                        analysis_status: updatedImg.analysis_status || prevImg.analysis_status,
                        vehicle_count: updatedImg.vehicle_count ?? prevImg.vehicle_count,
                        confidence_score: updatedImg.confidence_score ?? prevImg.confidence_score,
                        processed_at: updatedImg.processed_at || prevImg.processed_at
                      }
                    }
                    return prevImg
                  })
                )
              }
            } catch (error) {
              if (error.name !== 'CanceledError') {
                console.error('Error updating image statuses:', error)
              }
            }
          }

          await updateStatusesDirect()
        }
      }
    } catch (error) {
      if (error.name !== 'CanceledError') {
        console.error('Error checking for new images:', error)
      }
    } finally {
      setIsCheckingForNewImages(false)
    }
  }, [id, imagesLoading, imageFilters.limit, isCheckingForNewImages, isMounted])

  // Auto-clear success messages after 5 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        if (isMounted) {
          setSuccessMessage(null)
        }
      }, 5000)

      return () => clearTimeout(timer)
    }
  }, [successMessage, isMounted])

  // useEffect hooks - defined AFTER the functions they reference
  useEffect(() => {
    // Set mounted state when component mounts
    setIsMounted(true)

    return () => {
      // Clean up mounted state when component unmounts
      setIsMounted(false)
    }
  }, [])

  useEffect(() => {
    fetchCameraData()
  }, [id, fetchCameraData])

  // Initial fetch when component mounts
  useEffect(() => {
    if (camera) {
      // Reset to beginning when component mounts
      const initialFetch = async () => {
        try {
          setImagesLoading(true)

          const params = {
            limit: imageFilters.limit,
            offset: 0
          }

          // Initial fetch with specified parameters

          const response = await axios.get(`/api/images/camera/${id}`, { params })

          if (!response.data || !response.data.data) {
            console.error('Invalid response format from initial fetch API')
            return
          }

          const filteredImages = response.data.data
          const totalCount = response.data.count || filteredImages.length

          // Initial fetch completed

          setImages(filteredImages)
          setTotalImageCount(totalCount)
          setLastRefreshTime(new Date())

          if (filteredImages.length > 0) {
            setCameraStats(prev => ({
              ...prev,
              totalImages: totalCount,
              lastImageTime: filteredImages[0]?.created_at || prev.lastImageTime,
              firstImageTime: filteredImages[filteredImages.length - 1]?.created_at || prev.firstImageTime
            }))
          }
        } catch (error) {
          if (error.name !== 'CanceledError') {
            console.error('Error in initial fetch:', error)
            setError(`Failed to fetch initial images: ${error.message}`)
          }
        } finally {
          setImagesLoading(false)
        }
      }

      initialFetch()
    }
  }, [camera, id, imageFilters.limit]) // Removed updateCameraStats dependency

  // Fetch vehicle count data when component mounts
  useEffect(() => {
    if (id && camera) {
      fetchVehicleCountData()
    }
  }, [id, camera]) // Remove fetchVehicleCountData from dependencies

  // Status update polling for real-time status changes
  useEffect(() => {
    if (camera && isMounted && images.length > 0) {
      // Poll for status updates every 15 seconds
      const statusInterval = setInterval(() => {
        if (isMounted && images.length > 0) {
          // Simple status update without complex logic
          const updateStatuses = async () => {
            try {
              const params = {
                limit: Math.min(images.length, 20),
                offset: 0
              }

              const response = await axios.get(`/api/images/camera/${id}`, { params })

              if (response.data?.data && Array.isArray(response.data.data)) {
                const updatedImages = response.data.data

                setImages(prevImages =>
                  prevImages.map(prevImg => {
                    const updatedImg = updatedImages.find(updImg => updImg.id === prevImg.id)
                    if (updatedImg) {
                      return {
                        ...prevImg,
                        analysis_status: updatedImg.analysis_status || prevImg.analysis_status,
                        vehicle_count: updatedImg.vehicle_count ?? prevImg.vehicle_count,
                        confidence_score: updatedImg.confidence_score ?? prevImg.confidence_score,
                        processed_at: updatedImg.processed_at || prevImg.processed_at
                      }
                    }
                    return prevImg
                  })
                )
              }
            } catch (error) {
              if (error.name !== 'CanceledError') {
                console.error('Error updating image statuses:', error)
              }
            }
          }

          updateStatuses()
        }
      }, 15000)

      return () => {
        clearInterval(statusInterval)
      }
    }
  }, [camera, isMounted, images.length, id])

  // Auto-refresh functionality - simplified
  useEffect(() => {
    if (autoRefresh && camera && isMounted) {
      // Clear any existing interval
      if (refreshInterval) {
        clearInterval(refreshInterval)
      }

      // Set up new interval for auto-refresh every 60 seconds
      const interval = setInterval(() => {
        if (isMounted && camera) {
          // Simple refresh - just fetch latest images
          const refreshImages = async () => {
            try {
              const params = {
                limit: imageFilters.limit,
                offset: 0
              }

              // Auto-refresh fetching images

              const response = await axios.get(`/api/images/camera/${id}`, { params })

              if (response.data?.data && Array.isArray(response.data.data)) {
                const newImages = response.data.data
                const totalCount = response.data.count || newImages.length

                // Auto-refresh completed

                setImages(newImages)
                setTotalImageCount(totalCount)
                setLastRefreshTime(new Date())

                // Update camera stats directly
                if (newImages.length > 0) {
                  setCameraStats(prev => ({
                    ...prev,
                    totalImages: totalCount,
                    lastImageTime: newImages[0]?.created_at || prev.lastImageTime,
                    firstImageTime: newImages[newImages.length - 1]?.created_at || prev.firstImageTime
                  }))
                }
              }
            } catch (error) {
              if (error.name !== 'CanceledError') {
                console.error('Error refreshing images:', error)
              }
            }
          }

          refreshImages()
        }
      }, 60000)

      setRefreshInterval(interval)

      return () => {
        clearInterval(interval)
      }
    } else if (refreshInterval) {
      clearInterval(refreshInterval)
      setRefreshInterval(null)
    }
  }, [autoRefresh, camera, isMounted, id, imageFilters.limit]) // Removed updateCameraStats dependency

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval)
      }
      // Abort any ongoing requests
      if (abortController) {
        abortController.abort()
      }
      // Abort all analysis requests
      analysisAbortControllers.forEach(controller => {
        controller.abort()
      })
    }
  }, [refreshInterval, abortController, analysisAbortControllers])

  // Cleanup AbortController when component unmounts or id changes
  useEffect(() => {
    return () => {
      if (abortController) {
        abortController.abort()
      }
    }
  }, [abortController])

  useEffect(() => {
    if (camera) {
      fetchCameraStats()
    }
  }, [camera, fetchCameraStats])

  // Remove the problematic useEffect that was causing circular updates

  const toggleCameraStatus = useCallback(async () => {
    try {
      if (!camera) return

      setIsTogglingCamera(true)
      setError(null) // Clear any previous errors

      const newStatus = !camera.enabled
      // Toggling camera status

      const response = await axios.patch(`/api/cameras/${id}/toggle`, {
        enabled: newStatus
      })

      const validatedData = validateApiResponse(response, 'cameras/toggle')

      if (validatedData.success) {
        // Update local camera state
        if (isMounted) {
          setCamera(prev => ({
            ...prev,
            enabled: newStatus
          }))

          // Clear any previous errors
          setError(null)
        }
      } else {
        throw new Error('Failed to update camera status')
      }
    } catch (error) {
      console.error('Error toggling camera status:', error)
      if (isMounted) {
        setError(`Failed to update camera status: ${error.message}`)
      }
    } finally {
      if (isMounted) {
        setIsTogglingCamera(false)
      }
    }
  }, [camera, id, validateApiResponse, isMounted])

  const toggleAIAnalysisStatus = useCallback(async () => {
    try {
      if (!camera) return

      setIsTogglingAI(true)
      setError(null) // Clear any previous errors

      const newAiStatus = !camera.ai_analysis_enabled
      // Toggling AI analysis status

      const response = await axios.patch(`/api/cameras/${id}/toggle-ai-analysis`, {
        ai_analysis_enabled: newAiStatus
      })

      const validatedData = validateApiResponse(response, 'cameras/toggle-ai-analysis')

      if (validatedData.success) {
        // Update local camera state
        if (isMounted) {
          setCamera(prev => ({
            ...prev,
            ai_analysis_enabled: newAiStatus
          }))

          // Clear any previous errors
          setError(null)
        }
      } else {
        throw new Error('Failed to update AI analysis status')
      }
    } catch (error) {
      console.error('Error toggling AI analysis status:', error)
      if (isMounted) {
        setError(`Failed to update AI analysis status: ${error.message}`)
      }
    } finally {
      if (isMounted) {
        setIsTogglingAI(false)
      }
    }
  }, [camera, id, validateApiResponse, isMounted])

  const handleImageFilterChange = useCallback((key, value) => {
    setImageFilters(prev => ({
      ...prev,
      [key]: value,
      offset: 0 // Reset offset when filters change
    }))

    // Fetch images with new filters immediately using functional state update
    const fetchImagesWithFilters = async () => {
      try {
        setImagesLoading(true)

        // Use the new value directly instead of relying on stale state
        const currentLimit = key === 'limit' ? value : imageFilters.limit

        const params = {
          limit: currentLimit,
          offset: 0
        }

        // Filter change fetching images

        const response = await axios.get(`/api/images/camera/${id}`, { params })

        if (!response.data || !response.data.data) {
          console.error('Invalid response format from images API')
          return
        }

        const filteredImages = response.data.data
        const totalCount = response.data.count || filteredImages.length

        // Filter change completed

        setImages(filteredImages)
        setTotalImageCount(totalCount)
        setLastRefreshTime(new Date())
        setError(null) // Clear any previous errors

        if (filteredImages.length > 0) {
          // Update camera stats directly
          setCameraStats(prev => ({
            ...prev,
            totalImages: totalCount,
            lastImageTime: filteredImages[0]?.created_at || prev.lastImageTime,
            firstImageTime: filteredImages[filteredImages.length - 1]?.created_at || prev.firstImageTime
          }))
        }
      } catch (error) {
        console.error('Error fetching images with filters:', error)
        if (isMounted) {
          setError(`Failed to fetch images: ${error.message}`)
        }
      } finally {
        if (isMounted) {
          setImagesLoading(false)
        }
      }
    }

    fetchImagesWithFilters()
  }, [id, imageFilters.limit, isMounted])

  const loadMoreImages = useCallback(async () => {
    const newOffset = imageFilters.offset + imageFilters.limit
    setImageFilters(prev => ({
      ...prev,
      offset: newOffset
    }))

    // Fetch next page
    try {
      setLoadingMoreImages(true)

      const params = {
        limit: imageFilters.limit,
        offset: newOffset
      }

      // Loading more images

      const response = await axios.get(`/api/images/camera/${id}`, { params })

      // Add null check for response data
      if (!response.data || !response.data.data) {
        console.error('Invalid response format from loadMoreImages API')
        return
      }

      const newImages = response.data.data
      // Loaded additional images
      setImages(prev => [...prev, ...newImages])
    } catch (error) {
      console.error('Error loading more images:', error)
      // Set error state for UI feedback
      if (isMounted) {
        setError(`Failed to load more images: ${error.message}`)
      }
    } finally {
      if (isMounted) {
        setLoadingMoreImages(false)
      }
    }
  }, [id, imageFilters.limit, imageFilters.offset, isMounted])

  const resetImageGallery = useCallback(() => {
    // Reset offset and fetch from beginning
    setImageFilters(prev => ({ ...prev, offset: 0 }))

    const resetAndFetch = async () => {
      try {
        setImagesLoading(true)

        const params = {
          limit: imageFilters.limit,
          offset: 0
        }

        // Resetting gallery

        const response = await axios.get(`/api/images/camera/${id}`, { params })

        if (!response.data || !response.data.data) {
          console.error('Invalid response format from reset API')
          return
        }

        const filteredImages = response.data.data
        const totalCount = response.data.count || filteredImages.length

        // Reset completed

        setImages(filteredImages)
        setTotalImageCount(totalCount)
        setLastRefreshTime(new Date())

        if (filteredImages.length > 0) {
          // Update camera stats directly
          setCameraStats(prev => ({
            ...prev,
            totalImages: totalCount,
            lastImageTime: filteredImages[0]?.created_at || prev.lastImageTime,
            firstImageTime: filteredImages[filteredImages.length - 1]?.created_at || prev.firstImageTime
          }))
        }
      } catch (error) {
        console.error('Error resetting image gallery:', error)
        if (isMounted) {
          setError(`Failed to reset gallery: ${error.message}`)
        }
      } finally {
        if (isMounted) {
          setImagesLoading(false)
        }
      }
    }

    resetAndFetch()
  }, [id, imageFilters.limit, isMounted])

  const formatImageDate = useCallback((dateString) => {
    if (!dateString) return 'N/A'
    try {
      // Use our SQLite-aware date parser for consistent timezone handling
      const parsedDate = parseSQLiteDate(dateString)
      return parsedDate.toLocaleString()
    } catch (error) {
      console.error('Error formatting date:', error)
      return 'Invalid Date'
    }
  }, [])

  const handleViewImage = useCallback(async (image) => {
    try {
      // Viewing image details

      // Clear previous vehicle detection data to prevent memory leaks
      setVehicleDetectionData(null)

      // Check if vehicle detection data is already embedded in the image object
      if (image.vehicle_detection_data || image.bounding_boxes || image.gemini_response) {
        // Found embedded vehicle detection data
        const embeddedData = {
          bounding_boxes: image.bounding_boxes || image.vehicle_detection_data?.bounding_boxes || [],
          gemini_response: image.gemini_response || image.vehicle_detection_data?.gemini_response,
          processing_status: image.analysis_status === 'completed' ? 'completed' : 'pending',
          total_vehicles: image.vehicle_count,
          confidence_score: image.confidence_score,
          cars: image.vehicle_detection_data?.cars || 0,
          trucks: image.vehicle_detection_data?.trucks || 0,
          motorcycles: image.vehicle_detection_data?.motorcycles || 0,
          buses: image.vehicle_detection_data?.buses || 0
        }

        if (isMounted) {
          setVehicleDetectionData(embeddedData)
          // Set embedded vehicle detection data
        }
      }
      // Only try to fetch vehicle detection data if the image has been analyzed and we don't have embedded data
      else if (image.analysis_status === 'completed' && image.vehicle_count > 0) {
        try {
          // Fetching vehicle detection data
          const response = await axios.get(`/api/images/${image.id}/vehicle-detection`)
          // Vehicle detection response received

          if (response.data && response.data.success && response.data.data) {
            if (isMounted) {
              setVehicleDetectionData(response.data.data)
              // Vehicle detection data set successfully
            }
          } else {
            console.warn('Vehicle detection response missing data:', response.data)
            if (isMounted) {
              setVehicleDetectionData(null)
            }
          }
        } catch (error) {
          console.error('Error fetching vehicle detection data:', error)
          console.error('Error response:', error.response?.data)
          console.error('Error status:', error.response?.status)

          // If it's a 404, the data might not exist yet
          if (error.response?.status === 404) {
            // Vehicle detection data not found
          } else {
            console.error('Unexpected error fetching vehicle detection data:', error.message)
          }

          if (isMounted) {
            setVehicleDetectionData(null)
          }
        }
      } else {
        // Image not analyzed, skipping vehicle detection fetch
        if (isMounted) {
          setVehicleDetectionData(null)
        }
      }

      if (isMounted) {
        setSelectedImage(image)
        setShowImageModal(true)
      }
    } catch (error) {
      console.error('Error in handleViewImage:', error)
      if (isMounted) {
        setVehicleDetectionData(null)
        setSelectedImage(image)
        setShowImageModal(true)
      }
    }
  }, [isMounted])

  const closeImageModal = useCallback(() => {
    setShowImageModal(false)
    setSelectedImage(null)
    setVehicleDetectionData(null)
  }, [])

  // Handle image analysis actions
  const handleAnalyzeImage = useCallback(async (image) => {
    try {
      // Check if this specific image is already being analyzed
      if (analyzingImages.has(image.id)) return

      // Create AbortController for this request
      const abortController = new AbortController()
      setAnalysisAbortControllers(prev => new Map(prev).set(image.id, abortController))

      // Add image to analyzing set
      setAnalyzingImages(prev => new Set(prev).add(image.id))
      setError(null) // Clear any previous errors

      const response = await axios.post(`/api/images/${image.id}/analyze`, {}, {
        signal: abortController.signal
      })

      if (response.data && response.data.success) {
        // Update only the specific image's status instead of fetching all images
        if (isMounted) {
          setImages(prevImages =>
            prevImages.map(img =>
              img.id === image.id
                ? { ...img, analysis_status: 'queued' }
                : img
            )
          )
          setSuccessMessage('Image queued for analysis')
        }
      } else {
        throw new Error('Failed to queue image for analysis')
      }
    } catch (error) {
      if (error.name !== 'CanceledError') {
        console.error('Error analyzing image:', error)
        if (isMounted) {
          setError(`Failed to analyze image: ${error.response?.data?.error || error.message}`)
        }
      }
    } finally {
      // Clean up
      if (isMounted) {
        setAnalyzingImages(prev => {
          const newSet = new Set(prev)
          newSet.delete(image.id)
          return newSet
        })
        setAnalysisAbortControllers(prev => {
          const newMap = new Map(prev)
          newMap.delete(image.id)
          return newMap
        })
      }
    }
  }, [analyzingImages, isMounted])

  const handleRetryAnalysis = useCallback(async (image) => {
    try {
      // Check if this specific image is already being analyzed
      if (analyzingImages.has(image.id)) return

      // Create AbortController for this request
      const abortController = new AbortController()
      setAnalysisAbortControllers(prev => new Map(prev).set(image.id, abortController))

      // Add image to analyzing set
      setAnalyzingImages(prev => new Set(prev).add(image.id))
      setError(null) // Clear any previous errors

      const response = await axios.post(`/api/images/${image.id}/analyze`, {}, {
        signal: abortController.signal
      })

      if (response.data && response.data.success) {
        // Update only the specific image's status instead of fetching all images
        if (isMounted) {
          setImages(prevImages =>
            prevImages.map(img =>
              img.id === image.id
                ? { ...img, analysis_status: 'queued' }
                : img
            )
          )
          setSuccessMessage('Image queued for retry analysis')
        }
      } else {
        throw new Error('Failed to queue image for retry analysis')
      }
    } catch (error) {
      if (error.name !== 'CanceledError') {
        console.error('Error retrying analysis:', error)
        if (isMounted) {
          setError(`Failed to retry analysis: ${error.response?.data?.error || error.message}`)
        }
      }
    } finally {
      // Clean up
      if (isMounted) {
        setAnalyzingImages(prev => {
          const newSet = new Set(prev)
          newSet.delete(image.id)
          return newSet
        })
        setAnalysisAbortControllers(prev => {
          const newMap = new Map(prev)
          newMap.delete(image.id)
          return newMap
        })
      }
    }
  }, [analyzingImages, isMounted])

  const handleReanalyzeImage = useCallback(async (image) => {
    try {
      // Check if this specific image is already being analyzed
      if (analyzingImages.has(image.id)) return

      // Create AbortController for this request
      const abortController = new AbortController()
      setAnalysisAbortControllers(prev => new Map(prev).set(image.id, abortController))

      // Add image to analyzing set
      setAnalyzingImages(prev => new Set(prev).add(image.id))
      setError(null) // Clear any previous errors

      const response = await axios.post(`/api/images/${image.id}/analyze`, {}, {
        signal: abortController.signal
      })

      if (response.data && response.data.success) {
        // Update only the specific image's status instead of fetching all images
        if (isMounted) {
          setImages(prevImages =>
            prevImages.map(img =>
              img.id === image.id
                ? { ...img, analysis_status: 'queued' }
                : img
            )
          )
          setSuccessMessage('Image queued for reanalysis')
        }
      } else {
        throw new Error('Failed to queue image for reanalysis')
      }
    } catch (error) {
      if (error.name !== 'CanceledError') {
        console.error('Error reanalyzing image:', error)
        if (isMounted) {
          setError(`Failed to reanalyze image: ${error.response?.data?.error || error.message}`)
        }
      }
    } finally {
      // Clean up
      if (isMounted) {
        setAnalyzingImages(prev => {
          const newSet = new Set(prev)
          newSet.delete(image.id)
          return newSet
        })
        setAnalysisAbortControllers(prev => {
          const newMap = new Map(prev)
          newMap.delete(image.id)
          return newMap
        })
      }
    }
  }, [analyzingImages, isMounted])

  // Function to manually fix bounding boxes for an image
  const handleFixBoundingBoxes = useCallback(async (image) => {
    try {
      // Attempting to fix bounding boxes

      // First, try to reanalyze the image
      await handleReanalyzeImage(image)

      // Then refresh the vehicle detection data
      setTimeout(() => {
        handleViewImage(image)
      }, 2000) // Wait 2 seconds for analysis to complete

      setSuccessMessage('Image queued for reanalysis to fix bounding boxes')
    } catch (error) {
      console.error('Error fixing bounding boxes:', error)
      setError(`Failed to fix bounding boxes: ${error.message}`)
    }
  }, [handleReanalyzeImage, handleViewImage])

  const formatRelativeTime = useCallback((dateString) => {
    if (!dateString) return 'Unknown'

    try {
      const now = new Date()
      const date = new Date(dateString)

      if (isNaN(date.getTime())) {
        return 'Invalid Date'
      }

      const diffMs = now - date
      const diffMins = Math.floor(diffMs / 60000)
      const diffHours = Math.floor(diffMs / 3600000)
      const diffDays = Math.floor(diffMs / 86400000)

      if (diffMins < 1) return 'Just now'
      if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`
      if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
    } catch (error) {
      console.error('Error formatting relative time:', error)
      return 'Unknown'
    }
  }, [])

  const extractRoadInfo = useCallback((name) => {
    if (!name) return { road: 'Unknown', intersection: 'Unknown' }

    try {
      // Try to extract road and intersection from camera name
      const parts = name.split(' @ ')
      if (parts.length >= 2) {
        return { road: parts[0], intersection: parts[1] }
      }
      return { road: name, intersection: 'Unknown' }
    } catch (error) {
      console.error('Error extracting road info:', error)
      return { road: 'Unknown', intersection: 'Unknown' }
    }
  }, [])

  const getGoogleMapsUrl = useCallback((lat, lng) => {
    if (!lat || !lng || isNaN(Number(lat)) || isNaN(Number(lng))) {
      return '#'
    }
    return `https://www.google.com/maps?q=${lat},${lng}`
  }, [])








  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Error loading camera</h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <Link to="/cameras" className="text-primary-600 hover:text-primary-700">
          ← Back to cameras
        </Link>
      </div>
    )
  }

  if (!camera) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Camera not found</h3>
        <p className="text-gray-600 mb-4">Camera ID: {id}</p>
        <Link to="/cameras" className="text-primary-600 hover:text-primary-700">
          ← Back to cameras
        </Link>
      </div>
    )
  }

  const roadInfo = extractRoadInfo(camera.name)

  return (
    <div className="space-y-8">
      {/* Enhanced Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center space-x-6">
          <Link
            to="/cameras"
            className="p-3 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all duration-200 group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:scale-110 transition-transform" />
          </Link>

          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Camera className="w-6 h-6 text-blue-600" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900">
                {camera.name || `Camera ${camera.camera_id}`}
              </h1>
            </div>

            <div className="flex items-center space-x-6 text-sm text-gray-600">
              <span className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                Camera ID: <span className="font-mono font-medium text-gray-800">{camera.camera_id}</span>
              </span>

              {roadInfo.road !== 'Unknown' && (
                <span className="flex items-center space-x-2">
                  <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                  <MapPin className="w-4 h-4 text-gray-400" />
                  {roadInfo.road} at {roadInfo.intersection}
                </span>
              )}
            </div>
          </div>

          {/* Clean Status and Control Section */}
          <div className="flex items-center space-x-3">
            {/* Toggle Controls */}
            <div className="flex items-center space-x-4">
              {/* Image Polling Toggle */}
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Image Polling:</span>
                <button
                  onClick={toggleCameraStatus}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    camera.enabled ? 'bg-green-600' : 'bg-gray-300'
                  }`}
                  title={camera.enabled ? 'Disable image polling' : 'Enable image polling'}
                  disabled={isTogglingCamera}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      camera.enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span className="text-xs text-gray-500">
                  {camera.enabled ? 'Every minute' : 'Paused'}
                </span>
                {isTogglingCamera && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-2"></div>
                )}
              </div>

              {/* AI Analysis Toggle */}
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">AI Analysis:</span>
                <button
                  onClick={toggleAIAnalysisStatus}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
                    camera.ai_analysis_enabled ? 'bg-purple-600' : 'bg-gray-300'
                  }`}
                  title={camera.ai_analysis_enabled ? 'Disable AI analysis' : 'Enable AI analysis'}
                  disabled={isTogglingAI}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      camera.ai_analysis_enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span className="text-xs text-gray-500">
                  {camera.ai_analysis_enabled ? 'Every 5 min' : 'Disabled'}
                </span>
                {isTogglingAI && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-2"></div>
                )}
              </div>

              {/* Analysis Status Indicator */}
              {analyzingImages.size > 0 && (
                <div className="flex items-center space-x-2 px-3 py-1 bg-yellow-100 rounded-lg">
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-yellow-600"></div>
                  <span className="text-xs text-yellow-700">Analyzing {analyzingImages.size} image{analyzingImages.size > 1 ? 's' : ''}...</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
            <div className="flex-shrink-0">
              <button
                onClick={() => setError(null)}
                className="text-red-400 hover:text-red-600 transition-colors"
              >
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Message Display */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-green-800">Success</h3>
              <p className="text-sm text-green-700 mt-1">{successMessage}</p>
            </div>
            <div className="flex-shrink-0">
              <button
                onClick={() => setSuccessMessage(null)}
                className="text-green-400 hover:text-green-600 transition-colors"
              >
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Camera Information */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900 dark:to-indigo-900 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
            <div className="p-1.5 bg-blue-100 rounded-lg">
              <Camera className="w-4 h-4 text-blue-600" />
            </div>
            <span>Camera Information</span>
          </h3>
        </div>

        <div className="p-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Left Column - Road & Location Info */}
            <div className="space-y-3">
              {camera.description && (
                <div className="flex items-center space-x-3 p-2 bg-gray-50 rounded-lg">
                  <Info className="w-4 h-4 text-gray-600 flex-shrink-0" />
                  <div className="min-w-0">
                    <span className="text-xs font-medium text-gray-700 block mb-1">Description</span>
                    <p className="text-gray-900 text-sm">{camera.description}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center space-x-3 p-2 bg-gray-50 rounded-lg">
                <Clock className="w-4 h-4 text-gray-600 flex-shrink-0" />
                <div className="min-w-0">
                <span className="text-xs font-medium text-gray-700 block mb-1">Last Updated</span>
                <p className="text-gray-900 text-sm">{parseSQLiteDate(camera.updated_at)?.toLocaleString() || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Middle Column - Camera Details */}
            <div className="space-y-3">
              <div className="flex items-center space-x-3 p-2 bg-blue-50 rounded-lg">
                <MapPin className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <div className="min-w-0">
                  <span className="text-xs font-medium text-gray-700 block">Primary Road</span>
                  <p className="text-gray-900 font-medium text-sm">{roadInfo.road}</p>
                </div>
              </div>

              {camera.county && (
                <div className="flex items-center space-x-3 p-2 bg-purple-50 rounded-lg">
                  <MapPin className="w-4 h-4 text-purple-600 flex-shrink-0" />
                  <div className="min-w-0">
                    <span className="text-xs font-medium text-gray-700 block">County</span>
                    <p className="text-gray-900 font-medium text-sm">{camera.county} County</p>
                  </div>
                </div>
              )}

            </div>

            {/* Right Column - Coordinates & Additional Info */}
            <div className="space-y-3">
              {roadInfo.intersection !== 'Unknown' && (
                <div className="flex items-center space-x-3 p-2 bg-green-50 rounded-lg">
                  <Navigation className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <div className="min-w-0">
                    <span className="text-xs font-medium text-gray-700 block">Intersection</span>
                    <p className="text-gray-900 font-medium text-sm">{roadInfo.intersection}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center space-x-3 p-2 bg-blue-50 rounded-lg">
                <Camera className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <div className="min-w-0">
                  <span className="text-xs font-medium text-gray-700 block mb-1">Total Images</span>
                  <p className="text-gray-900 font-medium text-sm">{images.length}</p>
                </div>
              </div>
              {camera.latitude && camera.longitude && (
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-3 border border-green-200">
                  <span className="text-xs font-medium text-gray-700 block mb-2">Coordinates</span>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Lat:</span>
                      <span className="font-mono text-gray-900">{camera.latitude}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Lng:</span>
                      <span className="font-mono text-gray-900">{camera.longitude}</span>
                    </div>
                  </div>
                  <a
                    href={getGoogleMapsUrl(camera.latitude, camera.longitude)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-1.5 px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 transition-colors mt-2"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>View on Maps</span>
                  </a>
                </div>
              )}

              {camera.description && camera.description.length > 100 && (
                <div className="bg-yellow-50 rounded-lg p-3">
                  <span className="text-xs font-medium text-gray-700 block mb-1">Note</span>
                  <p className="text-gray-900 text-xs">
                    This camera has detailed traffic information available
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Vehicle Count Chart */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold text-gray-900 flex items-center space-x-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            <span>Traffic Analytics (24 Hours)</span>
          </h4>
          <button
            onClick={fetchVehicleCountData}
            disabled={vehicleCountLoading}
            className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-sm flex items-center space-x-2"
          >
            <RefreshCw className={`w-4 h-4 ${vehicleCountLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {vehicleCountLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading traffic data...</p>
            </div>
          </div>
        ) : vehicleCountData && vehicleCountData.length > 0 ? (
          <VehicleCountChart
            data={vehicleCountData}
            title="Vehicle Count Over Time"
            height={400}
            showLegend={true}
            showGrid={true}
            aggregationInterval={aggregationInterval}
          />
        ) : (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">No traffic data available</p>
              <p className="text-sm text-gray-500">This camera may not have any vehicle detection data for the last 24 hours</p>
            </div>
          </div>
        )}
      </div>

      {/* Recent Images Preview */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900 dark:to-emerald-900 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
              <div className="p-2 bg-green-100 rounded-lg">
                <GalleryHorizontal className="w-5 h-5 text-green-600" />
              </div>
              <span>
                Recent Images
                {totalImageCount > 0 && (
                  <span className="text-sm font-normal text-gray-600 ml-2">
                    ({images.length} of {totalImageCount} • Page size: {imageFilters.limit})
                  </span>
                )}
              </span>
            </h3>
            <div className="flex items-center space-x-3">
              {/* Image Limit Selector */}
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Show:</span>
                <select
                  value={imageFilters.limit}
                  onChange={(e) => handleImageFilterChange('limit', parseInt(e.target.value))}
                  className="px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={totalImageCount > 0 ? totalImageCount : 1000}>View All</option>
                </select>
              </div>

              <button
                onClick={() => {
                  // Manual refresh button clicked
                  setImageFilters(prev => ({ ...prev, offset: 0 }))
                  fetchImages(true)
                }}
                disabled={imagesLoading}
                className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-sm flex items-center space-x-2"
              >
                <RefreshCw className={`w-4 h-4 ${imagesLoading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>
        </div>

        <div className="p-6">
          {imagesLoading && images.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-2"></div>
                <p className="text-gray-600">Loading images...</p>
              </div>
            </div>
          ) : images.length === 0 ? (
            <div className="text-center py-12">
              <GalleryHorizontal className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No images available</h3>
              <p className="text-gray-500 mb-4">This camera hasn't captured any images yet or they may have been cleared.</p>
              <button
                onClick={() => fetchImages(true)}
                disabled={imagesLoading}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                Try Again
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {images.map((image) => {
                  // Rendering ImageCard component

                  return (
                    <ImageCard
                      key={image.id}
                      image={image}
                      onView={(image) => {
                        // View button clicked
                        handleViewImage(image)
                      }}
                      onAnalyze={(image) => {
                        // Analyze button clicked
                        handleAnalyzeImage(image)
                      }}
                      onReanalyze={(image) => {
                        // Reanalyze button clicked
                        handleReanalyzeImage(image)
                      }}
                      onRetry={(image) => {
                        // Retry button clicked
                        handleRetryAnalysis(image)
                      }}
                      isAnalyzing={analyzingImages.has(image.id)}
                      showTrafficAnalysis={true}
                      showLatestBadge={false}
                      className=""
                    />
                  )
                })}
              </div>

              {/* Pagination Controls */}
              {imageFilters.limit < totalImageCount && (
                <div className="mt-6 flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    Showing {images.length} of {totalImageCount} images
                    {imageFilters.offset > 0 && (
                      <span className="ml-2">
                        (Page {Math.floor(imageFilters.offset / imageFilters.limit) + 1})
                      </span>
                    )}
                    {images.length >= totalImageCount && totalImageCount > 0 && (
                      <span className="ml-2 text-green-600 font-medium">
                        ✓ All images loaded
                        {imageFilters.limit >= totalImageCount && (
                          <span className="ml-1 text-xs">(View All mode)</span>
                        )}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    {/* Reset to Beginning Button */}
                    <button
                      onClick={resetImageGallery}
                      disabled={imagesLoading || imageFilters.offset === 0}
                      className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                      ← First
                    </button>

                    {/* Previous Page Button */}
                    <button
                      onClick={() => {
                        const newOffset = Math.max(0, imageFilters.offset - imageFilters.limit)
                        setImageFilters(prev => ({ ...prev, offset: newOffset }))
                        fetchImages(true)
                      }}
                      disabled={imagesLoading || imageFilters.offset === 0}
                      className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                      ← Previous
                    </button>

                    {/* Page Info */}
                    <span className="px-3 py-2 text-sm text-gray-600">
                      {Math.floor(imageFilters.offset / imageFilters.limit) + 1} of {Math.ceil(totalImageCount / imageFilters.limit)}
                    </span>

                    {/* Next Page Button */}
                    <button
                      onClick={loadMoreImages}
                      disabled={imagesLoading || loadingMoreImages || images.length < imageFilters.limit || (imageFilters.offset + imageFilters.limit) >= totalImageCount}
                      className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                      Next →
                    </button>

                    {/* Load More Button (Alternative to Next) */}
                    {images.length < totalImageCount && (
                      <button
                        onClick={loadMoreImages}
                        disabled={imagesLoading || loadingMoreImages || images.length < imageFilters.limit}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-sm"
                      >
                        {loadingMoreImages ? (
                          <span className="flex items-center space-x-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            <span>Loading...</span>
                          </span>
                        ) : (
                          'Load More'
                        )}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Loading More Indicator */}
              {loadingMoreImages && (
                <div className="mt-4 text-center">
                  <div className="inline-flex items-center space-x-2 text-sm text-gray-600">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                    <span>Loading more images...</span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Image Details Modal */}
      {showImageModal && selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-900">
                  Image Details - {selectedImage?.camera_name || `Camera ${selectedImage?.camera_id || 'Unknown'}`}
                </h3>
                <button
                  onClick={closeImageModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Debug Summary */}
                <div className="lg:col-span-2 mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="text-sm font-medium text-gray-700 mb-2">Debug Summary</div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                    <div>
                      <span className="font-medium">Image ID:</span> {selectedImage?.id}
                    </div>
                    <div>
                      <span className="font-medium">Status:</span> {selectedImage?.analysis_status}
                    </div>
                    <div>
                      <span className="font-medium">Vehicle Count:</span> {selectedImage?.vehicle_count || 'N/A'}
                    </div>
                    <div>
                      <span className="font-medium">Detection Data:</span> {vehicleDetectionData ? '✅ Available' : '❌ Not Available'}
                    </div>
                    {vehicleDetectionData && (
                      <>
                        <div>
                          <span className="font-medium">Total Boxes:</span> {vehicleDetectionData.bounding_boxes?.length || 0}
                        </div>
                        <div>
                          <span className="font-medium">Valid Boxes:</span> {vehicleDetectionData.bounding_boxes?.filter(box => box.is_valid !== 0).length || 0}
                        </div>
                        <div>
                          <span className="font-medium">Invalid Boxes:</span> {vehicleDetectionData.bounding_boxes?.filter(box => box.is_valid === 0).length || 0}
                        </div>
                        <div>
                          <span className="font-medium">Processing:</span> {vehicleDetectionData.processing_status || 'Unknown'}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Image Display */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Image</h4>
                  {selectedImage.local_path ? (
                    <div>
                      {vehicleDetectionData && vehicleDetectionData.bounding_boxes && Array.isArray(vehicleDetectionData.bounding_boxes) && vehicleDetectionData.bounding_boxes.length > 0 ? (
                        <>
                          {(() => {
                            const validBoxes = vehicleDetectionData.bounding_boxes.filter(box => box.is_valid !== 0);
                            const invalidBoxes = vehicleDetectionData.bounding_boxes.filter(box => box.is_valid === 0);

                            return (
                              <>
                                <div className="mb-2 p-2 bg-green-50 rounded text-xs border border-green-200">
                                  ✅ Found {vehicleDetectionData.bounding_boxes.length} bounding boxes
                                  {validBoxes.length > 0 && <span className="ml-2">({validBoxes.length} valid)</span>}
                                  {invalidBoxes.length > 0 && <span className="ml-2 text-yellow-700">({invalidBoxes.length} invalid)</span>}
                                </div>
                                {validBoxes.length > 0 ? (
                                  <BoundingBoxCanvas
                                    imageSrc={`/api/images/file/${selectedImage.local_path.split('/').pop()}`}
                                    boundingBoxes={validBoxes}
                                    className="w-full"
                                  />
                                ) : (
                                  <div className="mb-2 p-2 bg-yellow-50 rounded text-xs border border-yellow-200">
                                    ⚠️ All bounding boxes are invalid. This usually means the coordinate validation failed.
                                    <button
                                      onClick={() => handleFixBoundingBoxes(selectedImage)}
                                      className="ml-2 px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs hover:bg-yellow-200 transition-colors"
                                    >
                                      🔧 Fix Bounding Boxes
                                    </button>
                                  </div>
                                )}
                                {invalidBoxes.length > 0 && (
                                  <div className="mt-2 p-2 bg-red-50 rounded text-xs border border-red-200">
                                    <div className="font-medium mb-1">Invalid Bounding Boxes (Debug Info):</div>
                                    <div className="space-y-1">
                                      {invalidBoxes.slice(0, 3).map((box, index) => (
                                        <div key={index} className="text-xs">
                                          {box.vehicle_type}: [{box.x_min}, {box.y_min}, {box.x_max}, {box.y_max}]
                                        </div>
                                      ))}
                                      {invalidBoxes.length > 3 && <div>... and {invalidBoxes.length - 3} more</div>}
                                    </div>
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </>
                      ) : (
                        <>
                          <div className="mb-2 p-2 bg-yellow-50 rounded text-xs border border-yellow-200">
                            <div className="font-medium mb-1">Debug: Bounding Boxes Not Found</div>
                            <div className="space-y-1 text-xs">
                              <div><strong>Image Status:</strong> {selectedImage.analysis_status}</div>
                              <div><strong>Vehicle Count:</strong> {selectedImage.vehicle_count || 'N/A'}</div>
                              <div><strong>Vehicle Detection Data:</strong> {vehicleDetectionData ? 'Available' : 'Not Available'}</div>
                              {vehicleDetectionData && (
                                <div><strong>Data Keys:</strong> {Object.keys(vehicleDetectionData).join(', ')}</div>
                              )}
                              {vehicleDetectionData?.bounding_boxes && (
                                <div><strong>Bounding Boxes Type:</strong> {typeof vehicleDetectionData.bounding_boxes} - {Array.isArray(vehicleDetectionData.bounding_boxes) ? 'Array' : 'Not Array'}</div>
                              )}
                            </div>
                            <button
                              onClick={() => {
                                // Manual refresh of vehicle detection data
                                handleViewImage(selectedImage)
                              }}
                              className="mt-2 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200 transition-colors"
                            >
                              🔄 Refresh Vehicle Data
                            </button>
                          </div>
                          <img
                            src={`/api/images/file/${selectedImage.local_path.split('/').pop()}`}
                            alt={`Camera ${selectedImage.camera_id}`}
                            className="w-full rounded-lg border border-gray-200"
                            onError={(e) => {
                              console.error('Failed to load image:', e)
                              e.target.style.display = 'none'
                              e.target.nextSibling.style.display = 'block'
                            }}
                          />
                          <div className="hidden w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                            <div className="text-center">
                              <ImageIcon className="w-16 h-16 text-gray-400 mx-auto mb-2" />
                              <p className="text-gray-500">Failed to load image</p>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                      <ImageIcon className="w-16 h-16 text-gray-400" />
                    </div>
                  )}
                </div>

                {/* Image Information */}
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">Image Information</h4>
                    <div className="space-y-2 text-sm">
                      <p><span className="font-medium">Camera ID:</span> {selectedImage?.camera_id || 'N/A'}</p>
                      <p><span className="font-medium">Road:</span> {camera?.road_name || camera?.name || 'N/A'}</p>
                      <p><span className="font-medium">County:</span> {camera?.county || 'N/A'}</p>
                      <p><span className="font-medium">Captured:</span> {selectedImage?.created_at ? formatImageDate(selectedImage.created_at) : 'N/A'}</p>
                    </div>
                  </div>

                  {/* Vehicle Detection Results */}
                  {vehicleDetectionData && (
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-3">Gemini AI Analysis</h4>
                      {vehicleDetectionData.processing_status === 'completed' ? (
                        <div className="space-y-3">
                          <div className="bg-blue-50 p-4 rounded-lg">
                            <div className="text-2xl font-bold text-blue-600 mb-2">
                              {typeof vehicleDetectionData.total_vehicles === 'number' ? vehicleDetectionData.total_vehicles : 0} Total Vehicles
                            </div>
                            <div className="text-sm text-blue-700">
                              Confidence: {typeof vehicleDetectionData.confidence_score === 'number' ? (vehicleDetectionData.confidence_score * 100).toFixed(1) : 0}%
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="bg-white dark:bg-gray-700 p-3 rounded-lg border border-gray-200 dark:border-gray-600">
                              <div className="text-lg font-semibold text-gray-900 dark:text-white">{typeof vehicleDetectionData.cars === 'number' ? vehicleDetectionData.cars : 0}</div>
                              <div className="text-sm text-gray-600 dark:text-gray-300">Cars</div>
                            </div>
                            <div className="bg-white dark:bg-gray-700 p-3 rounded-lg border border-gray-200 dark:border-gray-600">
                              <div className="text-lg font-semibold text-gray-900 dark:text-white">{typeof vehicleDetectionData.trucks === 'number' ? vehicleDetectionData.trucks : 0}</div>
                              <div className="text-sm text-gray-600 dark:text-gray-300">Trucks</div>
                            </div>
                            <div className="bg-white dark:bg-gray-700 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                              <div className="text-lg font-semibold text-gray-900 dark:text-white">{typeof vehicleDetectionData.motorcycles === 'number' ? vehicleDetectionData.motorcycles : 0}</div>
                              <div className="text-sm text-gray-600 dark:text-gray-300">Motorcycles</div>
                            </div>
                            <div className="bg-white dark:bg-gray-700 p-3 rounded-lg border border-gray-200 dark:border-gray-600">
                              <div className="text-lg font-semibold text-gray-900 dark:text-white">{typeof vehicleDetectionData.buses === 'number' ? vehicleDetectionData.buses : 0}</div>
                              <div className="text-sm text-gray-600 dark:text-gray-300">Buses</div>
                            </div>
                          </div>

                          {vehicleDetectionData.gemini_response && (
                            <details className="mt-4">
                              <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                                View Raw AI Response
                              </summary>
                              <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-x-auto">
                                {vehicleDetectionData.gemini_response}
                              </pre>
                            </details>
                          )}
                        </div>
                      ) : vehicleDetectionData.processing_status === 'failed' ? (
                        <div className="bg-red-50 p-4 rounded-lg">
                          <div className="text-red-600 font-medium">Analysis Failed</div>
                          <div className="text-sm text-red-700 mt-1">
                            {vehicleDetectionData.gemini_response || 'Unknown error'}
                          </div>
                        </div>
                      ) : (
                        <div className="bg-yellow-50 p-4 rounded-lg">
                          <div className="text-yellow-600 font-medium">No Analysis Available</div>
                          <div className="text-sm text-yellow-700 mt-1">
                            This image hasn't been analyzed by Gemini AI yet.
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {!vehicleDetectionData && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="text-gray-600 font-medium">No AI Analysis Data</div>
                      <div className="text-sm text-gray-700 mt-1">
                        Vehicle detection data is not available for this image.
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CameraDetail

