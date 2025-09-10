import {useCallback, useEffect, useState} from 'react'
import {settingsService} from '../services'
import useApi from './useApi'

const useSettings = (options = {}) => {
  const {
    autoFetch = true,
    refreshInterval = null
  } = options

  // Application settings state
  const appSettingsApi = useApi(null)
  const [appSettings, setAppSettings] = useState(null)

  // Camera settings state
  const cameraSettingsApi = useApi({})
  const [cameraSettings, setCameraSettings] = useState({})

  // AI analysis settings state
  const aiSettingsApi = useApi(null)
  const [aiSettings, setAiSettings] = useState(null)

  // Notification settings state
  const notificationSettingsApi = useApi(null)
  const [notificationSettings, setNotificationSettings] = useState(null)

  // Storage settings state
  const storageSettingsApi = useApi(null)
  const [storageSettings, setStorageSettings] = useState(null)

  // System information state
  const systemInfoApi = useApi(null)
  const [systemInfo, setSystemInfo] = useState(null)

  // Performance settings state
  const performanceSettingsApi = useApi(null)
  const [performanceSettings, setPerformanceSettings] = useState(null)

  // Setting categories state
  const categoriesApi = useApi([])
  const [categories, setCategories] = useState([])

  // Setting schema state
  const schemaApi = useApi({})
  const [schema, setSchema] = useState({})

  // Dirty state tracking
  const [dirtySettings, setDirtySettings] = useState(new Set())

  // Export/import state
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)

  // Validation state
  const [validationErrors, setValidationErrors] = useState({})

  // Fetch application settings
  const fetchAppSettings = useCallback(async () => {
    await appSettingsApi.execute(
      () => settingsService.getSettings(),
      { resetState: true }
    )
  }, [appSettingsApi])

  // Fetch camera settings
  const fetchCameraSettings = useCallback(async (cameraId) => {
    if (!cameraId) return

    await cameraSettingsApi.execute(
      () => settingsService.getCameraSettings(cameraId),
      { resetState: true }
    )
  }, [cameraSettingsApi])

  // Fetch AI analysis settings
  const fetchAISettings = useCallback(async () => {
    await aiSettingsApi.execute(
      () => settingsService.getAIAnalysisSettings(),
      { resetState: true }
    )
  }, [aiSettingsApi])

  // Fetch notification settings
  const fetchNotificationSettings = useCallback(async () => {
    await notificationSettingsApi.execute(
      () => settingsService.getNotificationSettings(),
      { resetState: true }
    )
  }, [notificationSettingsApi])

  // Fetch storage settings
  const fetchStorageSettings = useCallback(async () => {
    await storageSettingsApi.execute(
      () => settingsService.getStorageSettings(),
      { resetState: true }
    )
  }, [storageSettingsApi])

  // Fetch system information
  const fetchSystemInfo = useCallback(async () => {
    await systemInfoApi.execute(
      () => settingsService.getSystemInfo(),
      { resetState: true }
    )
  }, [systemInfoApi])

  // Fetch performance settings
  const fetchPerformanceSettings = useCallback(async () => {
    await performanceSettingsApi.execute(
      () => settingsService.getPerformanceSettings(),
      { resetState: true }
    )
  }, [performanceSettingsApi])

  // Fetch setting categories
  const fetchCategories = useCallback(async () => {
    await categoriesApi.execute(
      () => settingsService.getSettingCategories(),
      { resetState: true }
    )
  }, [categoriesApi])

  // Fetch setting schema
  const fetchSchema = useCallback(async (category = null) => {
    await schemaApi.execute(
      () => settingsService.getSettingSchema(category),
      { resetState: true }
    )
  }, [schemaApi])

  // Fetch all settings
  const fetchAllSettings = useCallback(async () => {
    await Promise.all([
      fetchAppSettings(),
      fetchAISettings(),
      fetchNotificationSettings(),
      fetchStorageSettings(),
      fetchSystemInfo(),
      fetchPerformanceSettings(),
      fetchCategories(),
      fetchSchema()
    ])
  }, [
    fetchAppSettings,
    fetchAISettings,
    fetchNotificationSettings,
    fetchStorageSettings,
    fetchSystemInfo,
    fetchPerformanceSettings,
    fetchCategories,
    fetchSchema
  ])

  // Update application settings
  const updateAppSettings = useCallback(async (updates) => {
    const result = await settingsService.updateSettings(updates)
    if (result.success) {
      setAppSettings(prev => ({ ...prev, ...updates }))
      setDirtySettings(prev => {
        const newSet = new Set(prev)
        Object.keys(updates).forEach(key => newSet.delete(key))
        return newSet
      })
      return result
    }
    throw new Error(result.error)
  }, [])

  // Update camera settings
  const updateCameraSettings = useCallback(async (cameraId, updates) => {
    const result = await settingsService.updateCameraSettings(cameraId, updates)
    if (result.success) {
      setCameraSettings(prev => ({
        ...prev,
        [cameraId]: { ...prev[cameraId], ...updates }
      }))
      setDirtySettings(prev => {
        const newSet = new Set(prev)
        Object.keys(updates).forEach(key => newSet.delete(`camera_${cameraId}_${key}`))
        return newSet
      })
      return result
    }
    throw new Error(result.error)
  }, [])

  // Update AI analysis settings
  const updateAISettings = useCallback(async (updates) => {
    const result = await settingsService.updateAIAnalysisSettings(updates)
    if (result.success) {
      setAiSettings(prev => ({ ...prev, ...updates }))
      setDirtySettings(prev => {
        const newSet = new Set(prev)
        Object.keys(updates).forEach(key => newSet.delete(key))
        return newSet
      })
      return result
    }
    throw new Error(result.error)
  }, [])

  // Update notification settings
  const updateNotificationSettings = useCallback(async (updates) => {
    const result = await settingsService.updateNotificationSettings(updates)
    if (result.success) {
      setNotificationSettings(prev => ({ ...prev, ...updates }))
      setDirtySettings(prev => {
        const newSet = new Set(prev)
        Object.keys(updates).forEach(key => newSet.delete(key))
        return newSet
      })
      return result
    }
    throw new Error(result.error)
  }, [])

  // Update storage settings
  const updateStorageSettings = useCallback(async (updates) => {
    const result = await settingsService.updateStorageSettings(updates)
    if (result.success) {
      setStorageSettings(prev => ({ ...prev, ...updates }))
      setDirtySettings(prev => {
        const newSet = new Set(prev)
        Object.keys(updates).forEach(key => newSet.delete(key))
        return newSet
      })
      return result
    }
    throw new Error(result.error)
  }, [])

  // Update performance settings
  const updatePerformanceSettings = useCallback(async (updates) => {
    const result = await settingsService.updatePerformanceSettings(updates)
    if (result.success) {
      setPerformanceSettings(prev => ({ ...prev, ...updates }))
      setDirtySettings(prev => {
        const newSet = new Set(prev)
        Object.keys(updates).forEach(key => newSet.delete(key))
        return newSet
      })
      return result
    }
    throw new Error(result.error)
  }, [])

  // Reset settings to defaults
  const resetSettings = useCallback(async (category = null) => {
    const result = await settingsService.resetSettings(category)
    if (result.success) {
      // Refetch settings after reset
      await fetchAllSettings()
      setDirtySettings(new Set())
      return result
    }
    throw new Error(result.error)
  }, [fetchAllSettings])

  // Export settings
  const exportSettings = useCallback(async (format = 'json') => {
    setExporting(true)
    try {
      const result = await settingsService.exportSettings(format)
      return result
    } finally {
      setExporting(false)
    }
  }, [])

  // Import settings
  const importSettings = useCallback(async (file, onProgress = null) => {
    setImporting(true)
    try {
      const result = await settingsService.importSettings(file, onProgress)
      if (result.success) {
        // Refetch settings after import
        await fetchAllSettings()
        setDirtySettings(new Set())
      }
      return result
    } finally {
      setImporting(false)
    }
  }, [fetchAllSettings])

  // Validate settings
  const validateSettings = useCallback(async (settings, category = null) => {
    const result = await settingsService.validateSettings(settings)
    if (result.success) {
      setValidationErrors({})
      return result
    } else {
      setValidationErrors(result.errors || {})
      throw new Error(result.error)
    }
  }, [])

  // Mark setting as dirty
  const markDirty = useCallback((settingKey) => {
    setDirtySettings(prev => new Set(prev).add(settingKey))
  }, [])

  // Clear dirty state
  const clearDirty = useCallback(() => {
    setDirtySettings(new Set())
  }, [])

  // Check if settings are dirty
  const hasDirtySettings = dirtySettings.size > 0

  // Save all dirty settings
  const saveAllDirty = useCallback(async () => {
    const promises = []

    // Group dirty settings by category and save
    for (const dirtyKey of dirtySettings) {
      if (dirtyKey.startsWith('camera_')) {
        // Camera setting
        const [, cameraId, settingKey] = dirtyKey.split('_')
        const value = cameraSettings[cameraId]?.[settingKey]
        if (value !== undefined) {
          promises.push(updateCameraSettings(cameraId, { [settingKey]: value }))
        }
      } else if (dirtyKey.startsWith('ai_')) {
        // AI setting
        const value = aiSettings?.[dirtyKey]
        if (value !== undefined) {
          promises.push(updateAISettings({ [dirtyKey]: value }))
        }
      } else if (dirtyKey.startsWith('notification_')) {
        // Notification setting
        const value = notificationSettings?.[dirtyKey]
        if (value !== undefined) {
          promises.push(updateNotificationSettings({ [dirtyKey]: value }))
        }
      } else if (dirtyKey.startsWith('storage_')) {
        // Storage setting
        const value = storageSettings?.[dirtyKey]
        if (value !== undefined) {
          promises.push(updateStorageSettings({ [dirtyKey]: value }))
        }
      } else if (dirtyKey.startsWith('performance_')) {
        // Performance setting
        const value = performanceSettings?.[dirtyKey]
        if (value !== undefined) {
          promises.push(updatePerformanceSettings({ [dirtyKey]: value }))
        }
      } else {
        // App setting
        const value = appSettings?.[dirtyKey]
        if (value !== undefined) {
          promises.push(updateAppSettings({ [dirtyKey]: value }))
        }
      }
    }

    await Promise.all(promises)
    setDirtySettings(new Set())
  }, [
    dirtySettings,
    cameraSettings,
    aiSettings,
    notificationSettings,
    storageSettings,
    performanceSettings,
    appSettings,
    updateCameraSettings,
    updateAISettings,
    updateNotificationSettings,
    updateStorageSettings,
    updatePerformanceSettings,
    updateAppSettings
  ])

  // Update state when API data changes
  useEffect(() => {
    if (appSettingsApi.data) {
      setAppSettings(appSettingsApi.data)
    }
  }, [appSettingsApi.data])

  useEffect(() => {
    if (cameraSettingsApi.data) {
      setCameraSettings(prev => ({
        ...prev,
        ...cameraSettingsApi.data
      }))
    }
  }, [cameraSettingsApi.data])

  useEffect(() => {
    if (aiSettingsApi.data) {
      setAiSettings(aiSettingsApi.data)
    }
  }, [aiSettingsApi.data])

  useEffect(() => {
    if (notificationSettingsApi.data) {
      setNotificationSettings(notificationSettingsApi.data)
    }
  }, [notificationSettingsApi.data])

  useEffect(() => {
    if (storageSettingsApi.data) {
      setStorageSettings(storageSettingsApi.data)
    }
  }, [storageSettingsApi.data])

  useEffect(() => {
    if (systemInfoApi.data) {
      setSystemInfo(systemInfoApi.data)
    }
  }, [systemInfoApi.data])

  useEffect(() => {
    if (performanceSettingsApi.data) {
      setPerformanceSettings(performanceSettingsApi.data)
    }
  }, [performanceSettingsApi.data])

  useEffect(() => {
    if (categoriesApi.data) {
      setCategories(categoriesApi.data)
    }
  }, [categoriesApi.data])

  useEffect(() => {
    if (schemaApi.data) {
      setSchema(schemaApi.data)
    }
  }, [schemaApi.data])

  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetch) {
      fetchAllSettings()
    }
  }, [autoFetch, fetchAllSettings])

  // Set up refresh interval
  useEffect(() => {
    if (refreshInterval) {
      const interval = setInterval(() => {
        fetchAllSettings()
      }, refreshInterval)

      return () => clearInterval(interval)
    }
  }, [refreshInterval, fetchAllSettings])

  return {
    // State
    appSettings,
    cameraSettings,
    aiSettings,
    notificationSettings,
    storageSettings,
    systemInfo,
    performanceSettings,
    categories,
    schema,
    dirtySettings,
    validationErrors,
    exporting,
    importing,

    // API state
    appSettingsLoading: appSettingsApi.loading,
    appSettingsError: appSettingsApi.error,
    cameraSettingsLoading: cameraSettingsApi.loading,
    aiSettingsLoading: aiSettingsApi.loading,
    notificationSettingsLoading: notificationSettingsApi.loading,
    storageSettingsLoading: storageSettingsApi.loading,
    systemInfoLoading: systemInfoApi.loading,
    performanceSettingsLoading: performanceSettingsApi.loading,
    categoriesLoading: categoriesApi.loading,
    schemaLoading: schemaApi.loading,

    // Actions
    fetchAppSettings,
    fetchCameraSettings,
    fetchAISettings,
    fetchNotificationSettings,
    fetchStorageSettings,
    fetchSystemInfo,
    fetchPerformanceSettings,
    fetchCategories,
    fetchSchema,
    fetchAllSettings,
    updateAppSettings,
    updateCameraSettings,
    updateAISettings,
    updateNotificationSettings,
    updateStorageSettings,
    updatePerformanceSettings,
    resetSettings,
    exportSettings,
    importSettings,
    validateSettings,

    // Dirty state management
    markDirty,
    clearDirty,
    saveAllDirty,
    hasDirtySettings,

    // Utility
    hasData: appSettings || aiSettings || notificationSettings,
    isLoading: appSettingsApi.loading || aiSettingsApi.loading || notificationSettingsApi.loading,
    hasError: appSettingsApi.error || aiSettingsApi.error || notificationSettingsApi.error
  }
}

export default useSettings
