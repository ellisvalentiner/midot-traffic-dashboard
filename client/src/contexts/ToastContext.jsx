import React, {createContext, useCallback, useContext, useState} from 'react'
import Toast from '../components/ui/Toast'

const ToastContext = createContext()

export const useToast = () => {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback(({ message, type = 'info', duration = 5000, position = 'top-right' }) => {
    const id = Date.now() + Math.random()
    const newToast = { id, message, type, duration, position }

    setToasts(prev => [...prev, newToast])

    return id
  }, [])

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  const showSuccess = useCallback((message, options = {}) => {
    return addToast({ message, type: 'success', ...options })
  }, [addToast])

  const showError = useCallback((message, options = {}) => {
    return addToast({ message, type: 'error', ...options })
  }, [addToast])

  const showWarning = useCallback((message, options = {}) => {
    return addToast({ message, type: 'warning', ...options })
  }, [addToast])

  const showInfo = useCallback((message, options = {}) => {
    return addToast({ message, type: 'info', ...options })
  }, [addToast])

  const clearAll = useCallback(() => {
    setToasts([])
  }, [])

  const value = {
    addToast,
    removeToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    clearAll
  }

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed z-50 top-4 right-4 space-y-2">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            duration={toast.duration}
            position={toast.position}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  )
}
