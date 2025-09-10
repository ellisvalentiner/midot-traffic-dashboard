/**
 * Data Formatting and Validation Utility Functions
 * Provides comprehensive data formatting, validation, and transformation utilities
 */

// Number formatting constants
export const NUMBER_FORMATS = {
  CURRENCY: 'currency',
  PERCENTAGE: 'percentage',
  DECIMAL: 'decimal',
  INTEGER: 'integer',
  SCIENTIFIC: 'scientific',
  COMPACT: 'compact'
}

// File size constants
export const FILE_SIZE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']

/**
 * Format a number according to the specified format
 * @param {number} number - Number to format
 * @param {string|Object} format - Format type or options object
 * @param {Object} options - Additional formatting options
 * @returns {string} Formatted number string
 */
export const formatNumber = (number, format = NUMBER_FORMATS.DECIMAL, options = {}) => {
  if (number === null || number === undefined || isNaN(number)) {
    return options.defaultValue || '0'
  }

  const defaultOptions = {
    locale: 'en-US',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    useGrouping: true,
    ...options
  }

  switch (format) {
    case NUMBER_FORMATS.CURRENCY:
      return new Intl.NumberFormat(defaultOptions.locale, {
        style: 'currency',
        currency: options.currency || 'USD',
        minimumFractionDigits: defaultOptions.minimumFractionDigits,
        maximumFractionDigits: defaultOptions.maximumFractionDigits,
        useGrouping: defaultOptions.useGrouping
      }).format(number)

    case NUMBER_FORMATS.PERCENTAGE:
      return new Intl.NumberFormat(defaultOptions.locale, {
        style: 'percent',
        minimumFractionDigits: defaultOptions.minimumFractionDigits,
        maximumFractionDigits: defaultOptions.maximumFractionDigits,
        useGrouping: defaultOptions.useGrouping
      }).format(number / 100)

    case NUMBER_FORMATS.DECIMAL:
      return new Intl.NumberFormat(defaultOptions.locale, {
        minimumFractionDigits: defaultOptions.minimumFractionDigits,
        maximumFractionDigits: defaultOptions.maximumFractionDigits,
        useGrouping: defaultOptions.useGrouping
      }).format(number)

    case NUMBER_FORMATS.INTEGER:
      return new Intl.NumberFormat(defaultOptions.locale, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
        useGrouping: defaultOptions.useGrouping
      }).format(Math.round(number))

    case NUMBER_FORMATS.SCIENTIFIC:
      return number.toExponential(defaultOptions.maximumFractionDigits)

    case NUMBER_FORMATS.COMPACT:
      return new Intl.NumberFormat(defaultOptions.locale, {
        notation: 'compact',
        maximumFractionDigits: defaultOptions.maximumFractionDigits
      }).format(number)

    default:
      return new Intl.NumberFormat(defaultOptions.locale, {
        minimumFractionDigits: defaultOptions.minimumFractionDigits,
        maximumFractionDigits: defaultOptions.maximumFractionDigits,
        useGrouping: defaultOptions.useGrouping
      }).format(number)
  }
}

/**
 * Format a file size in human-readable format
 * @param {number} bytes - Size in bytes
 * @param {number} decimals - Number of decimal places
 * @param {boolean} binary - Whether to use binary units (1024) instead of decimal (1000)
 * @returns {string} Formatted file size string
 */
export const formatFileSize = (bytes, decimals = 2, binary = false) => {
  if (bytes === 0) return '0 B'

  const k = binary ? 1024 : 1000
  const dm = decimals < 0 ? 0 : decimals
  const sizes = binary ? ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB'] : FILE_SIZE_UNITS

  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

/**
 * Format a percentage value
 * @param {number} value - Value to format as percentage
 * @param {number} decimals - Number of decimal places
 * @param {boolean} includeSymbol - Whether to include % symbol
 * @returns {string} Formatted percentage string
 */
export const formatPercentage = (value, decimals = 1, includeSymbol = true) => {
  if (value === null || value === undefined || isNaN(value)) {
    return '0%'
  }

  const formatted = formatNumber(value, NUMBER_FORMATS.DECIMAL, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  })

  return includeSymbol ? `${formatted}%` : formatted
}

/**
 * Format a currency value
 * @param {number} value - Value to format as currency
 * @param {string} currency - Currency code (e.g., 'USD', 'EUR')
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (value, currency = 'USD', decimals = 2) => {
  if (value === null || value === undefined || isNaN(value)) {
    return formatNumber(0, NUMBER_FORMATS.CURRENCY, { currency, minimumFractionDigits: decimals })
  }

  return formatNumber(value, NUMBER_FORMATS.CURRENCY, {
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  })
}

/**
 * Format a phone number
 * @param {string} phoneNumber - Phone number to format
 * @param {string} format - Format type ('US', 'international', 'compact')
 * @returns {string} Formatted phone number string
 */
export const formatPhoneNumber = (phoneNumber, format = 'US') => {
  if (!phoneNumber) return ''

  // Remove all non-digit characters
  const cleaned = phoneNumber.replace(/\D/g, '')

  if (cleaned.length === 0) return ''

  switch (format) {
    case 'US':
      if (cleaned.length === 10) {
        return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
      } else if (cleaned.length === 11 && cleaned[0] === '1') {
        return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`
      }
      break

    case 'international':
      if (cleaned.length === 10) {
        return `+1 ${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`
      } else if (cleaned.length === 11 && cleaned[0] === '1') {
        return `+1 ${cleaned.slice(1, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`
      }
      break

    case 'compact':
      return cleaned
  }

  return phoneNumber
}

/**
 * Format a credit card number (masked)
 * @param {string} cardNumber - Credit card number to format
 * @param {boolean} masked - Whether to mask the number
 * @returns {string} Formatted credit card number string
 */
export const formatCreditCard = (cardNumber, masked = true) => {
  if (!cardNumber) return ''

  // Remove all non-digit characters
  const cleaned = cardNumber.replace(/\D/g, '')

  if (cleaned.length === 0) return ''

  if (masked) {
    // Show only last 4 digits
    const lastFour = cleaned.slice(-4)
    const maskedPart = '*'.repeat(Math.max(0, cleaned.length - 4))
    return `${maskedPart}${lastFour}`
  } else {
    // Add spaces every 4 digits
    return cleaned.replace(/(\d{4})(?=\d)/g, '$1 ')
  }
}

/**
 * Format a social security number (masked)
 * @param {string} ssn - Social security number to format
 * @param {boolean} masked - Whether to mask the number
 * @returns {string} Formatted SSN string
 */
export const formatSSN = (ssn, masked = true) => {
  if (!ssn) return ''

  // Remove all non-digit characters
  const cleaned = ssn.replace(/\D/g, '')

  if (cleaned.length !== 9) return ssn

  if (masked) {
    return `***-**-${cleaned.slice(-4)}`
  } else {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 5)}-${cleaned.slice(5)}`
  }
}

/**
 * Format a name (title case)
 * @param {string} name - Name to format
 * @returns {string} Formatted name string
 */
export const formatName = (name) => {
  if (!name) return ''

  return name
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Format an address
 * @param {Object} address - Address object
 * @param {string} format - Format type ('single', 'multi', 'compact')
 * @returns {string} Formatted address string
 */
export const formatAddress = (address, format = 'single') => {
  if (!address) return ''

  const parts = []
  
  if (address.street) parts.push(address.street)
  if (address.street2) parts.push(address.street2)
  if (address.city) parts.push(address.city)
  if (address.state) parts.push(address.state)
  if (address.zipCode) parts.push(address.zipCode)
  if (address.country) parts.push(address.country)

  switch (format) {
    case 'single':
      return parts.join(', ')
    case 'multi':
      return parts.join('\n')
    case 'compact':
      return parts.filter(Boolean).join(' ')
    default:
      return parts.join(', ')
  }
}

/**
 * Format a URL
 * @param {string} url - URL to format
 * @param {boolean} includeProtocol - Whether to include protocol
 * @returns {string} Formatted URL string
 */
export const formatURL = (url, includeProtocol = true) => {
  if (!url) return ''

  // Remove protocol if not needed
  if (!includeProtocol) {
    return url.replace(/^https?:\/\//, '')
  }

  // Add protocol if missing
  if (!url.match(/^https?:\/\//)) {
    return `https://${url}`
  }

  return url
}

/**
 * Format a file extension
 * @param {string} filename - Filename to get extension from
 * @returns {string} File extension (without dot)
 */
export const getFileExtension = (filename) => {
  if (!filename) return ''
  
  const lastDotIndex = filename.lastIndexOf('.')
  return lastDotIndex > 0 ? filename.slice(lastDotIndex + 1).toLowerCase() : ''
}

/**
 * Format a filename (remove extension, truncate if too long)
 * @param {string} filename - Filename to format
 * @param {number} maxLength - Maximum length before truncation
 * @returns {string} Formatted filename string
 */
export const formatFilename = (filename, maxLength = 30) => {
  if (!filename) return ''

  const extension = getFileExtension(filename)
  const nameWithoutExt = filename.slice(0, -(extension.length + 1))

  if (nameWithoutExt.length <= maxLength) {
    return extension ? `${nameWithoutExt}.${extension}` : nameWithoutExt
  }

  const truncated = nameWithoutExt.slice(0, maxLength - 3) + '...'
  return extension ? `${truncated}.${extension}` : truncated
}

/**
 * Format a number with ordinal suffix
 * @param {number} number - Number to format
 * @returns {string} Number with ordinal suffix
 */
export const formatOrdinal = (number) => {
  if (number === null || number === undefined || isNaN(number)) {
    return '0th'
  }

  const j = number % 10
  const k = number % 100

  if (j === 1 && k !== 11) {
    return `${number}st`
  }
  if (j === 2 && k !== 12) {
    return `${number}nd`
  }
  if (j === 3 && k !== 13) {
    return `${number}rd`
  }
  return `${number}th`
}

/**
 * Format a range of numbers
 * @param {number} start - Start of range
 * @param {number} end - End of range
 * @param {string} separator - Separator between numbers
 * @returns {string} Formatted range string
 */
export const formatRange = (start, end, separator = ' - ') => {
  if (start === null || start === undefined || end === null || end === undefined) {
    return ''
  }

  if (start === end) {
    return formatNumber(start)
  }

  return `${formatNumber(start)}${separator}${formatNumber(end)}`
}

/**
 * Format a list of items
 * @param {Array} items - Array of items to format
 * @param {string} conjunction - Conjunction to use ('and', 'or')
 * @param {number} maxItems - Maximum items to show before truncating
 * @returns {string} Formatted list string
 */
export const formatList = (items, conjunction = 'and', maxItems = 5) => {
  if (!Array.isArray(items) || items.length === 0) {
    return ''
  }

  if (items.length === 1) {
    return String(items[0])
  }

  if (items.length === 2) {
    return `${items[0]} ${conjunction} ${items[1]}`
  }

  if (items.length <= maxItems) {
    const lastItem = items.pop()
    return `${items.join(', ')} ${conjunction} ${lastItem}`
  }

  const shownItems = items.slice(0, maxItems - 1)
  const remaining = items.length - maxItems + 1
  return `${shownItems.join(', ')} ${conjunction} ${remaining} more`
}

/**
 * Truncate text to a specified length
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @param {string} suffix - Suffix to add when truncated
 * @returns {string} Truncated text string
 */
export const truncateText = (text, maxLength = 100, suffix = '...') => {
  if (!text || text.length <= maxLength) {
    return text
  }

  return text.slice(0, maxLength - suffix.length) + suffix
}

/**
 * Capitalize the first letter of a string
 * @param {string} text - Text to capitalize
 * @returns {string} Capitalized text string
 */
export const capitalize = (text) => {
  if (!text) return ''
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase()
}

/**
 * Convert a string to title case
 * @param {string} text - Text to convert to title case
 * @returns {string} Title case text string
 */
export const toTitleCase = (text) => {
  if (!text) return ''
  
  return text
    .toLowerCase()
    .split(' ')
    .map(word => capitalize(word))
    .join(' ')
}

/**
 * Convert a string to kebab case
 * @param {string} text - Text to convert to kebab case
 * @returns {string} Kebab case text string
 */
export const toKebabCase = (text) => {
  if (!text) return ''
  
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

/**
 * Convert a string to snake case
 * @param {string} text - Text to convert to snake case
 * @returns {string} Snake case text string
 */
export const toSnakeCase = (text) => {
  if (!text) return ''
  
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/(^_|_$)/g, '')
}

/**
 * Convert a string to camel case
 * @param {string} text - Text to convert to camel case
 * @returns {string} Camel case text string
 */
export const toCamelCase = (text) => {
  if (!text) return ''
  
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+(.)/g, (match, char) => char.toUpperCase())
    .replace(/^[A-Z]/, char => char.toLowerCase())
}
