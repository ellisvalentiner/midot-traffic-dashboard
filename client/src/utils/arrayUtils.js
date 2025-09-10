/**
 * Array and Object Utility Functions
 * Provides comprehensive array manipulation, object handling, and data transformation utilities
 */

/**
 * Check if a value is an array
 * @param {any} value - Value to check
 * @returns {boolean} True if value is an array
 */
export const isArray = (value) => {
  return Array.isArray(value)
}

/**
 * Check if a value is an object (but not null, array, or primitive)
 * @param {any} value - Value to check
 * @returns {boolean} True if value is an object
 */
export const isObject = (value) => {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

/**
 * Check if an object is empty
 * @param {Object} obj - Object to check
 * @returns {boolean} True if object is empty
 */
export const isEmpty = (obj) => {
  if (obj == null) return true
  if (Array.isArray(obj) || typeof obj === 'string') return obj.length === 0
  if (obj instanceof Map || obj instanceof Set) return obj.size === 0
  if (typeof obj === 'object') return Object.keys(obj).length === 0
  return false
}

/**
 * Get the first element of an array
 * @param {Array} array - Array to get first element from
 * @param {any} defaultValue - Default value if array is empty
 * @returns {any} First element or default value
 */
export const first = (array, defaultValue = undefined) => {
  if (!Array.isArray(array) || array.length === 0) {
    return defaultValue
  }
  return array[0]
}

/**
 * Get the last element of an array
 * @param {Array} array - Array to get last element from
 * @param {any} defaultValue - Default value if array is empty
 * @returns {any} Last element or default value
 */
export const last = (array, defaultValue = undefined) => {
  if (!Array.isArray(array) || array.length === 0) {
    return defaultValue
  }
  return array[array.length - 1]
}

/**
 * Get a random element from an array
 * @param {Array} array - Array to get random element from
 * @returns {any} Random element or undefined if array is empty
 */
export const random = (array) => {
  if (!Array.isArray(array) || array.length === 0) {
    return undefined
  }
  return array[Math.floor(Math.random() * array.length)]
}

/**
 * Shuffle an array (Fisher-Yates algorithm)
 * @param {Array} array - Array to shuffle
 * @param {boolean} inPlace - Whether to shuffle in place or return new array
 * @returns {Array} Shuffled array
 */
export const shuffle = (array, inPlace = false) => {
  if (!Array.isArray(array)) return []
  
  const result = inPlace ? array : [...array]
  
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  
  return result
}

/**
 * Remove duplicates from an array
 * @param {Array} array - Array to remove duplicates from
 * @param {Function} keyFn - Function to extract key for comparison
 * @returns {Array} Array with duplicates removed
 */
export const unique = (array, keyFn = null) => {
  if (!Array.isArray(array)) return []
  
  if (keyFn) {
    const seen = new Set()
    return array.filter(item => {
      const key = keyFn(item)
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }
  
  return [...new Set(array)]
}

/**
 * Group array items by a key or function
 * @param {Array} array - Array to group
 * @param {string|Function} key - Key to group by or function that returns key
 * @returns {Object} Grouped items
 */
export const groupBy = (array, key) => {
  if (!Array.isArray(array)) return {}
  
  return array.reduce((groups, item) => {
    const groupKey = typeof key === 'function' ? key(item) : item[key]
    if (!groups[groupKey]) {
      groups[groupKey] = []
    }
    groups[groupKey].push(item)
    return groups
  }, {})
}

/**
 * Sort array by multiple criteria
 * @param {Array} array - Array to sort
 * @param {Array|Function} criteria - Sort criteria or function
 * @returns {Array} Sorted array
 */
export const sortBy = (array, criteria) => {
  if (!Array.isArray(array)) return []
  
  if (typeof criteria === 'function') {
    return [...array].sort(criteria)
  }
  
  if (Array.isArray(criteria)) {
    return [...array].sort((a, b) => {
      for (const criterion of criteria) {
        const { key, order = 'asc' } = criterion
        const aVal = typeof key === 'function' ? key(a) : a[key]
        const bVal = typeof key === 'function' ? key(b) : b[key]
        
        if (aVal < bVal) return order === 'desc' ? 1 : -1
        if (aVal > bVal) return order === 'desc' ? -1 : 1
      }
      return 0
    })
  }
  
  return [...array]
}

/**
 * Filter array by multiple conditions
 * @param {Array} array - Array to filter
 * @param {Object|Function} conditions - Filter conditions or function
 * @returns {Array} Filtered array
 */
export const filterBy = (array, conditions) => {
  if (!Array.isArray(array)) return []
  
  if (typeof conditions === 'function') {
    return array.filter(conditions)
  }
  
  if (typeof conditions === 'object') {
    return array.filter(item => {
      return Object.entries(conditions).every(([key, value]) => {
        if (typeof value === 'function') {
          return value(item[key], item)
        }
        if (value instanceof RegExp) {
          return value.test(item[key])
        }
        return item[key] === value
      })
    })
  }
  
  return array
}

/**
 * Find item in array by conditions
 * @param {Array} array - Array to search
 * @param {Object|Function} conditions - Search conditions or function
 * @returns {any} Found item or undefined
 */
export const findBy = (array, conditions) => {
  if (!Array.isArray(array)) return undefined
  
  if (typeof conditions === 'function') {
    return array.find(conditions)
  }
  
  if (typeof conditions === 'object') {
    return array.find(item => {
      return Object.entries(conditions).every(([key, value]) => {
        if (typeof value === 'function') {
          return value(item[key], item)
        }
        if (value instanceof RegExp) {
          return value.test(item[key])
        }
        return item[key] === value
      })
    })
  }
  
  return undefined
}

/**
 * Map array with index and array context
 * @param {Array} array - Array to map
 * @param {Function} fn - Mapping function (item, index, array)
 * @returns {Array} Mapped array
 */
export const mapWithIndex = (array, fn) => {
  if (!Array.isArray(array)) return []
  return array.map(fn)
}

/**
 * Reduce array with initial value
 * @param {Array} array - Array to reduce
 * @param {Function} fn - Reduction function (accumulator, item, index, array)
 * @param {any} initialValue - Initial value for accumulator
 * @returns {any} Reduced value
 */
export const reduceWithInitial = (array, fn, initialValue) => {
  if (!Array.isArray(array)) return initialValue
  return array.reduce(fn, initialValue)
}

/**
 * Chunk array into smaller arrays
 * @param {Array} array - Array to chunk
 * @param {number} size - Size of each chunk
 * @returns {Array} Array of chunks
 */
export const chunk = (array, size) => {
  if (!Array.isArray(array) || size <= 0) return []
  
  const chunks = []
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size))
  }
  
  return chunks
}

/**
 * Flatten nested arrays
 * @param {Array} array - Array to flatten
 * @param {number} depth - Maximum depth to flatten (default: Infinity)
 * @returns {Array} Flattened array
 */
export const flatten = (array, depth = Infinity) => {
  if (!Array.isArray(array)) return []
  
  if (depth === 0) return array
  
  return array.reduce((flat, item) => {
    if (Array.isArray(item) && depth > 0) {
      return flat.concat(flatten(item, depth - 1))
    }
    return flat.concat(item)
  }, [])
}

/**
 * Get intersection of multiple arrays
 * @param {...Array} arrays - Arrays to find intersection of
 * @returns {Array} Array containing common elements
 */
export const intersection = (...arrays) => {
  if (arrays.length === 0) return []
  
  const validArrays = arrays.filter(Array.isArray)
  if (validArrays.length === 0) return []
  
  return validArrays.reduce((common, array) => {
    return common.filter(item => array.includes(item))
  })
}

/**
 * Get union of multiple arrays
 * @param {...Array} arrays - Arrays to find union of
 * @returns {Array} Array containing all unique elements
 */
export const union = (...arrays) => {
  if (arrays.length === 0) return []
  
  const validArrays = arrays.filter(Array.isArray)
  if (validArrays.length === 0) return []
  
  return unique(flatten(validArrays))
}

/**
 * Get difference between arrays (elements in first array but not in others)
 * @param {Array} array - Base array
 * @param {...Array} others - Arrays to subtract
 * @returns {Array} Array containing elements only in base array
 */
export const difference = (array, ...others) => {
  if (!Array.isArray(array)) return []
  
  const otherElements = flatten(others.filter(Array.isArray))
  return array.filter(item => !otherElements.includes(item))
}

/**
 * Create array with range of numbers
 * @param {number} start - Start of range
 * @param {number} end - End of range
 * @param {number} step - Step between numbers
 * @returns {Array} Array of numbers
 */
export const range = (start, end, step = 1) => {
  if (step === 0) return []
  
  const result = []
  const ascending = step > 0
  
  for (let i = start; ascending ? i <= end : i >= end; i += step) {
    result.push(i)
  }
  
  return result
}

/**
 * Create array with repeated values
 * @param {any} value - Value to repeat
 * @param {number} count - Number of times to repeat
 * @returns {Array} Array with repeated values
 */
export const repeat = (value, count) => {
  if (count <= 0) return []
  return Array(count).fill(value)
}

/**
 * Get random sample from array
 * @param {Array} array - Array to sample from
 * @param {number} size - Size of sample
 * @returns {Array} Random sample
 */
export const sample = (array, size = 1) => {
  if (!Array.isArray(array) || size <= 0) return []
  
  const shuffled = shuffle(array)
  return shuffled.slice(0, Math.min(size, array.length))
}

/**
 * Partition array into two arrays based on predicate
 * @param {Array} array - Array to partition
 * @param {Function} predicate - Function to test each element
 * @returns {Array} Array containing [trueElements, falseElements]
 */
export const partition = (array, predicate) => {
  if (!Array.isArray(array)) return [[], []]
  
  return array.reduce(
    (result, item) => {
      result[predicate(item) ? 0 : 1].push(item)
      return result
    },
    [[], []]
  )
}

/**
 * Count occurrences of items in array
 * @param {Array} array - Array to count items in
 * @returns {Object} Object with item counts
 */
export const countBy = (array) => {
  if (!Array.isArray(array)) return {}
  
  return array.reduce((counts, item) => {
    counts[item] = (counts[item] || 0) + 1
    return counts
  }, {})
}

/**
 * Get array statistics (min, max, sum, average, etc.)
 * @param {Array} array - Array to analyze
 * @returns {Object} Object with statistics
 */
export const getStats = (array) => {
  if (!Array.isArray(array) || array.length === 0) {
    return {
      count: 0,
      min: undefined,
      max: undefined,
      sum: 0,
      average: 0,
      median: undefined
    }
  }
  
  const numericArray = array.filter(item => typeof item === 'number' && !isNaN(item))
  
  if (numericArray.length === 0) {
    return {
      count: array.length,
      min: undefined,
      max: undefined,
      sum: 0,
      average: 0,
      median: undefined
    }
  }
  
  const sorted = [...numericArray].sort((a, b) => a - b)
  const sum = numericArray.reduce((acc, val) => acc + val, 0)
  const average = sum / numericArray.length
  const median = sorted.length % 2 === 0
    ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
    : sorted[Math.floor(sorted.length / 2)]
  
  return {
    count: array.length,
    numericCount: numericArray.length,
    min: Math.min(...numericArray),
    max: Math.max(...numericArray),
    sum,
    average,
    median
  }
}

/**
 * Deep clone an object or array
 * @param {any} obj - Object to clone
 * @returns {any} Cloned object
 */
export const deepClone = (obj) => {
  if (obj === null || typeof obj !== 'object') return obj
  if (obj instanceof Date) return new Date(obj.getTime())
  if (obj instanceof RegExp) return new RegExp(obj)
  if (obj instanceof Map) return new Map(Array.from(obj.entries()))
  if (obj instanceof Set) return new Set(Array.from(obj))
  
  if (Array.isArray(obj)) {
    return obj.map(item => deepClone(item))
  }
  
  const cloned = {}
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      cloned[key] = deepClone(obj[key])
    }
  }
  
  return cloned
}

/**
 * Merge multiple objects deeply
 * @param {...Object} objects - Objects to merge
 * @returns {Object} Merged object
 */
export const deepMerge = (...objects) => {
  const result = {}
  
  objects.forEach(obj => {
    if (obj && typeof obj === 'object') {
      Object.keys(obj).forEach(key => {
        if (obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
          result[key] = deepMerge(result[key] || {}, obj[key])
        } else {
          result[key] = obj[key]
        }
      })
    }
  })
  
  return result
}

/**
 * Pick specific properties from an object
 * @param {Object} obj - Source object
 * @param {Array|string} keys - Keys to pick
 * @returns {Object} Object with picked properties
 */
export const pick = (obj, keys) => {
  if (!obj || typeof obj !== 'object') return {}
  
  const keyArray = Array.isArray(keys) ? keys : [keys]
  return keyArray.reduce((result, key) => {
    if (key in obj) {
      result[key] = obj[key]
    }
    return result
  }, {})
}

/**
 * Omit specific properties from an object
 * @param {Object} obj - Source object
 * @param {Array|string} keys - Keys to omit
 * @returns {Object} Object without omitted properties
 */
export const omit = (obj, keys) => {
  if (!obj || typeof obj !== 'object') return {}
  
  const keyArray = Array.isArray(keys) ? keys : [keys]
  const keySet = new Set(keyArray)
  
  return Object.keys(obj).reduce((result, key) => {
    if (!keySet.has(key)) {
      result[key] = obj[key]
    }
    return result
  }, {})
}
