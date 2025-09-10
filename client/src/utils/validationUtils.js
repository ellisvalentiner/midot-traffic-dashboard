/**
 * Validation and Error Handling Utility Functions
 * Provides comprehensive data validation, error handling, and sanitization utilities
 */

// Common validation patterns
export const VALIDATION_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^[\+]?[1-9][\d]{0,15}$/,
  URL: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
  IPV4: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
  IPV6: /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/,
  DATE: /^\d{4}-\d{2}-\d{2}$/,
  TIME: /^([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/,
  DATETIME: /^\d{4}-\d{2}-\d{2}T([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?(\.\d{3})?Z?$/,
  CREDIT_CARD: /^(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|6(?:011|5[0-9]{2})[0-9]{12}|(?:2131|1800|35\d{3})\d{11})$/,
  SSN: /^\d{3}-\d{2}-\d{4}$/,
  ZIP_CODE: /^\d{5}(-\d{4})?$/,
  ALPHA: /^[a-zA-Z]+$/,
  ALPHA_NUMERIC: /^[a-zA-Z0-9]+$/,
  NUMERIC: /^\d+$/,
  DECIMAL: /^\d*\.?\d+$/,
  HEX_COLOR: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
}

// Validation error messages
export const VALIDATION_MESSAGES = {
  REQUIRED: 'This field is required',
  EMAIL: 'Please enter a valid email address',
  PHONE: 'Please enter a valid phone number',
  URL: 'Please enter a valid URL',
  MIN_LENGTH: 'Must be at least {min} characters',
  MAX_LENGTH: 'Must be no more than {max} characters',
  MIN_VALUE: 'Must be at least {min}',
  MAX_VALUE: 'Must be no more than {max}',
  PATTERN: 'Please match the required format',
  CUSTOM: 'Invalid value'
}

/**
 * Validate if a value is required (not null, undefined, or empty string)
 * @param {any} value - Value to validate
 * @returns {boolean} True if value is required
 */
export const isRequired = (value) => {
  if (value === null || value === undefined) return false
  if (typeof value === 'string') return value.trim().length > 0
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === 'object') return Object.keys(value).length > 0
  return true
}

/**
 * Validate email address format
 * @param {string} email - Email to validate
 * @returns {boolean} True if email is valid
 */
export const isValidEmail = (email) => {
  if (!email || typeof email !== 'string') return false
  return VALIDATION_PATTERNS.EMAIL.test(email.trim())
}

/**
 * Validate phone number format
 * @param {string} phone - Phone number to validate
 * @returns {boolean} True if phone number is valid
 */
export const isValidPhone = (phone) => {
  if (!phone || typeof phone !== 'string') return false
  const cleaned = phone.replace(/\D/g, '')
  return VALIDATION_PATTERNS.PHONE.test(cleaned)
}

/**
 * Validate URL format
 * @param {string} url - URL to validate
 * @returns {boolean} True if URL is valid
 */
export const isValidURL = (url) => {
  if (!url || typeof url !== 'string') return false
  return VALIDATION_PATTERNS.URL.test(url.trim())
}

/**
 * Validate IP address format
 * @param {string} ip - IP address to validate
 * @param {string} version - IP version ('v4', 'v6', or 'both')
 * @returns {boolean} True if IP address is valid
 */
export const isValidIP = (ip, version = 'both') => {
  if (!ip || typeof ip !== 'string') return false
  
  switch (version) {
    case 'v4':
      return VALIDATION_PATTERNS.IPV4.test(ip)
    case 'v6':
      return VALIDATION_PATTERNS.IPV6.test(ip)
    case 'both':
      return VALIDATION_PATTERNS.IPV4.test(ip) || VALIDATION_PATTERNS.IPV6.test(ip)
    default:
      return false
  }
}

/**
 * Validate date format
 * @param {string} date - Date to validate
 * @returns {boolean} True if date is valid
 */
export const isValidDate = (date) => {
  if (!date || typeof date !== 'string') return false
  
  if (VALIDATION_PATTERNS.DATE.test(date)) {
    const dateObj = new Date(date)
    return !isNaN(dateObj.getTime())
  }
  
  return false
}

/**
 * Validate time format
 * @param {string} time - Time to validate
 * @returns {boolean} True if time is valid
 */
export const isValidTime = (time) => {
  if (!time || typeof time !== 'string') return false
  return VALIDATION_PATTERNS.TIME.test(time)
}

/**
 * Validate datetime format
 * @param {string} datetime - Datetime to validate
 * @returns {boolean} True if datetime is valid
 */
export const isValidDateTime = (datetime) => {
  if (!datetime || typeof datetime !== 'string') return false
  
  if (VALIDATION_PATTERNS.DATETIME.test(datetime)) {
    const dateObj = new Date(datetime)
    return !isNaN(dateObj.getTime())
  }
  
  return false
}

/**
 * Validate credit card number format
 * @param {string} cardNumber - Credit card number to validate
 * @returns {boolean} True if credit card number is valid
 */
export const isValidCreditCard = (cardNumber) => {
  if (!cardNumber || typeof cardNumber !== 'string') return false
  const cleaned = cardNumber.replace(/\D/g, '')
  return VALIDATION_PATTERNS.CREDIT_CARD.test(cleaned)
}

/**
 * Validate SSN format
 * @param {string} ssn - SSN to validate
 * @returns {boolean} True if SSN is valid
 */
export const isValidSSN = (ssn) => {
  if (!ssn || typeof ssn !== 'string') return false
  return VALIDATION_PATTERNS.SSN.test(ssn)
}

/**
 * Validate ZIP code format
 * @param {string} zipCode - ZIP code to validate
 * @returns {boolean} True if ZIP code is valid
 */
export const isValidZipCode = (zipCode) => {
  if (!zipCode || typeof zipCode !== 'string') return false
  return VALIDATION_PATTERNS.ZIP_CODE.test(zipCode)
}

/**
 * Validate string length
 * @param {string} value - String to validate
 * @param {Object} options - Length options
 * @returns {boolean} True if string length is valid
 */
export const isValidLength = (value, options = {}) => {
  if (!value || typeof value !== 'string') return false
  
  const { min, max } = options
  const length = value.length
  
  if (min !== undefined && length < min) return false
  if (max !== undefined && length > max) return false
  
  return true
}

/**
 * Validate numeric range
 * @param {number} value - Number to validate
 * @param {Object} options - Range options
 * @returns {boolean} True if number is within range
 */
export const isValidRange = (value, options = {}) => {
  if (typeof value !== 'number' || isNaN(value)) return false
  
  const { min, max } = options
  
  if (min !== undefined && value < min) return false
  if (max !== undefined && value > max) return false
  
  return true
}

/**
 * Validate pattern match
 * @param {string} value - Value to validate
 * @param {RegExp|string} pattern - Pattern to match
 * @returns {boolean} True if value matches pattern
 */
export const matchesPattern = (value, pattern) => {
  if (!value || typeof value !== 'string') return false
  
  if (pattern instanceof RegExp) {
    return pattern.test(value)
  }
  
  if (typeof pattern === 'string') {
    return new RegExp(pattern).test(value)
  }
  
  return false
}

/**
 * Validate object structure
 * @param {Object} obj - Object to validate
 * @param {Object} schema - Schema definition
 * @returns {Object} Validation result with errors
 */
export const validateObject = (obj, schema) => {
  if (!obj || typeof obj !== 'object') {
    return { isValid: false, errors: { _root: 'Invalid object' } }
  }
  
  const errors = {}
  
  for (const [key, rules] of Object.entries(schema)) {
    const value = obj[key]
    const fieldErrors = []
    
    // Required validation
    if (rules.required && !isRequired(value)) {
      fieldErrors.push(VALIDATION_MESSAGES.REQUIRED)
    }
    
    // Skip other validations if value is not required and empty
    if (!isRequired(value) && !rules.required) {
      continue
    }
    
    // Type validation
    if (rules.type && typeof value !== rules.type) {
      fieldErrors.push(`Must be of type ${rules.type}`)
    }
    
    // Length validation
    if (rules.minLength || rules.maxLength) {
      if (!isValidLength(value, { min: rules.minLength, max: rules.maxLength })) {
        if (rules.minLength && rules.maxLength) {
          fieldErrors.push(`Must be between ${rules.minLength} and ${rules.maxLength} characters`)
        } else if (rules.minLength) {
          fieldErrors.push(VALIDATION_MESSAGES.MIN_LENGTH.replace('{min}', rules.minLength))
        } else if (rules.maxLength) {
          fieldErrors.push(VALIDATION_MESSAGES.MAX_LENGTH.replace('{max}', rules.maxLength))
        }
      }
    }
    
    // Range validation
    if (rules.min !== undefined || rules.max !== undefined) {
      if (!isValidRange(value, { min: rules.min, max: rules.max })) {
        if (rules.min !== undefined && rules.max !== undefined) {
          fieldErrors.push(`Must be between ${rules.min} and ${rules.max}`)
        } else if (rules.min !== undefined) {
          fieldErrors.push(VALIDATION_MESSAGES.MIN_VALUE.replace('{min}', rules.min))
        } else if (rules.max !== undefined) {
          fieldErrors.push(VALIDATION_MESSAGES.MAX_VALUE.replace('{max}', rules.max))
        }
      }
    }
    
    // Pattern validation
    if (rules.pattern) {
      if (!matchesPattern(value, rules.pattern)) {
        fieldErrors.push(VALIDATION_MESSAGES.PATTERN)
      }
    }
    
    // Custom validation
    if (rules.validate) {
      const customResult = rules.validate(value, obj)
      if (customResult !== true) {
        fieldErrors.push(customResult || VALIDATION_MESSAGES.CUSTOM)
      }
    }
    
    if (fieldErrors.length > 0) {
      errors[key] = fieldErrors
    }
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  }
}

/**
 * Sanitize string input
 * @param {string} input - Input to sanitize
 * @param {Object} options - Sanitization options
 * @returns {string} Sanitized string
 */
export const sanitizeString = (input, options = {}) => {
  if (!input || typeof input !== 'string') return ''
  
  const {
    trim = true,
    removeHtml = true,
    removeScripts = true,
    maxLength = null,
    allowedTags = []
  } = options
  
  let result = input
  
  // Trim whitespace
  if (trim) {
    result = result.trim()
  }
  
  // Remove HTML tags
  if (removeHtml) {
    if (allowedTags.length > 0) {
      // Allow specific tags
      const allowedTagsRegex = new RegExp(`<(?!\/?(?:${allowedTags.join('|')})\b)[^>]+>`, 'gi')
      result = result.replace(allowedTagsRegex, '')
    } else {
      // Remove all HTML tags
      result = result.replace(/<[^>]*>/g, '')
    }
  }
  
  // Remove script tags and content
  if (removeScripts) {
    result = result.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
  }
  
  // Truncate if maxLength is specified
  if (maxLength && result.length > maxLength) {
    result = result.slice(0, maxLength)
  }
  
  return result
}

/**
 * Sanitize object input
 * @param {Object} obj - Object to sanitize
 * @param {Object} schema - Sanitization schema
 * @returns {Object} Sanitized object
 */
export const sanitizeObject = (obj, schema) => {
  if (!obj || typeof obj !== 'object') return {}
  
  const sanitized = {}
  
  for (const [key, rules] of Object.entries(schema)) {
    const value = obj[key]
    
    if (value === undefined) continue
    
    if (rules.sanitize) {
      sanitized[key] = rules.sanitize(value)
    } else if (rules.type === 'string') {
      sanitized[key] = sanitizeString(value, rules.stringOptions)
    } else if (rules.type === 'number') {
      sanitized[key] = Number(value) || rules.default
    } else if (rules.type === 'boolean') {
      sanitized[key] = Boolean(value)
    } else if (rules.type === 'array' && Array.isArray(value)) {
      sanitized[key] = value.map(item => 
        rules.itemSanitizer ? rules.itemSanitizer(item) : item
      )
    } else {
      sanitized[key] = value
    }
  }
  
  return sanitized
}

/**
 * Create a validation error object
 * @param {string} field - Field name
 * @param {string} message - Error message
 * @param {string} code - Error code
 * @returns {Object} Error object
 */
export const createValidationError = (field, message, code = 'VALIDATION_ERROR') => {
  return {
    field,
    message,
    code,
    timestamp: new Date().toISOString()
  }
}

/**
 * Format validation errors for display
 * @param {Object} errors - Validation errors object
 * @returns {Array} Array of formatted error messages
 */
export const formatValidationErrors = (errors) => {
  if (!errors || typeof errors !== 'object') return []
  
  const formatted = []
  
  for (const [field, fieldErrors] of Object.entries(errors)) {
    if (Array.isArray(fieldErrors)) {
      fieldErrors.forEach(error => {
        formatted.push({
          field,
          message: error,
          displayMessage: `${field}: ${error}`
        })
      })
    } else {
      formatted.push({
        field,
        message: fieldErrors,
        displayMessage: `${field}: ${fieldErrors}`
      })
    }
  }
  
  return formatted
}

/**
 * Debounce function execution
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @param {boolean} immediate - Whether to execute immediately
 * @returns {Function} Debounced function
 */
export const debounce = (func, wait, immediate = false) => {
  let timeout
  
  return function executedFunction(...args) {
    const later = () => {
      timeout = null
      if (!immediate) func(...args)
    }
    
    const callNow = immediate && !timeout
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
    
    if (callNow) func(...args)
  }
}

/**
 * Throttle function execution
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function} Throttled function
 */
export const throttle = (func, limit) => {
  let inThrottle
  
  return function executedFunction(...args) {
    if (!inThrottle) {
      func.apply(this, args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}
