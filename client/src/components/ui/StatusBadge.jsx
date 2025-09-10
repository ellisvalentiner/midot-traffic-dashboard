import React from 'react'
import {Brain, Clock, TrendingUp} from 'lucide-react'

const StatusBadge = ({
  type,
  status,
  showIcon = false,
  icon: Icon = null,
  className = '',
  size = 'sm'
}) => {
  // Status configurations
  const statusConfigs = {
    // Analysis statuses
    analysis: {
      completed: { bg: 'bg-green-100', text: 'text-green-800', label: 'Completed' },
      failed: { bg: 'bg-red-100', text: 'text-red-800', label: 'Failed' },
      processing: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Processing' },
      queued: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Queued' },
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending' },
      'not-analyzed': { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Not Analyzed' }
    },
    // AI statuses
    ai: {
      'ai-complete': { bg: 'bg-green-100', text: 'text-green-800', label: 'AI Complete' },
      'ai-failed': { bg: 'bg-red-100', text: 'text-red-800', label: 'AI Failed' },
      'ai-processing': { bg: 'bg-blue-100', text: 'text-blue-800', label: 'AI Processing' },
      'ai-queued': { bg: 'bg-purple-100', text: 'text-purple-800', label: 'AI Queued' },
      'ai-pending': { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'AI Pending' },
      'ai-not-started': { bg: 'bg-gray-100', text: 'text-gray-800', label: 'AI Not Started' },
      'ai-analyzing': { bg: 'bg-blue-100', text: 'text-blue-800', label: 'AI Analyzing' }
    },
    // Traffic density
    traffic: {
      light: { bg: 'bg-green-100', text: 'text-green-800', label: 'Light' },
      medium: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Medium' },
      heavy: { bg: 'bg-red-100', text: 'text-red-800', label: 'Heavy' },
      'no-traffic': { bg: 'bg-gray-100', text: 'text-gray-800', label: 'No Traffic' }
    },
    // General statuses
    general: {
      latest: { bg: 'bg-blue-500', text: 'text-white', label: 'Latest' },
      changed: { bg: 'bg-green-500', text: 'text-white', label: 'Changed' },
      enabled: { bg: 'bg-green-100', text: 'text-green-800', label: 'Enabled' },
      disabled: { bg: 'bg-red-100', text: 'text-red-800', label: 'Disabled' }
    }
  }

  // Size configurations
  const sizeConfigs = {
    xs: 'px-1.5 py-0.5 text-xs',
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base'
  }

  // Get status configuration
  const getStatusConfig = () => {
    if (type === 'analysis' && statusConfigs.analysis[status]) {
      return statusConfigs.analysis[status]
    }
    if (type === 'ai' && statusConfigs.ai[status]) {
      return statusConfigs.ai[status]
    }
    if (type === 'traffic' && statusConfigs.traffic[status]) {
      return statusConfigs.traffic[status]
    }
    if (type === 'general' && statusConfigs.general[status]) {
      return statusConfigs.general[status]
    }

    // Fallback to analysis status if no type specified
    if (statusConfigs.analysis[status]) {
      return statusConfigs.analysis[status]
    }

    // Default fallback
    return { bg: 'bg-gray-100', text: 'text-gray-800', label: status || 'Unknown' }
  }

  const config = getStatusConfig()
  const sizeClasses = sizeConfigs[size] || sizeConfigs.sm

  return (
    <span className={`inline-flex items-center space-x-1 rounded-full font-medium shadow-sm ${config.bg} ${config.text} ${sizeClasses} ${className}`}>
      {showIcon && Icon && <Icon className="w-3 h-3" />}
      {showIcon && !Icon && type === 'ai' && <Brain className="w-3 h-3" />}
      {showIcon && !Icon && type === 'general' && status === 'latest' && <Clock className="w-3 h-3" />}
      {showIcon && !Icon && type === 'general' && status === 'changed' && <TrendingUp className="w-3 h-3" />}
      <span>{config.label}</span>
    </span>
  )
}

export default StatusBadge
