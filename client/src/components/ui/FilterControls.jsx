import React from 'react'
import {Calendar, Camera, Car, Filter, X} from 'lucide-react'

const FilterControls = ({
  filters = {},
  onFilterChange,
  onClearFilters,
  filterConfigs = [],
  showClearButton = true,
  className = ''
}) => {
  const handleFilterChange = (key, value) => {
    if (onFilterChange) {
      onFilterChange(key, value)
    }
  }

  const renderFilterInput = (config) => {
    const { key, type, label, placeholder, options, min, max, step } = config
    const value = filters[key] || ''

    switch (type) {
      case 'select':
        return (
          <select
            value={value}
            onChange={(e) => handleFilterChange(key, e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value="">{placeholder || `Select ${label}`}</option>
            {options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        )

      case 'checkbox':
        return (
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={value}
              onChange={(e) => handleFilterChange(key, e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="text-sm text-gray-700">{label}</span>
          </label>
        )

      case 'date':
        return (
          <input
            type="date"
            value={value}
            onChange={(e) => handleFilterChange(key, e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        )

      case 'number':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => handleFilterChange(key, e.target.value)}
            min={min}
            max={max}
            step={step}
            placeholder={placeholder}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        )

      case 'text':
      default:
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => handleFilterChange(key, e.target.value)}
            placeholder={placeholder}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        )
    }
  }

  const getFilterIcon = (key) => {
    const iconMap = {
      camera_id: Camera,
      date_from: Calendar,
      date_to: Calendar,
      vehicle_type: Car,
      default: Filter
    }
    return iconMap[key] || iconMap.default
  }

  return (
    <div className={`bg-white p-4 rounded-lg border border-gray-200 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Filter className="h-5 w-5 text-gray-500" />
          <h3 className="text-lg font-medium text-gray-900">Filters</h3>
        </div>
        {showClearButton && onClearFilters && (
          <button
            onClick={onClearFilters}
            className="flex items-center space-x-1 text-sm text-gray-500 hover:text-gray-700"
          >
            <X className="h-4 w-4" />
            <span>Clear All</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filterConfigs.map((config) => {
          const Icon = getFilterIcon(config.key)
          return (
            <div key={config.key} className="space-y-2">
              <label className="flex items-center space-x-2 text-sm font-medium text-gray-700">
                <Icon className="h-4 w-4 text-gray-500" />
                <span>{config.label}</span>
              </label>
              {renderFilterInput(config)}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default FilterControls
