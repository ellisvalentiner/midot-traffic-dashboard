import React, {useEffect, useState} from 'react'
import {CheckCircle, Clock, RefreshCw} from 'lucide-react'

const AutoRefreshIndicator = ({
  interval = 30000, // 30 seconds default
  onRefresh,
  lastUpdate,
  isRefreshing = false,
  className = ''
}) => {
  const [timeUntilRefresh, setTimeUntilRefresh] = useState(interval)
  const [isEnabled, setIsEnabled] = useState(true)

  useEffect(() => {
    if (!isEnabled) return

    const timer = setInterval(() => {
      setTimeUntilRefresh(prev => {
        if (prev <= 1000) {
          // Trigger refresh
          if (onRefresh) {
            onRefresh()
          }
          return interval
        }
        return prev - 1000
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [interval, onRefresh, isEnabled])

  useEffect(() => {
    // Reset timer when lastUpdate changes
    setTimeUntilRefresh(interval)
  }, [lastUpdate, interval])

  const formatTime = (ms) => {
    const seconds = Math.ceil(ms / 1000)
    return `${seconds}s`
  }

  const getStatusIcon = () => {
    if (isRefreshing) {
      return <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
    }
    if (lastUpdate) {
      return <CheckCircle className="w-4 h-4 text-green-500" />
    }
    return <Clock className="w-4 h-4 text-gray-400" />
  }

  const getStatusText = () => {
    if (isRefreshing) {
      return 'Refreshing...'
    }
    if (lastUpdate) {
      return `Updated ${formatTimeUntilLastUpdate(lastUpdate)}`
    }
    return 'Never updated'
  }

  const formatTimeUntilLastUpdate = (timestamp) => {
    const now = new Date()
    const last = new Date(timestamp)
    const diff = now - last

    if (diff < 60000) return 'just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    return `${Math.floor(diff / 86400000)}d ago`
  }

  const handleManualRefresh = () => {
    if (onRefresh && !isRefreshing) {
      onRefresh()
      setTimeUntilRefresh(interval)
    }
  }

  const toggleAutoRefresh = () => {
    setIsEnabled(!isEnabled)
    if (!isEnabled) {
      setTimeUntilRefresh(interval)
    }
  }

  return (
    <div className={`flex items-center space-x-3 text-sm ${className}`}>
      {/* Status Indicator */}
      <div className="flex items-center space-x-2">
        {getStatusIcon()}
        <span className="text-gray-600 dark:text-gray-400">
          {getStatusText()}
        </span>
      </div>

      {/* Auto-refresh Toggle */}
      <button
        onClick={toggleAutoRefresh}
        className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
          isEnabled 
            ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' 
            : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
        }`}
        title={isEnabled ? 'Auto-refresh enabled' : 'Auto-refresh disabled'}
      >
        {isEnabled ? 'Auto' : 'Manual'}
      </button>

      {/* Countdown Timer */}
      {isEnabled && (
        <div className="flex items-center space-x-1 text-gray-500 dark:text-gray-400">
          <Clock className="w-3 h-3" />
          <span className="text-xs">
            {formatTime(timeUntilRefresh)}
          </span>
        </div>
      )}

      {/* Manual Refresh Button */}
      <button
        onClick={handleManualRefresh}
        disabled={isRefreshing}
        className="flex items-center space-x-1 px-2 py-1 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        title="Refresh now"
      >
        <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
        <span>Refresh</span>
      </button>
    </div>
  )
}

export default AutoRefreshIndicator
