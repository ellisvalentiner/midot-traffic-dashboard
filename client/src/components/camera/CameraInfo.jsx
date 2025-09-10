import React from 'react'
import {Brain, Camera, ExternalLink, MapPin, Power, PowerOff} from 'lucide-react'
import StatusBadge from '../ui/StatusBadge'

const CameraInfo = ({
  camera,
  onToggleStatus,
  onToggleAI,
  showControls = true,
  className = ''
}) => {
  if (!camera) return null

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown'
    try {
      return new Date(dateString).toLocaleString()
    } catch (error) {
      return 'Invalid date'
    }
  }

  const getTrafficDensityColor = (vehicleCount) => {
    if (!vehicleCount || vehicleCount === 0) return 'no-traffic'
    if (vehicleCount < 5) return 'light'
    if (vehicleCount < 15) return 'medium'
    return 'heavy'
  }

  const getTrafficDensityText = (vehicleCount) => {
    if (!vehicleCount || vehicleCount === 0) return 'No Traffic'
    if (vehicleCount < 5) return 'Light'
    if (vehicleCount < 15) return 'Medium'
    return 'Heavy'
  }

  return (
    <div className={`bg-white rounded-xl shadow-sm border-2 p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Camera className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {camera.name || `Camera ${camera.camera_id}`}
            </h1>
            <div className="flex items-center space-x-2 text-gray-600">
              <MapPin className="h-4 w-4" />
              <span>{camera.road_name || 'Unknown Road'}</span>
              {camera.county && (
                <>
                  <span>•</span>
                  <span>{camera.county}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Status Badges */}
        <div className="flex flex-col items-end space-y-2">
          <StatusBadge
            type="general"
            status={camera.enabled ? 'enabled' : 'disabled'}
            showIcon
            icon={camera.enabled ? Power : PowerOff}
          />
          <StatusBadge
            type="general"
            status={camera.ai_analysis_enabled ? 'enabled' : 'disabled'}
            showIcon
            icon={Brain}
          />
        </div>
      </div>

      {/* Camera Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Camera Details</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Camera ID:</span>
                <span className="font-medium">{camera.camera_id}</span>
              </div>
              {camera.intersection && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Intersection:</span>
                  <span className="font-medium">{camera.intersection}</span>
                </div>
              )}
              {camera.image_url && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Source:</span>
                  <a
                    href={camera.image_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                  >
                    <span>External Link</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Status Information</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Last Updated:</span>
                <span className="font-medium">{formatDate(camera.updated_at)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Created:</span>
                <span className="font-medium">{formatDate(camera.created_at)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      {showControls && (
        <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200">
          <button
            onClick={() => onToggleStatus && onToggleStatus()}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
              camera.enabled
                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                : 'bg-green-100 text-green-700 hover:bg-green-200'
            }`}
          >
            {camera.enabled ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
            <span>{camera.enabled ? 'Disable Camera' : 'Enable Camera'}</span>
          </button>

          <button
            onClick={() => onToggleAI && onToggleAI()}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
              camera.ai_analysis_enabled
                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                : 'bg-green-100 text-green-700 hover:bg-green-200'
            }`}
          >
            <Brain className="h-4 w-4" />
            <span>{camera.ai_analysis_enabled ? 'Disable AI Analysis' : 'Enable AI Analysis'}</span>
          </button>
        </div>
      )}
    </div>
  )
}

export default CameraInfo
