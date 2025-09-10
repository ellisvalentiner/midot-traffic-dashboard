import React, {useEffect, useState} from 'react'
import {
    Activity,
    BarChart3,
    Camera,
    Car,
    Clock,
    ExternalLink,
    Image,
    MapPin,
    RefreshCw,
    TrendingUp,
    Truck
} from 'lucide-react'
import {parseSQLiteDate} from '../utils/dateUtils'
import {Link} from 'react-router-dom'
import axios from 'axios'
import VehicleCountChart from '../components/charts/VehicleCountChart'

const Dashboard = () => {
  const [stats, setStats] = useState(null)
  const [recentImages, setRecentImages] = useState([])
  const [vehicleStats, setVehicleStats] = useState(null)
  const [trafficAlerts, setTrafficAlerts] = useState([])
  const [aggregatedVehicleCounts, setAggregatedVehicleCounts] = useState([])
  const [vehicleCountsLoading, setVehicleCountsLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [aggregationInterval, setAggregationInterval] = useState(600000) // Default to 10 minutes

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const [statsRes, imagesRes, vehicleRes, vehicleCountsRes] = await Promise.all([
        axios.get('/api/cameras/stats/summary'),
        axios.get('/api/images/recent?limit=6'),
        axios.get('/api/vehicle-detection/stats?time_range=24h'),
        axios.get('/api/vehicle-detection/counts-by-minute/aggregated?hours=24')
      ])

      setStats(statsRes.data.data)
      setRecentImages(imagesRes.data.data)
      setVehicleStats(vehicleRes.data.data)
      setAggregatedVehicleCounts(vehicleCountsRes.data.data || [])

      // Extract aggregation interval from vehicle counts response
      if (vehicleCountsRes.data && vehicleCountsRes.data.aggregationInterval) {
        setAggregationInterval(vehicleCountsRes.data.aggregationInterval)
      }

      // Debug: Log the vehicle counts data
      console.log('Dashboard: Vehicle counts API response:', {
        success: vehicleCountsRes.data.success,
        data: vehicleCountsRes.data.data,
        count: vehicleCountsRes.data.count,
        aggregationInterval: vehicleCountsRes.data.aggregationInterval,
        intervalMinutes: vehicleCountsRes.data.intervalMinutes
      })

      // Generate traffic alerts based on vehicle detection data
      generateTrafficAlerts(vehicleRes.data.data)
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      // Set default values if API fails
      setStats({
        cameras: { total_cameras: 0, total_counties: 0, total_roads: 0 },
        images: { total_images: 0 }
      })
      setRecentImages([])
      setVehicleStats({
        total_vehicles_detected: 0,
        avg_vehicles_per_image: 0,
        total_cars: 0,
        total_trucks: 0,
        avg_confidence: 0
      })
      setAggregatedVehicleCounts([])
    } finally {
      setLoading(false)
    }
  }

  const generateTrafficAlerts = (vehicleData) => {
    const alerts = []

    if (vehicleData) {
      // High traffic alert
      if (vehicleData.total_vehicles_detected > 1000) {
        alerts.push({
          type: 'high_traffic',
          severity: 'warning',
          message: 'High traffic volume detected across network',
          icon: '🚗'
        })
      }

      // Low confidence alert
      if (vehicleData.avg_confidence < 0.7) {
        alerts.push({
          type: 'low_confidence',
          severity: 'info',
          message: 'Some vehicle detections have low confidence scores',
          icon: '⚠️'
        })
      }

      // No recent data alert
      if (vehicleData.total_images_analyzed === 0) {
        alerts.push({
          type: 'no_data',
          severity: 'error',
          message: 'No recent vehicle detection data available',
          icon: '📊'
        })
      }
    }

    setTrafficAlerts(alerts)
  }

  const refreshCameras = async () => {
    try {
      setRefreshing(true)
      await axios.post('/api/cameras/refresh')
      await fetchDashboardData()
      alert('Cameras refreshed successfully!')
    } catch (error) {
      console.error('Error refreshing cameras:', error)
      alert('Failed to refresh cameras. Check the console for details.')
    } finally {
      setRefreshing(false)
    }
  }

  const formatRelativeTime = (dateString) => {
    const now = new Date()
    // Use our SQLite-aware date parser for consistent timezone handling
    const date = parseSQLiteDate(dateString)
    const diffInMinutes = Math.floor((now - date) / (1000 * 60))

    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
    return `${Math.floor(diffInMinutes / 1440)}d ago`
  }

  const getTrafficStatusColor = (vehicleCount) => {
    if (vehicleCount === 0) return 'text-gray-500'
    if (vehicleCount < 100) return 'text-green-600'
    if (vehicleCount < 500) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getTrafficStatusText = (vehicleCount) => {
    if (vehicleCount === 0) return 'No Data'
    if (vehicleCount < 100) return 'Light Traffic'
    if (vehicleCount < 500) return 'Moderate Traffic'
    return 'Heavy Traffic'
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

      {/* Enhanced Header with Traffic Focus */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Traffic Dashboard</h1>
            <p className="text-gray-600 mt-2">Real-time traffic pattern analysis and vehicle detection</p>
          </div>
          <div className="flex items-center space-x-3">
            <Link
              to="/settings"
              className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium shadow-sm hover:shadow-md flex items-center"
            >
              <MapPin className="w-4 h-4 mr-2" />
              Settings
            </Link>
            <button
              onClick={refreshCameras}
              disabled={refreshing}
              className="px-6 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors font-medium shadow-sm hover:shadow-md flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh Data'}
            </button>
          </div>
        </div>
      </div>

      {/* Traffic Overview Grid - Primary Focus */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {/* Total Vehicles Detected - PRIMARY METRIC */}
        <Link to="/images" className="group">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl p-6 border border-blue-200 hover:shadow-lg transition-all duration-200 group-hover:scale-105">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Car className="w-6 h-6 text-blue-600" />
              </div>
              <ExternalLink className="w-4 h-4 text-blue-400 group-hover:text-blue-600 transition-colors" />
            </div>
            <div className="text-3xl font-bold text-blue-900 mb-2">
              {vehicleStats?.total_vehicles_detected || 0}
            </div>
            <p className="text-blue-700 font-medium">Total Vehicles</p>
            <p className="text-sm text-blue-600 mt-1">
              {getTrafficStatusText(vehicleStats?.total_vehicles_detected || 0)}
            </p>
          </div>
        </Link>

        {/* Total Cameras */}
        <Link to="/cameras" className="group">
          <div className="bg-gradient-to-br from-indigo-50 to-purple-100 rounded-xl p-6 border border-indigo-200 hover:shadow-lg transition-all duration-200 group-hover:scale-105">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-indigo-100 rounded-lg">
                <Camera className="w-6 h-6 text-indigo-600" />
              </div>
              <ExternalLink className="w-4 h-4 text-indigo-400 group-hover:text-indigo-600 transition-colors" />
            </div>
            <div className="text-3xl font-bold text-indigo-900 mb-2">
              {stats?.cameras?.total_cameras || 0}
            </div>
            <p className="text-indigo-700 font-medium">Total Cameras</p>
            <p className="text-sm text-indigo-600 mt-1">
              {stats?.cameras?.total_counties || 0} counties covered
            </p>
          </div>
        </Link>

        {/* Average Vehicles per Image */}
        <Link to="/analytics" className="group">
          <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-xl p-6 border border-green-200 hover:shadow-lg transition-all duration-200 group-hover:scale-105">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <ExternalLink className="w-4 h-4 text-green-400 group-hover:text-green-600 transition-colors" />
            </div>
            <div className="text-3xl font-bold text-green-900 mb-2">
              {vehicleStats?.avg_vehicles_per_image?.toFixed(1) || 0}
            </div>
            <p className="text-green-700 font-medium">Avg per Image</p>
            <p className="text-sm text-green-600 mt-1">
              {vehicleStats?.avg_vehicles_per_image > 10 ? 'High Density' :
               vehicleStats?.avg_vehicles_per_image > 5 ? 'Medium Density' : 'Low Density'}
            </p>
          </div>
        </Link>

        {/* Vehicle Type Breakdown */}
        <Link to="/cameras" className="group">
          <div className="bg-gradient-to-br from-purple-50 to-violet-100 rounded-xl p-6 border border-purple-200 hover:shadow-lg transition-all duration-200 group-hover:scale-105">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Truck className="w-6 h-6 text-purple-600" />
              </div>
              <ExternalLink className="w-4 h-4 text-purple-400 group-hover:text-purple-600 transition-colors" />
            </div>
            <div className="text-3xl font-bold text-purple-900 mb-2">
              {vehicleStats?.total_cars || 0}
            </div>
            <p className="text-purple-700 font-medium">Cars</p>
            <p className="text-sm text-purple-600 mt-1">
              {vehicleStats?.total_trucks || 0} trucks detected
            </p>
          </div>
        </Link>

        {/* Analysis Confidence */}
        <Link to="/analytics" className="group">
          <div className="bg-gradient-to-br from-amber-50 to-orange-100 rounded-xl p-6 border border-amber-200 hover:shadow-lg transition-all duration-200 group-hover:scale-105">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-amber-100 rounded-lg">
                <BarChart3 className="w-6 h-6 text-amber-600" />
              </div>
              <ExternalLink className="w-4 h-4 text-amber-400 group-hover:text-amber-600 transition-colors" />
            </div>
            <div className="text-3xl font-bold text-amber-900 mb-2">
              {vehicleStats?.avg_confidence ? (vehicleStats.avg_confidence * 100).toFixed(0) : 0}%
            </div>
            <p className="text-amber-700 font-medium">AI Confidence</p>
            <p className="text-sm text-amber-600 mt-1">
              {vehicleStats?.avg_confidence > 0.8 ? 'Excellent' :
               vehicleStats?.avg_confidence > 0.6 ? 'Good' : 'Needs Review'}
            </p>
          </div>
        </Link>
      </div>

      {/* Traffic Pattern Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Traffic Activity */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900 dark:to-emerald-900 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
              <div className="p-2 bg-green-100 rounded-lg">
                <Activity className="w-5 h-5 text-green-600" />
              </div>
              <span>Recent Traffic Activity</span>
            </h3>
          </div>

          <div className="p-6">
            {/* TODO: Update cards to link to the camera detail page */}
            {recentImages.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Image className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No recent traffic data</h3>
                <p className="text-sm text-gray-600">Traffic patterns will appear here after refreshing data</p>
                <button
                  onClick={refreshCameras}
                  disabled={refreshing}
                  className="mt-4 px-4 py-2 bg-primary-100 text-primary-700 rounded-lg hover:bg-primary-200 transition-colors text-sm font-medium disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 inline mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                  Refresh Now
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {recentImages.slice(0, 5).map((image, index) => {
                  const imageUrl = image.local_path ? `/api/images/file/${image.local_path.split('/').pop()}` : null
                  // Determine if this is the latest image (most recent overall)
                  const isLatest = index === 0
                  return (
                    <Link key={image.id} to={`/cameras/${image.camera_id}`} className="group">
                      <div className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group-hover:bg-gray-200">
                        <div className="relative w-16 h-16 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                          {imageUrl ? (
                            <>
                              <img
                                src={imageUrl}
                                alt={`Camera ${image.camera_id}`}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.target.style.display = 'none'
                                  e.target.nextSibling.style.display = 'flex'
                                }}
                              />
                              <div className="w-full h-full flex items-center justify-center" style={{ display: 'none' }}>
                                <Image className="w-6 h-6 text-gray-400" />
                              </div>
                            </>
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Image className="w-6 h-6 text-gray-400" />
                            </div>
                          )}

                          {isLatest && (
                            <div className="absolute top-1 right-1 bg-blue-500 text-white text-xs px-1 py-0.5 rounded-full">
                              <Clock className="w-2 h-2" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate group-hover:text-primary-700">
                            {image.camera_name || `Camera ${image.camera_id}`}
                          </p>
                          <p className="text-sm text-gray-500">
                            {formatRelativeTime(image.created_at)}
                          </p>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center space-x-1 ${
                          isLatest 
                            ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                            : 'bg-gray-100 text-gray-800 border border-gray-200'
                        }`}>
                          {isLatest ? (
                            <>
                              <Clock className="w-3 h-3" />
                              <span>Latest</span>
                            </>
                          ) : (
                            <>
                              <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                              <span>Recent</span>
                            </>
                          )}
                        </div>
                        <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-primary-600 transition-colors ml-2" />
                      </div>
                    </Link>
                  )
                })}

                <div className="text-center pt-4">
                  <Link
                    to="/images"
                    className="inline-flex items-center px-4 py-2 bg-primary-100 text-primary-700 rounded-lg hover:bg-primary-200 transition-colors text-sm font-medium"
                  >
                    View All Traffic Data
                    <ExternalLink className="w-4 h-4 ml-2" />
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Traffic Pattern Insights */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900 dark:to-indigo-900 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <BarChart3 className="w-5 h-5 text-blue-600" />
              </div>
              <span>Traffic Pattern Insights</span>
            </h3>
          </div>

          <div className="p-6">
            <div className="space-y-4">
              {/* Traffic Density Indicator */}
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-sm font-medium text-blue-800">Current Traffic Density</span>
                </div>
                <span className={`text-sm font-medium ${getTrafficStatusColor(vehicleStats?.total_vehicles_detected || 0)}`}>
                  {getTrafficStatusText(vehicleStats?.total_vehicles_detected || 0)}
                </span>
              </div>

              {/* AI Analysis Status */}
              <Link to="/analytics" className="group">
                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200 hover:bg-green-100 transition-colors cursor-pointer">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-medium text-green-800 group-hover:text-green-900">AI Analysis</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-green-600 font-medium">
                      {vehicleStats?.total_images_analyzed || 0} images analyzed
                    </span>
                    <ExternalLink className="w-3 h-3 text-green-400 group-hover:text-green-600" />
                  </div>
                </div>
              </Link>

              {/* Image Processing Status */}
              <Link to="/cameras" className="group">
                <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg border border-purple-200 hover:bg-purple-100 transition-colors cursor-pointer">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                    <span className="text-sm font-medium text-purple-800 group-hover:text-purple-900">Image Processing</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-purple-600 font-medium">
                      {stats?.images?.total_images || 0} total images
                    </span>
                    <ExternalLink className="w-3 h-3 text-purple-400 group-hover:text-purple-600" />
                  </div>
                </div>
              </Link>

              {/* Quick Actions */}
              <div className="mt-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
                <div className="flex items-start space-x-3">
                  <span className="text-2xl">💡</span>
                  <div>
                    <p className="text-sm font-medium text-amber-800 mb-1">Traffic Analysis Tip</p>
                    <p className="text-sm text-amber-700">
                      Use the Analytics page to identify traffic patterns, peak hours, and congestion trends across different locations and time periods.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>


      </div>
      {/* Network-Wide Vehicle Count Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900 dark:to-teal-900 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <BarChart3 className="w-5 h-5 text-emerald-600" />
            </div>
            <span>Network-Wide Vehicle Count (24 Hours)</span>
          </h3>
        </div>

        <div className="p-6">
          {vehicleCountsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
              <span className="ml-2 text-gray-600">Loading vehicle count data...</span>
            </div>
          ) : (
            <VehicleCountChart
              data={aggregatedVehicleCounts}
              title="Total Vehicles Across All Cameras"
              height={400}
              className="w-full"
              backgroundColor="rgba(16, 185, 129, 0.1)"
              borderColor="#10B981"
              aggregationInterval={aggregationInterval}
            />
          )}
        </div>
      </div>
    </div>
  )
}

export default Dashboard

