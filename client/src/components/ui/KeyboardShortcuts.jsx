import React, {useEffect, useState} from 'react'
import {useLocation, useNavigate} from 'react-router-dom'
import {useToast} from '../../contexts/ToastContext'
import {useTheme} from '../../contexts/ThemeContext'

const KeyboardShortcuts = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { showInfo } = useToast()
  const { toggleTheme } = useTheme()
  const [showHelp, setShowHelp] = useState(false)

  useEffect(() => {
    const handleKeyDown = (event) => {
      // Don't trigger shortcuts when typing in input fields
      if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
        return
      }

      // Ctrl/Cmd + K: Show keyboard shortcuts help
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault()
        setShowHelp(prev => !prev)
        return
      }

      // Ctrl/Cmd + T: Toggle theme
      if ((event.ctrlKey || event.metaKey) && event.key === 't') {
        event.preventDefault()
        toggleTheme()
        showInfo('Theme toggled')
        return
      }

      // Ctrl/Cmd + 1-5: Navigate to main sections
      if ((event.ctrlKey || event.metaKey) && /^[1-5]$/.test(event.key)) {
        event.preventDefault()
        const routes = ['/', '/cameras', '/images', '/analytics', '/settings']
        const routeIndex = parseInt(event.key) - 1
        if (routes[routeIndex] && routes[routeIndex] !== location.pathname) {
          navigate(routes[routeIndex])
          showInfo(`Navigated to ${routes[routeIndex] === '/' ? 'Dashboard' : routes[routeIndex].slice(1).charAt(0).toUpperCase() + routes[routeIndex].slice(2)}`)
        }
        return
      }

      // Escape: Close modals/help
      if (event.key === 'Escape') {
        setShowHelp(false)
        return
      }

      // H: Go to Dashboard
      if (event.key === 'h' && !event.ctrlKey && !event.metaKey) {
        if (location.pathname !== '/') {
          navigate('/')
          showInfo('Navigated to Dashboard')
        }
        return
      }

      // C: Go to Cameras
      if (event.key === 'c' && !event.ctrlKey && !event.metaKey) {
        if (location.pathname !== '/cameras') {
          navigate('/cameras')
          showInfo('Navigated to Cameras')
        }
        return
      }

      // I: Go to Images
      if (event.key === 'i' && !event.ctrlKey && !event.metaKey) {
        if (location.pathname !== '/images') {
          navigate('/images')
          showInfo('Navigated to Images')
        }
        return
      }

      // A: Go to Analytics
      if (event.key === 'a' && !event.ctrlKey && !event.metaKey) {
        if (location.pathname !== '/analytics') {
          navigate('/analytics')
          showInfo('Navigated to Analytics')
        }
        return
      }

      // S: Go to Settings
      if (event.key === 's' && !event.ctrlKey && !event.metaKey) {
        if (location.pathname !== '/settings') {
          navigate('/settings')
          showInfo('Navigated to Settings')
        }
        return
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [navigate, location.pathname, showInfo, toggleTheme])

  if (!showHelp) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Keyboard Shortcuts</h2>
            <button
              onClick={() => setShowHelp(false)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Navigation */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Navigation</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Dashboard</span>
                  <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">H</kbd>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Cameras</span>
                  <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">C</kbd>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Images</span>
                  <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">I</kbd>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Analytics</span>
                  <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">A</kbd>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Settings</span>
                  <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">S</kbd>
                </div>
              </div>
            </div>

            {/* Global */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Global</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Toggle Theme</span>
                  <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">Ctrl/Cmd + T</kbd>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Show Help</span>
                  <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">Ctrl/Cmd + K</kbd>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Close/Back</span>
                  <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">Esc</kbd>
                </div>
              </div>
            </div>

            {/* Quick Navigation */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Quick Navigation</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Dashboard</span>
                  <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">Ctrl/Cmd + 1</kbd>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Cameras</span>
                  <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">Ctrl/Cmd + 2</kbd>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Images</span>
                  <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">Ctrl/Cmd + 3</kbd>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Analytics</span>
                  <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">Ctrl/Cmd + 4</kbd>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Settings</span>
                  <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">Ctrl/Cmd + 5</kbd>
                </div>
              </div>
            </div>

            {/* Tips */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Tips</h3>
              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <p>• Shortcuts work anywhere in the app</p>
                <p>• Use Ctrl (Windows) or Cmd (Mac)</p>
                <p>• Press Esc to close this help</p>
                <p>• Shortcuts don't work in input fields</p>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
              Press any key or click outside to close
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default KeyboardShortcuts
