import {useCallback, useEffect, useState} from 'react'
import {cameraService} from '../services'
import useApi from './useApi'

const useCameras = (options = {}) => {
  const {
    autoFetch = true,
    initialTimeRange = '24h',
    refreshInterval = null
  } = options

  // Camera list state
  const camerasApi = useApi([])
  const [cameras, setCameras] = useState([])
  const [filteredCameras, setFilteredCameras] = useState([])
  const [filters, setFilters] = useState({
    enabled: null,
    aiAnalysisEnabled: null,
    county: '',
    roadName: '',
    search: ''
  })

  // Camera stats state
  const statsApi = useApi(null)
  const [stats, setStats] = useState(null)

  // Selected cameras for batch operations
  const [selectedCameras, setSelectedCameras] = useState(new Set())

  // Fetch all cameras
  const fetchCameras = useCallback(async (resetState = false) => {
    await camerasApi.execute(
      () => cameraService.getAllCameras(),
      { resetState }
    )
  }, [camerasApi])

  // Fetch camera statistics
  const fetchStats = useCallback(async (timeRange = initialTimeRange) => {
    await statsApi.execute(
      () => cameraService.getCameraStats(timeRange),
      { resetState: true }
    )
  }, [statsApi, initialTimeRange])

  // Get camera by ID
  const getCameraById = useCallback(async (cameraId) => {
    const result = await cameraService.getCameraById(cameraId)
    if (result.success) {
      return result.data
    }
    throw new Error(result.error)
  }, [])

  // Toggle camera enabled status
  const toggleCameraStatus = useCallback(async (cameraId, enabled) => {
    const result = await cameraService.toggleCameraStatus(cameraId, enabled)
    if (result.success) {
      // Update local state
      setCameras(prev =>
        prev.map(camera =>
          camera.camera_id === cameraId
            ? { ...camera, enabled }
            : camera
        )
      )
      return result
    }
    throw new Error(result.error)
  }, [])

  // Toggle AI analysis for camera
  const toggleAIAnalysis = useCallback(async (cameraId, aiAnalysisEnabled) => {
    const result = await cameraService.toggleAIAnalysis(cameraId, aiAnalysisEnabled)
    if (result.success) {
      // Update local state
      setCameras(prev =>
        prev.map(camera =>
          camera.camera_id === cameraId
            ? { ...camera, ai_analysis_enabled: aiAnalysisEnabled }
            : camera
        )
      )
      return result
    }
    throw new Error(result.error)
  }, [])

  // Refresh cameras from external source
  const refreshCameras = useCallback(async () => {
    const result = await cameraService.refreshCameras()
    if (result.success) {
      // Refetch cameras after refresh
      await fetchCameras(true)
      return result
    }
    throw new Error(result.error)
  }, [fetchCameras])

  // Update camera details
  const updateCamera = useCallback(async (cameraId, updates) => {
    const result = await cameraService.updateCamera(cameraId, updates)
    if (result.success) {
      // Update local state
      setCameras(prev =>
        prev.map(camera =>
          camera.camera_id === cameraId
            ? { ...camera, ...updates }
            : camera
        )
      )
      return result
    }
    throw new Error(result.error)
  }, [])

  // Delete camera
  const deleteCamera = useCallback(async (cameraId) => {
    const result = await cameraService.deleteCamera(cameraId)
    if (result.success) {
      // Remove from local state
      setCameras(prev => prev.filter(camera => camera.camera_id !== cameraId))
      setSelectedCameras(prev => {
        const newSet = new Set(prev)
        newSet.delete(cameraId)
        return newSet
      })
      return result
    }
    throw new Error(result.error)
  }, [])

  // Batch toggle camera status
  const batchToggleStatus = useCallback(async (enabled) => {
    const cameraIds = Array.from(selectedCameras)
    if (cameraIds.length === 0) return

    const result = await cameraService.batchToggleStatus(cameraIds, enabled)
    if (result.success) {
      // Update local state
      setCameras(prev =>
        prev.map(camera =>
          selectedCameras.has(camera.camera_id)
            ? { ...camera, enabled }
            : camera
        )
      )
      return result
    }
    throw new Error(result.error)
  }, [selectedCameras])

  // Batch toggle AI analysis
  const batchToggleAI = useCallback(async (aiAnalysisEnabled) => {
    const cameraIds = Array.from(selectedCameras)
    if (cameraIds.length === 0) return

    const result = await cameraService.batchToggleAI(cameraIds, aiAnalysisEnabled)
    if (result.success) {
      // Update local state
      setCameras(prev =>
        prev.map(camera =>
          selectedCameras.has(camera.camera_id)
            ? { ...camera, ai_analysis_enabled: aiAnalysisEnabled }
            : camera
        )
      )
      return result
    }
    throw new Error(result.error)
  }, [selectedCameras])

  // Filter cameras
  const filterCameras = useCallback((newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
  }, [])

  // Clear filters
  const clearFilters = useCallback(() => {
    setFilters({
      enabled: null,
      aiAnalysisEnabled: null,
      county: '',
      roadName: '',
      search: ''
    })
  }, [])

  // Select/deselect camera
  const toggleCameraSelection = useCallback((cameraId) => {
    setSelectedCameras(prev => {
      const newSet = new Set(prev)
      if (newSet.has(cameraId)) {
        newSet.delete(cameraId)
      } else {
        newSet.add(cameraId)
      }
      return newSet
    })
  }, [])

  // Select all cameras
  const selectAllCameras = useCallback(() => {
    setSelectedCameras(new Set(cameras.map(camera => camera.camera_id)))
  }, [cameras])

  // Deselect all cameras
  const deselectAllCameras = useCallback(() => {
    setSelectedCameras(new Set())
  }, [])

  // Get camera images
  const getCameraImages = useCallback(async (cameraId, imageOptions = {}) => {
    const result = await cameraService.getCameraImages(cameraId, imageOptions)
    if (result.success) {
      return result
    }
    throw new Error(result.error)
  }, [])

  // Get camera analytics
  const getCameraAnalytics = useCallback(async (cameraId, timeRange = '168h') => {
    const result = await cameraService.getCameraAnalytics(cameraId, timeRange)
    if (result.success) {
      return result
    }
    throw new Error(result.error)
  }, [])

  // Apply filters to cameras
  useEffect(() => {
    let filtered = cameras

    // Filter by enabled status
    if (filters.enabled !== null) {
      filtered = filtered.filter(camera => camera.enabled === filters.enabled)
    }

    // Filter by AI analysis status
    if (filters.aiAnalysisEnabled !== null) {
      filtered = filtered.filter(camera => camera.ai_analysis_enabled === filters.aiAnalysisEnabled)
    }

    // Filter by county
    if (filters.county) {
      filtered = filtered.filter(camera =>
        camera.county?.toLowerCase().includes(filters.county.toLowerCase())
      )
    }

    // Filter by road name
    if (filters.roadName) {
      filtered = filtered.filter(camera =>
        camera.road_name?.toLowerCase().includes(filters.roadName.toLowerCase())
      )
    }

    // Filter by search term
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase()
      filtered = filtered.filter(camera =>
        camera.name?.toLowerCase().includes(searchTerm) ||
        camera.road_name?.toLowerCase().includes(searchTerm) ||
        camera.county?.toLowerCase().includes(searchTerm) ||
        camera.camera_id?.toString().includes(searchTerm)
      )
    }

    setFilteredCameras(filtered)
  }, [cameras, filters])

  // Update cameras when API data changes
  useEffect(() => {
    if (camerasApi.data) {
      setCameras(camerasApi.data)
    }
  }, [camerasApi.data])

  // Update stats when API data changes
  useEffect(() => {
    if (statsApi.data) {
      setStats(statsApi.data)
    }
  }, [statsApi.data])

  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetch) {
      fetchCameras()
      fetchStats()
    }
  }, [autoFetch, fetchCameras, fetchStats])

  // Set up refresh interval
  useEffect(() => {
    if (refreshInterval) {
      const interval = setInterval(() => {
        fetchCameras()
        fetchStats()
      }, refreshInterval)

      return () => clearInterval(interval)
    }
  }, [refreshInterval, fetchCameras, fetchStats])

  return {
    // State
    cameras,
    filteredCameras,
    stats,
    filters,
    selectedCameras,

    // API state
    loading: camerasApi.loading,
    error: camerasApi.error,
    success: camerasApi.success,
    statsLoading: statsApi.loading,
    statsError: statsApi.error,

    // Actions
    fetchCameras,
    fetchStats,
    getCameraById,
    toggleCameraStatus,
    toggleAIAnalysis,
    refreshCameras,
    updateCamera,
    deleteCamera,
    batchToggleStatus,
    batchToggleAI,
    getCameraImages,
    getCameraAnalytics,

    // Filtering
    filterCameras,
    clearFilters,

    // Selection
    toggleCameraSelection,
    selectAllCameras,
    deselectAllCameras,

    // Utility
    selectedCount: selectedCameras.size,
    hasSelection: selectedCameras.size > 0,
    isAllSelected: selectedCameras.size === cameras.length && cameras.length > 0,
    isPartiallySelected: selectedCameras.size > 0 && selectedCameras.size < cameras.length
  }
}

export default useCameras
