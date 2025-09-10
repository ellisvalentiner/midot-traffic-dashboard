import React from 'react'
import {Brain, Clock, Download, Eye, ImageIcon, TrendingUp} from 'lucide-react'
import {format} from 'date-fns'
import {parseSQLiteDate} from '../utils/dateUtils'

const ImageCard = ({
  image,
  isLatest = false,
  showSelection = false,
  isSelected = false,
  onSelectionChange = null,
  onView = null,
  onDownload = null,
  onAnalyze = null,
  onReanalyze = null,
  onRetry = null,
  showTrafficAnalysis = true,
  showLatestBadge = true,
  showChangeBadge = false,
  className = '',
  isAnalyzing = false
}) => {
  // Safety check - ensure image object exists and has required properties
  if (!image || !image.id) {
    console.error('ImageCard: Invalid image object provided', image)
    return null
  }

  const imageUrl = image.local_path ? `/api/images/file/${image.local_path.split('/').pop()}` : null

  const getTrafficDensityColor = (vehicleCount) => {
    if (!vehicleCount || vehicleCount === 0) return 'bg-gray-100 text-gray-800'
    if (vehicleCount < 5) return 'bg-green-100 text-green-800'
    if (vehicleCount < 15) return 'bg-yellow-100 text-yellow-800'
    return 'bg-red-100 text-red-800'
  }

  const getTrafficDensityText = (vehicleCount) => {
    if (!vehicleCount || vehicleCount === 0) return 'No Traffic'
    if (vehicleCount < 5) return 'Light'
    if (vehicleCount < 15) return 'Medium'
    return 'Heavy'
  }

  const formatImageDate = (dateString) => {
    if (!dateString) return 'No date'
    try {
      // Use our SQLite-aware date parser for consistent timezone handling
      const parsedDate = parseSQLiteDate(dateString)
      return format(parsedDate, 'MMM d, yyyy, h:mm a')
    } catch (error) {
      console.error('Error formatting date:', dateString, error)
      return 'Invalid date'
    }
  }

  return (
    <div className={`bg-white rounded-xl shadow-sm border-2 transition-all duration-200 hover:shadow-md ${className}`}>
      {/* Image Selection Checkbox
      {showSelection && (
        <div className="p-3 border-b border-gray-100">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onSelectionChange && onSelectionChange(image.id)}
              className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
            <span className="text-sm font-medium text-gray-700">Select for Analysis</span>
          </label>
        </div>
      )} */}

      {/* Image Display */}
      <div className="relative p-4">
        <div className="relative w-full h-48 bg-gray-200 rounded-lg overflow-hidden">
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
                <ImageIcon className="w-12 h-12 text-gray-400" />
              </div>
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageIcon className="w-12 h-12 text-gray-400" />
            </div>
          )}

          {/* Latest Image Badge */}
          {showLatestBadge && isLatest && (
            <div className="absolute top-2 right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full flex items-center space-x-1 shadow-sm">
              <Clock className="w-3 h-3" />
              <span>Latest</span>
            </div>
          )}

          {/* Change Detection Badge */}
          {showChangeBadge && image.has_changed && (
            <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full flex items-center space-x-1 shadow-sm">
              <TrendingUp className="w-3 h-3" />
              <span>Changed</span>
            </div>
          )}

          {/* Traffic Density Badge */}
          {showTrafficAnalysis && image.vehicle_count && (
            <div className={`absolute bottom-2 left-2 px-2 py-1 rounded-full text-xs font-semibold shadow-sm ${getTrafficDensityColor(image.vehicle_count)}`}>
              {getTrafficDensityText(image.vehicle_count)}
            </div>
          )}

        </div>
      </div>

      {/* Image Information */}
      <div className="p-4 space-y-3">
        <div>
          <h4 className="font-semibold text-gray-900 truncate">
            {image.camera_name || `Camera ${image.camera_id || 'Unknown'}`}
          </h4>
          <p className="text-sm text-gray-600">
            {image.created_at ? formatImageDate(image.created_at) : 'Unknown date'}
          </p>
        </div>



        {/* Image Pills - Status and Vehicle Count */}
        {showTrafficAnalysis && (
          <div className="flex items-center space-x-2 mb-3">
            {/* Analysis Status Badge */}
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              image.analysis_status === 'completed' ? 'bg-green-100 text-green-800' :
              image.analysis_status === 'failed' ? 'bg-red-100 text-red-800' :
              image.analysis_status === 'processing' ? 'bg-blue-100 text-blue-800' :
              image.analysis_status === 'queued' ? 'bg-purple-100 text-purple-800' :
              image.analysis_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {image.analysis_status === 'completed' ? 'Completed' :
               image.analysis_status === 'failed' ? 'Failed' :
               image.analysis_status === 'processing' ? 'Processing' :
               image.analysis_status === 'queued' ? 'Queued' :
               image.analysis_status === 'pending' ? 'Pending' :
               'Not Analyzed'}
            </span>

            {/* AI Analysis Status Badge */}
            <div className={`px-2 py-1 rounded-full text-xs font-semibold shadow-sm ${isAnalyzing ? 'bg-blue-100 text-blue-800' :
              image.analysis_status === 'completed' ? 'bg-green-100 text-green-800' :
                image.analysis_status === 'failed' ? 'bg-red-100 text-red-800' :
                  image.analysis_status === 'processing' ? 'bg-blue-100 text-blue-800' :
                    image.analysis_status === 'queued' ? 'bg-purple-100 text-purple-800' :
                      image.analysis_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
              }`}>
              <Brain className="w-3 h-3 inline mr-1" />
              {isAnalyzing ? 'AI Analyzing' :
                image.analysis_status === 'completed' ? 'AI Complete' :
                  image.analysis_status === 'failed' ? 'AI Failed' :
                    image.analysis_status === 'processing' ? 'AI Processing' :
                      image.analysis_status === 'queued' ? 'AI Queued' :
                        image.analysis_status === 'pending' ? 'AI Pending' : 'AI Not Started'}
            </div>

            {/* Vehicle Count Badge - Only show when analysis is completed and count is available */}
            {image.analysis_status === 'completed' && image.vehicle_count && image.vehicle_count > 0 && (
              <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">
                {image.vehicle_count} vehicles
              </span>
            )}

            {/* Analyzing Status Indicator */}
            {isAnalyzing && (
              <div className="flex items-center space-x-2 px-3 py-1.5 rounded-md text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span>Analyzing...</span>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-2">
          {/* View Button - Always visible */}
          <button
            onClick={() => {
              onView && onView(image)
            }}
            className="flex-1 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm font-medium"
          >
            <Eye className="w-4 h-4 inline mr-1" />
            View
          </button>

          {/* Analyze/Reanalyze Button */}
          {showTrafficAnalysis && !isAnalyzing && (
            <>
              {!image.analysis_status || image.analysis_status === 'failed' || image.analysis_status === 'pending' ? (
                <button
                  onClick={() => {
                    if (image.analysis_status === 'failed' && onRetry) {
                      onRetry(image)
                    } else if (onAnalyze) {
                      onAnalyze(image)
                    }
                  }}
                  disabled={!onAnalyze && !onRetry}
                  className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 shadow-sm ${
                    image.analysis_status === 'failed' 
                      ? 'bg-red-100 text-red-700 hover:bg-red-200 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed' 
                      : 'bg-blue-100 text-blue-700 hover:bg-blue-200 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed'
                  }`}
                  title={`Analyze this image manually (works even when camera AI is disabled). Callbacks: onAnalyze=${!!onAnalyze}, onRetry=${!!onRetry}`}
                >
                  {image.analysis_status === 'failed' ? 'Retry' : 'Analyze Now'}
                </button>
              ) : (
                <button
                  onClick={() => {
                    onReanalyze && onReanalyze(image)
                  }}
                  disabled={!onReanalyze || image.analysis_status === 'processing' || image.analysis_status === 'queued'}
                  className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${
                    image.analysis_status === 'completed' 
                      ? 'bg-green-100 text-green-700 hover:bg-green-200 hover:shadow-md' 
                      : image.analysis_status === 'processing' || image.analysis_status === 'queued'
                      ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                      : 'bg-green-100 text-green-700 hover:bg-green-200 hover:shadow-md'
                  }`}
                  title={
                    image.analysis_status === 'processing' 
                      ? 'Image is currently being processed by AI' 
                      : image.analysis_status === 'queued'
                      ? 'Image is queued for AI processing'
                      : `Reanalyze this image. Callback: onReanalyze=${!!onReanalyze}`
                  }
                >
                  {image.analysis_status === 'processing' ? 'Processing...' : 
                   image.analysis_status === 'queued' ? 'Queued' : 'Reanalyze'}
                </button>
              )}
            </>
          )}

          {onDownload && (
            <button
              onClick={() => onDownload(image)}
              className="flex-1 px-3 py-2 bg-primary-100 text-primary-700 rounded-lg hover:bg-primary-200 hover:shadow-md transition-all duration-200 shadow-sm text-sm font-medium"
            >
              <Download className="w-4 h-4 inline mr-1" />
              Download
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default ImageCard
