import React, {useEffect, useState} from 'react'
import {Camera, Clock, Info, Power, PowerOff, RefreshCw, Settings as SettingsIcon, Trash2} from 'lucide-react'
import axios from 'axios'
import {useToast} from '../contexts/ToastContext'

const Settings = () => {
  const { showSuccess, showError, showInfo } = useToast()
  const [systemStatus, setSystemStatus] = useState({
    database: 'Connected',
    api: 'Online',
    lastUpdate: 'Never',
    totalCameras: 0,
    enabledCameras: 0,
    disabledCameras: 0
  })

  const [loading, setLoading] = useState(false)
  const [updateMessage, setUpdateMessage] = useState('')
  const [aggregationInterval, setAggregationInterval] = useState(600000) // Default to 10 minutes
  const [configLoading, setConfigLoading] = useState(false)

  useEffect(() => {
    fetchSystemStatus()
    fetchAggregationInterval()
  }, [])

  const fetchSystemStatus = async () => {
    try {
      const [camerasResponse, imagesResponse] = await Promise.all([
        axios.get('/api/cameras'),
        axios.get('/api/images/stats/summary?hours=24')
      ])

      if (camerasResponse.data.success && imagesResponse.data.success) {
        const cameras = camerasResponse.data.data
        const enabledCount = cameras.filter(c => c.enabled).length
        const disabledCount = cameras.filter(c => !c.enabled).length

        setSystemStatus(prev => ({
          ...prev,
          totalCameras: cameras.length,
          enabledCameras: enabledCount,
          disabledCameras: disabledCount,
          lastUpdate: new Date().toLocaleString()
        }))
      }
    } catch (error) {
      console.error('Error fetching system status:', error)
    }
  }

  const fetchAggregationInterval = async () => {
    try {
      const response = await axios.get('/api/system/config/analytics.vehicleCountAggregationInterval')
      if (response.data.success) {
        setAggregationInterval(response.data.data.value)
      }
    } catch (error) {
      console.error('Error fetching aggregation interval:', error)
    }
  }

  const updateAggregationInterval = async () => {
    try {
      setConfigLoading(true)
      const response = await axios.put('/api/system/config/analytics.vehicleCountAggregationInterval', {
        value: aggregationInterval
      })

      if (response.data.success) {
        showSuccess('Aggregation interval updated successfully')
      } else {
        showError('Failed to update aggregation interval')
      }
    } catch (error) {
      console.error('Error updating aggregation interval:', error)
      if (error.response?.data?.error) {
        showError(`Failed to update aggregation interval: ${error.response.data.error}`)
      } else {
        showError('Failed to update aggregation interval')
      }
    } finally {
      setConfigLoading(false)
    }
  }

  const refreshCameras = async () => {
    try {
      setLoading(true)
      setUpdateMessage('Refreshing camera data...')

      const response = await axios.post('/api/cameras/refresh')

      if (response.data.success) {
        setUpdateMessage(`Successfully refreshed ${response.data.count} cameras`)
        await fetchSystemStatus() // Refresh the status
      } else {
        setUpdateMessage('Failed to refresh cameras')
      }
    } catch (error) {
      console.error('Error refreshing cameras:', error)
      setUpdateMessage('Error refreshing cameras')
    } finally {
      setLoading(false)
      // Clear message after 5 seconds
      setTimeout(() => setUpdateMessage(''), 5000)
    }
  }

  const updateCameraImages = async () => {
    try {
      setLoading(true)
      setUpdateMessage('Updating camera images...')

      const response = await axios.post('/api/cameras/update-images')

      if (response.data.success) {
        setUpdateMessage('Camera images updated successfully')
        await fetchSystemStatus() // Refresh the status
      } else {
        setUpdateMessage('Failed to update camera images')
      }
    } catch (error) {
      console.error('Error updating camera images:', error)
      setUpdateMessage('Error updating camera images')
    } finally {
      setLoading(false)
      setTimeout(() => setUpdateMessage(''), 5000)
    }
  }

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const handleDeleteAllImages = async () => {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true)
      return
    }

    try {
      setLoading(true)
      setUpdateMessage('Deleting all images...')

      const response = await axios.delete('/api/images/all')

      if (response.data.success) {
        showSuccess(`Successfully deleted ${response.data.data.deleted_records} images`)
        setUpdateMessage(`Successfully deleted ${response.data.data.deleted_records} images`)
        await fetchSystemStatus() // Refresh the status
      } else {
        showError('Failed to delete images')
        setUpdateMessage('Failed to delete images')
      }
    } catch (error) {
      console.error('Error deleting images:', error)
      showError('Error deleting images')
      setUpdateMessage('Error deleting images')
    } finally {
      setLoading(false)
      setShowDeleteConfirm(false)
      setTimeout(() => setUpdateMessage(''), 5000)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-2">System configuration and management</p>
      </div>

      {/* System Status */}
      <div className="card">
        <div className="flex items-center space-x-3 mb-4">
          <SettingsIcon className="w-6 h-6 text-gray-500" />
          <h3 className="text-lg font-semibold text-gray-900">System Status</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">Database</span>
              <span className="text-sm font-medium text-green-600">{systemStatus.database}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">API Status</span>
              <span className="text-sm font-medium text-green-600">{systemStatus.api}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">Last Update</span>
              <span className="text-sm text-gray-900">{systemStatus.lastUpdate}</span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">Total Cameras</span>
              <span className="text-sm font-medium text-blue-600">{systemStatus.totalCameras}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">Enabled Cameras</span>
              <div className="flex items-center space-x-2">
                <Power className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-600">{systemStatus.enabledCameras}</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">Disabled Cameras</span>
              <div className="flex items-center space-x-2">
                <PowerOff className="w-4 h-4 text-red-600" />
                <span className="text-sm font-medium text-red-600">{systemStatus.disabledCameras}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={refreshCameras}
            disabled={loading}
            className="flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className="w-5 h-5 mr-2" />
            Refresh Camera Data
          </button>

          <button
            onClick={updateCameraImages}
            disabled={loading}
            className="flex items-center justify-center px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            <Camera className="w-5 h-5 mr-2" />
            Update Camera Images
          </button>

          <button
            onClick={handleDeleteAllImages}
            disabled={loading}
            className="flex items-center justify-center px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            <Trash2 className="w-5 h-5 mr-2" />
            Delete All Images
          </button>
        </div>

        {updateMessage && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">{updateMessage}</p>
          </div>
        )}
      </div>

      {/* Configuration */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Configuration</h3>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <h4 className="font-medium text-gray-900">Automatic Image Updates</h4>
              <p className="text-sm text-gray-600">Automatically fetch new images from cameras</p>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-red-600 font-medium mr-2">Disabled</span>
              <div className="w-12 h-6 bg-gray-200 rounded-full relative">
                <div className="w-6 h-6 bg-gray-400 rounded-full absolute left-0 transition-transform"></div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <h4 className="font-medium text-gray-900">Change Detection</h4>
              <p className="text-sm text-gray-600">Compare images to detect traffic changes</p>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-green-600 font-medium mr-2">Enabled</span>
              <div className="w-12 h-6 bg-green-600 rounded-full relative">
                <div className="w-6 h-6 bg-white rounded-full absolute right-0 transition-transform"></div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <h4 className="font-medium text-gray-900">Image Storage</h4>
              <p className="text-sm text-gray-600">Store captured images locally</p>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-green-600 font-medium mr-2">Enabled</span>
              <div className="w-12 h-6 bg-green-600 rounded-full relative">
                <div className="w-6 h-6 bg-white rounded-full absolute right-0 transition-transform"></div>
              </div>
            </div>
          </div>

          {/* Vehicle Count Aggregation Interval Configuration */}
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="font-medium text-gray-900">Vehicle Count Aggregation Interval</h4>
                <p className="text-sm text-gray-600">
                  Time interval for grouping vehicle count data in charts (currently {Math.floor(aggregationInterval / 60000)} minutes)
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <select
                value={Math.floor(aggregationInterval / 60000)}
                onChange={(e) => setAggregationInterval(parseInt(e.target.value) * 60000)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={configLoading}
              >
                <option value={1}>1 minute</option>
                <option value={2}>2 minutes</option>
                <option value={5}>5 minutes</option>
                <option value={10}>10 minutes</option>
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={60}>60 minutes</option>
              </select>

              <button
                onClick={updateAggregationInterval}
                disabled={configLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center space-x-2"
              >
                {configLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Updating...</span>
                  </>
                ) : (
                  <>
                    <Clock className="w-4 h-4" />
                    <span>Update Interval</span>
                  </>
                )}
              </button>
            </div>

            <p className="text-xs text-gray-500 mt-2">
              Changes will take effect immediately for new chart data. Existing charts may need to be refreshed.
            </p>
          </div>
        </div>
      </div>

      {/* Information */}
      <div className="card">
        <div className="flex items-center space-x-3 mb-4">
          <Info className="w-6 h-6 text-blue-500" />
          <h3 className="text-lg font-semibold text-gray-900">System Information</h3>
        </div>

        <div className="space-y-3 text-sm text-gray-600">
          <p>• Camera updates are now <strong>disabled by default</strong> to conserve resources</p>
          <p>• Use the "Update Camera Images" button to manually fetch new images</p>
          <p>• Individual cameras can be enabled/disabled from the Cameras page</p>
          <p>• Only enabled cameras will be processed during manual updates</p>
          <p>• Change detection and image storage remain active for enabled cameras</p>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Confirm Deletion</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete all images? This action cannot be undone and will remove all stored camera images.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAllImages}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Deleting...' : 'Delete All Images'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Settings
