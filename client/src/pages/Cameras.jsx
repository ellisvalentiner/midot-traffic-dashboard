import React, {useEffect, useState} from 'react'
import {Brain, Camera, Car, Filter, ImageIcon, MapPin, Power, PowerOff, RefreshCw, Search} from 'lucide-react'
import axios from 'axios'

const Cameras = () => {
  const [cameras, setCameras] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCounty, setFilterCounty] = useState('')
  const [filterRoad, setFilterRoad] = useState('')
  const [showEnabledOnly, setShowEnabledOnly] = useState(false)
  const [sortBy, setSortBy] = useState('name')
  const [sortOrder, setSortOrder] = useState('asc')
  const [aiAnalysisLoading, setAiAnalysisLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [camerasPerPage, setCamerasPerPage] = useState(12)
  const [showAdvancedControls, setShowAdvancedControls] = useState(false)
  const [togglingCameras, setTogglingCameras] = useState(new Set())
  const [togglingAI, setTogglingAI] = useState(new Set())
  const [cameraStats, setCameraStats] = useState({})
  const [cameraImages, setCameraImages] = useState({})
  const [imagesLoading, setImagesLoading] = useState(false)

  useEffect(() => {
    fetchCameras()
  }, [])

  // Fetch stats and images after cameras are loaded
  useEffect(() => {
    if (cameras.length > 0) {
      fetchCameraStats()
      fetchCameraImages()
    }
  }, [cameras])

  const fetchCameraStats = async () => {
    try {
      setLoading(true)
      
      // Get enabled cameras
      const enabledCameras = cameras.filter(camera => camera.enabled)
      
      // Fetch stats for each enabled camera
      const statsPromises = enabledCameras.map(async (camera) => {
        try {
          const response = await axios.get(`/api/cameras/${camera.camera_id}/stats`)
          if (response.data.success) {
            return {
              camera_id: camera.camera_id,
              ...response.data.data
            }
          }
        } catch (error) {
          console.error(`Error fetching stats for camera ${camera.camera_id}:`, error)
        }
        return null
      })

      const statsResults = await Promise.all(statsPromises)
      const validStats = statsResults.filter(Boolean)
      
      // Create a map of camera stats
      const statsMap = {}
      validStats.forEach(stats => {
        statsMap[stats.camera_id] = stats
      })
      
      setCameraStats(statsMap)
    } catch (error) {
      console.error('Error fetching camera stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchCameraImages = async () => {
    try {
      setImagesLoading(true)
      
      // Get enabled cameras
      const enabledCameras = cameras.filter(camera => camera.enabled)
      
      // Fetch recent image for each enabled camera
      const imagePromises = enabledCameras.map(async (camera) => {
        try {
          const response = await axios.get(`/api/images/camera/${camera.camera_id}?limit=1`)
          if (response.data.success && response.data.data.length > 0) {
            return {
              camera_id: camera.camera_id,
              image: response.data.data[0]
            }
          }
        } catch (error) {
          console.error(`Error fetching image for camera ${camera.camera_id}:`, error)
        }
        return null
      })

      const imageResults = await Promise.all(imagePromises)
      const validImages = imageResults.filter(Boolean)
      
      // Create a map of camera images
      const imagesMap = {}
      validImages.forEach(item => {
        imagesMap[item.camera_id] = item.image
      })
      
      setCameraImages(imagesMap)
    } catch (error) {
      console.error('Error fetching camera images:', error)
    } finally {
      setImagesLoading(false)
    }
  }

  const fetchCameras = async () => {
    try {
      setLoading(true)
      const response = await axios.get('/api/cameras')
      if (response.data.success) {
        // Convert enabled and ai_analysis_enabled fields from number to boolean
        const camerasWithBoolean = response.data.data.map(camera => ({
          ...camera,
          enabled: Boolean(camera.enabled),
          ai_analysis_enabled: Boolean(camera.ai_analysis_enabled)
        }))

        setCameras(camerasWithBoolean)
      }
    } catch (error) {
      console.error('Error fetching cameras:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleCameraStatus = async (cameraId, currentEnabled) => {
    try {
      setTogglingCameras(prev => new Set(prev).add(cameraId))

      const response = await axios.patch(`/api/cameras/${cameraId}/toggle`, {
        enabled: !currentEnabled
      })

      if (response.data.success) {
        // Update local state - ensure we're working with booleans
        setCameras(prev => prev.map(camera =>
          camera.camera_id === cameraId
            ? { ...camera, enabled: !currentEnabled }
            : camera
        ))

        // Refresh images and stats when camera status changes
        // Small delay to ensure state has updated
        setTimeout(() => {
          fetchCameraImages()
          fetchCameraStats()
        }, 500)
      }
    } catch (error) {
      console.error('Error toggling camera status:', error)
    } finally {
      setTogglingCameras(prev => {
        const newSet = new Set(prev)
        newSet.delete(cameraId)
        return newSet
      })
    }
  }

  const toggleAIAnalysisStatus = async (cameraId, currentAiEnabled) => {
    try {
      setTogglingAI(prev => new Set(prev).add(cameraId))

      const response = await axios.patch(`/api/cameras/${cameraId}/toggle-ai-analysis`, {
        ai_analysis_enabled: !currentAiEnabled
      })

      if (response.data.success) {
        // Update local state
        setCameras(prev => prev.map(camera =>
          camera.camera_id === cameraId
            ? { ...camera, ai_analysis_enabled: !currentAiEnabled }
            : camera
        ))
      }
    } catch (error) {
      console.error('Error toggling AI analysis status:', error)
    } finally {
      setTogglingAI(prev => {
        const newSet = new Set(prev)
        newSet.delete(cameraId)
        return newSet
      })
    }
  }

  const bulkToggleCameras = async (enable) => {
    try {
      setLoading(true)

      // Use the bulk endpoint for efficiency
      const response = await axios.patch('/api/cameras/bulk-toggle', {
        cameraIds: cameras.map(c => c.camera_id),
        enabled: enable
      })

      if (response.data.success) {
        // Update local state
        setCameras(prev => prev.map(camera => ({
          ...camera,
          enabled: enable
        })))

        // Refresh images and stats after bulk camera toggle
        setTimeout(() => {
          fetchCameraImages()
          fetchCameraStats()
        }, 500)
      }
    } catch (error) {
      console.error(`Error bulk ${enable ? 'enabling' : 'disabling'} cameras:`, error)
    } finally {
      setLoading(false)
    }
  }

  const toggleFilteredCameras = async (enable) => {
    try {
      setLoading(true)

      // Only update cameras that match current filters and need updating
      const camerasToUpdate = filteredCameras.filter(camera => camera.enabled !== enable)

      if (camerasToUpdate.length === 0) {
        return
      }

      // Use the bulk endpoint for efficiency
      const response = await axios.patch('/api/cameras/bulk-toggle', {
        cameraIds: camerasToUpdate.map(c => c.camera_id),
        enabled: enable
      })

      if (response.data.success) {
        // Update local state
        setCameras(prev => prev.map(camera => {
          const shouldUpdate = camerasToUpdate.some(c => c.camera_id === camera.camera_id)
          return shouldUpdate ? { ...camera, enabled: enable } : camera
        }))
      }
    } catch (error) {
      console.error(`Error bulk ${enable ? 'enabling' : 'disabling'} filtered cameras:`, error)
    } finally {
      setLoading(false)
    }
  }

  const bulkToggleAIAnalysis = async (enable) => {
    try {
      setAiAnalysisLoading(true)

      const response = await axios.patch('/api/cameras/bulk-toggle-ai-analysis', {
        cameraIds: cameras.map(c => c.camera_id),
        ai_analysis_enabled: enable
      })

      if (response.data.success) {
        // Update local state
        setCameras(prev => prev.map(camera => ({
          ...camera,
          ai_analysis_enabled: enable
        })))
      }
    } catch (error) {
      console.error(`Error bulk ${enable ? 'enabling' : 'disabling'} AI analysis:`, error)
    } finally {
      setAiAnalysisLoading(false)
    }
  }

  const toggleFilteredAIAnalysis = async (enable) => {
    try {
      setAiAnalysisLoading(true)

      // Only update cameras that match current filters and need updating
      const camerasToUpdate = filteredCameras.filter(camera => camera.ai_analysis_enabled !== enable)

      if (camerasToUpdate.length === 0) {
        return
      }

      const response = await axios.patch('/api/cameras/bulk-toggle-ai-analysis', {
        cameraIds: camerasToUpdate.map(c => c.camera_id),
        ai_analysis_enabled: enable
      })

      if (response.data.success) {
        // Update local state
        setCameras(prev => prev.map(camera =>
          filteredCameras.some(fc => fc.camera_id === camera.camera_id)
            ? { ...camera, ai_analysis_enabled: enable }
            : camera
        ))
      }
    } catch (error) {
      console.error(`Error bulk ${enable ? 'enabling' : 'disabling'} AI analysis for filtered cameras:`, error)
    } finally {
      setAiAnalysisLoading(false)
    }
  }

  const filteredCameras = cameras.filter(camera => {
    const matchesSearch = camera.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         camera.camera_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         camera.road_name?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesCounty = !filterCounty || camera.county === filterCounty
    const matchesRoad = !filterRoad || camera.road_name === filterRoad
    const matchesEnabled = !showEnabledOnly || camera.enabled

    return matchesSearch && matchesCounty && matchesRoad && matchesEnabled
  })

  // Sort the filtered cameras
  const sortedCameras = [...filteredCameras].sort((a, b) => {
    let aValue, bValue

    switch (sortBy) {
      case 'name':
        aValue = a.name || `Camera ${a.camera_id}` || ''
        bValue = b.name || `Camera ${b.camera_id}` || ''
        break
      case 'camera_id':
        aValue = parseInt(a.camera_id) || 0
        bValue = parseInt(b.camera_id) || 0
        break
      case 'county':
        aValue = a.county || ''
        bValue = b.county || ''
        break
      case 'road_name':
        aValue = a.road_name || ''
        bValue = b.road_name || ''
        break
      case 'enabled':
        aValue = a.enabled ? 1 : 0
        bValue = b.enabled ? 1 : 0
        break
      case 'ai_analysis_enabled':
        aValue = a.ai_analysis_enabled ? 1 : 0
        bValue = b.ai_analysis_enabled ? 1 : 0
        break
      case 'activity':
        aValue = cameraStats[a.camera_id]?.total_vehicles || 0
        bValue = cameraStats[b.camera_id]?.total_vehicles || 0
        break
      default:
        aValue = a.name || ''
        bValue = b.name || ''
    }

    if (typeof aValue === 'string') {
      aValue = aValue.toLowerCase()
      bValue = bValue.toLowerCase()
    }

    if (sortOrder === 'asc') {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
    } else {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
    }
  })

  // Pagination logic
  const totalPages = Math.ceil(sortedCameras.length / camerasPerPage)
  const startIndex = (currentPage - 1) * camerasPerPage
  const endIndex = startIndex + camerasPerPage
  const paginatedCameras = sortedCameras.slice(startIndex, endIndex)

  // Reset to first page when filters or sorting change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, filterCounty, filterRoad, showEnabledOnly, sortBy, sortOrder])

  // Reset to first page when cameras change
  useEffect(() => {
    setCurrentPage(1)
  }, [cameras.length])

  const counties = [...new Set(cameras.map(camera => camera.county).filter(Boolean))].sort()
  const primaryRoads = [...new Set(cameras.map(camera => camera.road_name).filter(Boolean))].sort()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading cameras...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center sm:text-left">
        <h1 className="text-4xl font-bold text-gray-900 mb-3">Cameras</h1>
        <p className="text-lg text-gray-600">Monitor and manage MIDOT traffic cameras</p>
      </div>

      {/* Simplified Control Panel with Progressive Disclosure */}
      {cameras.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          {/* Filters Section */}
          <div className="mb-6">
            {/* Enhanced Status Cards */}
            <div className="mb-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="text-2xl font-bold text-blue-600">{cameras.length}</div>
                  <div className="text-sm text-blue-700 font-medium">Total Cameras</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {cameras.filter(c => c.enabled).length} active
                  </div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <div className="text-2xl font-bold text-purple-600">{cameras.filter(c => c.ai_analysis_enabled).length}</div>
                  <div className="text-sm text-purple-700 font-medium">AI Analysis Active</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {cameras.length > 0 ? Math.round((cameras.filter(c => c.ai_analysis_enabled).length / cameras.length) * 100) : 0}% of total
                  </div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="text-2xl font-bold text-green-600">{counties.length}</div>
                  <div className="text-sm text-green-700 font-medium">Counties Covered</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {primaryRoads.length} primary roads
                  </div>
                </div>
              </div>
            </div>
            {/* Bulk Operations */}
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Bulk Operations</h4>
              <div className="grid grid-cols-2 gap-3">
                {/* Camera Status */}
                <div className="space-y-2">
                  <button
                    onClick={() => bulkToggleCameras(true)}
                    disabled={loading || cameras.every(c => c.enabled)}
                    className="w-full px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium text-xs shadow-sm flex items-center justify-center space-x-2"
                  >
                    <Power className="w-3 h-3" />
                    <span>Enable All Cameras</span>
                  </button>
                  <button
                    onClick={() => bulkToggleCameras(false)}
                    disabled={loading || cameras.every(c => !c.enabled)}
                    className="w-full px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium text-xs shadow-sm flex items-center justify-center space-x-2"
                  >
                    <PowerOff className="w-3 h-3" />
                    <span>Disable All Cameras</span>
                  </button>
                </div>

                {/* AI Analysis */}
                <div className="space-y-2">
                  <button
                    onClick={() => bulkToggleAIAnalysis(true)}
                    disabled={aiAnalysisLoading || cameras.every(c => c.ai_analysis_enabled)}
                    className="w-full px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium text-xs shadow-sm flex items-center justify-center space-x-2"
                  >
                    <Brain className="w-3 h-3" />
                    <span>Enable AI for All</span>
                  </button>
                  <button
                    onClick={() => bulkToggleAIAnalysis(false)}
                    disabled={aiAnalysisLoading || cameras.every(c => !c.ai_analysis_enabled)}
                    className="w-full px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium text-xs shadow-sm flex items-center justify-center space-x-2"
                  >
                    <Brain className="w-3 h-3" />
                    <span>Disable AI for All</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search cameras..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">County</label>
                <div className="relative">
                  <select
                    value={filterCounty}
                    onChange={(e) => setFilterCounty(e.target.value)}
                    className="w-full px-3 py-2.5 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 text-sm appearance-none bg-white cursor-pointer hover:border-gray-400"
                  >
                    <option value="">All Counties</option>
                    {counties.map(county => (
                      <option key={county} value={county}>{county}</option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Primary Road</label>
                <div className="relative">
                  <select
                    value={filterRoad || ''}
                    onChange={(e) => setFilterRoad(e.target.value)}
                    className="w-full px-3 py-2.5 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 text-sm appearance-none bg-white cursor-pointer hover:border-gray-400"
                  >
                    <option value="">All Roads</option>
                    {primaryRoads.map(road => (
                      <option key={road} value={road}>{road}</option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Sort Controls */}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full px-3 py-2.5 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 text-sm appearance-none bg-white cursor-pointer hover:border-gray-400"
                  >
                    <option value="name">Camera Name</option>
                    <option value="camera_id">Camera ID</option>
                    <option value="county">County</option>
                    <option value="road_name">Road Name</option>
                    <option value="enabled">Status (Enabled/Disabled)</option>
                    <option value="ai_analysis_enabled">AI Analysis Status</option>
                    <option value="activity">Traffic Activity (24h)</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sort Order</label>
                <div className="relative">
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                    className="w-full px-3 py-2.5 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 text-sm appearance-none bg-white cursor-pointer hover:border-gray-400"
                  >
                    <option value="asc">Ascending (A→Z, Low→High)</option>
                    <option value="desc">Descending (Z→A, High→Low)</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* More Options Button */}
            <div className="mt-4 flex items-center justify-center">
              <button
                onClick={() => setShowAdvancedControls(!showAdvancedControls)}
                className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all duration-200 font-medium text-sm flex items-center space-x-2"
              >
                <Filter className="w-4 h-4" />
                <span>{showAdvancedControls ? 'Hide' : 'Show'} More Options</span>
              </button>
            </div>

            {/* Simple Filter Summary */}
            {(searchTerm || filterCounty || filterRoad || showEnabledOnly) && (
              <div className="mt-3 text-center">
                <button
                  onClick={() => {
                    setSearchTerm('')
                    setFilterCounty('')
                    setFilterRoad('')
                    setShowEnabledOnly(false)
                    setSortBy('name')
                    setSortOrder('asc')
                  }}
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  Clear filters ({filteredCameras.length} of {cameras.length} results)
                </button>
              </div>
            )}

          {/* Advanced Controls - Collapsible */}
          {showAdvancedControls && (
            <div className="border-t border-gray-200 pt-4 space-y-4">
              {/* Show Enabled Only Toggle */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Show Enabled Only</span>
                <button
                  onClick={() => setShowEnabledOnly(!showEnabledOnly)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                    showEnabledOnly ? 'bg-primary-600' : 'bg-gray-200'
                  }`}
                  role="switch"
                  aria-checked={showEnabledOnly}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ease-in-out ${
                      showEnabledOnly ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Quick Actions */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-700">Quick Actions</h4>

                {/* Refresh Buttons */}
                <div className="flex items-center space-x-3">
                  <button
                    onClick={fetchCameras}
                    disabled={loading}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium text-sm flex items-center space-x-2"
                  >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    <span>Refresh Cameras</span>
                  </button>

                  <button
                    onClick={fetchCameraImages}
                    disabled={imagesLoading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium text-sm flex items-center space-x-2"
                  >
                    <RefreshCw className={`w-4 h-4 ${imagesLoading ? 'animate-spin' : ''}`} />
                    <span>Refresh Images</span>
                  </button>
                </div>
              </div>


            </div>
          )}
          </div>

          {/* Bulk Operations Section */}
          <div>

            {/* Filtered Cameras Operations - Only show when filters are active */}
            {filteredCameras.length !== cameras.length && filteredCameras.length > 0 && (
              <div className="border-t border-gray-200 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-gray-700">
                    Filtered Cameras ({filteredCameras.length})
                  </h4>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                    {filteredCameras.length} of {cameras.length} selected
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => toggleFilteredCameras(true)}
                    disabled={loading || filteredCameras.every(c => c.enabled)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium text-xs shadow-sm flex items-center space-x-2"
                  >
                    <Power className="w-3 h-3" />
                    <span>Enable Selected</span>
                  </button>

                  <button
                    onClick={() => toggleFilteredCameras(false)}
                    disabled={loading || filteredCameras.every(c => !c.enabled)}
                    className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium text-xs shadow-sm flex items-center space-x-2"
                  >
                    <PowerOff className="w-3 h-3" />
                    <span>Disable Selected</span>
                  </button>

                  <button
                    onClick={() => toggleFilteredAIAnalysis(true)}
                    disabled={aiAnalysisLoading || filteredCameras.every(c => c.ai_analysis_enabled)}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium text-xs shadow-sm flex items-center space-x-2"
                  >
                    <Brain className="w-3 h-3" />
                    <span>Enable AI for Selected</span>
                  </button>

                  <button
                    onClick={() => toggleFilteredAIAnalysis(false)}
                    disabled={aiAnalysisLoading || filteredCameras.every(c => !c.ai_analysis_enabled)}
                    className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium text-xs shadow-sm flex items-center space-x-2"
                  >
                    <Brain className="w-3 h-3" />
                    <span>Disable AI for Selected</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Camera Grid */}
      {paginatedCameras.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
          <Camera className="w-20 h-20 mx-auto mb-6 text-gray-300" />
          <h3 className="text-xl font-semibold text-gray-900 mb-3">No cameras found</h3>
          <p className="text-gray-500">Try adjusting your search or filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {paginatedCameras.map((camera) => (
                            <div key={camera.camera_id} className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden transition-all duration-200 hover:shadow-md ${!camera.enabled ? 'opacity-75' : ''}`}>
              {/* Image Preview */}
              {cameraImages[camera.camera_id] && (
                <div className="relative h-40 bg-gray-100">
                  <img
                    src={`/api/images/file/${cameraImages[camera.camera_id].local_path.split('/').pop()}`}
                    alt={`Camera ${camera.camera_id} preview`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none'
                      e.target.nextSibling.style.display = 'flex'
                    }}
                  />
                  <div className="hidden w-full h-full items-center justify-center bg-gray-100 text-gray-400">
                    <ImageIcon className="w-8 h-8" />
                  </div>
                  {/* Overlay with camera status */}
                  <div className="absolute top-2 right-2">
                    <button
                      onClick={() => toggleCameraStatus(camera.camera_id, camera.enabled)}
                      disabled={togglingCameras.has(camera.camera_id)}
                      className={`p-2 rounded-lg backdrop-blur-sm bg-white/80 transition-all duration-200 ${
                        camera.enabled 
                          ? 'text-green-600 hover:bg-green-100/80' 
                          : 'text-red-600 hover:bg-red-100/80'
                      }`}
                      title={camera.enabled ? 'Disable camera' : 'Enable camera'}
                    >
                      {togglingCameras.has(camera.camera_id) ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
                      ) : (
                        camera.enabled ? <Power className="w-4 h-4" /> : <PowerOff className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  {/* Camera ID overlay */}
                  <div className="absolute top-2 left-2 bg-black/60 text-white px-2 py-1 rounded text-sm font-semibold">
                    #{camera.camera_id}
                  </div>
                </div>
              )}

              {/* No Image Fallback */}
              {!cameraImages[camera.camera_id] && (
                <div className="relative h-32 bg-gray-100 flex items-center justify-center">
                  <div className="text-center">
                    {imagesLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                        <span className="text-sm text-gray-500">Loading image...</span>
                      </>
                    ) : (
                      <>
                        <ImageIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <span className="text-sm text-gray-500">No recent image</span>
                      </>
                    )}
                  </div>
                  {/* Header for no-image cards */}
                  <div className="absolute top-2 right-2">
                    <button
                      onClick={() => toggleCameraStatus(camera.camera_id, camera.enabled)}
                      disabled={togglingCameras.has(camera.camera_id)}
                      className={`p-2 rounded-lg transition-all duration-200 ${
                        camera.enabled 
                          ? 'bg-green-100 text-green-600 hover:bg-green-200' 
                          : 'bg-red-100 text-red-600 hover:bg-red-200'
                      }`}
                      title={camera.enabled ? 'Disable camera' : 'Enable camera'}
                    >
                      {togglingCameras.has(camera.camera_id) ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
                      ) : (
                        camera.enabled ? <Power className="w-4 h-4" /> : <PowerOff className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  <div className="absolute top-2 left-2 bg-black/60 text-white px-2 py-1 rounded text-sm font-semibold">
                    #{camera.camera_id}
                  </div>
                </div>
              )}

              {/* Content Area */}
              <div className="p-4">
                {/* Camera Name - Most Important */}
                <h3 className="font-bold text-gray-900 mb-3 line-clamp-2">
                  {camera.name || `Camera ${camera.camera_id}`}
                </h3>

              {/* Location & Activity */}
              <div className="space-y-3 mb-4">
                {/* County Location */}
                {camera.county && (
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <MapPin className="w-4 h-4" />
                    <span>{camera.county}</span>
                  </div>
                )}

                {/* Traffic Statistics */}
                {cameraStats[camera.camera_id] && (
                  <div className="flex items-center space-x-2 text-sm text-green-600">
                    <Car className="w-4 h-4" />
                    <span>{cameraStats[camera.camera_id].total_vehicles || 0} vehicles (24h)</span>
                  </div>
                )}

                {/* Activity Status */}
                {cameraImages[camera.camera_id] && (
                  <div className="flex items-center space-x-2 text-sm text-blue-600">
                    <ImageIcon className="w-4 h-4" />
                    <span>Latest: {new Date(cameraImages[camera.camera_id].captured_at + 'Z').toLocaleTimeString()}</span>
                  </div>
                )}
              </div>

              {/* Enhanced Action Row */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => toggleAIAnalysisStatus(camera.camera_id, camera.ai_analysis_enabled)}
                    disabled={togglingAI.has(camera.camera_id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                      camera.ai_analysis_enabled 
                        ? 'bg-purple-100 text-purple-700 hover:bg-purple-200' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                    title={camera.ai_analysis_enabled ? 'Disable AI analysis' : 'Enable AI analysis'}
                  >
                    {togglingAI.has(camera.camera_id) ? (
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current" />
                    ) : (
                      camera.ai_analysis_enabled ? 'AI Enabled' : 'AI Disabled'
                    )}
                  </button>

                  <a
                    href={`/cameras/${camera.camera_id}/images`}
                    className="text-blue-600 hover:text-blue-700 text-xs font-medium transition-colors duration-200"
                  >
                    Images
                  </a>
                </div>

                <a
                  href={`/cameras/${camera.camera_id}`}
                  className="text-primary-600 hover:text-primary-700 text-sm font-medium transition-colors duration-200"
                >
                  Details →
                </a>
              </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Inline Pagination */}
      {filteredCameras.length > camerasPerPage && (
        <div className="flex items-center justify-center space-x-4 py-6">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ← Previous
          </button>

          <span className="px-4 py-2 text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </span>

          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next →
          </button>
        </div>
      )}

      {/* Results Summary */}
      {filteredCameras.length > 0 && (
        <div className="text-center text-sm text-gray-500 pb-4">
          Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
          <span className="font-medium">
            {Math.min(endIndex, filteredCameras.length)}
          </span>{' '}
          of <span className="font-medium">{filteredCameras.length}</span> cameras
        </div>
      )}
    </div>
  )
}

export default Cameras
