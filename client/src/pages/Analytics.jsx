import React, {useEffect, useState} from 'react'
import {
    Activity,
    AlertTriangle,
    BarChart3,
    Car,
    Clock,
    LineChart,
    MapPin,
    PieChart,
    RefreshCw,
    TrendingUp,
    Truck
} from 'lucide-react'
import {parseSQLiteDate} from '../utils/dateUtils'
import axios from 'axios'
import {format} from 'date-fns'

const Analytics = () => {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState(null)
  const [vehicleStats, setVehicleStats] = useState(null)
  const [trends, setTrends] = useState([])
  const [cameraStats, setCameraStats] = useState([])
  const [timeRange, setTimeRange] = useState('7d')
  const [selectedCamera, setSelectedCamera] = useState('')
  const [trafficInsights, setTrafficInsights] = useState([])
  const [peakHours, setPeakHours] = useState([])
  const [vehicleDistribution, setVehicleDistribution] = useState({})

  useEffect(() => {
    fetchAnalyticsData()
  }, [timeRange, selectedCamera])

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true)

      const [statsRes, vehicleRes, trendsRes, cameraRes] = await Promise.all([
        axios.get('/api/images/stats/summary'),
        axios.get(`/api/vehicle-detection/stats?time_range=${timeRange}${selectedCamera ? `&camera_id=${selectedCamera}` : ''}`),
        axios.get(`/api/vehicle-detection/trends?days=${timeRange === '24h' ? 1 : timeRange === '7d' ? 7 : 30}`),
        axios.get('/api/cameras')
      ])

      setStats(statsRes.data.data)
      setVehicleStats(vehicleRes.data.data)
      setTrends(trendsRes.data.data)
      setCameraStats(cameraRes.data.data)

      // Generate traffic insights
      generateTrafficInsights(vehicleRes.data.data, trendsRes.data.data)

      // Analyze peak hours
      analyzePeakHours(trendsRes.data.data)

      // Calculate vehicle distribution
      calculateVehicleDistribution(vehicleRes.data.data)

    } catch (error) {
      console.error('Error fetching analytics data:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateTrafficInsights = (vehicleData, trendData) => {
    const insights = []

    if (vehicleData) {
      // Traffic volume insights
      if (vehicleData.total_vehicles_detected > 1000) {
        insights.push({
          type: 'high_volume',
          icon: '🚗',
          title: 'High Traffic Volume',
          description: `Detected ${vehicleData.total_vehicles_detected} vehicles in the selected period`,
          severity: 'info'
        })
      }

      // Confidence insights
      if (vehicleData.avg_confidence < 0.8) {
        insights.push({
          type: 'low_confidence',
          icon: '⚠️',
          title: 'Analysis Quality Alert',
          description: `Average confidence score is ${(vehicleData.avg_confidence * 100).toFixed(1)}% - consider reviewing low-confidence detections`,
          severity: 'warning'
        })
      }

      // Vehicle mix insights
      if (vehicleData.total_trucks > vehicleData.total_cars * 0.3) {
        insights.push({
          type: 'commercial_heavy',
          icon: '🚛',
          title: 'Commercial Traffic Dominant',
          description: 'Significant commercial vehicle presence detected',
          severity: 'info'
        })
      }
    }

    if (trendData && trendData.length > 1) {
      // Trend analysis
      const recentTrend = trendData.slice(0, 3)
      const avgRecent = recentTrend.reduce((sum, day) => sum + day.total_vehicles, 0) / recentTrend.length
      const avgOverall = trendData.reduce((sum, day) => sum + day.total_vehicles, 0) / trendData.length

      if (avgRecent > avgOverall * 1.2) {
        insights.push({
          type: 'increasing_trend',
          icon: '📈',
          title: 'Traffic Volume Increasing',
          description: 'Recent traffic volume is 20%+ higher than the period average',
          severity: 'success'
        })
      } else if (avgRecent < avgOverall * 0.8) {
        insights.push({
          type: 'decreasing_trend',
          icon: '📉',
          title: 'Traffic Volume Decreasing',
          description: 'Recent traffic volume is 20%+ lower than the period average',
          severity: 'warning'
        })
      }
    }

    setTrafficInsights(insights)
  }

  const analyzePeakHours = (trendData) => {
    if (!trendData || trendData.length === 0) return

    // Group by hour and calculate average vehicles
    const hourlyData = {}
    trendData.forEach(day => {
              // Use our SQLite-aware date parser for consistent timezone handling
        const parsedDate = parseSQLiteDate(day.date)
        const hour = parsedDate.getHours()
      if (!hourlyData[hour]) hourlyData[hour] = []
      hourlyData[hour].push(day.total_vehicles)
    })

    const hourlyAverages = Object.entries(hourlyData).map(([hour, values]) => ({
      hour: parseInt(hour),
      avgVehicles: values.reduce((sum, val) => sum + val, 0) / values.length
    }))

    // Sort by hour and identify peaks
    hourlyAverages.sort((a, b) => a.hour - b.hour)
    setPeakHours(hourlyAverages)
  }

  const calculateVehicleDistribution = (vehicleData) => {
    if (!vehicleData) return

    const total = vehicleData.total_vehicles_detected || 1
    setVehicleDistribution({
      cars: { count: vehicleData.total_cars || 0, percentage: ((vehicleData.total_cars || 0) / total * 100).toFixed(1) },
      trucks: { count: vehicleData.total_trucks || 0, percentage: ((vehicleData.total_trucks || 0) / total * 100).toFixed(1) },
      motorcycles: { count: vehicleData.total_motorcycles || 0, percentage: ((vehicleData.total_motorcycles || 0) / total * 100).toFixed(1) },
      buses: { count: vehicleData.total_buses || 0, percentage: ((vehicleData.total_buses || 0) / total * 100).toFixed(1) },
      rvs: { count: vehicleData.total_rvs || 0, percentage: ((vehicleData.total_rvs || 0) / total * 100).toFixed(1) },
      emergency: { count: vehicleData.total_emergency || 0, percentage: ((vehicleData.total_emergency || 0) / total * 100).toFixed(1) },
      construction: { count: vehicleData.total_construction || 0, percentage: ((vehicleData.total_construction || 0) / total * 100).toFixed(1) },
      other: { count: vehicleData.total_other || 0, percentage: ((vehicleData.total_other || 0) / total * 100).toFixed(1) }
    })
  }

  const getTimeRangeLabel = (range) => {
    switch (range) {
      case '24h': return 'Last 24 Hours'
      case '7d': return 'Last 7 Days'
      case '30d': return 'Last 30 Days'
      default: return 'Last 7 Days'
    }
  }

  const getInsightColor = (severity) => {
    switch (severity) {
      case 'success': return 'bg-green-50 border-green-200 text-green-800'
      case 'warning': return 'bg-amber-50 border-amber-200 text-amber-800'
      case 'error': return 'bg-red-50 border-red-200 text-red-800'
      default: return 'bg-blue-50 border-blue-200 text-blue-800'
    }
  }

  const getInsightIconColor = (severity) => {
    switch (severity) {
      case 'success': return 'text-green-600'
      case 'warning': return 'text-amber-600'
      case 'error': return 'text-red-600'
      default: return 'text-blue-600'
    }
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
      {/* Enhanced Header with Traffic Analytics Focus */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Traffic Analytics Center</h1>
            <p className="text-gray-600 mt-2">Comprehensive traffic pattern analysis, trends, and insights</p>
          </div>
          <div className="flex items-center space-x-4">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="form-select"
            >
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>
            <select
              value={selectedCamera}
              onChange={(e) => setSelectedCamera(e.target.value)}
              className="form-select"
            >
              <option value="">All Cameras</option>
              {cameraStats.map((camera) => (
                <option key={camera.camera_id} value={camera.camera_id}>
                  {camera.name || `Camera ${camera.camera_id}`}
                </option>
              ))}
            </select>
            <button
              onClick={fetchAnalyticsData}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium flex items-center"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </button>
          </div>
        </div>

        {/* Traffic Insights Banner */}
        {trafficInsights.length > 0 && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-center space-x-3 mb-3">
              <AlertTriangle className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-blue-800">Traffic Insights</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {trafficInsights.map((insight, index) => (
                <div key={index} className={`p-3 rounded-lg border ${getInsightColor(insight.severity)}`}>
                  <div className="flex items-start space-x-2">
                    <span className="text-lg">{insight.icon}</span>
                    <div>
                      <p className="font-medium text-sm">{insight.title}</p>
                      <p className="text-xs opacity-80">{insight.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Key Traffic Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl p-6 border border-blue-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Car className="w-6 h-6 text-blue-600" />
            </div>
            <TrendingUp className="w-5 h-5 text-blue-400" />
          </div>
          <div className="text-3xl font-bold text-blue-900 mb-2">
            {vehicleStats?.total_vehicles_detected || 0}
          </div>
          <p className="text-blue-700 font-medium">Total Vehicles</p>
          <p className="text-sm text-blue-600 mt-1">
            {getTimeRangeLabel(timeRange)}
          </p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-xl p-6 border border-green-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <BarChart3 className="w-6 h-6 text-green-600" />
            </div>
            <Activity className="w-5 h-5 text-green-400" />
          </div>
          <div className="text-3xl font-bold text-green-900 mb-2">
            {vehicleStats?.avg_vehicles_per_image?.toFixed(1) || 0}
          </div>
          <p className="text-green-700 font-medium">Avg per Image</p>
          <p className="text-sm text-green-600 mt-1">
            {vehicleStats?.total_images_analyzed || 0} images analyzed
          </p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-violet-100 rounded-xl p-6 border border-purple-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Truck className="w-6 h-6 text-purple-600" />
            </div>
            <MapPin className="w-5 h-5 text-purple-400" />
          </div>
          <div className="text-3xl font-bold text-purple-900 mb-2">
            {vehicleStats?.total_cars || 0}
          </div>
          <p className="text-purple-700 font-medium">Passenger Vehicles</p>
          <p className="text-sm text-purple-600 mt-1">
            {vehicleStats?.total_trucks || 0} commercial vehicles
          </p>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-orange-100 rounded-xl p-6 border border-amber-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-amber-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-amber-600" />
            </div>
            <Clock className="w-5 h-5 text-amber-400" />
          </div>
          <div className="text-3xl font-bold text-amber-900 mb-2">
            {vehicleStats?.avg_confidence ? (vehicleStats.avg_confidence * 100).toFixed(0) : 0}%
          </div>
          <p className="text-amber-700 font-medium">AI Confidence</p>
          <p className="text-sm text-amber-600 mt-1">
            {vehicleStats?.failed_analyses || 0} failed analyses
          </p>
        </div>
      </div>

      {/* Traffic Pattern Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Vehicle Type Distribution */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-900 dark:to-violet-900 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
              <div className="p-2 bg-purple-100 rounded-lg">
                <PieChart className="w-5 h-5 text-purple-600" />
              </div>
              <span>Vehicle Type Distribution</span>
            </h3>
          </div>

          <div className="p-6">
            <div className="space-y-4">
              {Object.entries(vehicleDistribution).map(([type, data]) => (
                <div key={type} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-4 h-4 bg-purple-500 rounded-full"></div>
                    <span className="font-medium text-gray-700 capitalize">
                      {type === 'emergency' ? 'Emergency' :
                       type === 'construction' ? 'Construction' : type}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-gray-900">{data.count}</div>
                    <div className="text-sm text-gray-500">{data.percentage}%</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Peak Hours Analysis */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900 dark:to-emerald-900 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
              <div className="p-2 bg-green-100 rounded-lg">
                <LineChart className="w-5 h-5 text-green-600" />
              </div>
              <span>Peak Hours Analysis</span>
            </h3>
          </div>

          <div className="p-6">
            {peakHours.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm">No hourly data available</p>
              </div>
            ) : (
              <div className="space-y-3">
                {peakHours.map((hourData, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <span className="text-lg font-semibold text-gray-900">
                        {hourData.hour.toString().padStart(2, '0')}:00
                      </span>
                      <span className="text-sm text-gray-600">
                        {hourData.hour >= 6 && hourData.hour <= 9 ? 'Morning Peak' :
                         hourData.hour >= 16 && hourData.hour <= 19 ? 'Evening Peak' :
                         hourData.hour >= 22 || hourData.hour <= 5 ? 'Night' : 'Day'}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-gray-900">
                        {hourData.avgVehicles.toFixed(1)}
                      </div>
                      <div className="text-sm text-gray-500">avg vehicles</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Traffic Trends Over Time */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900 dark:to-indigo-900 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <span>Traffic Trends - {getTimeRangeLabel(timeRange)}</span>
          </h3>
        </div>

        <div className="p-6">
          {trends.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <BarChart3 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No trend data available</h3>
              <p className="text-sm text-gray-600">Traffic trends will appear here as data accumulates</p>
            </div>
          ) : (
            <div className="space-y-4">
              {trends.map((day, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className="text-center">
                      <div className="text-lg font-semibold text-gray-900">
                        {format(parseSQLiteDate(day.date), 'MMM dd')}
                      </div>
                      <div className="text-sm text-gray-500">
                        {format(parseSQLiteDate(day.date), 'EEE')}
                      </div>
                    </div>

                    <div className="flex items-center space-x-6">
                      <div className="text-center">
                        <div className="text-sm font-medium text-gray-600">Images</div>
                        <div className="text-lg font-semibold text-blue-600">{day.images_analyzed}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-medium text-gray-600">Total Vehicles</div>
                        <div className="text-lg font-semibold text-green-600">{day.total_vehicles}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-medium text-gray-600">Avg per Image</div>
                        <div className="text-lg font-semibold text-purple-600">{day.avg_vehicles_per_image?.toFixed(1) || 0}</div>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm text-gray-500">Vehicle Mix</div>
                    <div className="text-xs text-gray-600">
                      Cars: {day.total_cars || 0} | Trucks: {day.total_trucks || 0}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Traffic Pattern Recommendations */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900 dark:to-orange-900 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
            <div className="p-2 bg-amber-100 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <span>Traffic Pattern Recommendations</span>
          </h3>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900">Based on Current Data</h4>

              {vehicleStats?.total_vehicles_detected > 1000 && (
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="flex items-start space-x-3">
                    <span className="text-2xl">🚗</span>
                    <div>
                      <p className="font-medium text-blue-800">High Traffic Volume</p>
                      <p className="text-sm text-blue-700 mt-1">
                        Consider implementing congestion monitoring and traffic flow optimization strategies.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {vehicleStats?.avg_confidence < 0.8 && (
                <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                  <div className="flex items-start space-x-3">
                    <span className="text-2xl">⚠️</span>
                    <div>
                      <p className="font-medium text-amber-800">Analysis Quality</p>
                      <p className="text-sm text-amber-700 mt-1">
                        Review low-confidence detections and consider camera positioning adjustments.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {vehicleStats?.total_trucks > vehicleStats?.total_cars * 0.3 && (
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                  <div className="flex items-start space-x-3">
                    <span className="text-2xl">🚛</span>
                    <div>
                      <p className="font-medium text-purple-800">Commercial Traffic</p>
                      <p className="text-sm text-purple-700 mt-1">
                        Monitor freight patterns and consider commercial vehicle routing optimization.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900">Optimization Suggestions</h4>

              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <div className="flex items-start space-x-3">
                  <span className="text-2xl">💡</span>
                  <div>
                    <p className="font-medium text-green-800">Data Collection</p>
                    <p className="text-sm text-green-700 mt-1">
                      Continue monitoring traffic patterns to identify recurring congestion points and peak hours.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
                <div className="flex items-start space-x-3">
                  <span className="text-2xl">📊</span>
                  <div>
                    <p className="font-medium text-indigo-800">Analysis Enhancement</p>
                    <p className="text-sm text-indigo-700 mt-1">
                      Use the comparison tools to analyze traffic changes between different time periods and locations.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-teal-50 p-4 rounded-lg border border-teal-200">
                <div className="flex items-start space-x-3">
                  <span className="text-2xl">🎯</span>
                  <div>
                    <p className="font-medium text-teal-800">Strategic Planning</p>
                    <p className="text-sm text-teal-700 mt-1">
                      Leverage traffic pattern data for infrastructure planning and traffic management decisions.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Analytics
