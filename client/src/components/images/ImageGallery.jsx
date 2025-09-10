import React from 'react'
import {ChevronLeft, ChevronRight, RefreshCw} from 'lucide-react'
import ImageCard from '../ImageCard'
import LoadingSpinner from '../ui/LoadingSpinner'
import ErrorMessage from '../ui/ErrorMessage'

const ImageGallery = ({
  images = [],
  loading = false,
  error = null,
  pagination = {},
  onLoadMore,
  onRefresh,
  onImageAction,
  showPagination = true,
  showRefresh = true,
  className = ''
}) => {
  const {
    page = 1,
    limit = 20,
    total = 0,
    hasMore = false
  } = pagination

  const totalPages = Math.ceil(total / limit)

  const handleLoadMore = () => {
    if (onLoadMore && hasMore) {
      onLoadMore()
    }
  }

  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh()
    }
  }

  if (loading && images.length === 0) {
    return (
      <div className="flex justify-center items-center py-12">
        <LoadingSpinner size="lg" text="Loading images..." showText />
      </div>
    )
  }

  if (error) {
    return (
      <ErrorMessage
        error={error}
        title="Failed to load images"
        onDismiss={() => onRefresh && onRefresh()}
      />
    )
  }

  if (images.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500">
          <p className="text-lg font-medium">No images found</p>
          <p className="text-sm">Try adjusting your filters or refreshing the page</p>
        </div>
      </div>
    )
  }

  return (
    <div className={className}>
      {/* Header with refresh button */}
      {showRefresh && (
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            Images ({total} total)
          </h3>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      )}

      {/* Image Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {images.map((image) => (
          <ImageCard
            key={image.id}
            image={image}
            onView={onImageAction?.onView}
            onDownload={onImageAction?.onDownload}
            onAnalyze={onImageAction?.onAnalyze}
            onReanalyze={onImageAction?.onReanalyze}
            onRetry={onImageAction?.onRetry}
            onSelectionChange={onImageAction?.onSelectionChange}
            showSelection={onImageAction?.showSelection}
            isSelected={onImageAction?.isSelected?.(image.id)}
            isAnalyzing={onImageAction?.isAnalyzing?.(image.id)}
          />
        ))}
      </div>

      {/* Loading indicator for pagination */}
      {loading && images.length > 0 && (
        <div className="flex justify-center py-6">
          <LoadingSpinner size="md" text="Loading more images..." showText />
        </div>
      )}

      {/* Pagination */}
      {showPagination && totalPages > 1 && (
        <div className="flex items-center justify-between mt-8 px-4 py-3 bg-white border border-gray-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-700">
              Page {page} of {totalPages}
            </span>
            <span className="text-sm text-gray-500">
              ({total} total images)
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => onLoadMore && onLoadMore(page - 1)}
              disabled={page <= 1 || loading}
              className="flex items-center space-x-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Previous</span>
            </button>

            <button
              onClick={handleLoadMore}
              disabled={!hasMore || loading}
              className="flex items-center space-x-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <span>Next</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Load More Button (alternative to pagination) */}
      {!showPagination && hasMore && (
        <div className="flex justify-center mt-8">
          <button
            onClick={handleLoadMore}
            disabled={loading}
            className="px-6 py-3 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? (
              <LoadingSpinner size="sm" text="Loading..." showText />
            ) : (
              'Load More Images'
            )}
          </button>
        </div>
      )}
    </div>
  )
}

export default ImageGallery
