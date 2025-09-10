import React from 'react'
import {BarChart3, Calendar, Car, Download, X} from 'lucide-react'
import BoundingBoxCanvas from '../BoundingBoxCanvas'
import StatusBadge from '../ui/StatusBadge'
import LoadingSpinner from '../ui/LoadingSpinner'

const ImageModal = ({
  image,
  isOpen = false,
  onClose,
  vehicleDetectionData = null,
  loadingVehicleData = false,
  onAnalyze,
  onReanalyze,
  onRetry,
  className = ''
}) => {
  if (!isOpen || !image) return null

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown'
    try {
      return new Date(dateString).toLocaleString()
    } catch (error) {
      return 'Invalid date'
    }
  }

  const handleDownload = () => {
    if (!image.local_path) return

    const link = document.createElement('a')
    link.href = `/api/images/file/${image.local_path.split('/').pop()}`
    link.download = `camera-${image.camera_id}-${formatDate(image.created_at)}.jpg`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleAnalyze = () => {
    if (onAnalyze) {
      onAnalyze(image)
    }
  }

  const handleReanalyze = () => {
    if (onReanalyze) {
      onReanalyze(image)
    }
  }

  const handleRetry = () => {
    if (onRetry) {
      onRetry(image)
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />

        {/* Modal content */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          {/* Header */}
          <div className="bg-white px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Car className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    Image Analysis
                  </h3>
                  <p className="text-sm text-gray-500">
                    {image.camera_name || `Camera ${image.camera_id}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleDownload}
                  className="p-2 text-gray-400 hover:text-gray-600"
                  title="Download Image"
                >
                  <Download className="h-5 w-5" />
                </button>
                <button
                  onClick={onClose}
                  className="p-2 text-gray-400 hover:text-gray-600"
                  title="Close Modal"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="bg-white px-6 py-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column - Image */}
              <div className="space-y-4">
                <div className="relative">
                  <BoundingBoxCanvas
                    imageSrc={`/api/images/file/${image.local_path?.split('/').pop()}`}
                    boundingBoxes={vehicleDetectionData?.bounding_boxes || []}
                    imageWidth={800}
                    imageHeight={600}
                    className="w-full h-auto rounded-lg border border-gray-200"
                  />
                </div>

                {/* Image Details */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-3">Image Details</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-600">Captured:</span>
                      <span className="font-medium">{formatDate(image.created_at)}</span>
                    </div>
                    {image.has_changed && (
                      <div className="flex items-center space-x-2">
                        <BarChart3 className="h-4 w-4 text-green-500" />
                        <span className="text-green-600 font-medium">Change Detected</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column - Analysis Data */}
              <div className="space-y-4">
                {/* Analysis Status */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-3">Analysis Status</h4>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">Status:</span>
                      <StatusBadge
                        type="analysis"
                        status={image.analysis_status || 'not-analyzed'}
                        size="sm"
                      />
                    </div>
                    {image.vehicle_count !== undefined && (
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600">Vehicles:</span>
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                          {image.vehicle_count} detected
                        </span>
                      </div>
                    )}
                    {image.confidence_score !== undefined && (
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600">Confidence:</span>
                        <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                          {Math.round(image.confidence_score * 100)}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Vehicle Detection Data */}
                {loadingVehicleData ? (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-3">Vehicle Detection</h4>
                    <LoadingSpinner size="md" text="Loading detection data..." showText />
                  </div>
                ) : vehicleDetectionData ? (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-3">Vehicle Detection</h4>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600">Total Vehicles:</span>
                        <span className="font-medium">{vehicleDetectionData.total_vehicles || 0}</span>
                      </div>
                      {vehicleDetectionData.vehicles && (
                        <div className="space-y-1">
                          <span className="text-sm text-gray-600">Breakdown:</span>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            {Object.entries(vehicleDetectionData.vehicles).map(([type, count]) => (
                              count > 0 && (
                                <div key={type} className="flex justify-between">
                                  <span className="capitalize">{type}:</span>
                                  <span className="font-medium">{count}</span>
                                </div>
                              )
                            ))}
                          </div>
                        </div>
                      )}
                      {vehicleDetectionData.bounding_boxes && (
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-600">Bounding Boxes:</span>
                          <span className="font-medium">{vehicleDetectionData.bounding_boxes.length}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}

                {/* Action Buttons */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-3">Actions</h4>
                  <div className="space-y-2">
                    {!image.analysis_status || image.analysis_status === 'failed' ? (
                      <button
                        onClick={handleAnalyze}
                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {image.analysis_status === 'failed' ? 'Retry Analysis' : 'Analyze Image'}
                      </button>
                    ) : image.analysis_status === 'completed' ? (
                      <button
                        onClick={handleReanalyze}
                        className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                      >
                        Reanalyze Image
                      </button>
                    ) : (
                      <div className="text-center text-sm text-gray-500">
                        Analysis in progress...
                      </div>
                    )}
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

export default ImageModal
