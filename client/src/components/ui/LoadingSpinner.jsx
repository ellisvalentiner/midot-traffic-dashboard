import React from 'react'

const LoadingSpinner = ({ 
  size = 'md', 
  variant = 'default',
  className = '',
  text = '',
  showText = false
}) => {
  const sizeConfigs = {
    xs: 'w-2 h-2',
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-6 h-6',
    xl: 'w-8 h-8'
  }

  const variantConfigs = {
    default: 'border-gray-300 border-t-blue-600',
    primary: 'border-blue-200 border-t-blue-600',
    secondary: 'border-gray-200 border-t-gray-600',
    success: 'border-green-200 border-t-green-600',
    warning: 'border-yellow-200 border-t-yellow-600',
    error: 'border-red-200 border-t-red-600'
  }

  const sizeClasses = sizeConfigs[size] || sizeConfigs.md
  const variantClasses = variantConfigs[variant] || variantConfigs.default

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div 
        className={`${sizeClasses} border-2 rounded-full animate-spin ${variantClasses}`}
        role="status"
        aria-label="Loading"
      />
      {showText && text && (
        <span className="text-sm text-gray-600">{text}</span>
      )}
    </div>
  )
}

export default LoadingSpinner
