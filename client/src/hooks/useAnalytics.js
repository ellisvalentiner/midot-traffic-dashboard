import {useCallback, useEffect, useState} from 'react'
import {analyticsService} from '../services'
import useApi from './useApi'

const useAnalytics = (options = {}) => {
  const {
    autoFetch = true,
    initialTimeRange = '24h',
    refreshInterval = null
  } = options

  // Dashboard stats state
  const dashboardStatsApi = useApi(null)
  const [dashboardStats, setDashboardStats] = useState(null)

  // Image stats state
  const imageStatsApi = useApi(null)
  const [imageStats, setImageStats] = useState(null)

  // Vehicle detection stats state
  const vehicleStatsApi = useApi(null)
  const [vehicleStats, setVehicleStats] = useState(null)

  // Traffic density analysis state
  const trafficDensityApi = useApi(null)
  const [trafficDensity, setTrafficDensity] = useState(null)

  // Hourly patterns state
  const hourlyPatternsApi = useApi(null)
  const [hourlyPatterns, setHourlyPatterns] = useState(null)

  // Daily trends state
  const dailyTrendsApi = useApi(null)
  const [dailyTrends, setDailyTrends] = useState(null)

  // Vehicle type distribution state
  const vehicleTypesApi = useApi(null)
  const [vehicleTypes, setVehicleTypes] = useState(null)

  // Confidence scores state
  const confidenceScoresApi = useApi(null)
  const [confidenceScores, setConfidenceScores] = useState(null)

  // Change detection state
  const changeDetectionApi = useApi(null)
  const [changeDetection, setChangeDetection] = useState(null)

  // Performance metrics state
  const performanceApi = useApi(null)
  const [performanceMetrics, setPerformanceMetrics] = useState(null)

  // Real-time analytics state
  const realtimeApi = useApi(null)
  const [realtimeData, setRealtimeData] = useState(null)

  // Vehicle counts by minute state
  const vehicleCountsApi = useApi(null)
  const [vehicleCounts, setVehicleCounts] = useState(null)

  // Aggregated vehicle counts state
  const aggregatedCountsApi = useApi(null)
  const [aggregatedCounts, setAggregatedCounts] = useState(null)

  // Current filters
  const [filters, setFilters] = useState({
    timeRange: initialTimeRange,
    cameraId: null,
    vehicleType: null,
    roadName: null,
    minConfidence: null,
    threshold: null,
    date: null,
    days: 7
  })

  // Export state
  const [exporting, setExporting] = useState(false)

  // Fetch dashboard statistics
  const fetchDashboardStats = useCallback(async (timeRange = filters.timeRange) => {
    await dashboardStatsApi.execute(
      () => analyticsService.getDashboardStats(timeRange),
      { resetState: true }
    )
  }, [dashboardStatsApi, filters.timeRange])

  // Fetch image statistics
  const fetchImageStats = useCallback(async (options = {}) => {
    const { hours = 168, cameraId = filters.cameraId } = options
    await imageStatsApi.execute(
      () => analyticsService.getImageStats({ hours, cameraId }),
      { resetState: true }
    )
  }, [imageStatsApi, filters.cameraId])

  // Fetch vehicle detection statistics
  const fetchVehicleStats = useCallback(async (options = {}) => {
    const { timeRange = filters.timeRange, cameraId = filters.cameraId, vehicleType = filters.vehicleType } = options
    await vehicleStatsApi.execute(
      () => analyticsService.getVehicleDetectionStats({ timeRange, cameraId, vehicleType }),
      { resetState: true }
    )
  }, [vehicleStatsApi, filters.timeRange, filters.cameraId, filters.vehicleType])

  // Fetch traffic density analysis
  const fetchTrafficDensity = useCallback(async (options = {}) => {
    const { timeRange = filters.timeRange, cameraId = filters.cameraId, roadName = filters.roadName } = options
    await trafficDensityApi.execute(
      () => analyticsService.getTrafficDensityAnalysis({ timeRange, cameraId, roadName }),
      { resetState: true }
    )
  }, [trafficDensityApi, filters.timeRange, filters.cameraId, filters.roadName])

  // Fetch hourly traffic patterns
  const fetchHourlyPatterns = useCallback(async (options = {}) => {
    const { date = filters.date, cameraId = filters.cameraId } = options
    await hourlyPatternsApi.execute(
      () => analyticsService.getHourlyTrafficPatterns({ date, cameraId }),
      { resetState: true }
    )
  }, [hourlyPatternsApi, filters.date, filters.cameraId])

  // Fetch daily traffic trends
  const fetchDailyTrends = useCallback(async (options = {}) => {
    const { days = filters.days, cameraId = filters.cameraId } = options
    await dailyTrendsApi.execute(
      () => analyticsService.getDailyTrafficTrends({ days, cameraId }),
      { resetState: true }
    )
  }, [dailyTrendsApi, filters.days, filters.cameraId])

  // Fetch vehicle type distribution
  const fetchVehicleTypes = useCallback(async (options = {}) => {
    const { timeRange = filters.timeRange, cameraId = filters.cameraId } = options
    await vehicleTypesApi.execute(
      () => analyticsService.getVehicleTypeDistribution({ timeRange, cameraId }),
      { resetState: true }
    )
  }, [vehicleTypesApi, filters.timeRange, filters.cameraId])

  // Fetch confidence score analysis
  const fetchConfidenceScores = useCallback(async (options = {}) => {
    const { timeRange = filters.timeRange, cameraId = filters.cameraId, minConfidence = filters.minConfidence } = options
    await confidenceScoresApi.execute(
      () => analyticsService.getConfidenceScoreAnalysis({ timeRange, cameraId, minConfidence }),
      { resetState: true }
    )
  }, [confidenceScoresApi, filters.timeRange, filters.cameraId, filters.minConfidence])

  // Fetch change detection analysis
  const fetchChangeDetection = useCallback(async (options = {}) => {
    const { timeRange = filters.timeRange, cameraId = filters.cameraId, threshold = filters.threshold } = options
    await changeDetectionApi.execute(
      () => analyticsService.getChangeDetectionAnalysis({ timeRange, cameraId, threshold }),
      { resetState: true }
    )
  }, [changeDetectionApi, filters.timeRange, filters.cameraId, filters.threshold])

  // Fetch performance metrics
  const fetchPerformanceMetrics = useCallback(async (options = {}) => {
    const { timeRange = filters.timeRange, cameraId = filters.cameraId } = options
    await performanceApi.execute(
      () => analyticsService.getPerformanceMetrics({ timeRange, cameraId }),
      { resetState: true }
    )
  }, [performanceApi, filters.timeRange, filters.cameraId])

  // Fetch real-time analytics
  const fetchRealtimeAnalytics = useCallback(async (options = {}) => {
    const { cameraId = filters.cameraId, updateInterval = 5000 } = options
    await realtimeApi.execute(
      () => analyticsService.getRealTimeAnalytics({ cameraId, updateInterval }),
      { resetState: true }
    )
  }, [realtimeApi, filters.cameraId])

  // Fetch vehicle counts by minute
  const fetchVehicleCountsByMinute = useCallback(async (options = {}) => {
    const { cameraId = filters.cameraId, hours = 24 } = options
    await vehicleCountsApi.execute(
      () => analyticsService.getVehicleCountsByMinute({ cameraId, hours }),
      { resetState: true }
    )
  }, [vehicleCountsApi, filters.cameraId])

  // Fetch aggregated vehicle counts
  const fetchAggregatedVehicleCounts = useCallback(async (options = {}) => {
    const { hours = 24 } = options
    await aggregatedCountsApi.execute(
      () => analyticsService.getAggregatedVehicleCounts({ hours }),
      { resetState: true }
    )
  }, [aggregatedCountsApi])

  // Fetch all analytics data
  const fetchAllAnalytics = useCallback(async (newFilters = {}) => {
    const updatedFilters = { ...filters, ...newFilters }
    setFilters(updatedFilters)

    // Fetch all analytics in parallel
    await Promise.all([
      fetchDashboardStats(updatedFilters.timeRange),
      fetchImageStats({ cameraId: updatedFilters.cameraId }),
      fetchVehicleStats({
        timeRange: updatedFilters.timeRange,
        cameraId: updatedFilters.cameraId,
        vehicleType: updatedFilters.vehicleType
      }),
      fetchTrafficDensity({
        timeRange: updatedFilters.timeRange,
        cameraId: updatedFilters.cameraId,
        roadName: updatedFilters.roadName
      }),
      fetchHourlyPatterns({
        date: updatedFilters.date,
        cameraId: updatedFilters.cameraId
      }),
      fetchDailyTrends({
        days: updatedFilters.days,
        cameraId: updatedFilters.cameraId
      }),
      fetchVehicleTypes({
        timeRange: updatedFilters.timeRange,
        cameraId: updatedFilters.cameraId
      }),
      fetchConfidenceScores({
        timeRange: updatedFilters.timeRange,
        cameraId: updatedFilters.cameraId,
        minConfidence: updatedFilters.minConfidence
      }),
      fetchChangeDetection({
        timeRange: updatedFilters.timeRange,
        cameraId: updatedFilters.cameraId,
        threshold: updatedFilters.threshold
      }),
      fetchPerformanceMetrics({
        timeRange: updatedFilters.timeRange,
        cameraId: updatedFilters.cameraId
      }),
      fetchVehicleCountsByMinute({
        cameraId: updatedFilters.cameraId,
        hours: 24
      }),
      fetchAggregatedVehicleCounts({ hours: 24 })
    ])
  }, [
    filters,
    fetchDashboardStats,
    fetchImageStats,
    fetchVehicleStats,
    fetchTrafficDensity,
    fetchHourlyPatterns,
    fetchDailyTrends,
    fetchVehicleTypes,
    fetchConfidenceScores,
    fetchChangeDetection,
    fetchPerformanceMetrics,
    fetchVehicleCountsByMinute,
    fetchAggregatedVehicleCounts
  ])

  // Export analytics data
  const exportAnalytics = useCallback(async (exportOptions = {}) => {
    setExporting(true)
    try {
      const result = await analyticsService.exportAnalyticsData({
        timeRange: filters.timeRange,
        cameraId: filters.cameraId,
        ...exportOptions
      })
      return result
    } finally {
      setExporting(false)
    }
  }, [filters.timeRange, filters.cameraId])

  // Update filters
  const updateFilters = useCallback((newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
  }, [])

  // Clear filters
  const clearFilters = useCallback(() => {
    setFilters({
      timeRange: initialTimeRange,
      cameraId: null,
      vehicleType: null,
      roadName: null,
      minConfidence: null,
      threshold: null,
      date: null,
      days: 7
    })
  }, [initialTimeRange])

  // Refresh all data
  const refreshAll = useCallback(async () => {
    await fetchAllAnalytics()
  }, [fetchAllAnalytics])

  // Update state when API data changes
  useEffect(() => {
    if (dashboardStatsApi.data) {
      setDashboardStats(dashboardStatsApi.data)
    }
  }, [dashboardStatsApi.data])

  useEffect(() => {
    if (imageStatsApi.data) {
      setImageStats(imageStatsApi.data)
    }
  }, [imageStatsApi.data])

  useEffect(() => {
    if (vehicleStatsApi.data) {
      setVehicleStats(vehicleStatsApi.data)
    }
  }, [vehicleStatsApi.data])

  useEffect(() => {
    if (trafficDensityApi.data) {
      setTrafficDensity(trafficDensityApi.data)
    }
  }, [trafficDensityApi.data])

  useEffect(() => {
    if (hourlyPatternsApi.data) {
      setHourlyPatterns(hourlyPatternsApi.data)
    }
  }, [hourlyPatternsApi.data])

  useEffect(() => {
    if (dailyTrendsApi.data) {
      setDailyTrends(dailyTrendsApi.data)
    }
  }, [dailyTrendsApi.data])

  useEffect(() => {
    if (vehicleTypesApi.data) {
      setVehicleTypes(vehicleTypesApi.data)
    }
  }, [vehicleTypesApi.data])

  useEffect(() => {
    if (confidenceScoresApi.data) {
      setConfidenceScores(confidenceScoresApi.data)
    }
  }, [confidenceScoresApi.data])

  useEffect(() => {
    if (changeDetectionApi.data) {
      setChangeDetection(changeDetectionApi.data)
    }
  }, [changeDetectionApi.data])

  useEffect(() => {
    if (performanceApi.data) {
      setPerformanceMetrics(performanceApi.data)
    }
  }, [performanceApi.data])

  useEffect(() => {
    if (realtimeApi.data) {
      setRealtimeData(realtimeApi.data)
    }
  }, [realtimeApi.data])

  useEffect(() => {
    if (vehicleCountsApi.data) {
      setVehicleCounts(vehicleCountsApi.data)
    }
  }, [vehicleCountsApi.data])

  useEffect(() => {
    if (aggregatedCountsApi.data) {
      setAggregatedCounts(aggregatedCountsApi.data)
    }
  }, [aggregatedCountsApi.data])

  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetch) {
      fetchAllAnalytics()
    }
  }, [autoFetch, fetchAllAnalytics])

  // Set up refresh interval
  useEffect(() => {
    if (refreshInterval) {
      const interval = setInterval(() => {
        refreshAll()
      }, refreshInterval)

      return () => clearInterval(interval)
    }
  }, [refreshInterval, refreshAll])

  return {
    // State
    dashboardStats,
    imageStats,
    vehicleStats,
    trafficDensity,
    hourlyPatterns,
    dailyTrends,
    vehicleTypes,
    confidenceScores,
    changeDetection,
    performanceMetrics,
    realtimeData,
    vehicleCounts,
    aggregatedCounts,
    filters,
    exporting,

    // API state
    dashboardLoading: dashboardStatsApi.loading,
    dashboardError: dashboardStatsApi.error,
    imageStatsLoading: imageStatsApi.loading,
    imageStatsError: imageStatsApi.error,
    vehicleStatsLoading: vehicleStatsApi.loading,
    vehicleStatsError: vehicleStatsApi.error,
    trafficDensityLoading: trafficDensityApi.loading,
    hourlyPatternsLoading: hourlyPatternsApi.loading,
    dailyTrendsLoading: dailyTrendsApi.loading,
    vehicleTypesLoading: vehicleTypesApi.loading,
    confidenceScoresLoading: confidenceScoresApi.loading,
    changeDetectionLoading: changeDetectionApi.loading,
    performanceLoading: performanceApi.loading,
    realtimeLoading: realtimeApi.loading,
    vehicleCountsLoading: vehicleCountsApi.loading,
    aggregatedCountsLoading: aggregatedCountsApi.loading,

    // Actions
    fetchDashboardStats,
    fetchImageStats,
    fetchVehicleStats,
    fetchTrafficDensity,
    fetchHourlyPatterns,
    fetchDailyTrends,
    fetchVehicleTypes,
    fetchConfidenceScores,
    fetchChangeDetection,
    fetchPerformanceMetrics,
    fetchRealtimeAnalytics,
    fetchVehicleCountsByMinute,
    fetchAggregatedVehicleCounts,
    fetchAllAnalytics,
    exportAnalytics,
    refreshAll,

    // Filtering
    updateFilters,
    clearFilters,

    // Utility
    hasData: dashboardStats || imageStats || vehicleStats || vehicleCounts || aggregatedCounts,
    isLoading: dashboardStatsApi.loading || imageStatsApi.loading || vehicleStatsApi.loading || vehicleCountsLoading || aggregatedCountsLoading,
    hasError: dashboardStatsApi.error || imageStatsApi.error || vehicleStatsApi.error || vehicleCountsApi.error || aggregatedCountsApi.error
  }
}

export default useAnalytics
