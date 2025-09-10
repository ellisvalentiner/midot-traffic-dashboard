import React from 'react'

const Skeleton = ({ 
  className = '', 
  width = 'w-full', 
  height = 'h-4', 
  rounded = 'rounded',
  animate = true 
}) => {
  const baseClasses = `bg-gray-200 ${width} ${height} ${rounded}`
  const animationClasses = animate ? 'animate-pulse' : ''
  
  return (
    <div className={`${baseClasses} ${animationClasses} ${className}`} />
  )
}

// Predefined skeleton components
export const SkeletonText = ({ lines = 1, className = '' }) => (
  <div className={`space-y-2 ${className}`}>
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton 
        key={i} 
        height="h-4" 
        width={i === lines - 1 ? 'w-3/4' : 'w-full'} 
      />
    ))}
  </div>
)

export const SkeletonCard = ({ className = '' }) => (
  <div className={`bg-white rounded-lg shadow-sm border p-4 ${className}`}>
    <div className="space-y-3">
      <Skeleton height="h-4" width="w-1/3" />
      <Skeleton height="h-32" width="w-full" />
      <SkeletonText lines={2} />
    </div>
  </div>
)

export const SkeletonTable = ({ rows = 5, columns = 4, className = '' }) => (
  <div className={`bg-white rounded-lg shadow-sm border ${className}`}>
    <div className="p-4 border-b">
      <Skeleton height="h-6" width="w-1/4" />
    </div>
    <div className="divide-y">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="p-4 flex space-x-4">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton 
              key={colIndex} 
              height="h-4" 
              width={colIndex === 0 ? 'w-1/3' : 'w-1/4'} 
            />
          ))}
        </div>
      ))}
    </div>
  </div>
)

export const SkeletonChart = ({ className = '' }) => (
  <div className={`bg-white rounded-lg shadow-sm border p-4 ${className}`}>
    <div className="space-y-4">
      <Skeleton height="h-6" width="w-1/3" />
      <div className="h-64 bg-gray-50 rounded flex items-center justify-center">
        <div className="text-center text-gray-400">
          <div className="w-16 h-16 mx-auto mb-2 bg-gray-200 rounded animate-pulse" />
          <Skeleton height="h-4" width="w-24" className="mx-auto" />
        </div>
      </div>
    </div>
  </div>
)

export const SkeletonImageGrid = ({ items = 6, className = '' }) => (
  <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 ${className}`}>
    {Array.from({ length: items }).map((_, i) => (
      <SkeletonCard key={i} />
    ))}
  </div>
)

export default Skeleton
