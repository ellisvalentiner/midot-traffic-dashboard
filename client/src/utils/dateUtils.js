/**
 * Date and Time Utility Functions
 * Provides comprehensive date manipulation, formatting, and calculation utilities
 * 
 * IMPORTANT: This project uses SQLite which stores dates in UTC format.
 * All date parsing functions automatically convert UTC to local timezone.
 */

// Date formatting constants
export const DATE_FORMATS = {
  ISO: 'YYYY-MM-DD',
  SHORT: 'MM/DD/YY',
  LONG: 'MMMM DD, YYYY',
  TIME: 'HH:mm:ss',
  DATETIME: 'YYYY-MM-DD HH:mm:ss',
  RELATIVE: 'relative'
}

// Time units in milliseconds
export const TIME_UNITS = {
  MILLISECOND: 1,
  SECOND: 1000,
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
  WEEK: 7 * 24 * 60 * 60 * 1000,
  MONTH: 30 * 24 * 60 * 60 * 1000,
  YEAR: 365 * 24 * 60 * 60 * 1000
}

/**
 * Parse a date string from SQLite (UTC) and convert to local timezone
 * SQLite stores dates in UTC format, so we need to properly parse them
 * @param {string|Date} date - Date string from SQLite or Date object
 * @returns {Date} Date object in local timezone
 */
export const parseSQLiteDate = (date) => {
  if (!date) return null
  
  // If it's already a Date object, return it
  if (date instanceof Date) return date
  
  // If it's a string, parse it
  if (typeof date === 'string') {
    // Handle SQLite datetime format: "2025-08-20 20:18:00"
    if (date.includes(' ') && date.includes('-') && date.includes(':')) {
      // This is a SQLite datetime string, treat as UTC and convert to local
      const utcDate = new Date(date + 'Z') // Add Z to indicate UTC
      return utcDate
    }
    
    // Handle ISO format strings
    if (date.includes('T') || date.includes('Z')) {
      return new Date(date)
    }
    
    // Handle date-only strings (assume local timezone)
    if (date.includes('-') && !date.includes(':')) {
      return new Date(date)
    }
  }
  
  // Fallback to standard Date constructor
  return new Date(date)
}

/**
 * Format a date according to the specified format
 * @param {Date|string|number} date - Date to format
 * @param {string} format - Format string or predefined format
 * @returns {string} Formatted date string
 */
export const formatDate = (date, format = DATE_FORMATS.ISO) => {
  if (!date) return ''
  
  // Use our SQLite-aware date parser
  const dateObj = parseSQLiteDate(date)
  if (!dateObj || isNaN(dateObj.getTime())) return ''
  
  if (format === DATE_FORMATS.RELATIVE) {
    return getRelativeTime(dateObj)
  }
  
  if (format === DATE_FORMATS.ISO) {
    return dateObj.toISOString().split('T')[0]
  }
  
  if (format === DATE_FORMATS.SHORT) {
    return dateObj.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: '2-digit'
    })
  }
  
  if (format === DATE_FORMATS.LONG) {
    return dateObj.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    })
  }
  
  if (format === DATE_FORMATS.TIME) {
    return dateObj.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }
  
  if (format === DATE_FORMATS.DATETIME) {
    return `${formatDate(date, DATE_FORMATS.ISO)} ${formatDate(date, DATE_FORMATS.TIME)}`
  }
  
  // Custom format string
  return formatCustomDate(dateObj, format)
}

/**
 * Format a date with a custom format string
 * @param {Date} date - Date object
 * @param {string} format - Custom format string
 * @returns {string} Formatted date string
 */
const formatCustomDate = (date, format) => {
  const replacements = {
    YYYY: date.getFullYear(),
    MM: String(date.getMonth() + 1).padStart(2, '0'),
    DD: String(date.getDate()).padStart(2, '0'),
    HH: String(date.getHours()).padStart(2, '0'),
    mm: String(date.getMinutes()).padStart(2, '0'),
    ss: String(date.getSeconds()).padStart(2, '0'),
    MMMM: date.toLocaleDateString('en-US', { month: 'long' }),
    MMM: date.toLocaleDateString('en-US', { month: 'short' }),
    DDD: date.toLocaleDateString('en-US', { weekday: 'long' }),
    DD: date.toLocaleDateString('en-US', { weekday: 'short' })
  }
  
  let result = format
  Object.entries(replacements).forEach(([key, value]) => {
    result = result.replace(new RegExp(key, 'g'), value)
  })
  
  return result
}

/**
 * Format a date for display with proper timezone handling
 * @param {string|Date} date - Date from SQLite or Date object
 * @param {string} format - Format string (e.g., 'MMM dd, yyyy, h:mm a')
 * @returns {string} Formatted date string in local timezone
 */
export const formatDisplayDate = (date, format = 'MMM dd, yyyy, h:mm a') => {
  const dateObj = parseSQLiteDate(date)
  if (!dateObj || isNaN(dateObj.getTime())) return 'Invalid Date'
  
  // Use date-fns format if available, otherwise fallback to locale methods
  try {
    // Import date-fns format function dynamically
    const { format: dateFnsFormat } = require('date-fns')
    return dateFnsFormat(dateObj, format)
  } catch (error) {
    // Fallback to locale methods
    if (format.includes('MMM') && format.includes('dd') && format.includes('yyyy')) {
      return dateObj.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }) + ', ' + dateObj.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
    }
    
    if (format.includes('h:mm a')) {
      return dateObj.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
    }
    
    // Default fallback
    return dateObj.toLocaleString('en-US')
  }
}

/**
 * Get relative time string (e.g., "2 hours ago", "3 days ago")
 * @param {Date} date - Date to get relative time for
 * @returns {string} Relative time string
 */
export const getRelativeTime = (date) => {
  const now = new Date()
  const diff = now - date
  const absDiff = Math.abs(diff)
  
  if (absDiff < TIME_UNITS.MINUTE) {
    return 'just now'
  }
  
  if (absDiff < TIME_UNITS.HOUR) {
    const minutes = Math.floor(absDiff / TIME_UNITS.MINUTE)
    return `${minutes} minute${minutes !== 1 ? 's' : ''} ${diff > 0 ? 'ago' : 'from now'}`
  }
  
  if (absDiff < TIME_UNITS.DAY) {
    const hours = Math.floor(absDiff / TIME_UNITS.HOUR)
    return `${hours} hour${hours !== 1 ? 's' : ''} ${diff > 0 ? 'ago' : 'from now'}`
  }
  
  if (absDiff < TIME_UNITS.WEEK) {
    const days = Math.floor(absDiff / TIME_UNITS.DAY)
    return `${days} day${days !== 1 ? 's' : ''} ${diff > 0 ? 'ago' : 'from now'}`
  }
  
  if (absDiff < TIME_UNITS.MONTH) {
    const weeks = Math.floor(absDiff / TIME_UNITS.WEEK)
    return `${weeks} week${weeks !== 1 ? 's' : ''} ${diff > 0 ? 'ago' : 'from now'}`
  }
  
  if (absDiff < TIME_UNITS.YEAR) {
    const months = Math.floor(absDiff / TIME_UNITS.MONTH)
    return `${months} month${months !== 1 ? 's' : ''} ${diff > 0 ? 'ago' : 'from now'}`
  }
  
  const years = Math.floor(absDiff / TIME_UNITS.YEAR)
  return `${years} year${years !== 1 ? 's' : ''} ${diff > 0 ? 'ago' : 'from now'}`
}

/**
 * Parse a time range string and return start/end dates
 * @param {string} timeRange - Time range string (e.g., "24h", "7d", "1w", "1m")
 * @returns {Object} Object with start and end dates
 */
export const parseTimeRange = (timeRange) => {
  const now = new Date()
  let startDate = new Date(now)
  
  if (typeof timeRange === 'string') {
    const value = parseInt(timeRange)
    const unit = timeRange.slice(-1).toLowerCase()
    
    switch (unit) {
      case 'h':
        startDate.setHours(now.getHours() - value)
        break
      case 'd':
        startDate.setDate(now.getDate() - value)
        break
      case 'w':
        startDate.setDate(now.getDate() - (value * 7))
        break
      case 'm':
        startDate.setMonth(now.getMonth() - value)
        break
      case 'y':
        startDate.setFullYear(now.getFullYear() - value)
        break
      default:
        // Default to 24 hours if no valid unit
        startDate.setHours(now.getHours() - 24)
    }
  } else if (typeof timeRange === 'number') {
    // Assume hours if just a number
    startDate.setHours(now.getHours() - timeRange)
  }
  
  return {
    start: startDate,
    end: now,
    duration: now - startDate
  }
}

/**
 * Get the start of a time period
 * @param {string} period - Time period ('day', 'week', 'month', 'year')
 * @param {Date} date - Reference date (defaults to now)
 * @returns {Date} Start of the period
 */
export const getStartOfPeriod = (period, date = new Date()) => {
  const result = new Date(date)
  
  switch (period.toLowerCase()) {
    case 'day':
      result.setHours(0, 0, 0, 0)
      break
    case 'week':
      const day = result.getDay()
      const diff = result.getDate() - day + (day === 0 ? -6 : 1)
      result.setDate(diff)
      result.setHours(0, 0, 0, 0)
      break
    case 'month':
      result.setDate(1)
      result.setHours(0, 0, 0, 0)
      break
    case 'year':
      result.setMonth(0, 1)
      result.setHours(0, 0, 0, 0)
      break
  }
  
  return result
}

/**
 * Get the end of a time period
 * @param {string} period - Time period ('day', 'week', 'month', 'year')
 * @param {Date} date - Reference date (defaults to now)
 * @returns {Date} End of the period
 */
export const getEndOfPeriod = (period, date = new Date()) => {
  const result = new Date(date)
  
  switch (period.toLowerCase()) {
    case 'day':
      result.setHours(23, 59, 59, 999)
      break
    case 'week':
      const day = result.getDay()
      const diff = result.getDate() - day + (day === 0 ? 0 : 7)
      result.setDate(diff)
      result.setHours(23, 59, 59, 999)
      break
    case 'month':
      result.setMonth(result.getMonth() + 1, 0)
      result.setHours(23, 59, 59, 999)
      break
    case 'year':
      result.setMonth(11, 31)
      result.setHours(23, 59, 59, 999)
      break
  }
  
  return result
}

/**
 * Check if a date is today
 * @param {Date|string|number} date - Date to check
 * @returns {boolean} True if date is today
 */
export const isToday = (date) => {
  const dateObj = new Date(date)
  const today = new Date()
  
  return dateObj.toDateString() === today.toDateString()
}

/**
 * Check if a date is yesterday
 * @param {Date|string|number} date - Date to check
 * @returns {boolean} True if date is yesterday
 */
export const isYesterday = (date) => {
  const dateObj = new Date(date)
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  
  return dateObj.toDateString() === yesterday.toDateString()
}

/**
 * Check if a date is within the last N days
 * @param {Date|string|number} date - Date to check
 * @param {number} days - Number of days
 * @returns {boolean} True if date is within the last N days
 */
export const isWithinLastDays = (date, days) => {
  const dateObj = new Date(date)
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  
  return dateObj >= cutoff
}

/**
 * Get the difference between two dates in various units
 * @param {Date|string|number} date1 - First date
 * @param {Date|string|number} date2 - Second date
 * @param {string} unit - Unit of measurement ('ms', 's', 'm', 'h', 'd')
 * @returns {number} Difference in specified units
 */
export const getDateDifference = (date1, date2, unit = 'ms') => {
  const d1 = new Date(date1)
  const d2 = new Date(date2)
  const diff = Math.abs(d2 - d1)
  
  switch (unit.toLowerCase()) {
    case 'ms':
      return diff
    case 's':
      return Math.floor(diff / TIME_UNITS.SECOND)
    case 'm':
      return Math.floor(diff / TIME_UNITS.MINUTE)
    case 'h':
      return Math.floor(diff / TIME_UNITS.HOUR)
    case 'd':
      return Math.floor(diff / TIME_UNITS.DAY)
    default:
      return diff
  }
}

/**
 * Add time to a date
 * @param {Date|string|number} date - Base date
 * @param {number} amount - Amount to add
 * @param {string} unit - Unit of time ('ms', 's', 'm', 'h', 'd', 'w', 'M', 'y')
 * @returns {Date} New date
 */
export const addTime = (date, amount, unit) => {
  const dateObj = new Date(date)
  
  switch (unit.toLowerCase()) {
    case 'ms':
      dateObj.setMilliseconds(dateObj.getMilliseconds() + amount)
      break
    case 's':
      dateObj.setSeconds(dateObj.getSeconds() + amount)
      break
    case 'm':
      dateObj.setMinutes(dateObj.getMinutes() + amount)
      break
    case 'h':
      dateObj.setHours(dateObj.getHours() + amount)
      break
    case 'd':
      dateObj.setDate(dateObj.getDate() + amount)
      break
    case 'w':
      dateObj.setDate(dateObj.getDate() + (amount * 7))
      break
    case 'M':
      dateObj.setMonth(dateObj.getMonth() + amount)
      break
    case 'y':
      dateObj.setFullYear(dateObj.getFullYear() + amount)
      break
  }
  
  return dateObj
}

/**
 * Subtract time from a date
 * @param {Date|string|number} date - Base date
 * @param {number} amount - Amount to subtract
 * @param {string} unit - Unit of time ('ms', 's', 'm', 'h', 'd', 'w', 'M', 'y')
 * @returns {Date} New date
 */
export const subtractTime = (date, amount, unit) => {
  return addTime(date, -amount, unit)
}

/**
 * Get a human-readable duration string
 * @param {number} milliseconds - Duration in milliseconds
 * @param {boolean} short - Whether to use short format
 * @returns {string} Human-readable duration
 */
export const formatDuration = (milliseconds, short = false) => {
  if (milliseconds < TIME_UNITS.SECOND) {
    return `${Math.round(milliseconds)}ms`
  }
  
  if (milliseconds < TIME_UNITS.MINUTE) {
    const seconds = Math.floor(milliseconds / TIME_UNITS.SECOND)
    return short ? `${seconds}s` : `${seconds} second${seconds !== 1 ? 's' : ''}`
  }
  
  if (milliseconds < TIME_UNITS.HOUR) {
    const minutes = Math.floor(milliseconds / TIME_UNITS.MINUTE)
    const seconds = Math.floor((milliseconds % TIME_UNITS.MINUTE) / TIME_UNITS.SECOND)
    if (short) {
      return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`
    }
    return `${minutes} minute${minutes !== 1 ? 's' : ''}${seconds > 0 ? ` ${seconds} second${seconds !== 1 ? 's' : ''}` : ''}`
  }
  
  if (milliseconds < TIME_UNITS.DAY) {
    const hours = Math.floor(milliseconds / TIME_UNITS.HOUR)
    const minutes = Math.floor((milliseconds % TIME_UNITS.HOUR) / TIME_UNITS.MINUTE)
    if (short) {
      return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
    }
    return `${hours} hour${hours !== 1 ? 's' : ''}${minutes > 0 ? ` ${minutes} minute${minutes !== 1 ? 's' : ''}` : ''}`
  }
  
  const days = Math.floor(milliseconds / TIME_UNITS.DAY)
  const hours = Math.floor((milliseconds % TIME_UNITS.DAY) / TIME_UNITS.HOUR)
  if (short) {
    return hours > 0 ? `${days}d ${hours}h` : `${days}d`
  }
  return `${days} day${days !== 1 ? 's' : ''}${hours > 0 ? ` ${hours} hour${hours !== 1 ? 's' : ''}` : ''}`
}

/**
 * Check if a date is valid
 * @param {any} date - Date to validate
 * @returns {boolean} True if date is valid
 */
export const isValidDate = (date) => {
  if (!date) return false
  const dateObj = new Date(date)
  return !isNaN(dateObj.getTime())
}

/**
 * Get the current timestamp
 * @returns {number} Current timestamp in milliseconds
 */
export const getCurrentTimestamp = () => {
  return Date.now()
}

/**
 * Get the current date as an ISO string
 * @returns {string} Current date in ISO format
 */
export const getCurrentDateISO = () => {
  return new Date().toISOString()
}
