import axios from 'axios'

// Create axios instance with default configuration
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add any request preprocessing here
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor
api.interceptors.response.use(
  (response) => {
    // Add any response preprocessing here
    return response
  },
  (error) => {
    // Handle common errors
    if (error.response?.status === 401) {
      // Handle unauthorized access
    } else if (error.response?.status === 500) {
      // Handle server errors
    }
    return Promise.reject(error)
  }
)

// Common HTTP methods with error handling
const api = {
  // GET request
  get: async (url, config = {}) => {
    try {
      const response = await apiClient.get(url, config)
      return {
        success: true,
        data: response.data.data || response.data,
        count: response.data.count,
        message: response.data.message,
        raw: response.data
      }
    } catch (error) {
      return {
        success: false,
        error: error.userMessage,
        status: error.response?.status,
        details: error.apiError
      }
    }
  },

  // POST request
  post: async (url, data = {}, config = {}) => {
    try {
      const response = await apiClient.post(url, data, config)
      return {
        success: true,
        data: response.data.data || response.data,
        message: response.data.message,
        raw: response.data
      }
    } catch (error) {
      return {
        success: false,
        error: error.userMessage,
        status: error.response?.status,
        details: error.apiError
      }
    }
  },

  // PUT request
  put: async (url, data = {}, config = {}) => {
    try {
      const response = await apiClient.put(url, data, config)
      return {
        success: true,
        data: response.data.data || response.data,
        message: response.data.message,
        raw: response.data
      }
    } catch (error) {
      return {
        success: false,
        error: error.userMessage,
        status: error.response?.status,
        details: error.apiError
      }
    }
  },

  // PATCH request
  patch: async (url, data = {}, config = {}) => {
    try {
      const response = await apiClient.patch(url, data, config)
      return {
        success: true,
        data: response.data.data || response.data,
        message: response.data.message,
        raw: response.data
      }
    } catch (error) {
      return {
        success: false,
        error: error.userMessage,
        status: error.response?.status,
        details: error.apiError
      }
    }
  },

  // DELETE request
  delete: async (url, config = {}) => {
    try {
      const response = await apiClient.delete(url, config)
      return {
        success: true,
        data: response.data.data || response.data,
        message: response.data.message,
        raw: response.data
      }
    } catch (error) {
      return {
        success: false,
        error: error.userMessage,
        status: error.response?.status,
        details: error.apiError
      }
    }
  },

  // File upload helper
  upload: async (url, file, onProgress = null, config = {}) => {
    try {
      const formData = new FormData()
      formData.append('file', file)
      
      const uploadConfig = {
        ...config,
        headers: {
          ...config.headers,
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: onProgress ? (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          onProgress(percentCompleted)
        } : undefined,
      }
      
      const response = await apiClient.post(url, formData, uploadConfig)
      return {
        success: true,
        data: response.data.data || response.data,
        message: response.data.message,
        raw: response.data
      }
    } catch (error) {
      return {
        success: false,
        error: error.userMessage,
        status: error.response?.status,
        details: error.apiError
      }
    }
  },

  // Batch requests helper
  batch: async (requests) => {
    try {
      const responses = await Promise.all(requests.map(req => apiClient.request(req)))
      return {
        success: true,
        data: responses.map(response => response.data.data || response.data),
        raw: responses
      }
    } catch (error) {
      return {
        success: false,
        error: error.userMessage,
        status: error.response?.status,
        details: error.apiError
      }
    }
  }
}

export default api
export { apiClient }
