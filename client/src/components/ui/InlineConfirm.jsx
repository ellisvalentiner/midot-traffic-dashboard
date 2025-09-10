import React, {useState} from 'react'
import {AlertTriangle, Check, X} from 'lucide-react'

const InlineConfirm = ({
  onConfirm,
  onCancel,
  message = 'Are you sure?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'danger', // danger, warning, info
  className = ''
}) => {
  const [isConfirming, setIsConfirming] = useState(false)

  const handleConfirm = async () => {
    setIsConfirming(true)
    try {
      await onConfirm()
    } finally {
      setIsConfirming(false)
    }
  }

  const handleCancel = () => {
    onCancel?.()
  }

  const getTypeStyles = () => {
    switch (type) {
      case 'danger':
        return {
          container: 'border-red-200 bg-red-50 dark:border-red-700 dark:bg-red-900',
          icon: 'text-red-600 dark:text-red-400',
          button: 'bg-red-600 hover:bg-red-700 text-white',
          cancelButton: 'border-red-300 text-red-700 hover:bg-red-100 dark:border-red-600 dark:text-red-300 dark:hover:bg-red-900'
        }
      case 'warning':
        return {
          container: 'border-yellow-200 bg-yellow-50 dark:border-yellow-700 dark:bg-yellow-900',
          icon: 'text-yellow-600 dark:text-yellow-400',
          button: 'bg-yellow-600 hover:bg-yellow-700 text-white',
          cancelButton: 'border-yellow-300 text-yellow-700 hover:bg-yellow-100 dark:border-yellow-600 dark:text-yellow-300 dark:hover:bg-yellow-900'
        }
      case 'info':
        return {
          container: 'border-blue-200 bg-blue-50 dark:border-blue-700 dark:bg-blue-900',
          icon: 'text-blue-600 dark:text-blue-400',
          button: 'bg-blue-600 hover:bg-blue-700 text-white',
          cancelButton: 'border-blue-300 text-blue-700 hover:bg-blue-100 dark:border-blue-600 dark:text-blue-300 dark:hover:bg-blue-900'
        }
      default:
        return {
          container: 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900',
          icon: 'text-gray-600 dark:text-gray-400',
          button: 'bg-gray-600 hover:bg-gray-700 text-white',
          cancelButton: 'border-gray-300 text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-900'
        }
    }
  }

  const styles = getTypeStyles()

  return (
    <div className={`inline-flex items-center space-x-3 p-3 rounded-lg border ${styles.container} ${className}`}>
      <AlertTriangle className={`w-5 h-5 ${styles.icon}`} />
      <span className="text-sm font-medium text-gray-900 dark:text-white">{message}</span>

      <div className="flex items-center space-x-2">
        <button
          onClick={handleConfirm}
          disabled={isConfirming}
          className={`px-3 py-1.5 rounded text-sm font-medium transition-colors disabled:opacity-50 ${styles.button}`}
        >
          {isConfirming ? (
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Confirming...</span>
            </div>
          ) : (
            <div className="flex items-center space-x-1">
              <Check className="w-3 h-3" />
              <span>{confirmText}</span>
            </div>
          )}
        </button>

        <button
          onClick={handleCancel}
          className={`px-3 py-1.5 rounded text-sm font-medium border transition-colors ${styles.cancelButton}`}
        >
          <div className="flex items-center space-x-1">
            <X className="w-3 h-3" />
            <span>{cancelText}</span>
          </div>
        </button>
      </div>
    </div>
  )
}

export default InlineConfirm
