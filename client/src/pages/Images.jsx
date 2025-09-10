import React, {useEffect, useState} from 'react'
import {BarChart3, Car, Filter, GitCompare, Image as ImageIcon, Trash2, TrendingUp} from 'lucide-react'
import axios from 'axios'
import {format} from 'date-fns'
import {parseSQLiteDate} from '../utils/dateUtils'
import {useToast} from '../contexts/ToastContext'
import ImageCard from '../components/ImageCard'
import BoundingBoxCanvas from '../components/BoundingBoxCanvas'
import AutoRefreshIndicator from '../components/ui/AutoRefreshIndicator'
import InlineConfirm from '../components/ui/InlineConfirm'

const Images = () => {
  const { showSuccess, showError, showWarning } = useToast()
  const [images, setImages] = useState([])
  const [cameras, setCameras] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [selectedImage, setSelectedImage] = useState(null)
  const [showImageModal, setShowImageModal] = useState(false)
  const [vehicleDetectionData, setVehicleDetectionData] = useState(null)
  const [selectedImages, setSelectedImages] = useState([])
  const [showComparison, setShowComparison] = useState(false)
  const [trafficAnalysis, setTrafficAnalysis] = useState(null)
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 })

  // Simplified essential filters
  const [filters, setFilters] = useState({
    camera_id: '',
    showLatestOnly: false,
    date_from: '',
    date_to: ''
  })

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0
  })

  useEffect(() => {
    fetchData()
  }, [filters, pagination.page])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [statsRes, imagesRes, camerasRes] = await Promise.all([
        axios.get('/api/images/stats/summary'),
        axios.get(`/api/images/recent?limit=${pagination.limit}&offset=${(pagination.page - 1) * pagination.limit}`),
        axios.get('/api/cameras')
      ])

      setStats(statsRes.data.data)
      setImages(imagesRes.data.data)
      setCameras(camerasRes.data.data)
      setPagination(prev => ({ ...prev, total: imagesRes.data.count || 0 }))
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const clearFilters = () => {
    setFilters({
      camera_id: '',
      showLatestOnly: false,
      date_from: '',
      date_to: ''
    })
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const handleDeleteAllImages = async () => {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true)
      return
    }

    try {
      setDeleting(true)
      const response = await axios.delete('/api/images/all')

      if (response.data.success) {
        await fetchData()
        showSuccess(`Successfully deleted ${response.data.data.deleted_records} images`)
      }
    } catch (error) {
      console.error('Error deleting all images:', error)
      showError('Failed to delete images: ' + (error.response?.data?.error || error.message))
    } finally {
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  const handleViewImage = async (image) => {
    try {
      const response = await axios.get(`/api/images/${image.id}/vehicle-detection`)
      setVehicleDetectionData(response.data.data)
      // Determine if this is the latest image
      const imageIndex = images.findIndex(img => img.id === image.id)
      const isLatest = imageIndex === 0
      setSelectedImage({ ...image, isLatest })
      setShowImageModal(true)
      setImageDimensions({ width: 0, height: 0 })
    } catch (error) {
      console.error('Error fetching vehicle detection data:', error)
      setVehicleDetectionData(null)
      // Determine if this is the latest image
      const imageIndex = images.findIndex(img => img.id === image.id)
      const isLatest = imageIndex === 0
      setSelectedImage({ ...image, isLatest })
      setShowImageModal(true)
      setImageDimensions({ width: 0, height: 0 })
    }
  }

  const closeImageModal = () => {
    setShowImageModal(false)
    setSelectedImage(null)
    setVehicleDetectionData(null)
    setImageDimensions({ width: 0, height: 0 })
  }

  const handleDownloadImage = (image) => {
    const imageUrl = image.local_path ? `/api/images/file/${image.local_path.split('/').pop()}` : null
    if (imageUrl) {
      const link = document.createElement('a')
      link.href = imageUrl
      link.download = `camera_${image.camera_id}_${format(new Date(image.created_at), 'yyyy-MM-dd_HH-mm')}.jpg`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  const handleImageSelection = (imageId) => {
    setSelectedImages(prev =>
      prev.includes(imageId)
        ? prev.filter(id => id !== imageId)
        : [...prev, imageId]
    )
  }

  const handleComparison = async () => {
    if (selectedImages.length < 2) {
      showWarning('Please select at least 2 images to compare')
      return
    }

    setAnalysisLoading(true)
    try {
      // Fetch vehicle detection data for selected images
      const comparisonData = await Promise.all(
        selectedImages.map(async (imageId) => {
          try {
            const response = await axios.get(`/api/images/${imageId}/vehicle-detection`)
            return response.data.data
          } catch (error) {
            return { image_id: imageId, error: 'Failed to fetch data' }
          }
        })
      )

      // Analyze traffic patterns
      const analysis = analyzeTrafficPatterns(comparisonData)
      setTrafficAnalysis(analysis)
      setShowComparison(true)
    } catch (error) {
      console.error('Error analyzing traffic patterns:', error)
      showError('Failed to analyze traffic patterns')
    } finally {
      setAnalysisLoading(false)
    }
  }

  // Handle image analysis actions
  const handleAnalyzeImage = async (image) => {
    try {
      setIsAnalyzing(true)
      const response = await axios.post(`/api/images/${image.id}/analyze`)

      if (response.data.success) {
        // Refresh the data to show updated status
        await fetchData()
        showSuccess('Image queued for analysis')
      }
    } catch (error) {
      console.error('Error analyzing image:', error)
              showError(error.response?.data?.error || 'Failed to analyze image')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleRetryAnalysis = async (image) => {
    try {
      setIsAnalyzing(true)
      const response = await axios.post(`/api/images/${image.id}/analyze`)

      if (response.data.success) {
        // Refresh the data to show updated status
        await fetchData()
        showSuccess('Image queued for retry analysis')
      }
    } catch (error) {
      console.error('Error retrying analysis:', error)
              showError(error.response?.data?.error || 'Failed to retry analysis')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleReanalyzeImage = async (image) => {
    try {
      setIsAnalyzing(true)
      const response = await axios.post(`/api/images/${image.id}/analyze`)

      if (response.data.success) {
        // Refresh the data to show updated status
        await fetchData()
        showSuccess('Image queued for reanalysis')
      }
    } catch (error) {
      console.error('Error reanalyzing image:', error)
              showError(error.response?.data?.error || 'Failed to reanalyze image')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const analyzeTrafficPatterns = (data) => {
    const validData = data.filter(item => !item.error)

    if (validData.length === 0) return null

    const totalVehicles = validData.reduce((sum, item) => sum + (item.total_vehicles || 0), 0)
    const avgVehicles = totalVehicles / validData.length
    const vehicleTypes = {
      cars: validData.reduce((sum, item) => sum + (item.cars || 0), 0),
      trucks: validData.reduce((sum, item) => sum + (item.trucks || 0), 0),
      motorcycles: validData.reduce((sum, item) => sum + (item.motorcycles || 0), 0),
      buses: validData.reduce((sum, item) => sum + (item.buses || 0), 0)
    }

    // Traffic pattern analysis
    const patterns = {
      density: avgVehicles > 15 ? 'High' : avgVehicles > 8 ? 'Medium' : 'Low',
      consistency: validData.length > 1 ? 'Variable' : 'Single Sample',
      peak_hours: validData.some(item => {
        const hour = new Date(item.processed_at).getHours()
        return hour >= 7 && hour <= 9 || hour >= 16 && hour <= 18
      }) ? 'Peak Hours' : 'Off-Peak',
      vehicle_mix: vehicleTypes.trucks > vehicleTypes.cars * 0.3 ? 'Commercial Heavy' : 'Passenger Heavy'
    }

    return {
      summary: {
        total_images: validData.length,
        total_vehicles,
        avg_vehicles: avgVehicles.toFixed(1),
        vehicle_types: vehicleTypes
      },
      patterns,
      recommendations: generateTrafficRecommendations(patterns, avgVehicles, vehicleTypes)
    }
  }

  const generateTrafficRecommendations = (patterns, avgVehicles, vehicleTypes) => {
    const recommendations = []

    if (patterns.density === 'High') {
      recommendations.push('High traffic density detected - consider congestion monitoring')
    }
    if (patterns.peak_hours === 'Peak Hours') {
      recommendations.push('Traffic captured during peak hours - valuable for commute analysis')
    }
    if (vehicleTypes.trucks > vehicleTypes.cars * 0.2) {
      recommendations.push('Significant commercial traffic - monitor freight patterns')
    }
    if (avgVehicles < 5) {
      recommendations.push('Low traffic volume - verify camera positioning and timing')
    }

    return recommendations.length > 0 ? recommendations : ['Traffic patterns appear normal']
  }

  const getImageUrl = (localPath) => {
    if (!localPath) return null
    const filename = localPath.split('/').pop()
    return `/api/images/file/${filename}`
  }

  const formatDate = (dateString) => {
    try {
      // Use our SQLite-aware date parser for consistent timezone handling
      const parsedDate = parseSQLiteDate(dateString)
      return format(parsedDate, 'MMM dd, yyyy h:mm a')
    } catch (error) {
      return 'Invalid Date'
    }
  }

  const handleImageLoad = (event) => {
    const { naturalWidth, naturalHeight } = event.target
    setImageDimensions({ width: naturalWidth, height: naturalHeight })
  }

  const handleImageClick = (image) => {
    setSelectedImage(image)
    setShowImageModal(true)
    setVehicleDetectionData(null)
    setImageDimensions({ width: 0, height: 0 })
  }


  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Header with Traffic Analysis Tools */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Traffic Analysis Center</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">Analyze traffic patterns, compare images, and identify trends</p>
          </div>
          <div className="flex flex-col space-y-3">
            <AutoRefreshIndicator
              interval={30000}
              onRefresh={fetchData}
              lastUpdate={new Date()}
              isRefreshing={loading}
              className="justify-end"
            />
            <div className="flex space-x-3">
            {selectedImages.length >= 2 && (
              <button
                onClick={handleComparison}
                disabled={analysisLoading}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium flex items-center disabled:opacity-50"
              >
                <GitCompare className="w-4 h-4 mr-2" />
                {analysisLoading ? 'Analyzing...' : `Compare ${selectedImages.length} Images`}
              </button>
            )}
            {showDeleteConfirm ? (
              <InlineConfirm
                onConfirm={handleDeleteAllImages}
                onCancel={() => setShowDeleteConfirm(false)}
                message="Delete all images? This action cannot be undone."
                confirmText="Delete All"
                cancelText="Cancel"
                type="danger"
              />
            ) : (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete All Images
              </button>
            )}
            </div>
          </div>
        </div>

        {/* Traffic Statistics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 dark:bg-blue-900 p-4 rounded-lg border border-blue-200 dark:border-blue-700">
            <div className="flex items-center space-x-3">
              <ImageIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              <div>
                <p className="text-sm font-medium text-blue-800 dark:text-blue-200">Total Images</p>
                <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{stats?.total_images || 0}</p>
              </div>
            </div>
          </div>
          <div className="bg-green-50 dark:bg-green-900 p-4 rounded-lg border border-green-200 dark:border-green-700">
            <div className="flex items-center space-x-3">
              <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
              <div>
                <p className="text-sm font-medium text-green-800 dark:text-green-200">Total Images</p>
                <p className="text-2xl font-bold text-green-900 dark:text-green-100">{stats?.total_images || 0}</p>
              </div>
            </div>
          </div>
          <div className="bg-purple-50 dark:bg-purple-900 p-4 rounded-lg border border-purple-200 dark:border-purple-700">
            <div className="flex items-center space-x-3">
              <Car className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              <div>
                <p className="text-sm font-medium text-purple-800 dark:text-purple-200">Vehicles Detected</p>
                <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">{stats?.total_vehicles || 0}</p>
              </div>
            </div>
          </div>
          <div className="bg-amber-50 dark:bg-amber-900 p-4 rounded-lg border border-amber-200 dark:border-amber-700">
            <div className="flex items-center space-x-3">
              <BarChart3 className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              <div>
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Analysis Quality</p>
                <p className="text-2xl font-bold text-amber-900 dark:text-amber-100">{stats?.avg_confidence ? (stats.avg_confidence * 100).toFixed(0) : 0}%</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Simplified Essential Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
            <Filter className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <span>Filters</span>
          </h3>
          <button
            onClick={clearFilters}
            className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 font-medium hover:underline"
          >
            Clear Filters
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Camera Filter */}
          <div>
            <label className="form-label">Camera</label>
            <select
              value={filters.camera_id}
              onChange={(e) => handleFilterChange('camera_id', e.target.value)}
              className="form-select"
            >
              <option value="">All Cameras</option>
              {cameras.map((camera) => (
                <option key={camera.camera_id} value={camera.camera_id}>
                  {camera.name || `Camera ${camera.camera_id}`}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range Filters */}
          <div>
            <label className="form-label">From Date</label>
            <input
              type="date"
              value={filters.date_from}
              onChange={(e) => handleFilterChange('date_from', e.target.value)}
              className="form-select"
            />
          </div>

          <div>
            <label className="form-label">To Date</label>
            <input
              type="date"
              value={filters.date_to}
              onChange={(e) => handleFilterChange('date_to', e.target.value)}
              className="form-select"
            />
          </div>







                  {/* Latest Images Filter */}
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="showLatestOnly"
            checked={filters.showLatestOnly}
            onChange={(e) => handleFilterChange('showLatestOnly', e.target.checked)}
            className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
          />
          <label htmlFor="showLatestOnly" className="form-label">Show Latest Images Only</label>
        </div>
        </div>
      </div>

      {/* Traffic Comparison Analysis Modal */}
      {showComparison && trafficAnalysis && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Traffic Pattern Analysis</h3>
                <button
                  onClick={() => setShowComparison(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Analysis Summary */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900 dark:text-white">Analysis Summary</h4>
                  <div className="bg-blue-50 dark:bg-blue-900 p-4 rounded-lg border border-blue-200 dark:border-blue-700">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="font-medium text-blue-800 dark:text-blue-200">Images Analyzed</p>
                        <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{trafficAnalysis.summary.total_images}</p>
                      </div>
                      <div>
                        <p className="font-medium text-blue-800 dark:text-blue-200">Total Vehicles</p>
                        <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{trafficAnalysis.summary.total_vehicles}</p>
                      </div>
                      <div>
                        <p className="font-medium text-blue-800 dark:text-blue-200">Average per Image</p>
                        <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{trafficAnalysis.summary.avg_vehicles}</p>
                      </div>
                      <div>
                        <p className="font-medium text-blue-800 dark:text-blue-200">Traffic Density</p>
                        <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{trafficAnalysis.patterns.density}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Vehicle Type Breakdown */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900 dark:text-white">Vehicle Composition</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <span className="font-medium dark:text-gray-300">Cars</span>
                      <span className="text-lg font-bold text-gray-900 dark:text-white">{trafficAnalysis.summary.vehicle_types.cars}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <span className="font-medium dark:text-gray-300">Trucks</span>
                      <span className="text-lg font-bold text-gray-900 dark:text-white">{trafficAnalysis.summary.vehicle_types.trucks}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <span className="font-medium dark:text-gray-300">Motorcycles</span>
                      <span className="text-lg font-bold text-gray-900 dark:text-white">{trafficAnalysis.summary.vehicle_types.motorcycles}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <span className="font-medium dark:text-gray-300">Buses</span>
                      <span className="text-lg font-bold text-gray-900 dark:text-white">{trafficAnalysis.summary.vehicle_types.buses}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Traffic Patterns */}
              <div className="mt-6">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Traffic Patterns</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-green-50 dark:bg-green-900 p-4 rounded-lg border border-green-200 dark:border-green-700 text-center">
                    <p className="text-sm font-medium text-green-800 dark:text-green-200">Density</p>
                    <p className="text-xl font-bold text-green-900 dark:text-green-100">{trafficAnalysis.patterns.density}</p>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-900 p-4 rounded-lg border border-blue-200 dark:border-blue-700 text-center">
                    <p className="text-sm font-medium text-blue-800 dark:text-blue-200">Consistency</p>
                    <p className="text-xl font-bold text-blue-900 dark:text-blue-100">{trafficAnalysis.patterns.consistency}</p>
                  </div>
                  <div className="bg-purple-50 dark:bg-purple-900 p-4 rounded-lg border border-purple-200 dark:border-purple-700 text-center">
                    <p className="text-sm font-medium text-purple-800 dark:text-purple-200">Timing</p>
                    <p className="text-xl font-bold text-purple-900 dark:text-purple-100">{trafficAnalysis.patterns.peak_hours}</p>
                  </div>
                  <div className="bg-amber-50 dark:bg-amber-900 p-4 rounded-lg border border-amber-200 dark:border-amber-700 text-center">
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Vehicle Mix</p>
                    <p className="text-xl font-bold text-amber-900 dark:text-amber-100">{trafficAnalysis.patterns.vehicle_mix}</p>
                  </div>
                </div>
              </div>

              {/* Recommendations */}
              <div className="mt-6">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Traffic Insights & Recommendations</h4>
                <div className="bg-amber-50 dark:bg-amber-900 p-4 rounded-lg border border-amber-200 dark:border-amber-700">
                  <ul className="space-y-2">
                    {trafficAnalysis.recommendations.map((rec, index) => (
                      <li key={index} className="flex items-start space-x-2 text-sm">
                        <span className="text-amber-600 dark:text-amber-400">💡</span>
                        <span className="text-amber-800 dark:text-amber-200">{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Images Grid with Traffic Analysis */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900 dark:to-emerald-900 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
              <ImageIcon className="w-5 h-5 text-green-600" />
              <span>Traffic Images</span>
            </h3>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <span>{images.length} of {pagination.total} images</span>
              {selectedImages.length > 0 && (
                <span className="bg-primary-100 text-primary-800 px-2 py-1 rounded-full">
                  {selectedImages.length} selected
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="p-6">
          {images.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <ImageIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No traffic images found</h3>
              <p className="text-sm text-gray-600">Try adjusting your filters or refresh the data</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                              {images.map((image, index) => {
                  const isSelected = selectedImages.includes(image.id)
                  const isLatest = index === 0

                  return (
                    <ImageCard
                      key={image.id}
                      image={image}
                      isLatest={isLatest}
                      showSelection={true}
                      isSelected={isSelected}
                      onSelectionChange={handleImageSelection}
                      onView={handleViewImage}
                      onDownload={handleDownloadImage}
                      onAnalyze={handleAnalyzeImage}
                      onRetry={handleRetryAnalysis}
                      onReanalyze={handleReanalyzeImage}
                      showTrafficAnalysis={true}
                      showLatestBadge={true}
                      showChangeBadge={false}
                      className={isSelected ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'}
                    />
                  )
                })}
            </div>
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
                  Image Details - {selectedImage.camera_name || `Camera ${selectedImage.camera_id}`}
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
                {/* Image Display */}
                <div>
                  {/* <h4 className="font-semibold text-gray-900 mb-3">Image</h4> */}
                  {getImageUrl(selectedImage.local_path) ? (
                    <div>
                      {vehicleDetectionData && vehicleDetectionData.bounding_boxes && vehicleDetectionData.bounding_boxes.length > 0 ? (
                        <BoundingBoxCanvas
                          imageSrc={getImageUrl(selectedImage.local_path)}
                          boundingBoxes={vehicleDetectionData.bounding_boxes}
                          imageWidth={imageDimensions.width}
                          imageHeight={imageDimensions.height}
                          className="w-full"
                        />
                      ) : (
                        <img
                          src={getImageUrl(selectedImage.local_path)}
                          alt={`Camera ${selectedImage.camera_id}`}
                          className="w-full rounded-lg border border-gray-200"
                          onLoad={handleImageLoad}
                        />
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
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Image Information</h4>
                    <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                      <p><span className="font-medium">Camera ID:</span> {selectedImage.camera_id}</p>
                      <p><span className="font-medium">Road:</span> {selectedImage.road_name || 'N/A'}</p>
                      <p><span className="font-medium">County:</span> {selectedImage.county || 'N/A'}</p>
                      <p><span className="font-medium">Captured:</span> {formatDate(selectedImage.created_at)}</p>
                    </div>
                  </div>

                  {/* Vehicle Detection Results */}
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Gemini AI Analysis</h4>
                    {vehicleDetectionData && vehicleDetectionData.processing_status === 'completed' ? (
                      <div className="space-y-3">
                        <div className="bg-blue-50 p-4 rounded-lg">
                          <div className="text-2xl font-bold text-blue-600 mb-2">
                            {vehicleDetectionData.total_vehicles} Total Vehicles
                          </div>
                          <div className="text-sm text-blue-700">
                            Confidence: {(vehicleDetectionData.confidence_score * 100).toFixed(1)}%
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-white dark:bg-gray-700 p-3 rounded-lg border border-gray-200 dark:border-gray-600">
                            <div className="text-lg font-semibold text-gray-900 dark:text-white">{vehicleDetectionData.cars || 0}</div>
                            <div className="text-sm text-gray-600 dark:text-gray-300">Cars</div>
                          </div>
                          <div className="bg-white dark:bg-gray-700 p-3 rounded-lg border border-gray-200 dark:border-gray-600">
                            <div className="text-lg font-semibold text-gray-900 dark:text-white">{vehicleDetectionData.trucks || 0}</div>
                            <div className="text-sm text-gray-600 dark:text-gray-300">Trucks</div>
                          </div>
                          <div className="bg-white dark:bg-gray-700 p-3 rounded-lg border border-gray-200 dark:border-gray-600">
                            <div className="text-lg font-semibold text-gray-900 dark:text-white">{vehicleDetectionData.motorcycles || 0}</div>
                            <div className="text-sm text-gray-600 dark:text-gray-300">Motorcycles</div>
                          </div>
                          <div className="bg-white dark:bg-gray-700 p-3 rounded-lg border border-gray-200 dark:border-gray-600">
                            <div className="text-lg font-semibold text-gray-900 dark:text-white">{vehicleDetectionData.buses || 0}</div>
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
                    ) : vehicleDetectionData && vehicleDetectionData.processing_status === 'failed' ? (
                      <div className="bg-red-50 p-4 rounded-lg">
                        <div className="text-red-600 font-medium">Analysis Failed</div>
                        <div className="text-sm text-red-700 mt-1">
                          {vehicleDetectionData.gemini_response || 'Unknown error'}
                        </div>
                      </div>
                    ) : vehicleDetectionData === null ? (
                      <div className="bg-yellow-50 p-4 rounded-lg">
                        <div className="text-yellow-600 font-medium">No Analysis Available</div>
                        <div className="text-sm text-yellow-700 mt-1">
                          This image hasn't been analyzed by Gemini AI yet.
                        </div>
                      </div>
                    ) : (
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="text-gray-600 font-medium">Loading Analysis...</div>
                        <div className="text-sm text-gray-500 mt-1">
                          Fetching vehicle detection results...
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Images
