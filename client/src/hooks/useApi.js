import {useCallback, useRef, useState} from 'react'

const useApi = (initialData = null) => {
  const [data, setData] = useState(initialData)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const abortControllerRef = useRef(null)

  // Execute API call with automatic state management
  const execute = useCallback(async (apiCall, options = {}) => {
    const {
      onSuccess,
      onError,
      onFinally,
      resetState = false,
      preserveData = false,
      abortPrevious = true
    } = options

    // Abort previous request if needed
    if (abortPrevious && abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController()

    try {
      // Reset state if requested
      if (resetState) {
        setData(initialData)
        setError(null)
        setSuccess(false)
      }

      setLoading(true)
      setError(null)
      setSuccess(false)

      // Execute API call with abort signal
      const result = await apiCall(abortControllerRef.current.signal)

      // Check if request was aborted
      if (abortControllerRef.current.signal.aborted) {
        return
      }

      if (result.success) {
        // Update data based on preserveData option
        if (preserveData && data) {
          setData(prevData => {
            if (Array.isArray(prevData) && Array.isArray(result.data)) {
              return [...prevData, ...result.data]
            }
            return { ...prevData, ...result.data }
          })
        } else {
          setData(result.data)
        }

        setSuccess(true)
        setError(null)

        // Call success callback
        if (onSuccess) {
          onSuccess(result.data, result)
        }
      } else {
        setError(result.error || 'An error occurred')
        setSuccess(false)

        // Call error callback
        if (onError) {
          onError(result.error, result)
        }
      }
    } catch (err) {
      // Check if request was aborted
      if (abortControllerRef.current.signal.aborted) {
        return
      }

      const errorMessage = err.message || 'An unexpected error occurred'
      setError(errorMessage)
      setSuccess(false)

      // Call error callback
      if (onError) {
        onError(errorMessage, err)
      }
    } finally {
      // Check if request was aborted
      if (abortControllerRef.current.signal.aborted) {
        return
      }

      setLoading(false)

      // Call finally callback
      if (onFinally) {
        onFinally()
      }
    }
  }, [data, initialData])

  // Reset state to initial values
  const reset = useCallback(() => {
    setData(initialData)
    setLoading(false)
    setError(null)
    setSuccess(false)
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
  }, [initialData])

  // Update data manually
  const updateData = useCallback((newData) => {
    setData(newData)
  }, [])

  // Set error manually
  const setErrorManually = useCallback((errorMessage) => {
    setError(errorMessage)
    setSuccess(false)
  }, [])

  // Set loading manually
  const setLoadingManually = useCallback((isLoading) => {
    setLoading(isLoading)
  }, [])

  // Abort current request
  const abort = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      setLoading(false)
    }
  }, [])

  // Check if there's an active request
  const isActive = loading && !abortControllerRef.current?.signal.aborted

  return {
    // State
    data,
    loading,
    error,
    success,
    isActive,

    // Actions
    execute,
    reset,
    updateData,
    setError: setErrorManually,
    setLoading: setLoadingManually,
    abort,

    // Utility
    hasData: data !== null && data !== undefined,
    hasError: error !== null,
    isEmpty: Array.isArray(data) ? data.length === 0 : !data
  }
}

export default useApi
