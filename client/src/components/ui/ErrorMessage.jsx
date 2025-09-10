import React from 'react'
import {AlertTriangle, X} from 'lucide-react'

const ErrorMessage = ({
  error,
  title = 'Error',
  variant = 'error',
  onDismiss,
  showIcon = true,
  className = ''
}) => {
  if (!error) return null

  const variantConfigs = {
    error: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-800',
      icon: 'text-red-400',
      iconBg: 'bg-red-100'
    },
    warning: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      text: 'text-yellow-800',
      icon: 'text-yellow-400',
      iconBg: 'bg-yellow-100'
    },
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-800',
      icon: 'text-blue-400',
      iconBg: 'bg-blue-100'
    }
  }

  const config = variantConfigs[variant] || variantConfigs.error

  return (
    <div className={`rounded-md p-4 border ${config.bg} ${config.border} ${className}`}>
      <div className="flex">
        {showIcon && (
          <div className={`flex-shrink-0 ${config.iconBg} rounded-full p-1 mr-3`}>
            <AlertTriangle className={`h-5 w-5 ${config.icon}`} />
          </div>
        )}
        <div className="flex-1">
          <h3 className={`text-sm font-medium ${config.text}`}>
            {title}
          </h3>
          <div className={`mt-2 text-sm ${config.text}`}>
            {typeof error === 'string' ? error : error.message || 'An unexpected error occurred'}
          </div>
        </div>
        {onDismiss && (
          <div className="ml-auto pl-3">
            <button
              onClick={onDismiss}
              className={`inline-flex ${config.text} hover:${config.text.replace('text-', 'text-')} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-${variant === 'error' ? 'red' : variant === 'warning' ? 'yellow' : 'blue'}-50 focus:ring-${variant === 'error' ? 'red' : variant === 'warning' ? 'yellow' : 'blue'}-400`}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default ErrorMessage
